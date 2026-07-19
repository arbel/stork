import { useState, useMemo, useEffect, useCallback, memo } from "react";
import { SwipeCard } from "./SwipeCard";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Heart, X, RotateCcw, List, Sparkles } from "lucide-react";
import { BoyIcon } from "./icons/BoyIcon";
import { GirlIcon } from "./icons/GirlIcon";
import { UnisexIcon } from "./icons/UnisexIcon";
import { GenderDistributionBar } from "./GenderDistributionBar";
import { toast } from "@/hooks/use-toast";
import { useSwipe } from "@/contexts/SwipeContext";
import { useNavigate } from "react-router-dom";
import confetti from "canvas-confetti";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNameRecommendations } from "@/hooks/useNameRecommendations";
import undoIcon from "@/assets/undo.svg";

import { BabyName } from "@/contexts/SwipeContext";
import { MatchCelebration } from "./MatchCelebration";
import { StorkLoader } from "./StorkLoader";
import { fetchAllActiveNames } from "@/lib/nameQueries";

interface NameWithOccurrences extends BabyName {
  maleOccurrences?: number;
  femaleOccurrences?: number;
}

// FNV-1a 32-bit hash — deterministic, well-distributed. Used to derive a per-user deck seed
// and to break ties between names so partners don't get identical orderings.
const fnv1a = (str: string): number => {
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
};

