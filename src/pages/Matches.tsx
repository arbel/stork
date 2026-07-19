import { useEffect, useState } from "react";
import { useSwipe, BabyName } from "@/contexts/SwipeContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { NameListLayout } from "@/components/NameListLayout";

const Matches = () => {
  const { matches, partnership } = useSwipe();
  const { user } = useAuth();
  const [dbMatches, setDbMatches] = useState<BabyName[] | null>(null);

  useEffect(() => {
    const loadMatchesFromDb = async () => {
      if (!user || !partnership) {
        console.log('DB matches: missing user or partnership, falling back to context');
        setDbMatches(null);
        return;
      }

      const partnerId = partnership.user1_id === user.id ? partnership.user2_id : partnership.user1_id;
      if (!partnerId) {
        console.log('DB matches: no partner in partnership, falling back to context');
        setDbMatches(null);
        return;
      }

      try {
        console.log('DB matches: loading for partnership', partnership.id);

        const { data: swipes, error } = await supabase
          .from('user_swipes')
          .select('name, user_id, action')
          .eq('partnership_id', partnership.id)
          .in('user_id', [user.id, partnerId])
          .eq('action', 'like');

        if (error) {
          console.error('Error loading matches from DB:', error);
          setDbMatches(null);
          return;
        }

        const userLikes = new Set(
          (swipes || [])
            .filter(s => s.user_id === user.id)
            .map(s => s.name)
        );
        const partnerLikes = new Set(
          (swipes || [])
            .filter(s => s.user_id === partnerId)
            .map(s => s.name)
        );

        const matchNames = Array.from(userLikes).filter(name => partnerLikes.has(name));
        console.log('DB matches: found', matchNames.length, 'names:', matchNames);

        if (matchNames.length === 0) {
          setDbMatches([]);
          return;
        }

        const { data: nameRows, error: namesError } = await supabase
          .from('names')
          .select('*')
          .in('name', matchNames)
          .eq('is_active', true);

        if (namesError) {
          console.error('Error loading name details for matches:', namesError);
          setDbMatches(null);
          return;
        }

        const mapped: BabyName[] = (nameRows || []).map(n => ({
          name: n.name,
          displayName: n.display_name || undefined,
          origin: n.origin || undefined,
          originCategory: n.origin_category || undefined,
          meaning: n.meaning || undefined,
          gender: (n.gender as 'male' | 'female' | 'unisex') || undefined,
          maleOccurrences: n.male_occurrences || 0,
          femaleOccurrences: n.female_occurrences || 0,
        }));

        // Sort alphabetically by name for stable display
        mapped.sort((a, b) => a.name.localeCompare(b.name));

        setDbMatches(mapped);
      } catch (err) {
        console.error('Unexpected error loading matches from DB:', err);
        setDbMatches(null);
      }
    };

    loadMatchesFromDb();
  }, [user, partnership]);

  const displayMatches = dbMatches ?? matches;

  return (
    <NameListLayout
      title="התאמות"
      variant="match"
      names={displayMatches}
      bannerText="שניכם אוהבים את אלה!"
      emptyTitle="עדיין אין התאמות!"
      emptyText="המשיכו להחליק כדי למצוא שמות ששניכם אוהבים."
      ctaText="המשיכו להחליק"
    />
  );
};

export default Matches;
