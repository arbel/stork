import { memo } from "react";
import frame1 from "@/assets/loader-frame-1.png";
import frame2 from "@/assets/loader-frame-2.png";

interface StorkLoaderProps {
  message?: string;
  /** Character height in px. */
  size?: number;
  /** "light" for dark/green backgrounds, "dark" for light backgrounds. */
  tone?: "light" | "dark";
}

/**
 * Playful loading animation: two illustration frames that hop and switch while
 * hearts float up. Frames live in src/assets/loader-frame-{1,2}.svg.
 */
export const StorkLoader = memo(({ message = "מחפשים שמות יפים…", size = 96, tone = "light" }: StorkLoaderProps) => {
  const textColor = tone === "light" ? "rgba(255,255,255,0.95)" : "#4b5563";
  const dotColor = tone === "light" ? "rgba(255,255,255,0.95)" : "#9ca3af";

  return (
    <div className="stork-loader flex flex-col items-center gap-5" dir="rtl">
      <style>{`
        @keyframes stork-hop {
          0%, 100% { transform: translateY(0) rotate(-4deg); }
          50%      { transform: translateY(-22px) rotate(4deg); }
        }
        @keyframes stork-frameA { 0%, 49% { opacity: 1; } 50%, 100% { opacity: 0; } }
        @keyframes stork-frameB { 0%, 49% { opacity: 0; } 50%, 100% { opacity: 1; } }
        @keyframes stork-shadow {
          0%, 100% { transform: translateX(-50%) scaleX(1);   opacity: .26; }
          50%      { transform: translateX(-50%) scaleX(.55); opacity: .12; }
        }
        @keyframes stork-heart {
          0%   { transform: translateY(0) scale(.5);    opacity: 0; }
          25%  { opacity: .95; }
          100% { transform: translateY(-74px) scale(1); opacity: 0; }
        }
        @keyframes stork-dots { 0%, 80%, 100% { opacity: .2; } 40% { opacity: 1; } }
        @media (prefers-reduced-motion: reduce) {
          .stork-loader [style*="animation"] { animation: none !important; }
          .stork-loader .frame-b { opacity: 0; }
        }
      `}</style>

      <div className="relative" style={{ width: size, height: size + 18 }}>
        {/* Floating hearts */}
        <span className="absolute text-lg" style={{ left: 2, top: -6, animation: "stork-heart 2.2s ease-in infinite" }}>💛</span>
        <span className="absolute text-base" style={{ right: 2, top: -2, animation: "stork-heart 2.7s ease-in .8s infinite" }}>💙</span>
        <span className="absolute text-sm" style={{ left: "48%", top: -10, animation: "stork-heart 2.45s ease-in 1.3s infinite" }}>💗</span>

        {/* Character: two frames that hop and switch */}
        <div
          className="absolute inset-x-0 top-0 flex justify-center"
          style={{ height: size, animation: "stork-hop .9s cubic-bezier(.5,0,.5,1) infinite" }}
        >
          <img
            src={frame1}
            alt=""
            aria-hidden
            className="absolute"
            style={{ height: size, width: "auto", animation: "stork-frameA .9s steps(1) infinite" }}
          />
          <img
            src={frame2}
            alt=""
            aria-hidden
            className="absolute frame-b"
            style={{ height: size, width: "auto", animation: "stork-frameB .9s steps(1) infinite" }}
          />
        </div>

        {/* Ground shadow */}
        <div
          className="absolute rounded-[50%] bg-black"
          style={{ left: "50%", bottom: 0, width: size * 0.55, height: 8, animation: "stork-shadow .9s cubic-bezier(.5,0,.5,1) infinite" }}
        />
      </div>

      {message && (
        <div className="flex items-center gap-2">
          <span className="font-bold text-lg" style={{ color: textColor, fontFamily: "system-ui" }}>{message}</span>
          <span className="flex gap-1">
            <i className="w-1.5 h-1.5 rounded-full" style={{ background: dotColor, animation: "stork-dots 1.4s infinite" }} />
            <i className="w-1.5 h-1.5 rounded-full" style={{ background: dotColor, animation: "stork-dots 1.4s .2s infinite" }} />
            <i className="w-1.5 h-1.5 rounded-full" style={{ background: dotColor, animation: "stork-dots 1.4s .4s infinite" }} />
          </span>
        </div>
      )}
    </div>
  );
});

StorkLoader.displayName = "StorkLoader";
