import { useRef, useState } from "react";
import { Star, Sparkles, Heart, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { BabyName } from "@/contexts/SwipeContext";
import { ORIGIN_LABELS } from "./GenderDistributionBar";
import { BoyIcon } from "./icons/BoyIcon";
import { GirlIcon } from "./icons/GirlIcon";

export type NameListVariant = "match" | "liked" | "passed";

// Per-list accent colour + corner badge icon.
const VARIANTS: Record<
  NameListVariant,
  { accent: string; soft: string; Icon: typeof Heart; filled: boolean }
> = {
  match: { accent: "#5CC1B6", soft: "rgba(92,193,182,0.14)", Icon: Sparkles, filled: false },
  liked: { accent: "#22C55E", soft: "rgba(34,197,94,0.14)", Icon: Heart, filled: true },
  passed: { accent: "#EF5185", soft: "rgba(239,81,133,0.14)", Icon: X, filled: false },
};

// Name colour: dominated (≥75%) → blue/pink, otherwise unisex green. Mirrors the swipe card.
const nameColorFor = (male: number, female: number, gender?: string) => {
  const total = male + female;
  if (total > 0) {
    if ((male / total) * 100 >= 75) return "#65BADF";
    if ((female / total) * 100 >= 75) return "#EF5185";
    return "#8DC53F";
  }
  if (gender === "male") return "#65BADF";
  if (gender === "female") return "#EF5185";
  return "#8DC53F";
};

// Drag distance that commits a decision change (same physical directions as the deck:
// right = like, left = pass).
const SWIPE_THRESHOLD = 90;

export const NameListCard = ({
  name,
  variant,
  onDecision,
}: {
  name: BabyName;
  variant: NameListVariant;
  /** When set, the card can be swiped horizontally to re-decide (right = like, left = pass). */
  onDecision?: (action: "like" | "pass") => void;
}) => {
  const { accent, soft, Icon, filled } = VARIANTS[variant];
  const male = name.maleOccurrences || 0;
  const female = name.femaleOccurrences || 0;
  const total = male + female;
  const malePct = total > 0 ? Math.round((male / total) * 100) : 0;
  const femalePct = total > 0 ? Math.round((female / total) * 100) : 0;
  const nameColor = nameColorFor(male, female, name.gender);
  const originLabel = name.originCategory ? ORIGIN_LABELS[name.originCategory] : undefined;

  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [leaving, setLeaving] = useState<"left" | "right" | null>(null);
  const start = useRef<{ x: number; y: number } | null>(null);

  const actionFor = (dir: "left" | "right") => (dir === "right" ? "like" : "pass");
  // The direction that would re-apply the card's current list is a no-op — it only
  // rubber-bands. Only the opposite direction commits.
  const isActionable = (dir: "left" | "right") =>
    !!onDecision && actionFor(dir) !== (variant === "liked" ? "like" : "pass");

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!onDecision || leaving) return;
    start.current = { x: e.clientX, y: e.clientY };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!start.current || leaving) return;
    const dx = e.clientX - start.current.x;
    const dy = e.clientY - start.current.y;

    if (!dragging) {
      // Decide intent: clearly horizontal → drag; clearly vertical → leave it to the scroller.
      if (Math.abs(dx) > 12 && Math.abs(dx) > Math.abs(dy) * 1.4) {
        setDragging(true);
        e.currentTarget.setPointerCapture(e.pointerId);
      } else {
        if (Math.abs(dy) > 14) start.current = null;
        return;
      }
    }

    const dir: "left" | "right" = dx > 0 ? "right" : "left";
    setDragX(isActionable(dir) ? dx : dx * 0.25);
  };

  const handlePointerEnd = () => {
    if (!start.current) return;
    start.current = null;
    if (!dragging) return;
    setDragging(false);

    const dir: "left" | "right" = dragX > 0 ? "right" : "left";
    if (Math.abs(dragX) > SWIPE_THRESHOLD && isActionable(dir)) {
      setLeaving(dir);
      setDragX(dir === "right" ? window.innerWidth : -window.innerWidth);
      setTimeout(() => onDecision!(actionFor(dir)), 260);
    } else {
      setDragX(0);
    }
  };

  const activeDir: "left" | "right" | null = dragX > 0 ? "right" : dragX < 0 ? "left" : null;
  const hintOpacity =
    activeDir && isActionable(activeDir) ? Math.min(Math.abs(dragX) / SWIPE_THRESHOLD, 1) : 0;

  return (
    <div
      className="relative select-none"
      style={{
        transform: `translateX(${dragX}px) rotate(${dragX / 60}deg)`,
        transition: dragging ? "none" : "transform 0.26s ease, opacity 0.26s ease",
        opacity: leaving ? 0 : 1,
        touchAction: onDecision ? "pan-y" : undefined,
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerEnd}
      onPointerCancel={handlePointerEnd}
    >
      <Card className="rounded-[22px] border border-black/[0.05] bg-white p-5 shadow-[0_2px_4px_rgba(0,0,0,0.04),0_12px_28px_-16px_rgba(0,0,0,0.22)]">
        {/* Top row: name + badge on the right, origin chip on the left */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <h3
              className="truncate text-[28px] font-extrabold leading-[1.15]"
              style={{ color: nameColor, fontFamily: "system-ui" }}
            >
              {name.displayName || name.name}
            </h3>
            <div
              className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full"
              style={{ background: soft }}
            >
              <Icon
                className="h-[18px] w-[18px]"
                style={{ color: accent }}
                fill={filled ? "currentColor" : "none"}
                strokeWidth={filled ? 2 : 2.5}
              />
            </div>
          </div>
          {originLabel && (
            <div className="flex flex-shrink-0 items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
              <Star className="h-3 w-3" strokeWidth={2} />
              {originLabel}
            </div>
          )}
        </div>

        {/* Meaning */}
        {name.meaning && (
          <p className="mt-2.5 line-clamp-2 text-sm leading-relaxed text-gray-600">"{name.meaning}"</p>
        )}

        {/* Gender distribution */}
        {total > 0 && (
          <div className="mt-4 flex items-center gap-2.5">
            <div className="flex flex-shrink-0 items-center gap-1.5">
              <GirlIcon className="h-6 w-6" />
              <span className="text-sm font-bold text-[#f0abcd]">{femalePct}%</span>
            </div>
            <div className="flex h-2.5 flex-1 overflow-hidden rounded-full bg-slate-100">
              {femalePct > 0 && <div className="bg-[#f0abcd]" style={{ width: `${femalePct}%` }} />}
              {malePct > 0 && <div className="bg-[#7fb3d5]" style={{ width: `${malePct}%` }} />}
            </div>
            <div className="flex flex-shrink-0 items-center gap-1.5">
              <span className="text-sm font-bold text-[#7fb3d5]">{malePct}%</span>
              <BoyIcon className="h-6 w-6" />
            </div>
          </div>
        )}
      </Card>

      {/* Drag hint: heart when dragging toward like, X toward pass — fades in with distance */}
      {hintOpacity > 0 && (
        <div
          className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-[22px]"
          style={{
            opacity: hintOpacity,
            background: activeDir === "right" ? "rgba(34,197,94,0.12)" : "rgba(239,81,133,0.12)",
          }}
        >
          <div
            className="flex h-16 w-16 items-center justify-center rounded-full bg-white shadow-lg"
            style={{ color: activeDir === "right" ? "#22C55E" : "#EF5185" }}
          >
            {activeDir === "right" ? (
              <Heart className="h-8 w-8" fill="currentColor" strokeWidth={1.5} />
            ) : (
              <X className="h-8 w-8" strokeWidth={2.5} />
            )}
          </div>
        </div>
      )}
    </div>
  );
};