const SwipeInterface = () => {
  const { likedNames, passedNames, matches, partnerLikes, addLikedName, addPassedName, addMatch, resetAll, preferences, partnership, refreshPartnership } = useSwipe();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // State management
  const [allNames, setAllNames] = useState<NameWithOccurrences[]>([]);
  const [namesLoading, setNamesLoading] = useState(true);
  const [cardAnimation, setCardAnimation] = useState<'left' | 'right' | null>(null);
  const [useRecommendations, setUseRecommendations] = useState(true);
  const [showMatchCelebration, setShowMatchCelebration] = useState(false);
  const [matchedName, setMatchedName] = useState<BabyName | null>(null);
  const [dragDirection, setDragDirection] = useState<'left' | 'right' | null>(null);
  const [dragOffset, setDragOffset] = useState(0);
  const [lastUndo, setLastUndo] = useState<{ name: BabyName; direction: 'left' | 'right' } | null>(null);
  const [undoAnimation, setUndoAnimation] = useState<{ active: boolean; direction: 'left' | 'right' } | null>(null);
  const [undoCardName, setUndoCardName] = useState<string | null>(null);
  
  const { 
    recommendations, 
    isLoading: recommendationsLoading, 
    refreshRecommendations 
  } = useNameRecommendations();

  // Per-user deck seed: FNV-1a hash of the user UUID mixed with a daily bucket so the deck
  // RESHUFFLES over time (day to day) while staying DIFFERENT per user, so two partners never
  // share an order. The daily rotation is picked up on each fresh mount / new session.
  const randomSeed = useMemo(() => {
    if (!user) return 0;
    const dayBucket = Math.floor(Date.now() / (1000 * 60 * 60 * 24)); // rotates daily
    return (fnv1a(user.id) ^ (dayBucket >>> 0)) >>> 0;
  }, [user?.id]);

  // Tier weights for popularity-based ordering
  // Top 25% gets 50% of slots, etc.
  const TIER_WEIGHTS = {
    elite: 0.50,    // Top 25% (75th+ percentile)
    popular: 0.25,  // 50th-75th percentile
    common: 0.15,   // 25th-50th percentile
    rare: 0.10      // Bottom 25%
  };

  // Seeded random generator
  const createSeededRandom = useCallback((initialSeed: number) => {
    let seed = initialSeed;
    return () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };
  }, []);

  // Weighted popularity shuffle - prioritizes popular names while maintaining randomness
  const weightedPopularityShuffle = useCallback((names: NameWithOccurrences[]) => {
    if (names.length === 0) return [];

    const seededRandom = createSeededRandom(randomSeed);

    // Calculate total occurrences for each name
    const namesWithTotal = names.map(name => ({
      ...name,
      totalOccurrences: (name.maleOccurrences || 0) + (name.femaleOccurrences || 0)
    }));

    // Sort by occurrences to find percentile thresholds
    const sortedByOccurrences = [...namesWithTotal].sort((a, b) => a.totalOccurrences - b.totalOccurrences);
    const len = sortedByOccurrences.length;
    
    // Calculate percentile thresholds
    const p25Index = Math.floor(len * 0.25);
    const p50Index = Math.floor(len * 0.50);
    const p75Index = Math.floor(len * 0.75);
    
    const threshold25 = sortedByOccurrences[p25Index]?.totalOccurrences || 0;
    const threshold50 = sortedByOccurrences[p50Index]?.totalOccurrences || 0;
    const threshold75 = sortedByOccurrences[p75Index]?.totalOccurrences || 0;

    // Assign names to tiers
    const tiers = {
      elite: [] as typeof namesWithTotal,     // Top 25%
      popular: [] as typeof namesWithTotal,   // 50-75th percentile
      common: [] as typeof namesWithTotal,    // 25-50th percentile
      rare: [] as typeof namesWithTotal       // Bottom 25%
    };

    namesWithTotal.forEach(name => {
      if (name.totalOccurrences >= threshold75) {
        tiers.elite.push(name);
      } else if (name.totalOccurrences >= threshold50) {
        tiers.popular.push(name);
      } else if (name.totalOccurrences >= threshold25) {
        tiers.common.push(name);
      } else {
        tiers.rare.push(name);
      }
    });

    // Shuffle each tier internally with weighted preference for higher occurrences
    const shuffleTierWithWeights = (tier: typeof namesWithTotal) => {
      if (tier.length === 0) return [];
      
      // Sort by occurrence first, then add randomness
      return tier.sort((a, b) => {
        const occDiff = b.totalOccurrences - a.totalOccurrences;
        // Add some randomness - higher occurrence names are more likely to be first
        // but not guaranteed
        const randomFactor = (seededRandom() - 0.5) * Math.max(a.totalOccurrences, b.totalOccurrences) * 0.5;
        return occDiff + randomFactor;
      });
    };

    // Shuffle each tier
    Object.keys(tiers).forEach(key => {
      tiers[key as keyof typeof tiers] = shuffleTierWithWeights(tiers[key as keyof typeof tiers]);
    });

    // Build result array based on tier weights
    const result: NameWithOccurrences[] = [];
    const tierPointers = { elite: 0, popular: 0, common: 0, rare: 0 };
    const totalNames = names.length;

    for (let i = 0; i < totalNames; i++) {
      const rand = seededRandom();
      let selectedTier: keyof typeof tiers;

      // Weighted random tier selection
      if (rand < TIER_WEIGHTS.elite) {
        selectedTier = 'elite';
      } else if (rand < TIER_WEIGHTS.elite + TIER_WEIGHTS.popular) {
        selectedTier = 'popular';
      } else if (rand < TIER_WEIGHTS.elite + TIER_WEIGHTS.popular + TIER_WEIGHTS.common) {
        selectedTier = 'common';
      } else {
        selectedTier = 'rare';
      }

      // Try to get name from selected tier, fallback to others if exhausted
      const tierOrder: (keyof typeof tiers)[] = [selectedTier, 'elite', 'popular', 'common', 'rare'];
      let added = false;

      for (const tier of tierOrder) {
        if (tierPointers[tier] < tiers[tier].length) {
          result.push(tiers[tier][tierPointers[tier]]);
          tierPointers[tier]++;
          added = true;
          break;
        }
      }

      if (!added) break;
    }

    return result;
  }, [randomSeed, createSeededRandom]);

  // Fetch names from database
  useEffect(() => {
    const fetchNames = async () => {
      setNamesLoading(true);
      try {
        // Paginated: loads the whole catalog, not just the first 1000 rows.
        const formattedNames = await fetchAllActiveNames();
        setAllNames(formattedNames);
      } catch (error) {
        console.error('Error fetching names:', error);
      } finally {
        setNamesLoading(false);
      }
    };

    fetchNames();
  }, []);

  // Create stable shuffled deck - only reshuffles when preferences change, NOT when swiping
  const shuffledDeck = useMemo(() => {
    if (!preferences || allNames.length === 0) return [];
    
    // Only filter by origin when the user picked a strict subset; empty/undefined = show all.
    const originFilter =
      preferences.originGroups && preferences.originGroups.length > 0
        ? new Set(preferences.originGroups)
        : null;

    // Filter by preferences (gender, language, origin) - this is the base deck
    const filtered = allNames.filter(name => {
      // Filter by gender preference
      if (preferences.gender !== 'unknown' && name.gender !== 'unisex' && name.gender !== preferences.gender) {
        return false;
      }

      // Filter by language preference
      if (preferences.language && name.language && name.language !== preferences.language) {
        return false;
      }

      // Filter by origin group. Names without a group (not yet classified) are always kept.
      if (originFilter && name.originGroup && !originFilter.has(name.originGroup)) {
        return false;
      }

      return true;
    });
    
    if (useRecommendations && recommendations.length > 0) {
      // Create a map of recommendation scores
      const recScores = new Map(recommendations.map(rec => [rec.name, rec.score]));
      
      console.log('Using recommendations mode. Scores:', Array.from(recScores.entries()).slice(0, 5));
      
      // Sort names by recommendation score, with stable sorting for same scores
      return filtered.sort((a, b) => {
        const scoreA = recScores.get(a.name) || 0;
        const scoreB = recScores.get(b.name) || 0;
        
        if (scoreA !== scoreB) {
          return scoreB - scoreA; // Higher scores first
        }

        // Tie-break (e.g. cold start where every score is 0): mix the per-user seed into the
        // name hash so the ordering is stable per user but DIVERGES between partners from the
        // very first card. Without the seed both partners saw an identical deck.
        const hashA = fnv1a(a.name) ^ randomSeed;
        const hashB = fnv1a(b.name) ^ randomSeed;
        return (hashA >>> 0) - (hashB >>> 0);
      });
    } else {
      console.log('Creating weighted popularity deck with', filtered.length, 'names');
      // Return filtered names with weighted popularity ordering
      return weightedPopularityShuffle(filtered);
    }
  }, [preferences, recommendations, useRecommendations, weightedPopularityShuffle, allNames, randomSeed]);

  // Filter out swiped names WITHOUT reshuffling - maintains stable order
  const availableNames = useMemo(() => {
    const likedNameSet = new Set(likedNames.map(n => n.name));
    const passedNameSet = new Set(passedNames.map(n => n.name));
    
    return shuffledDeck.filter(name => 
      !likedNameSet.has(name.name) && !passedNameSet.has(name.name)
    );
  }, [shuffledDeck, likedNames, passedNames]);

  // Popularity ranking: rank names by real occurrences within each gender, so a card can show
  // "מקום N בשמות הבנים/הבנות". Derived from the occurrence counts already loaded — no extra data.
  const rankMaps = useMemo(() => {
    const boyRank = new Map<string, number>();
    const girlRank = new Map<string, number>();
    [...allNames]
      .filter((n) => (n.maleOccurrences || 0) > 0)
      .sort((a, b) => (b.maleOccurrences || 0) - (a.maleOccurrences || 0))
      .forEach((n, i) => boyRank.set(n.name, i + 1));
    [...allNames]
      .filter((n) => (n.femaleOccurrences || 0) > 0)
      .sort((a, b) => (b.femaleOccurrences || 0) - (a.femaleOccurrences || 0))
      .forEach((n, i) => girlRank.set(n.name, i + 1));
    return { boyRank, girlRank };
  }, [allNames]);

  const getPopularity = useCallback((name?: NameWithOccurrences) => {
    if (!name) return null;
    const male = name.maleOccurrences || 0;
    const female = name.femaleOccurrences || 0;
    if (male === 0 && female === 0) return null;
    const isBoy = male >= female;
    const rank = isBoy ? rankMaps.boyRank.get(name.name) : rankMaps.girlRank.get(name.name);
    if (!rank) return null;
    return { rank, group: isBoy ? 'בנים' : 'בנות' };
  }, [rankMaps]);

  // Determine which index in the deck is currently shown
  const mainIndex = useMemo(() => {
    if (availableNames.length === 0) return -1;
    if (undoAnimation?.active && undoCardName) {
      const idx = availableNames.findIndex((n) => n.name === undoCardName);
      if (idx !== -1) return idx;
    }
    return 0;
  }, [availableNames, undoAnimation?.active, undoCardName]);

  const currentName = mainIndex >= 0 ? availableNames[mainIndex] : undefined;
  
  // Debug logging
  console.log('Current state:', { 
    availableNamesLength: availableNames.length, 
    currentNameShown: currentName?.name,
    nextName: availableNames[1]?.name,
    likedCount: likedNames.length,
    passedCount: passedNames.length,
  });
  
  // Check if current name is recommended
  const currentRecommendation = currentName ? recommendations.find(rec => rec.name === currentName.name) : null;
  const isRecommended = !!currentRecommendation;

  const triggerConfetti = useCallback(() => {
    console.log('🎉 CONFETTI TRIGGERED! 🎉');
    
    // Optimized confetti for mobile performance
    const isMobile = window.innerWidth < 768;
    const duration = isMobile ? 600 : 800; // Much shorter on mobile
    const particleCount = isMobile ? 15 : 25; // Fewer particles on mobile
    
    // Simple single burst instead of complex animation
    confetti({
      particleCount,
      spread: 70,
      origin: { y: 0.6 },
      startVelocity: 25,
      colors: ['#ff69b4', '#ff1493', '#dc143c'],
      ticks: isMobile ? 40 : 60
    });
    
    // Optional second burst with delay (only on non-mobile)
    if (!isMobile) {
      setTimeout(() => {
        confetti({
          particleCount: 20,
          spread: 50,
          origin: { y: 0.7 },
          startVelocity: 20,
          colors: ['#ff69b4', '#dc143c']
        });
      }, 200);
    }
  }, []);

  const handleDragChange = useCallback((direction: 'left' | 'right' | null, offset: number) => {
    setDragDirection(direction);
    setDragOffset(offset);
  }, []);

  const handleSwipe = (direction: 'left' | 'right') => {
    if (!currentName) return;

    console.log('=== SWIPE START ===');
    console.log('Swipe triggered:', direction, 'Current name:', currentName.name);
    
    const nameToSwipe = currentName;

    if (direction === 'right') {
      addLikedName(nameToSwipe);
      setLastUndo({ name: nameToSwipe, direction: 'right' });
      
      // Check for match
      console.log('Checking for match:', { name: nameToSwipe.name, partnerLikes: partnerLikes.length, includes: partnerLikes.includes(nameToSwipe.name) });
      if (partnerLikes.includes(nameToSwipe.name)) {
        addMatch(nameToSwipe);
        setMatchedName(nameToSwipe);
        setShowMatchCelebration(true);
        console.log('🎉 SWIPE MATCH FOUND! 🎉', nameToSwipe.name);
        return;
      }
    } else {
      addPassedName(nameToSwipe);
      setLastUndo({ name: nameToSwipe, direction: 'left' });
    }

    // No need to update index - filtering handles showing next card
    console.log('=== SWIPE COMPLETED ===');
  };

  const handleLikeButton = useCallback(() => {
    console.log('Like button clicked');
    if (!cardAnimation && currentName) {
      // Check for match BEFORE animating for button clicks
      if (partnerLikes.includes(currentName.name)) {
        // It's a match! Don't update state yet, just show match celebration
        // State will be updated when match celebration is closed
        setMatchedName(currentName);
        setShowMatchCelebration(true);
        console.log('🎉 BUTTON MATCH FOUND! 🎉', currentName.name);
        return;
      }
      
      // Trigger background color animation
      setDragDirection('right');
      setDragOffset(300);
      
      // No match, proceed with normal animation and swipe
      setCardAnimation('right');
      setTimeout(() => {
        handleSwipe('right');
        setCardAnimation(null);
        setDragDirection(null);
        setDragOffset(0);
      }, 300);
    }
  }, [cardAnimation, currentName, partnerLikes, handleSwipe]);
  
  const handlePassButton = useCallback(() => {
    console.log('Pass button clicked');
    if (!cardAnimation && currentName) {
      // Trigger background color animation
      setDragDirection('left');
      setDragOffset(300);
      
      // For pass button, always animate since there's no match to check
      setCardAnimation('left');
      setTimeout(() => {
        handleSwipe('left');
        setCardAnimation(null);
        setDragDirection(null);
        setDragOffset(0);
      }, 300);
    }
  }, [cardAnimation, currentName, handleSwipe]);

  const handleMatchContinue = useCallback(() => {
    if (matchedName) {
      addLikedName(matchedName);
      addMatch(matchedName);
      setShowMatchCelebration(false);
      setMatchedName(null);
      // No need to set index - filtering handles next card
    }
  }, [matchedName, addLikedName, addMatch]);

  const handleUndoSwipe = useCallback(async () => {
    if (!lastUndo || !user) {
      toast({
        title: "אין מה לבטל",
        description: "אין החלקה אחרונה לביטול.",
      });
      return;
    }

    // Store the animation direction and card name before clearing lastUndo
    const animDirection = lastUndo.direction;
    const animName = lastUndo.name.name;

    try {
      // Remove from database - handle both with and without partnership
      let query = supabase
        .from('user_swipes')
        .delete()
        .eq('user_id', user.id)
        .eq('name', lastUndo.name.name);
      
      if (partnership?.id) {
        query = query.eq('partnership_id', partnership.id);
      } else {
        query = query.is('partnership_id', null);
      }

      const { error } = await query;

      if (error) throw error;

      // Clear the last undo
      setLastUndo(null);

      // Refresh partnership to reload swipes FIRST
      await refreshPartnership();
      
      // THEN start the animation after data is updated
      // Use a small delay to ensure React has re-rendered with new data
      setTimeout(() => {
        setUndoCardName(animName);
        setUndoAnimation({ active: true, direction: animDirection });
        
        // End the animation after it completes
        setTimeout(() => {
          setUndoAnimation(null);
          setUndoCardName(null);
        }, 450);
      }, 50);
      
    } catch (error: any) {
      console.error('Error undoing swipe:', error);
      setUndoAnimation(null);
      setUndoCardName(null);
      toast({
        title: "הביטול נכשל",
        description: error.message || "אנא נסו שוב.",
        variant: "destructive",
      });
    }
  }, [lastUndo, user, partnership, refreshPartnership]);

  const resetSwipes = async () => {
    try {
      // First clear from database if user and partnership exist
      if (user && partnership) {
        await supabase
          .from('user_swipes')
          .delete()
          .eq('user_id', user.id)
          .eq('partnership_id', partnership.id);
        
        console.log('Database swipes cleared for user:', user.id);
      }
      
      // Clear local state - filtering will reset to start
      setDragDirection(null);
      setDragOffset(0);
      resetAll();
      
      toast({
        title: "האיפוס הושלם",
        description: "מתחילים מחדש עם שמות חדשים!",
      });
    } catch (error) {
      console.error('Error resetting swipes:', error);
      toast({
        title: "האיפוס נכשל",
        description: "אירעה שגיאה במחיקת הבחירות. אנא נסו שוב.",
        variant: "destructive"
      });
    }
  };

  // Refresh recommendations when user likes names - but don't change current view
  useEffect(() => {
    if (likedNames.length > 0 && likedNames.length % 10 === 0) {
      // Refresh recommendations every 10 likes (less frequent to avoid disruption)
      // But don't refresh if we're currently showing recommendations to avoid name jumping
      if (!useRecommendations) {
        const excludeNames = [...likedNames.map(n => n.name), ...passedNames.map(n => n.name)];
        refreshRecommendations(excludeNames);
      }
    }
  }, [likedNames.length, passedNames.length, refreshRecommendations, useRecommendations]);


  // Get background overlay opacity
  const getOverlayStyle = () => {
    if (!dragDirection || dragOffset === 0) return { opacity: 0 };
    
    const opacity = Math.min(Math.abs(dragOffset) / 200, 1);
    return { opacity };
  };

  // Show loading spinner while names are being fetched
  if (namesLoading) {
    return (
      <div 
        className="flex items-center justify-center fixed inset-0"
        style={{
          backgroundImage: 'url(/bg-base.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      >
        <StorkLoader message="מחפשים שמות יפים…" />
      </div>
    );
  }

  if (!currentName) {
    return (
      <div 
        className="flex flex-col items-center justify-center space-y-6 p-4 transition-all duration-500 fixed inset-0 overflow-hidden"
        style={{
          backgroundImage: 'url(/bg-base.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      >
        <div className="text-center space-y-4">
          <h2 className="text-2xl font-bold text-white">סיימתם את כל השמות! 🎉</h2>
          <p className="text-white/80">עברתם על כל השמות הזמינים לפי ההעדפות שלכם.</p>
        </div>
        <div className="flex space-x-4 space-x-reverse">
          <Button onClick={resetSwipes} className="bg-white text-gray-800 hover:bg-white/90">
            <RotateCcw className="w-4 h-4 ml-2" />
            להתחיל מחדש
          </Button>
          <Button variant="outline" onClick={() => navigate("/matches")} className="border-white text-white hover:bg-white/10">
            <List className="w-4 h-4 ml-2" />
            צפייה בתוצאות
          </Button>
          <Button 
            variant="outline" 
            onClick={() => setUseRecommendations(!useRecommendations)}
            className="border-white text-white hover:bg-white/10"
          >
            <Sparkles className="w-4 h-4 ml-2" />
            {useRecommendations ? 'מצב אקראי' : 'מצב חכם'}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="fixed inset-0 overflow-hidden flex flex-col"
      style={{
        background: 'linear-gradient(180deg, #1a1a2e 0%, #2d1b3d 50%, #3d2347 100%)',
      }}
    >
      {/* Base background image */}
      <div 
        className="absolute inset-0 z-0"
        style={{
          backgroundImage: 'url(/bg-base.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      />
      {/* Overlay backgrounds for like/dislike - behind content */}
      {dragDirection === 'right' && Math.abs(dragOffset) > 0 && (
        <div 
          className="absolute inset-0 pointer-events-none transition-opacity duration-100 z-0"
          style={{
            backgroundImage: 'url(/bg-like.png)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            ...getOverlayStyle()
          }}
        />
      )}
      {dragDirection === 'left' && Math.abs(dragOffset) > 0 && (
        <div 
          className="absolute inset-0 pointer-events-none transition-opacity duration-100 z-0"
          style={{
            backgroundImage: 'url(/bg-dislike.png)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            ...getOverlayStyle()
          }}
        />
      )}
      
      {/* Content wrapper with responsive spacing - above backgrounds */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 pt-4 pb-4 min-h-0 relative z-20">
        {/* Stacked Cards Effect - one-point perspective with 3 visible cards */}
        <div className="relative flex-1 flex items-center justify-center min-h-0">
          {/* Fourth card - subtle edge */}
          {mainIndex >= 0 && availableNames[mainIndex + 3] && (
            <div 
              className="absolute pointer-events-none"
              style={{
                transform: 'translateY(30px) scale(0.95)',
                zIndex: 7,
                opacity: 0.4,
                transition: 'transform 0.45s cubic-bezier(0.33, 1, 0.68, 1), opacity 0.45s ease-out',
              }}
            >
              <Card 
                className="w-[calc(100vw-48px)] max-w-[340px] aspect-[4/5] border-0 bg-white rounded-3xl"
                style={{ boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)' }}
              />
            </div>
          )}
          
          {/* Third card - visible placeholder */}
          {mainIndex >= 0 && availableNames[mainIndex + 2] && (
            <div 
              className="absolute pointer-events-none"
              style={{
                transform: 'translateY(20px) scale(0.97)',
                zIndex: 8,
                opacity: 0.7,
                transition: 'transform 0.45s cubic-bezier(0.33, 1, 0.68, 1), opacity 0.45s ease-out',
              }}
            >
              <Card 
                className="w-[calc(100vw-48px)] max-w-[340px] aspect-[4/5] border-0 bg-white rounded-3xl"
                style={{ boxShadow: '0 4px 12px rgba(0, 0, 0, 0.06)' }}
              />
            </div>
          )}
          
          {/* Second card - fully rendered with content */}
          {mainIndex >= 0 && availableNames[mainIndex + 1] && (
            <div 
              className="absolute pointer-events-none"
              style={{
                transform: 'translateY(10px) scale(0.99)',
                zIndex: 9,
                opacity: 0.96,
                transition: 'transform 0.45s cubic-bezier(0.33, 1, 0.68, 1), opacity 0.45s ease-out',
              }}
            >
              <SwipeCard
                key={`next-${availableNames[mainIndex + 1].name}`}
                name={availableNames[mainIndex + 1]}
                onSwipe={() => {}}
                maleOccurrences={availableNames[mainIndex + 1].maleOccurrences}
                femaleOccurrences={availableNames[mainIndex + 1].femaleOccurrences}
              />
            </div>
          )}
          
          {/* Main active card */}
          <div 
            style={{ 
              zIndex: 20,
              position: 'relative',
              transform: 'translateY(0) scale(1)',
              opacity: 1,
              transition: 'transform 0.45s cubic-bezier(0.33, 1, 0.68, 1), opacity 0.45s ease-out',
              animation: undoAnimation?.active 
                ? `slideInFrom${undoAnimation.direction === 'right' ? 'Right' : 'Left'} 0.45s cubic-bezier(0.33, 1, 0.68, 1) forwards`
                : 'none',
            }}
          >
            {currentName && (
              <SwipeCard
                key={`main-${currentName.name}`}
                name={currentName}
                onSwipe={handleSwipe}
                triggerAnimation={cardAnimation}
                onDragChange={handleDragChange}
                maleOccurrences={currentName.maleOccurrences}
                femaleOccurrences={currentName.femaleOccurrences}
                popularity={getPopularity(currentName)}
              />
            )}
          </div>
        </div>

        {/* Action Buttons - Pill shaped container, same width as cards */}
        <div
          className="flex items-center justify-center flex-shrink-0 pt-4 px-6"
          style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 1.5rem)' }}
        >
          <div className="flex items-center justify-between bg-white rounded-full px-4 py-3 shadow-lg w-[calc(100vw-48px)] max-w-[340px]">
            {/* Pass Button (X) - Left */}
            <button
              onClick={handlePassButton}
              className="w-16 h-16 rounded-full bg-[#EF5185] flex items-center justify-center hover:scale-110 transition-all"
            >
              <X className="w-8 h-8 text-white" />
            </button>
            
            {/* Undo Button - Center */}
            <button
              onClick={handleUndoSwipe}
              disabled={!lastUndo}
              className="w-12 h-12 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center hover:scale-110 transition-all disabled:opacity-30 disabled:hover:scale-100"
              title="ביטול ההחלקה האחרונה"
            >
              <img src={undoIcon} alt="ביטול" className="w-6 h-6" />
            </button>
            
            {/* Like Button (Heart) - Right */}
            <button
              onClick={handleLikeButton}
              className="w-16 h-16 rounded-full bg-[#8DC53F] flex items-center justify-center hover:scale-110 transition-all"
            >
              <Heart className="w-8 h-8 text-white fill-white" />
            </button>
          </div>
        </div>
      </div>
      
      {/* Show match celebration when there's a match */}
      {showMatchCelebration && matchedName && (
        <MatchCelebration 
          matchedName={matchedName}
          onContinue={handleMatchContinue}
        />
      )}
    </div>
  );
};

export { SwipeInterface };
