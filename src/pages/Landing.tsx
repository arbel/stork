import { useState, useEffect, useRef, useCallback } from "react";
import { Heart, X } from "lucide-react";
import confetti from "canvas-confetti";
import storkWordmark from "@/assets/stork-logo.svg";
import { GenderDistributionBar } from "@/components/GenderDistributionBar";

const FONT = "'Assistant', system-ui, sans-serif";

const BG_QUILT = {
  backgroundImage: "url(/bg-base.png)",
  backgroundSize: "cover",
  backgroundPosition: "center",
} as const;

const NAME_COLORS: Record<string, string> = {
  girl: "#EF5185",
  boy: "#65BADF",
  uni: "#8DC53F",
};

interface DemoName {
  name: string;
  gender: "girl" | "boy" | "uni";
  meaning: string;
  originCategory: string;
  rank: number;
  group: string;
  malePct: number;
  action: "like" | "pass" | "match";
}

// Curated demo deck — real names with real meanings, scripted so the auto-play
// shows likes, passes, and a match payoff every 4th card.
const DEMO_NAMES: DemoName[] = [
  { name: "יעל", gender: "girl", meaning: "יעלת ההרים — חן, זריזות ועדינות", originCategory: "biblical", rank: 14, group: "בנות", malePct: 3, action: "like" },
  { name: "איתן", gender: "boy", meaning: "חזק, יציב ואיתן כסלע", originCategory: "biblical", rank: 7, group: "בנים", malePct: 97, action: "pass" },
  { name: "נועה", gender: "girl", meaning: "תנועה, חיים ורעננות", originCategory: "biblical", rank: 2, group: "בנות", malePct: 2, action: "like" },
  { name: "ארי", gender: "boy", meaning: "אריה — עוצמה ואומץ לב", originCategory: "modern", rank: 3, group: "בנים", malePct: 95, action: "match" },
  { name: "תמר", gender: "girl", meaning: "עץ התמר — יופי, גובה ויושר", originCategory: "nature", rank: 6, group: "בנות", malePct: 2, action: "like" },
  { name: "רוני", gender: "uni", meaning: "הרינה והשמחה שלי", originCategory: "virtue", rank: 21, group: "בנות", malePct: 48, action: "pass" },
  { name: "מיקה", gender: "girl", meaning: "מי כמוך באלים — ענווה וייחוד", originCategory: "modern", rank: 18, group: "בנות", malePct: 4, action: "like" },
  { name: "אורי", gender: "boy", meaning: "האור שלי", originCategory: "biblical", rank: 8, group: "בנים", malePct: 92, action: "match" },
];

const RIVER_NAMES: [string, "girl" | "boy" | "uni", string][] = [
  ["אביגיל", "girl", "שמחת האב"], ["לביא", "boy", "אריה צעיר"], ["שקד", "uni", "העץ הפורח ראשון"],
  ["אמילי", "girl", ""], ["יהונתן", "boy", "ה׳ נתן"], ["גפן", "uni", "סמל לשורשיות"],
  ["אביה", "girl", "ה׳ הוא אבי"], ["עידו", "boy", ""], ["אריאל", "uni", "אריה האל"],
  ["ליה", "girl", "שייכת לי"], ["דוד", "boy", "אהוב"], ["עומר", "uni", "אלומת תבואה"],
  ["הילה", "girl", "זוהר ואור"], ["רפאל", "boy", "האל ריפא"], ["טל", "uni", "רעננות הבוקר"],
  ["נעמי", "girl", "נעימה ונחמדה"], ["איתמר", "boy", "אי התמרים"], ["ים", "uni", ""],
];

const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

type DeckPhase = "idle" | "fly-left" | "fly-right" | "match" | "match-out";
type TintKind = "like" | "pass" | "match" | null;

const SMOOTH = "cubic-bezier(.4,0,.2,1)";
const BOUNCE = "cubic-bezier(.68,-.55,.265,1.55)";

interface DemoDeckProps {
  onFrontChange: (d: DemoName) => void;
  onTint: (kind: TintKind) => void;
  onUserMatch: () => void;
}

