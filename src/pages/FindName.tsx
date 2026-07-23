import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Search, Heart, Check } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useSwipe, BabyName } from "@/contexts/SwipeContext";
import { searchActiveNames } from "@/lib/nameQueries";
import { ORIGIN_LABELS } from "@/components/GenderDistributionBar";
import { MatchCelebration } from "@/components/MatchCelebration";

const FONT = "'Assistant', system-ui, sans-serif";

// Same 75%-threshold coloring the swipe card uses.
const nameColor = (n: BabyName) => {
  const m = n.maleOccurrences || 0;
  const f = n.femaleOccurrences || 0;
  const total = m + f;
  if (total > 0) {
    if (m / total >= 0.75) return '#65BADF';
    if (f / total >= 0.75) return '#EF5185';
    return '#8DC53F';
  }
  return n.gender === 'male' ? '#65BADF' : n.gender === 'female' ? '#EF5185' : '#8DC53F';
};

const FindName = () => {
  const navigate = useNavigate();
  const { addLikedName, addMatch, partnerLikes, likedNames, matches } = useSwipe();

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<BabyName[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [matchedName, setMatchedName] = useState<BabyName | null>(null);

  const likedSet = useMemo(() => new Set(likedNames.map((n) => n.name)), [likedNames]);
  const matchSet = useMemo(() => new Set(matches.map((n) => n.name)), [matches]);

  const trimmed = query.trim();

  // Debounced search; only fires at 2+ characters.
  useEffect(() => {
    if (trimmed.length < 2) {
      setResults([]);
      setSearched(false);
      setLoading(false);
      return;
    }
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const r = await searchActiveNames(trimmed);
        setResults(r);
        setSearched(true);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [trimmed]);

  const handleLike = (name: BabyName) => {
    if (likedSet.has(name.name)) {
      toast({ title: "כבר אהבתם את השם הזה 💚", duration: 1500 });
      return;
    }
    // Partner already liked it → it's a match. The celebration commits the like on continue,
    // mirroring the swipe deck's behavior.
    if (partnerLikes.includes(name.name)) {
      setMatchedName(name);
      return;
    }
    addLikedName(name);
    toast({ title: `${name.displayName || name.name} נוסף לרשימה שלכם 💚`, duration: 1800 });
  };

  const handleMatchContinue = () => {
    if (matchedName) {
      addLikedName(matchedName);
      addMatch(matchedName);
      setMatchedName(null);
    }
  };

  return (
    <div
      className="h-[100dvh] flex flex-col"
      style={{ backgroundImage: 'url(/bg-base.webp)', backgroundSize: 'cover', backgroundPosition: 'center', fontFamily: FONT }}
    >
      {/* Header */}
      <div className="shrink-0 p-4 flex items-center justify-between">
        <button onClick={() => navigate('/')} className="p-2 text-white hover:bg-white/10 rounded-lg" aria-label="חזרה">
          <ArrowRight className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-bold text-white flex-1 text-center mx-4">חיפוש שם</h1>
        <div className="w-9" />
      </div>

      {/* Search box */}
      <div className="shrink-0 px-4">
        <div className="max-w-md mx-auto relative">
          <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="הקלידו שם (2 אותיות לפחות)"
            autoFocus
            className="w-full rounded-2xl bg-white pr-12 pl-4 py-4 text-[16px] font-medium text-[#23282B] placeholder:text-[#B4B4B4] outline-none shadow-lg"
          />
        </div>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-6">
        <div className="max-w-md mx-auto space-y-2.5">
          {trimmed.length > 0 && trimmed.length < 2 && (
            <p className="text-center text-white/90 font-semibold pt-8">הקלידו לפחות 2 אותיות</p>
          )}
          {loading && <p className="text-center text-white/90 font-semibold pt-8">מחפשים…</p>}
          {!loading && searched && results.length === 0 && (
            <p className="text-center text-white/90 font-semibold pt-8">לא נמצאו שמות תואמים</p>
          )}

          {results.map((n) => {
            const liked = likedSet.has(n.name);
            const matched = matchSet.has(n.name);
            const originLabel = n.originCategory ? ORIGIN_LABELS[n.originCategory] : undefined;
            return (
              <div key={n.name} className="flex items-center gap-3 bg-white rounded-2xl px-4 py-3 shadow">
                <div className="flex-1 min-w-0 text-start">
                  <div className="flex items-center gap-2">
                    <span className="text-[20px] font-extrabold leading-tight" style={{ color: nameColor(n) }}>
                      {n.displayName || n.name}
                    </span>
                    {matched && (
                      <span className="text-[11px] font-bold text-[#5CC1B6] bg-[#5CC1B6]/15 rounded-full px-2 py-0.5">
                        מאצ'
                      </span>
                    )}
                  </div>
                  {n.meaning && <div className="text-[13px] text-gray-600 leading-snug truncate">{n.meaning}</div>}
                  {originLabel && <div className="text-[11px] font-semibold text-slate-500 mt-0.5">{originLabel}</div>}
                </div>
                <button
                  onClick={() => handleLike(n)}
                  aria-label={liked ? "כבר אהבתם" : "אהבתי"}
                  className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 transition-transform hover:scale-110 ${
                    liked ? 'bg-[#8DC53F]' : 'bg-gray-100'
                  }`}
                >
                  {liked ? <Check className="w-6 h-6 text-white" /> : <Heart className="w-6 h-6 text-[#8DC53F]" />}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {matchedName && <MatchCelebration matchedName={matchedName} onContinue={handleMatchContinue} />}
    </div>
  );
};

export default FindName;
