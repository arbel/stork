import { requireUser } from '../_shared/auth.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface RecommendationRequest {
  userId: string
  userPreferences?: {
    gender?: string
    country?: string
    language?: string
  }
  excludeNames?: string[]
  limit?: number
}

interface NameRecommendation {
  name: string
  score: number
  reason: string
  basedOnUsers?: string[]
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Authenticate the caller and NEVER trust a client-supplied userId (was an IDOR: any user
    // could wipe/poison another user's recommendations and read their similar-user UUIDs).
    const gate = await requireUser(req)
    if ('errorResponse' in gate) return gate.errorResponse
    const supabaseClient = gate.admin
    const userId = gate.user.id

    const { userPreferences, excludeNames = [], limit = 20 }: Omit<RecommendationRequest, 'userId'> = await req.json()

    // Get user's liked names
    const { data: userLikes } = await supabaseClient
      .from('user_swipes')
      .select('name')
      .eq('user_id', userId)
      .eq('action', 'like')

    const likedNames = userLikes?.map(like => like.name) || []
    const allExcludedNames = [...likedNames, ...excludeNames]
    const excludedSet = new Set(allExcludedNames)

    console.log('User has liked:', likedNames.length, 'names')

    let recommendations: NameRecommendation[] = []

    // Strategy 1: Collaborative Filtering (if user has liked some names)
    if (likedNames.length > 0) {
      console.log('Using collaborative filtering...')
      
      // Find similar users
      const { data: similarUsers } = await supabaseClient
        .from('user_similarities')
        .select('user1_id, user2_id, similarity_score, common_likes_count')
        .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
        .order('similarity_score', { ascending: false })
        .limit(10)

      if (similarUsers && similarUsers.length > 0) {
        console.log('Found', similarUsers.length, 'similar users')

        // Get recommendations from similar users
        for (const similarity of similarUsers) {
          const otherUserId = similarity.user1_id === userId ? similarity.user2_id : similarity.user1_id
          
          // Get names liked by similar user that current user hasn't seen
          const { data: otherUserLikes } = await supabaseClient
            .from('user_swipes')
            .select('name')
            .eq('user_id', otherUserId)
            .eq('action', 'like')

          if (otherUserLikes) {
            for (const like of otherUserLikes) {
              if (excludedSet.has(like.name)) continue
              const existingRec = recommendations.find(r => r.name === like.name)
              const scoreBoost = similarity.similarity_score * 0.8 // Weight by similarity

              if (existingRec) {
                existingRec.score += scoreBoost
                existingRec.basedOnUsers?.push(otherUserId)
              } else {
                recommendations.push({
                  name: like.name,
                  score: scoreBoost,
                  reason: 'collaborative_filtering',
                  basedOnUsers: [otherUserId]
                })
              }
            }
          }
        }
      }
    }

    // Strategy 2: Name-based similarities (names often liked together)
    if (likedNames.length > 0) {
      console.log('Using name-based similarities...')
      
      for (const likedName of likedNames) {
        // Find names similar to this liked name
        const { data: similarNames } = await supabaseClient
          .from('name_similarities')
          .select('name1, name2, similarity_score')
          .or(`name1.eq.${likedName},name2.eq.${likedName}`)
          .order('similarity_score', { ascending: false })
          .limit(5)

        if (similarNames) {
          for (const similarity of similarNames) {
            const recommendedName = similarity.name1 === likedName ? similarity.name2 : similarity.name1
            
            if (!allExcludedNames.includes(recommendedName)) {
              const existingRec = recommendations.find(r => r.name === recommendedName)
              const scoreBoost = similarity.similarity_score * 0.6

              if (existingRec) {
                existingRec.score += scoreBoost
              } else {
                recommendations.push({
                  name: recommendedName,
                  score: scoreBoost,
                  reason: 'name_similarity',
                  basedOnUsers: []
                })
              }
            }
          }
        }
      }
    }

    // Strategy 3: Popular names (fallback for new users or to fill remaining slots)
    console.log('Adding popular names as fallback...')
    
    const { data: popularNames } = await supabaseClient
      .from('user_swipes')
      .select('name')
      .eq('action', 'like')

    if (popularNames) {
      // Count occurrences of each name (excluding already-seen names)
      const nameCounts: { [key: string]: number } = {}
      popularNames.forEach(item => {
        if (excludedSet.has(item.name)) return
        nameCounts[item.name] = (nameCounts[item.name] || 0) + 1
      })

      // Convert to recommendations
      Object.entries(nameCounts)
        .sort(([,a], [,b]) => b - a) // Sort by popularity
        .slice(0, 10) // Top 10 popular names
        .forEach(([name, count]) => {
          const existingRec = recommendations.find(r => r.name === name)
          const popularityScore = Math.log(count + 1) * 0.3 // Logarithmic scaling

          if (existingRec) {
            existingRec.score += popularityScore
          } else {
            recommendations.push({
              name,
              score: popularityScore,
              reason: 'popular',
              basedOnUsers: []
            })
          }
        })
    }

    // Apply preference filters if provided
    if (userPreferences?.gender || userPreferences?.country || userPreferences?.language) {
      console.log('Applying preference filters...')
      // Note: This would require name metadata in the database
      // For now, we'll boost scores slightly for recommendations
      recommendations.forEach(rec => {
        rec.score += 0.1 // Small boost for having preferences
      })
    }

    // Sort by score and return top recommendations
    const finalRecommendations = recommendations
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(rec => ({
        ...rec,
        score: Math.round(rec.score * 1000) / 1000 // Round to 3 decimal places
      }))

    console.log('Returning', finalRecommendations.length, 'recommendations')

    // Cache recommendations in database
    if (finalRecommendations.length > 0) {
      // Clear old recommendations
      await supabaseClient
        .from('name_recommendations')
        .delete()
        .eq('user_id', userId)

      // Insert new recommendations
      const recommendationsToInsert = finalRecommendations.map(rec => ({
        user_id: userId,
        recommended_name: rec.name,
        recommendation_score: rec.score,
        recommendation_type: rec.reason,
        based_on_users: rec.basedOnUsers || []
      }))

      await supabaseClient
        .from('name_recommendations')
        .insert(recommendationsToInsert)
    }

    return new Response(
      JSON.stringify({
        success: true,
        recommendations: finalRecommendations,
        userLikesCount: likedNames.length,
        totalRecommendations: finalRecommendations.length
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Error generating recommendations:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})