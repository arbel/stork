import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from "react";
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';
import { fetchAllActiveNames } from '@/lib/nameQueries';

export interface BabyName {
  name: string;
  displayName?: string; // For Hebrew script display
  origin?: string;
  originCategory?: string; // e.g. biblical / nature / virtue / foreign — see origin_category column
  originGroup?: string; // ethnolinguistic group for filtering — see origin_group column
  meaning?: string;
  gender?: 'male' | 'female' | 'unisex';
  language?: string;
  countries?: string[];
  maleOccurrences?: number;
  femaleOccurrences?: number;
}

export interface UserPreferences {
  gender: 'male' | 'female' | 'unknown';
  country?: string;
  language: string;
  originGroups?: string[]; // selected origin_group values to include; undefined/empty = all
}

interface SwipeContextType {
  likedNames: BabyName[];
  passedNames: BabyName[];
  matches: BabyName[];
  partnerLikes: string[];
  partnerLikesLoaded: boolean;
  // The partner's own origin-category selection + display name, for showing "your partner also
  // picked this" badges. null = no partner (or not loaded yet).
  partnerOriginGroups: string[] | null;
  partnerName: string | null;
  preferences: UserPreferences | null;
  isOnboardingComplete: boolean;
  partnership: any | null;
  partnershipLoaded: boolean;
  // True once the user's own liked/passed lists reflect the DB for the settled partnership
  // context — until then the lists are empty because they haven't loaded, not because the
  // user has no swipes. Pages should show a loader, not an empty state.
  swipesLoaded: boolean;
  // Same, for the matches list.
  matchesLoaded: boolean;
  notifications: any[] | null;
  addLikedName: (name: BabyName) => void;
  addPassedName: (name: BabyName) => void;
  addMatch: (name: BabyName) => void;
  removeSwipeLocal: (name: string) => void;
  markNotificationsRead: (ids: string[]) => Promise<void>;
  resetAll: () => void;
  completeOnboarding: (preferences: UserPreferences) => void;
  refreshPartnership: () => Promise<void>;
  loadPartnerLikesManually: () => void;
}

const SwipeContext = createContext<SwipeContextType | undefined>(undefined);

export const useSwipe = () => {
  const context = useContext(SwipeContext);
  if (!context) {
    throw new Error("useSwipe must be used within a SwipeProvider");
  }
  return context;
};

// Pick which partnership to treat as "yours". An ACTIVE partnership always wins over a stray
// pending/orphan row — e.g. a duplicate a user created during the invite bug, where they're
// user1 of an empty pending row AND user2 of the real active one. `rows` is newest-first, so a
// plain [0] would wrongly surface the orphan; prefer active, then fall back to most recent.
const pickPrimaryPartnership = (rows: any[] | null | undefined): any => {
  if (!rows || rows.length === 0) return null;
  return rows.find((p) => p.status === 'active') ?? rows[0];
};

