import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Heart, ArrowLeft } from "lucide-react";
import { useSwipe, BabyName } from "@/contexts/SwipeContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { NameListLayout } from "@/components/NameListLayout";

const FIRST_MATCH_TARGET = 40; // "most couples match after ~40 names"

const Matches = () => {
  const navigate = useNavigate();
  const { matches, partnership, likedNames, passedNames, notifications, markNotificationsRead } = useSwipe();
  const { user, profile } = useAuth();
  const [dbMatches, setDbMatches] = useState<BabyName[] | null>(null);
  const [partnerName, setPartnerName] = useState<string>("");

  // Seeing the matches list counts as seeing the new matches — clear their unread
  // notifications so the badge settles and the swipe screen won't re-celebrate them.
  useEffect(() => {
    const ids = (notifications || [])
      .filter((n: any) => n.type === 'match_found')
      .map((n: any) => n.id);
    if (ids.length) markNotificationsRead(ids);
  }, [notifications, markNotificationsRead]);

  useEffect(() => {
    const loadPartner = async () => {
      if (!partnership || !user) return setPartnerName("");
      const partnerId = partnership.user1_id === user.id ? partnership.user2_id : partnership.user1_id;
      if (!partnerId) return setPartnerName("");
      const { data } = await supabase
        .from("profiles")
        .select("first_name, email")
        .eq("user_id", partnerId)
        .maybeSingle();
      if (data) setPartnerName(data.first_name || data.email?.split("@")[0] || "");
    };
    loadPartner();
  }, [partnership, user]);

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

  const swipeCount = likedNames.length + passedNames.length;
  const selfInitial = (profile?.first_name || user?.email || "?").trim().charAt(0).toUpperCase();
  const partnerInitial = (partnerName || "?").trim().charAt(0).toUpperCase();
  const progressPct = Math.min(100, Math.round((swipeCount / FIRST_MATCH_TARGET) * 100));

  const emptyState = (
    <div className="flex flex-col" style={{ minHeight: "calc(100dvh - 64px)", fontFamily: "'Assistant', system-ui, sans-serif" }}>
      <div className="flex-1 min-h-[16px]" />
      <div className="bg-white rounded-t-[30px] px-6 pt-9 pb-8 shadow-[0_-14px_34px_-20px_rgba(0,0,0,.35)]">
        {/* Paired avatars with a heart in the middle */}
        <div className="mb-6 flex items-center justify-center">
          <div className="flex h-[76px] w-[76px] items-center justify-center rounded-full bg-[#EF5185] text-2xl font-extrabold text-white shadow-lg ring-[5px] ring-white">
            {partnerInitial}
          </div>
          <div className="z-10 -mx-3 flex h-11 w-11 items-center justify-center rounded-full bg-[#FDECF2] ring-[5px] ring-white">
            <Heart className="h-5 w-5 fill-current text-[#E8508A]" />
          </div>
          <div className="flex h-[76px] w-[76px] items-center justify-center rounded-full bg-[#65BADF] text-2xl font-extrabold text-white shadow-lg ring-[5px] ring-white">
            {selfInitial}
          </div>
        </div>

        <h3 className="mb-3 text-center text-2xl font-extrabold text-[#23282B]">עוד לא מצאתם התאמה</h3>
        <p className="mx-auto mb-6 max-w-[32ch] text-center text-[15px] leading-relaxed text-[#5A554C]">
          כשגם את/ה וגם {partnerName || "בן/בת הזוג"} תאהבו את אותו שם — הוא יופיע כאן.
        </p>

        {/* Progress toward the typical first match */}
        <div className="mb-6 rounded-2xl bg-[#F6F4EE] px-5 py-4">
          <div className="mb-2.5 flex items-center justify-between">
            <span className="text-lg font-extrabold tabular-nums text-[#E8508A]">{swipeCount}</span>
            <span className="text-[15px] font-bold text-[#23282B]">השמות שעברתם עליהם</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-[#E7E1D4]">
            <div className="h-full rounded-full bg-[#E8508A] transition-all" style={{ width: `${progressPct}%` }} />
          </div>
          <p className="mt-2.5 text-center text-[12.5px] leading-snug text-[#8C8478]">
            רוב הזוגות מוצאים התאמה ראשונה אחרי כ-{FIRST_MATCH_TARGET} שמות
          </p>
        </div>

        <button
          onClick={() => navigate("/")}
          className="flex w-full items-center justify-center gap-2 rounded-[16px] bg-[#E8508A] py-4 text-[16px] font-extrabold text-white shadow-[0_12px_26px_-12px_rgba(232,80,138,.6)] transition-transform hover:scale-[1.02]"
        >
          המשיכו להחליק
          <ArrowLeft className="h-[18px] w-[18px]" />
        </button>
      </div>
    </div>
  );

  return (
    <NameListLayout
      title="התאמות"
      variant="match"
      names={displayMatches}
      bannerText="שניכם אוהבים את אלה!"
      emptyTitle="עדיין אין התאמות!"
      emptyText="המשיכו להחליק כדי למצוא שמות ששניכם אוהבים."
      ctaText="המשיכו להחליק"
      emptyState={emptyState}
    />
  );
};

export default Matches;