const DemoDeck = ({ onFrontChange, onTint, onUserMatch }: DemoDeckProps) => {
  const [idx, setIdx] = useState(0);
  const [phase, setPhase] = useState<DeckPhase>("idle");
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const stageRef = useRef<HTMLDivElement>(null);
  const phaseRef = useRef<DeckPhase>("idle");
  const idxRef = useRef(0);
  const visibleRef = useRef(true);
  const lastTouchRef = useRef(0);
  const manualLikesRef = useRef(0);
  const userMatchDoneRef = useRef(false);
  const timeoutsRef = useRef<number[]>([]);
  const startXRef = useRef(0);
  phaseRef.current = phase;
  idxRef.current = idx;

  const later = useCallback((fn: () => void, ms: number) => {
    timeoutsRef.current.push(window.setTimeout(fn, ms));
  }, []);

  useEffect(() => () => timeoutsRef.current.forEach(clearTimeout), []);

  useEffect(() => {
    onFrontChange(DEMO_NAMES[idx % DEMO_NAMES.length]);
  }, [idx, onFrontChange]);

  // Pause the auto-play while the deck is off screen.
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const io = new IntersectionObserver((entries) => {
      visibleRef.current = entries[0].isIntersecting;
    }, { threshold: 0.2 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const fireConfetti = useCallback(() => {
    if (prefersReducedMotion()) return;
    const rect = stageRef.current?.getBoundingClientRect();
    if (!rect) return;
    confetti({
      particleCount: 60,
      spread: 75,
      startVelocity: 28,
      origin: {
        x: (rect.left + rect.width / 2) / window.innerWidth,
        y: (rect.top + rect.height * 0.4) / window.innerHeight,
      },
      colors: ["#EF5185", "#65BADF", "#8DC53F", "#F7C948", "#ffffff"],
    });
  }, []);

  const advance = useCallback(() => {
    setIdx((i) => i + 1);
    setDragOffset(0);
    setPhase("idle");
  }, []);

  const doSwipe = useCallback((dir: "left" | "right") => {
    setPhase(dir === "right" ? "fly-right" : "fly-left");
    onTint(dir === "right" ? "like" : "pass");
    later(advance, prefersReducedMotion() ? 30 : 580);
  }, [advance, later, onTint]);

  const doMatch = useCallback((byUser: boolean) => {
    setPhase("match");
    onTint("match");
    fireConfetti();
    later(() => {
      setPhase("match-out");
      later(() => {
        advance();
        if (byUser && !userMatchDoneRef.current) {
          userMatchDoneRef.current = true;
          onUserMatch();
        }
      }, prefersReducedMotion() ? 30 : 480);
    }, prefersReducedMotion() ? 60 : 2100);
  }, [advance, fireConfetti, later, onTint, onUserMatch]);

  // Auto-play loop.
  useEffect(() => {
    if (prefersReducedMotion()) return;
    const iv = window.setInterval(() => {
      if (phaseRef.current !== "idle") return;
      if (!visibleRef.current) return;
      if (Date.now() - lastTouchRef.current < 7000) return;
      const act = DEMO_NAMES[idxRef.current % DEMO_NAMES.length].action;
      if (act === "match") doMatch(false);
      else doSwipe(act === "like" ? "right" : "left");
    }, 2700);
    return () => clearInterval(iv);
  }, [doMatch, doSwipe]);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (phaseRef.current !== "idle") return;
    setIsDragging(true);
    startXRef.current = e.clientX;
    lastTouchRef.current = Date.now();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    setDragOffset(e.clientX - startXRef.current);
  };

  const handlePointerUp = () => {
    if (!isDragging) return;
    setIsDragging(false);
    lastTouchRef.current = Date.now();
    const dx = dragOffset;
    if (Math.abs(dx) > 90) {
      if (dx > 0) {
        manualLikesRef.current += 1;
        // The visitor's 2nd manual like always lands a match — the designed "aha" moment.
        if (manualLikesRef.current >= 2 && !userMatchDoneRef.current) {
          setDragOffset(0);
          later(() => doMatch(true), 260);
          return;
        }
        doSwipe("right");
      } else {
        doSwipe("left");
      }
    } else {
      setDragOffset(0);
    }
  };

  const frontStyle = (): React.CSSProperties => {
    switch (phase) {
      case "fly-right":
        return { transform: "translate(520px,-20px) rotate(26deg)", opacity: 0.4, transition: `transform .55s ${SMOOTH}, opacity .5s` };
      case "fly-left":
        return { transform: "translate(-520px,-20px) rotate(-26deg)", opacity: 0.4, transition: `transform .55s ${SMOOTH}, opacity .5s` };
      case "match":
        return { transform: "scale(1.05)", transition: `transform .45s ${BOUNCE}` };
      case "match-out":
        return { transform: "translateY(-60px) scale(.95)", opacity: 0, transition: `transform .5s ${SMOOTH}, opacity .45s` };
      default:
        return isDragging
          ? { transform: `translateX(${dragOffset}px) rotate(${dragOffset * 0.08}deg)`, transition: "none" }
          : { transform: "translateX(0)", transition: "transform .2s ease-out" };
    }
  };

  const likeOpacity = isDragging && dragOffset > 40 ? Math.min(dragOffset / 110, 1) : phase === "fly-right" ? 1 : 0;
  const passOpacity = isDragging && dragOffset < -40 ? Math.min(-dragOffset / 110, 1) : phase === "fly-left" ? 1 : 0;
  const isMatching = phase === "match" || phase === "match-out";

  return (
    <div
      ref={stageRef}
      className="relative z-[2] w-[min(315px,76vw)] aspect-[4/5] touch-pan-y select-none"
      aria-label="הדגמה — גררו את הכרטיס ימינה או שמאלה"
    >
      {[2, 1, 0].map((pos) => {
        const d = DEMO_NAMES[(idx + pos) % DEMO_NAMES.length];
        const isFront = pos === 0;
        const backStyle: React.CSSProperties = {
          transform: `translateY(${pos * 16}px) scale(${1 - pos * 0.05})`,
          opacity: pos === 2 ? 0.92 : 1,
          transition: `transform .35s ${SMOOTH}`,
        };
        return (
          <div
            key={idx + pos}
            className={`absolute inset-0 bg-white border rounded-3xl shadow-2xl will-change-transform ${
              isFront ? "cursor-grab active:cursor-grabbing border-white/30" : "border-white/30"
            }`}
            style={{
              zIndex: 3 - pos,
              ...(isFront ? frontStyle() : backStyle),
              ...(isFront && isMatching
                ? { boxShadow: "0 0 0 3px #fff, 0 0 44px rgba(255,255,255,.75)" }
                : {}),
            }}
            onPointerDown={isFront ? handlePointerDown : undefined}
            onPointerMove={isFront ? handlePointerMove : undefined}
            onPointerUp={isFront ? handlePointerUp : undefined}
            onPointerCancel={isFront ? handlePointerUp : undefined}
          >
            <div className="flex flex-col h-full text-center relative p-2">
              <GenderDistributionBar
                maleOccurrences={d.malePct}
                femaleOccurrences={100 - d.malePct}
                displayName={d.name}
                showNameDisplay
                meaning={d.meaning}
                originCategory={d.originCategory}
                popularity={{ rank: d.rank, group: d.group }}
              />
              {isFront && (
                <>
                  <div className="absolute top-4 right-4 pointer-events-none" style={{ opacity: likeOpacity }}>
                    <Heart className={`w-16 h-16 text-[#8DC53F] fill-current ${phase === "fly-right" ? "animate-pulse" : ""}`} />
                  </div>
                  <div className="absolute top-4 left-4 pointer-events-none" style={{ opacity: passOpacity }}>
                    <X className={`w-16 h-16 text-[#EF5185] ${phase === "fly-left" ? "animate-pulse" : ""}`} strokeWidth={3} />
                  </div>
                  <div
                    className="absolute -top-[18px] left-1/2 -translate-x-1/2 bg-[#2B9C8E] text-white font-extrabold text-lg px-6 py-2 rounded-full whitespace-nowrap shadow-lg"
                    style={{
                      transform: `translateX(-50%) scale(${isMatching ? 1 : 0})`,
                      transition: `transform .5s ${BOUNCE}`,
                    }}
                  >
                    יש התאמה! 🎉
                  </div>
                </>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

/** Mini animated vignettes for the "how it works" steps. */
const MiniHeart = ({ className, color }: { className?: string; color: string }) => (
  <svg className={className} width="30" height="30" viewBox="0 0 24 24" fill={color}>
    <path d="M12 21s-7.5-4.7-10-9.3C.4 8.5 2.3 5 5.7 5c2 0 3.4 1.1 4.3 2.6h4C15 6.1 16.4 5 18.4 5c3.3 0 5.2 3.5 3.6 6.7C19.5 16.3 12 21 12 21z" />
  </svg>
);

const miniCardCls =
  "w-[66px] h-[84px] bg-white rounded-xl border border-[#F3DCE6] shadow-md flex items-center justify-center font-extrabold text-lg";

interface LandingProps {
  onStart: () => void;
}

const Landing = ({ onStart }: LandingProps) => {
  const [front, setFront] = useState<DemoName>(DEMO_NAMES[0]);
  const [tint, setTint] = useState<TintKind>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [showStickyCta, setShowStickyCta] = useState(false);
  const heroRef = useRef<HTMLElement>(null);
  const tintTimeoutRef = useRef<number>();

  const handleTint = useCallback((kind: TintKind) => {
    setTint(kind);
    clearTimeout(tintTimeoutRef.current);
    tintTimeoutRef.current = window.setTimeout(() => setTint(null), 750);
  }, []);

  const handleUserMatch = useCallback(() => setShowPrompt(true), []);

  // Sticky mobile CTA once the hero scrolls out of view.
  useEffect(() => {
    const el = heroRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => setShowStickyCta(!entries[0].isIntersecting),
      { threshold: 0.12 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Scroll reveals.
  useEffect(() => {
    const els = document.querySelectorAll(".landing-reveal");
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((en) => {
          if (en.isIntersecting) {
            en.target.classList.add("in");
            io.unobserve(en.target);
          }
        });
      },
      { threshold: 0.15 }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  useEffect(() => () => clearTimeout(tintTimeoutRef.current), []);

  const tintBg =
    tint === "like"
      ? "radial-gradient(60% 55% at 50% 45%, rgba(141,197,63,.32), transparent 70%)"
      : tint === "pass"
      ? "radial-gradient(60% 55% at 50% 45%, rgba(239,81,133,.30), transparent 70%)"
      : tint === "match"
      ? "radial-gradient(60% 55% at 50% 45%, rgba(255,255,255,.35), transparent 70%)"
      : "none";

  const ctaButton = (extra = "") => (
    <button
      onClick={onStart}
      className={`inline-block border-none cursor-pointer font-bold text-xl text-white px-11 py-4 rounded-full transition-transform duration-300 hover:scale-105 shadow-[0_10px_26px_-8px_rgba(200,30,90,.5)] bg-gradient-to-br from-[#E8508A] to-[#F2A0BF] ${extra}`}
      style={{ fontFamily: FONT }}
    >
      מתחילים עכשיו
    </button>
  );

  const riverRow = (items: typeof RIVER_NAMES, reverse: boolean) => {
    const doubled = [...items, ...items];
    return (
      <div
        className="flex gap-3 w-max"
        style={{
          animation: `landing-slide ${reverse ? "58s" : "44s"} linear infinite ${reverse ? "reverse" : ""}`,
        }}
      >
        {doubled.map(([name, gender, meaning], i) => (
          <span
            key={i}
            dir="rtl"
            className="bg-white border border-[#F3DCE6] rounded-full px-4 py-2 whitespace-nowrap flex items-baseline gap-2 shadow-sm"
          >
            <b className="text-lg font-extrabold" style={{ color: NAME_COLORS[gender] }}>{name}</b>
            {meaning && <span className="text-sm text-[#6B515F]">{meaning}</span>}
          </span>
        ))}
      </div>
    );
  };

  return (
    <div dir="rtl" className="min-h-screen bg-[#FFF9FB] text-[#2B2127] overflow-x-hidden" style={{ fontFamily: FONT }}>
      {/* ===== Top band: header + hero on the app's teal quilt ===== */}
      <div className="rounded-b-[36px] relative overflow-hidden pb-9" style={BG_QUILT}>
        <header className="flex justify-center pt-6 pb-1">
          <img src={storkWordmark} alt="Stork" className="h-[52px] w-auto drop-shadow" />
        </header>

        <section ref={heroRef} className="relative pt-3 pb-8">
          <div
            className="absolute -inset-x-0 -top-32 bottom-0 pointer-events-none transition-opacity duration-500"
            style={{ background: tintBg, opacity: tint ? 1 : 0 }}
          />
          <div className="relative max-w-[1060px] mx-auto px-6 grid gap-7 items-center md:grid-cols-2 md:gap-5">
            <div className="text-center md:text-right text-white relative z-[3]">
              <h1
                className="font-extrabold m-0 mb-4 text-[clamp(2.5rem,6.5vw,3.7rem)] leading-[1.16] tracking-tight"
                style={{ textShadow: "0 2px 10px rgba(20,80,70,.25)", textWrap: "balance" } as React.CSSProperties}
              >
                אולי{" "}
                <span
                  className="underline decoration-[6px] underline-offset-8 transition-colors duration-300"
                  style={{ textDecorationColor: NAME_COLORS[front.gender] }}
                >
                  {front.name}
                </span>
                ?
                <br />
                את השם בוחרים ביחד.
              </h1>
              <p className="text-white/95 text-[clamp(1.05rem,2.4vw,1.2rem)] max-w-[44ch] mx-auto md:mx-0 mb-7">
                מחליקים על שמות שאתם אוהבים, מזמינים את בן או בת הזוג — וכשתשניכם בוחרים את אותו שם, יש התאמה 🎉
              </p>
              {ctaButton()}
            </div>

            <div className="relative min-h-[470px] flex items-end justify-center">
              <DemoDeck onFrontChange={setFront} onTint={handleTint} onUserMatch={handleUserMatch} />
              <button
                onClick={onStart}
                className="absolute -bottom-11 left-1/2 -translate-x-1/2 z-[4] bg-white text-[#2B9C8E] font-bold text-[.95rem] px-6 py-2.5 rounded-full shadow-lg whitespace-nowrap"
                style={{
                  transform: `translateX(-50%) scale(${showPrompt ? 1 : 0})`,
                  transition: `transform .5s ${BOUNCE}`,
                  fontFamily: FONT,
                }}
              >
                אהבתם? מתחילים עכשיו ✨
              </button>
            </div>
          </div>
        </section>
      </div>

      <main>
        {/* ===== How it works ===== */}
        <section className="max-w-[1060px] mx-auto px-6 py-16">
          <h2 className="landing-reveal text-center font-extrabold m-0 mb-2.5 text-[clamp(1.7rem,4.2vw,2.3rem)]">
            איך זה עובד?
          </h2>
          <p className="landing-reveal text-center text-[#6B515F] mx-auto mb-10 max-w-[52ch] text-lg">
            שלושה צעדים בין "אין לנו כיוון" ל"יש לנו שם".
          </p>
          <div className="grid gap-5 md:grid-cols-3">
            <div className="landing-reveal bg-white border border-[#F3DCE6] rounded-[22px] p-6 text-center relative shadow-sm">
              <div className="h-[120px] relative flex items-center justify-center">
                <div className={`${miniCardCls} absolute translate-y-2 scale-[.92] opacity-60`}>נועה</div>
                <div className={`${miniCardCls} relative landing-toss`} style={{ color: "#65BADF" }}>ארי</div>
                <MiniHeart className="absolute top-3 right-6 landing-heartpop" color="#8DC53F" />
              </div>
              <h3 className="mt-3 mb-1.5 text-xl font-extrabold">מחליקים</h3>
              <p className="m-0 text-[#6B515F]">עוברים על אלפי שמות — לייק ימינה, דיסלייק שמאלה. לבד, בקצב שלכם.</p>
            </div>

            <div className="landing-reveal bg-white border-2 border-[#F2A0BF] rounded-[22px] p-6 text-center relative shadow-sm">
              <span className="absolute -top-[13px] left-1/2 -translate-x-1/2 bg-[#E8508A] text-white text-xs font-bold px-3.5 py-1 rounded-full whitespace-nowrap">
                הקסם קורה כאן
              </span>
              <div className="h-[120px] relative flex items-center justify-center">
                <div className="flex gap-7 items-center">
                  <div className={miniCardCls} style={{ color: "#EF5185" }}>תמר</div>
                  <div className={miniCardCls} style={{ color: "#EF5185" }}>תמר</div>
                </div>
                <span
                  dir="ltr"
                  className="absolute bottom-1 bg-pink-50 border border-dashed border-[#F2A0BF] text-[#C2497A] text-xs font-bold px-3 py-1 rounded-full landing-linkpulse"
                >
                  stork-app.com/join/♥
                </span>
              </div>
              <h3 className="mt-3 mb-1.5 text-xl font-extrabold">מזמינים</h3>
              <p className="m-0 text-[#6B515F]">שולחים קישור לבן או בת הזוג — הם מצטרפים בלחיצה ומחליקים בעצמם.</p>
            </div>

            <div className="landing-reveal bg-white border border-[#F3DCE6] rounded-[22px] p-6 text-center relative shadow-sm">
              <div className="h-[120px] relative flex items-center justify-center">
                <div className="relative">
                  <div className="flex gap-0.5 items-center">
                    <div className={`${miniCardCls} -rotate-[9deg] -translate-x-[9px]`} style={{ color: "#8DC53F" }}>רוני</div>
                    <div className={`${miniCardCls} rotate-[9deg] translate-x-[9px]`} style={{ color: "#8DC53F" }}>רוני</div>
                  </div>
                  <MiniHeart className="absolute -top-2 left-1/2 -translate-x-1/2 landing-heartbeat" color="#37B6A6" />
                  <span className="absolute w-[7px] h-[7px] rounded-sm bg-[#F7C948] -top-1 left-1.5 rotate-[20deg]" />
                  <span className="absolute w-[7px] h-[7px] rounded-sm bg-[#EF5185] top-3.5 -right-2 -rotate-[15deg]" />
                  <span className="absolute w-[7px] h-[7px] rounded-sm bg-[#65BADF] -bottom-0.5 -left-2.5 rotate-45" />
                </div>
              </div>
              <h3 className="mt-3 mb-1.5 text-xl font-extrabold">מתאימים</h3>
              <p className="m-0 text-[#6B515F]">אהבתם את אותו שם? יש התאמה 🎉 הרשימה המשותפת נבנית מעצמה.</p>
            </div>
          </div>
        </section>

        {/* ===== Name river ===== */}
        <section className="pt-14 pb-16">
          <div className="max-w-[1060px] mx-auto px-6">
            <h2 className="landing-reveal text-center font-extrabold m-0 mb-2.5 text-[clamp(1.7rem,4.2vw,2.3rem)]">
              ‏5,780 שמות אמיתיים מנתוני הלמ״ס
            </h2>
            <p className="landing-reveal text-center text-[#6B515F] mx-auto mb-0 max-w-[52ch] text-lg">
              עם משמעות, מקור ומדד פופולריות לכל שם.
            </p>
          </div>
          <div
            dir="ltr"
            className="overflow-hidden mt-8 grid gap-3.5"
            style={{ maskImage: "linear-gradient(90deg, transparent, #000 8%, #000 92%, transparent)" }}
            aria-hidden="true"
          >
            {riverRow(RIVER_NAMES.filter((_, i) => i % 2 === 0), false)}
            {riverRow(RIVER_NAMES.filter((_, i) => i % 2 === 1), true)}
          </div>
        </section>

        {/* ===== Match moment ===== */}
        <section
          className="text-white text-center relative overflow-hidden rounded-t-[36px] pt-16 pb-20"
          style={{
            background:
              "radial-gradient(80% 90% at 50% 10%, rgba(94,214,198,.9), transparent 60%), linear-gradient(165deg, #53CCBF, #35AB9C)",
          }}
        >
          {/* floating confetti */}
          {[
            { bg: "#F7C948", style: { top: "14%", left: "12%", ["--r" as string]: "20deg" } },
            { bg: "#EF5185", style: { top: "26%", left: "22%", animationDelay: "-1.2s", ["--r" as string]: "-30deg" } },
            { bg: "#8DC53F", style: { top: "12%", right: "16%", animationDelay: "-2.1s", ["--r" as string]: "45deg" } },
            { bg: "#65BADF", style: { top: "34%", right: "8%", animationDelay: "-.6s", ["--r" as string]: "-15deg" } },
            { bg: "#fff", style: { bottom: "20%", left: "8%", animationDelay: "-3s", ["--r" as string]: "10deg" } },
            { bg: "#F7C948", style: { bottom: "14%", right: "24%", animationDelay: "-1.8s", ["--r" as string]: "-40deg" } },
          ].map((p, i) => (
            <span
              key={i}
              className="absolute w-[11px] h-[15px] rounded-[3px] landing-floaty pointer-events-none"
              style={{ background: p.bg, ...p.style }}
            />
          ))}
          {[
            { top: "18%", left: "34%", animationDelay: "-.9s" },
            { top: "10%", right: "36%", animationDelay: "-2.5s" },
            { bottom: "16%", left: "44%", animationDelay: "-1.5s" },
          ].map((s, i) => (
            <span key={i} className="absolute text-lg text-white landing-floaty pointer-events-none" style={s}>✦</span>
          ))}

          <div className="max-w-[1060px] mx-auto px-6">
            <div className="landing-reveal inline-block bg-white text-[#2B9C8E] font-extrabold text-lg px-6 py-2.5 rounded-full shadow-lg mb-7 -rotate-2">
              יש התאמה! 🎉
            </div>
            <h2
              className="landing-reveal font-extrabold m-0 mb-2.5 text-[clamp(1.7rem,4.2vw,2.3rem)]"
              style={{ textShadow: "0 2px 10px rgba(20,80,70,.3)" }}
            >
              כשהלב של שניכם אומר את אותו שם — אתם תדעו.
            </h2>
            <p className="landing-reveal text-white/90 mx-auto mb-10 max-w-[52ch] text-lg">
              כל התאמה נחגגת עם קונפטי, ונשמרת ברשימה המשותפת שלכם.
            </p>
            <div className="landing-reveal relative flex justify-center items-center min-h-[240px]">
              <div className="w-[156px] h-[194px] bg-white rounded-2xl shadow-2xl flex flex-col items-center justify-center gap-1.5 text-[#2B2127] z-[1]" style={{ transform: "rotate(-8deg) translateX(-20px)" }}>
                <span className="text-4xl font-bold text-[#EF5185]" style={{ fontFamily: "system-ui" }}>אלה</span>
                <span className="text-xs text-[#6B515F] font-semibold">הלייק שלך</span>
              </div>
              <div className="absolute z-[3] -top-1.5 left-1/2 -translate-x-1/2 w-[74px] h-[74px] rounded-full bg-white flex items-center justify-center shadow-xl landing-heartbeat">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="#EF5185">
                  <path d="M12 21s-7.5-4.7-10-9.3C.4 8.5 2.3 5 5.7 5c2 0 3.4 1.1 4.3 2.6h4C15 6.1 16.4 5 18.4 5c3.3 0 5.2 3.5 3.6 6.7C19.5 16.3 12 21 12 21z" />
                </svg>
              </div>
              <div className="w-[156px] h-[194px] bg-white rounded-2xl shadow-2xl flex flex-col items-center justify-center gap-1.5 text-[#2B2127] z-[2]" style={{ transform: "rotate(8deg) translateX(20px)" }}>
                <span className="text-4xl font-bold text-[#EF5185]" style={{ fontFamily: "system-ui" }}>אלה</span>
                <span className="text-xs text-[#6B515F] font-semibold">הלייק של בן הזוג</span>
              </div>
            </div>
          </div>
        </section>

        {/* ===== Final CTA on teal ===== */}
        <div style={BG_QUILT}>
          <section className="relative py-20 px-6">
            <div className="landing-reveal relative bg-white rounded-[28px] shadow-2xl max-w-[620px] mx-auto text-center px-8 py-12 z-[2]">
              <h2 className="font-extrabold m-0 mb-6 text-[clamp(1.8rem,4.5vw,2.4rem)]" style={{ textWrap: "balance" } as React.CSSProperties}>
                השם הבא יכול להיות זה.
              </h2>
              {ctaButton()}
              <p className="mt-4 mb-0 text-[#6B515F]">ואז שולחים הזמנה — כי שם בוחרים ביחד 💛</p>
            </div>
          </section>
        </div>
      </main>

      {/* ===== Footer ===== */}
      <footer className="bg-[#2B2127] py-8 text-[#BFA8B4] text-sm">
        <div className="max-w-[1060px] mx-auto px-6 flex flex-wrap gap-4 items-center justify-between">
          <img src={storkWordmark} alt="Stork" className="h-8 w-auto" />
          <span>נבנה באהבה בישראל 🍼</span>
        </div>
      </footer>

      {/* ===== Sticky mobile CTA ===== */}
      <button
        onClick={onStart}
        className="fixed bottom-3.5 inset-x-3.5 z-50 md:hidden text-white border-none rounded-full py-4 font-bold text-lg cursor-pointer bg-gradient-to-br from-[#E8508A] to-[#F2A0BF] shadow-[0_10px_30px_-8px_rgba(200,30,90,.65)]"
        style={{
          transform: showStickyCta ? "none" : "translateY(90px)",
          transition: `transform .45s ${BOUNCE}`,
          fontFamily: FONT,
        }}
      >
        מתחילים עכשיו
      </button>
    </div>
  );
};

export default Landing;
