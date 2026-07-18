import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface NameRecommendation {
  name: string;
  score: number;
  reason: string;
  basedOnUsers?: string[];
}

export interface RecommendationResponse {
  success: boolean;
  recommendations: NameRecommendation[];
  userLikesCount: number;
  totalRecommendations: number;
  error?: string;
}

export const useNameRecommendations = () => {
  const [recommendations, setRecommendations] = useState<NameRecommendation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const generateRecommendations = useCallback(async (
    excludeNames: string[] = [],
    limit: number = 20
  ) => {
    if (!user) {
      setError('User not authenticated');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log('Generating recommendations for user:', user.id);
      
      const { data, error: funcError } = await supabase.functions.invoke('recommend-names', {
        body: {
          userId: user.id,
          excludeNames,
          limit
        }
      });

      if (funcError) {
        throw new Error(funcError.message);
      }

      if (!data.success) {
        throw new Error(data.error || 'Failed to generate recommendations');
      }

      setRecommendations(data.recommendations);
      console.log('Received', data.recommendations.length, 'recommendations');
      
    } catch (err) {
      console.error('Error generating recommendations:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate recommendations');
      setRecommendations([]);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const getCachedRecommendations = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('name_recommendations')
        .select('recommended_name, recommendation_score, recommendation_type, based_on_users')
        .eq('user_id', user.id)
        .order('recommendation_score', { ascending: false });

      if (error) {
        console.error('Error fetching cached recommendations:', error);
        return;
      }

      if (data && data.length > 0) {
        const cachedRecs = data.map(rec => ({
          name: rec.recommended_name,
          score: rec.recommendation_score,
          reason: rec.recommendation_type,
          basedOnUsers: rec.based_on_users || []
        }));
        
        setRecommendations(cachedRecs);
        console.log('Loaded', cachedRecs.length, 'cached recommendations');
      }
    } catch (err) {
      console.error('Error loading cached recommendations:', err);
    }
  }, [user]);

  const refreshRecommendations = useCallback(async (excludeNames: string[] = []) => {
    // First try to get cached recommendations
    await getCachedRecommendations();
    
    // Then generate fresh ones in the background
    await generateRecommendations(excludeNames);
  }, [getCachedRecommendations, generateRecommendations]);

  // Load cached recommendations on mount
  useEffect(() => {
    getCachedRecommendations();
  }, [getCachedRecommendations]);

  return {
    recommendations,
    isLoading,
    error,
    generateRecommendations,
    getCachedRecommendations,
    refreshRecommendations
  };
};