export const SwipeProvider = ({ children }: { children: ReactNode }) => {
  const { user, profile } = useAuth();
  const [likedNames, setLikedNames] = useState<BabyName[]>([]);
  const [passedNames, setPassedNames] = useState<BabyName[]>([]);
  const [matches, setMatches] = useState<BabyName[]>([]);
  const [partnership, setPartnership] = useState<any>(null);
  // Whether the initial partnership load has resolved — used to avoid swiping (and writing swipes
  // with a null partnership_id) before we know whether the user is in a partnership.
  const [partnershipLoaded, setPartnershipLoaded] = useState(false);
  // Bumped by a realtime user_swipes subscription so partner-likes / matches refresh live.
  const [swipesVersion, setSwipesVersion] = useState(0);
  // True once the initial partner-likes fetch has settled (or there's no partner to fetch for).
  // Lets the deck take ONE stable snapshot instead of re-interleaving on live updates.
  const [partnerLikesLoaded, setPartnerLikesLoaded] = useState(false);
  const [swipesLoaded, setSwipesLoaded] = useState(false);
  const [matchesLoaded, setMatchesLoaded] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [partnerLikes, setPartnerLikes] = useState<string[]>([]);
  const [partnerOriginGroups, setPartnerOriginGroups] = useState<string[] | null>(null);
  const [partnerName, setPartnerName] = useState<string | null>(null);
  const [allNames, setAllNames] = useState<BabyName[]>([]);
  
  // Fetch names from database (paginated so the full catalog loads, not just the first 1000)
  useEffect(() => {
    const fetchNames = async () => {
      try {
        const formattedNames = await fetchAllActiveNames();
        setAllNames(formattedNames);
      } catch (error) {
        console.error('Error fetching names:', error);
      }
    };

    fetchNames();
  }, []);
  
  // Helper function to enrich a name string with full BabyName data
  const enrichNameData = (nameString: string): BabyName => {
    const fullNameData = allNames.find(bn => bn.name === nameString);
    return fullNameData || { name: nameString };
  };
  
  const preferences = profile?.preferences || null;
  
  // Determine if onboarding is complete
  const isOnboardingComplete = (() => {
    if (!user || !profile) return false;
    
    const hasBasicInfo = profile.first_name;
    const hasPreferences = preferences &&
      preferences.gender;

    // Partner with inherited preferences only needs basic info
    const isPartnerWithInheritedPrefs = profile.partner_name === 'partner' && preferences &&
      preferences.gender;
    
    return hasBasicInfo && (hasPreferences || isPartnerWithInheritedPrefs);
  })();

  // Load partnership data
  useEffect(() => {
    if (!user) {
      setPartnership(null);
      return;
    }

    const loadPartnership = async () => {
      console.log('Loading partnership for user:', user.id);
      
      // Look for any partnership where user is involved (active or pending), newest first.
      const { data, error } = await supabase
        .from('partnerships')
        .select('*')
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      console.log('Partnership query result:', { data, error });

      if (error) {
        console.error('Error loading partnership:', error);
        setPartnership(null);
      } else {
        const primary = pickPrimaryPartnership(data);
        console.log('Partnership selected:', primary);
        setPartnership(primary);
      }
      setPartnershipLoaded(true);
    };

    loadPartnership();

    // Subscribe to real-time partnership updates
    const channel = supabase
      .channel('partnerships-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'partnerships'
      }, (payload) => {
        console.log('Partnership update received:', payload);
        const partnershipData = payload.new || payload.old;
        
        // Check if this update affects the current user
        if (partnershipData && 
            ((partnershipData as any).user1_id === user.id || (partnershipData as any).user2_id === user.id)) {
          if (payload.eventType === 'DELETE') {
            setPartnership(null);
          } else {
            loadPartnership();
          }
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Realtime: when either partner's swipes change in the current partnership, refresh partner-likes
  // and matches so a partner-initiated match surfaces live (no reload needed).
  useEffect(() => {
    if (!partnership?.id) return;
    const channel = supabase
      .channel(`user_swipes-${partnership.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'user_swipes',
        filter: `partnership_id=eq.${partnership.id}`,
      }, () => {
        setSwipesVersion((v) => v + 1);
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [partnership?.id]);

  // IDs the user already consumed locally (celebration dismissed etc.). A refetch that races
  // the read-update in the DB must not resurrect them into the unread list.
  const readNotificationIdsRef = useRef<Set<string>>(new Set());

  const loadNotifications = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .eq('read', false)
      .order('created_at', { ascending: false });

    setNotifications((data || []).filter(n => !readNotificationIdsRef.current.has(n.id)));
  }, [user?.id]);

  // Load notifications
  useEffect(() => {
    if (!user) return;

    loadNotifications();

    // Subscribe to real-time notifications
    const channel = supabase
      .channel('notifications')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${user.id}`
      }, () => {
        loadNotifications();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, loadNotifications]);

  // The notifications realtime channel has proven flaky, while the user_swipes channel (which
  // bumps swipesVersion) is reliable — and match notifications are created by the very same
  // swipe transactions. Piggyback: any partner swipe activity also refreshes notifications,
  // so a partner-created match reaches this client without a page reload.
  useEffect(() => {
    if (swipesVersion > 0) loadNotifications();
  }, [swipesVersion, loadNotifications]);

  // Load user's existing swipes
  useEffect(() => {
    if (!user) return;

    // Wait for the partnership to settle first — otherwise this runs once with
    // partnership=null, queries the (empty) solo context, and briefly shows partnered
    // users an empty liked/passed list on refresh.
    if (!partnershipLoaded) return;

    // Wait until allNames is loaded before filtering swipes
    if (allNames.length === 0) {
      console.log('Waiting for allNames to load before loading swipes');
      return;
    }

    const loadUserSwipes = async () => {
      let query = supabase
        .from('user_swipes')
        .select('name, action')
        .eq('user_id', user.id);
      
      // Strict isolation: only this partnership's swipes, or the solo (NULL) context.
      if (partnership?.id) {
        query = query.eq('partnership_id', partnership.id);
      } else {
        query = query.is('partnership_id', null);
      }

      const { data } = await query;
      
      if (data) {
        // Only include names that still exist in the database (allNames)
        const activeNameSet = new Set(allNames.map(n => n.name));
        
        console.log('Active names count:', activeNameSet.size);
        
        const allLikes = data.filter(s => s.action === 'like');
        const filteredLikes = allLikes.filter(s => activeNameSet.has(s.name));
        
        if (allLikes.length !== filteredLikes.length) {
          const missingNames = allLikes
            .filter(s => !activeNameSet.has(s.name))
            .map(s => s.name);
          console.log('Liked names not found in active names:', missingNames);
        }
        
        const likes = filteredLikes.map(s => enrichNameData(s.name));
        const passes = data
          .filter(s => s.action === 'pass' && activeNameSet.has(s.name))
          .map(s => enrichNameData(s.name));
        
        setLikedNames(likes);
        setPassedNames(passes);
        
        console.log('Loaded existing swipes (filtered to active names):', { likes: likes.length, passes: passes.length });
      }
    };

    loadUserSwipes().finally(() => setSwipesLoaded(true));
  }, [user, partnership, allNames, partnershipLoaded]);

  // Manual partner likes loading function
  const loadPartnerLikesManually = async () => {
    if (!partnership || !user) {
      console.log('Cannot load partner likes manually - missing data');
      return;
    }
    
    const partnerId = partnership.user1_id === user.id ? partnership.user2_id : partnership.user1_id;
    if (!partnerId) {
      console.log('No partner found for manual loading');
      return;
    }
    
    console.log('Manual loading partner likes for:', partnerId, 'in partnership:', partnership.id);
    
    try {
      const { data, error } = await supabase
        .from('user_swipes')
        .select('name')
        .eq('user_id', partnerId)
        .eq('partnership_id', partnership.id)
        .eq('action', 'like');
      
      console.log('Manual query result:', { data, error, count: data?.length });
      
      if (error) {
        console.error('Manual query error:', error);
        return;
      }
      
      const partnerLikedNames = data?.map(s => s.name) || [];
      console.log('Manual result - Partner has liked', partnerLikedNames.length, 'names');
      setPartnerLikes(partnerLikedNames);
    } catch (err) {
      console.error('Manual loading exception:', err);
    }
  };

  // Load partner's likes to check for matches
  useEffect(() => {
    if (!user) return;
    if (!partnership) {
      // No partnership at all (solo user) — there are no partner likes to wait for.
      if (partnershipLoaded) setPartnerLikesLoaded(true);
      return;
    }

    // Only load partner likes if there's a partner in the partnership
    const partnerId = partnership.user1_id === user.id ? partnership.user2_id : partnership.user1_id;

    if (!partnerId) {
      console.log('No partner in partnership yet');
      setPartnerLikes([]);
      setPartnerLikesLoaded(true);
      return;
    }

    const loadPartnerLikes = async () => {
      console.log('Loading partner likes for partner:', partnerId, 'in partnership:', partnership.id);

      try {
        const { data, error } = await supabase
          .from('user_swipes')
          .select('name')
          .eq('user_id', partnerId)
          .eq('partnership_id', partnership.id)
          .eq('action', 'like');

        console.log('Partner likes query result:', { data, error, count: data?.length });

        if (error) {
          console.error('Error loading partner likes:', error);
          return;
        }

        const partnerLikedNames = data?.map(s => s.name) || [];
        console.log('Partner has liked', partnerLikedNames.length, 'names:', partnerLikedNames.slice(0, 5));
        setPartnerLikes(partnerLikedNames);
      } catch (err) {
        console.error('Exception loading partner likes:', err);
      } finally {
        // Even on error: unblocks consumers waiting for the initial load (deck freeze).
        setPartnerLikesLoaded(true);
      }
    };

    // Load immediately and forcefully
    loadPartnerLikes();
  }, [partnership?.id, user?.id, swipesVersion, partnershipLoaded]);

  // Load the partner's own origin-category selection (+ their name) so Preferences can show a badge
  // on categories the partner has enabled. The partner's profile row is readable under the
  // "Partners can view each other's basic profile info" RLS policy (active partnerships only).
  useEffect(() => {
    if (!partnership || !user) { setPartnerOriginGroups(null); setPartnerName(null); return; }

    const partnerId = partnership.user1_id === user.id ? partnership.user2_id : partnership.user1_id;
    if (!partnerId) { setPartnerOriginGroups(null); setPartnerName(null); return; }

    let cancelled = false;
    const loadPartnerPrefs = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('first_name, preferences')
        .eq('user_id', partnerId)
        .order('created_at', { ascending: false })
        .limit(1);

      if (cancelled) return;
      const row = Array.isArray(data) ? data[0] : data;
      if (error || !row) { setPartnerOriginGroups(null); setPartnerName(null); return; }

      const og = (row.preferences as { originGroups?: string[] } | null)?.originGroups;
      // Empty/undefined means "all groups included" per the app convention.
      setPartnerOriginGroups(Array.isArray(og) ? og : []);
      setPartnerName(row.first_name ?? null);
    };

    loadPartnerPrefs();
    return () => { cancelled = true; };
  }, [partnership?.id, user?.id]);

  // Calculate matches directly from database for accuracy
  useEffect(() => {
    // Don't resolve matches (or declare them loaded) off a not-yet-settled partnership.
    if (!partnershipLoaded) return;

    const loadMatchesFromDb = async () => {
      if (!user || !partnership) {
        console.log('Matches: missing user or partnership');
        setMatches([]);
        return;
      }

      const partnerId = partnership.user1_id === user.id ? partnership.user2_id : partnership.user1_id;
      if (!partnerId) {
        console.log('Matches: no partner in partnership');
        setMatches([]);
        return;
      }

      try {
        console.log('Matches: loading from DB for partnership', partnership.id);

        const { data: swipes, error } = await supabase
          .from('user_swipes')
          .select('name, user_id')
          .eq('partnership_id', partnership.id)
          .in('user_id', [user.id, partnerId])
          .eq('action', 'like');

        if (error) {
          console.error('Error loading matches from DB:', error);
          setMatches([]);
          return;
        }

        const userLikes = new Set(
          (swipes || []).filter(s => s.user_id === user.id).map(s => s.name)
        );
        const partnerLikesSet = new Set(
          (swipes || []).filter(s => s.user_id === partnerId).map(s => s.name)
        );

        const matchNames = Array.from(userLikes).filter(name => partnerLikesSet.has(name));
        console.log('Matches from DB:', matchNames.length, 'names');

        if (matchNames.length === 0) {
          setMatches([]);
          return;
        }

        // Enrich with name data from allNames
        const enrichedMatches = matchNames.map(name => {
          const found = allNames.find(n => n.name === name);
          return found || { name };
        });

        setMatches(enrichedMatches);
      } catch (err) {
        console.error('Unexpected error loading matches:', err);
        setMatches([]);
      }
    };

    loadMatchesFromDb().finally(() => setMatchesLoaded(true));
  }, [user, partnership, allNames, swipesVersion, partnershipLoaded]);

  const addLikedName = async (name: BabyName) => {
    console.log('addLikedName called:', { 
      user: !!user, 
      partnership: !!partnership, 
      partnershipId: partnership?.id,
      userId: user?.id
    });
    
    if (!user) {
      console.log('Cannot save like - no user');
      return;
    }

    // Guard against double-commits from a single gesture (no-op if already liked)
    if (likedNames.some(n => n.name === name.name)) {
      console.log('Like already recorded, skipping:', name.name);
      return;
    }

    setLikedNames(prev => [...prev, name]);
    // If it was previously passed, drop it from the local passed set (latest choice wins)
    setPassedNames(prev => prev.filter(n => n.name !== name.name));

    // Upsert so re-swiping a name overwrites the prior choice instead of erroring on the
    // (user_id, name, partnership_id) unique index. Latest choice wins.
    const { error } = await supabase
      .from('user_swipes')
      .upsert({
        user_id: user.id,
        partnership_id: partnership?.id || null,
        name: name.name,
        action: 'like'
      }, { onConflict: 'user_id,name,partnership_id' });

    if (error) {
      console.error('Error saving like:', error);
    } else {
      console.log('Successfully saved like for:', name.name);
      
      // Reload partner likes if we have a partnership
      if (partnership) {
        loadPartnerLikesManually();
      }
    }
  };

  const addMatch = (name: BabyName) => {
    console.log('Adding match:', name.name);
    setMatches(prev => {
      // Check if match already exists to prevent duplicates
      const exists = prev.some(match => match.name === name.name);
      if (exists) {
        console.log('Match already exists, skipping:', name.name);
        return prev;
      }
      console.log('Adding new match:', name.name);
      return [...prev, name];
    });
  };

  // Mark notifications as read (used after presenting match celebrations / summaries).
  // Optimistically drops them from the local unread list so the UI settles immediately.
  const markNotificationsRead = async (ids: string[]) => {
    if (ids.length === 0) return;
    ids.forEach(id => readNotificationIdsRef.current.add(id));
    setNotifications(prev => prev.filter(n => !ids.includes(n.id)));
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .in('id', ids);
    if (error) {
      console.error('Error marking notifications read:', error);
    }
  };

  // Remove a name from the local liked/passed lists (used by undo, so the card reappears in the
  // deck). Works regardless of partnership context — the DB row deletion is done by the caller.
  const removeSwipeLocal = (name: string) => {
    setLikedNames(prev => prev.filter(n => n.name !== name));
    setPassedNames(prev => prev.filter(n => n.name !== name));
  };

  const addPassedName = async (name: BabyName) => {
    if (!user) {
      console.log('Cannot save pass - no user');
      return;
    }

    // Guard against double-commits from a single gesture (no-op if already passed)
    if (passedNames.some(n => n.name === name.name)) {
      console.log('Pass already recorded, skipping:', name.name);
      return;
    }

    setPassedNames(prev => [...prev, name]);
    // If it was previously liked, drop it from the local liked set (latest choice wins)
    setLikedNames(prev => prev.filter(n => n.name !== name.name));

    // Upsert so re-swiping a name overwrites the prior choice instead of erroring on the
    // (user_id, name, partnership_id) unique index. Latest choice wins.
    const { error } = await supabase
      .from('user_swipes')
      .upsert({
        user_id: user.id,
        partnership_id: partnership?.id || null,
        name: name.name,
        action: 'pass'
      }, { onConflict: 'user_id,name,partnership_id' });

    if (error) {
      console.error('Error saving pass:', error);
    } else {
      console.log('Successfully saved pass for:', name.name);
    }
  };


  const resetAll = () => {
    setLikedNames([]);
    setPassedNames([]);
    setMatches([]);
  };

  const completeOnboarding = async (userPreferences: UserPreferences) => {
    // This will be handled by the AuthContext updateProfile method
  };

  const refreshPartnership = async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from('partnerships')
      .select('*')
      .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error refreshing partnership:', error);
      setPartnership(null);
    } else {
      setPartnership(pickPrimaryPartnership(data));
    }
  };

  const contextValue = {
    likedNames,
    passedNames,
    matches,
    partnerLikes,
    partnerLikesLoaded,
    partnerOriginGroups,
    partnerName,
    preferences,
    isOnboardingComplete,
    partnership,
    partnershipLoaded,
    swipesLoaded,
    matchesLoaded,
    notifications,
    addLikedName,
    addPassedName,
    addMatch,
    removeSwipeLocal,
    markNotificationsRead,
    resetAll,
    completeOnboarding,
    refreshPartnership,
    loadPartnerLikesManually,
  };

  return (
    <SwipeContext.Provider value={contextValue}>
      {children}
    </SwipeContext.Provider>
  );
};