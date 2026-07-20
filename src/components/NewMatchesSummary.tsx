import { useEffect, useState } from "react";
import { Heart } from "lucide-react";
import confetti from "canvas-confetti";
import { BabyName } from "@/contexts/SwipeContext";

const MAX_SHOWN = 6;

const nameColor = (n: BabyName) => {
  const male = n.maleOccurrences || 0;
  const female = n.femaleOccurrences || 0;
  const total = male + female;
  if (total === 0) return "#8DC53F";
  if ((male / total) * 100 >= 75) return "#65BADF";
  if ((female / total) * 100 >= 75) return "#EF5185";
  return "#8DC53F";
};

interface NewMatchesSummaryProps {
  names: BabyName[];
  onViewMatches: () => void;
  onClose: () => void;
}

/**
 * Shown on the swipe screen when 2+ matches happened since the user's last
 * visit (partner kept swiping while they were away). A single new match gets
 * the full MatchCelebration instead.
 */
export const NewMatchesSummary = ({ names, onViewMatches, onClose }: NewMatchesSummaryProps) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const t = window.setTimeout(() => {
      setIsVisible(true);
      confetti({
        particleCount: 90,
        spread: 100,
        origin: { y: 0.45, x: 0.5 },
        colors: ["#EF5185", "#65BADF", "#8DC53F", "#F7C948", "#37B6A6"],
        startVelocity: 40,
      });
    }, 100);
    return () => clearTimeout(t);
  }, []);

  const shown = names.slice(0, MAX_SHOWN);
  const extra = names.length - shown.length;

  const dismiss = (after: () => void) => {
    setIsVisible(false);
    setTimeout(after, 250);
  };

  return (
    <div
      dir="rtl"
      className={`fixed inset-0 z-[9999] flex items-center justify-center transition-opacity duration-300 ${
        isVisible ? "opacity-100" : "opacity-0"
      }`}
      style={{ fontFamily: "'Assistant', system-ui, sans-serif" }}
    >
      <div className="absolute inset-0 bg-gray-900/90" onClick={() => dismiss(onClose)} />

      <div className="relative z-10 mx-4 w-full max-w-sm rounded-3xl bg-white p-6 text-center shadow-2xl">
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 flex gap-1">
          <span className="text-2xl animate-bounce" style={{ animationDelay: "0s" }}>💕</span>
          <span className="text-3xl animate-bounce" style={{ animationDelay: "0.1s" }}>💖</span>
          <span className="text-2xl animate-bounce" style={{ animationDelay: "0.2s" }}>💕</span>
        </div>

        <h1 className="mt-4 mb-1 text-2xl font-extrabold text-[#2B2127]">
          יש לכם {names.length} התאמות חדשות! 🎉
        </h1>
        <p className="mb-5 text-[#6B515F]">בן/בת הזוג המשיכו להחליק מאז הביקור האחרון שלכם</p>

        <div className="mb-6 flex flex-wrap justify-center gap-2">
          {shown.map((n) => (
            <span
              key={n.name}
              className="rounded-full border border-[#F3DCE6] bg-[#FFF7FA] px-4 py-1.5 text-lg font-bold"
              style={{ color: nameColor(n) }}
            >
              {n.displayName || n.name}
            </span>
          ))}
          {extra > 0 && (
            <span className="rounded-full bg-[#F2EDF0] px-4 py-1.5 text-lg font-bold text-[#6B515F]">
              ‏+{extra} נוספות
            </span>
          )}
        </div>

        <button
          onClick={() => dismiss(onViewMatches)}
          className="mb-2 flex w-full items-center justify-center gap-2 rounded-full bg-[#E8508A] py-3.5 text-lg font-bold text-white shadow-lg transition-transform hover:scale-[1.03]"
        >
          <Heart className="h-5 w-5 fill-current" />
          לרשימת ההתאמות
        </button>
        <button
          onClick={() => dismiss(onClose)}
          className="w-full rounded-full py-2.5 font-semibold text-[#6B515F] hover:bg-[#F7F2F5]"
        >
          אחר כך
        </button>
      </div>
    </div>
  );
};
