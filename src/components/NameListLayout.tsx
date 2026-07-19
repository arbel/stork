import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Search, Sparkles, Heart, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { BabyName } from "@/contexts/SwipeContext";
import { NameListCard, NameListVariant } from "./NameListCard";

const VARIANT_META: Record<NameListVariant, { accent: string; Icon: typeof Heart; filled: boolean }> = {
  match: { accent: "#5CC1B6", Icon: Sparkles, filled: false },
  liked: { accent: "#22C55E", Icon: Heart, filled: true },
  passed: { accent: "#EF5185", Icon: X, filled: false },
};

interface NameListLayoutProps {
  title: string;
  variant: NameListVariant;
  names: BabyName[];
  bannerText: string;
  emptyTitle: string;
  emptyText: string;
  ctaText: string;
}

export const NameListLayout = ({
  title,
  variant,
  names,
  bannerText,
  emptyTitle,
  emptyText,
  ctaText,
}: NameListLayoutProps) => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const { accent, Icon, filled } = VARIANT_META[variant];

  const filtered = names.filter(
    (n) =>
      n.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (n.displayName && n.displayName.includes(searchQuery))
  );

  return (
    <div
      className="h-screen overflow-y-auto smooth-scroll"
      style={{
        backgroundImage: "url(/bg-base.png)",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundAttachment: "fixed",
      }}
    >
      {/* Sticky title bar */}
      <div className="sticky top-0 z-50 px-3 py-3">
        <div className="mx-auto flex max-w-md items-center justify-between">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/")}
            className="h-11 w-11 rounded-full text-white hover:bg-white/15"
          >
            <ArrowRight className="!h-6 !w-6" />
          </Button>
          <h1 className="flex-1 truncate text-center text-xl font-bold text-white">{title}</h1>
          <div className="w-11" />
        </div>
      </div>

      {names.length > 0 ? (
        <div className="mx-auto max-w-md px-4 pb-10">
          {/* Subtitle + count */}
          <p className="mb-4 text-center text-[15px] font-bold text-white/90">
            {bannerText} · {names.length}
          </p>

          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <Input
              type="text"
              placeholder="חיפוש שמות..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-12 rounded-2xl border-0 bg-white pr-12 text-base shadow-[0_6px_20px_-10px_rgba(0,0,0,0.35)] focus-visible:ring-2 focus-visible:ring-white/60"
            />
          </div>

          {/* Cards */}
          {filtered.length > 0 ? (
            <div className="space-y-4">
              {filtered.map((name, i) => (
                <NameListCard key={`${variant}-${name.name}-${i}`} name={name} variant={variant} />
              ))}
            </div>
          ) : (
            <div className="py-10 text-center">
              <p className="text-white/90">אין שמות שתואמים את החיפוש.</p>
            </div>
          )}
        </div>
      ) : (
        /* Empty state */
        <div className="mx-auto max-w-md px-6 py-20 text-center">
          <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-white shadow-[0_10px_30px_-12px_rgba(0,0,0,0.4)]">
            <Icon
              className="h-12 w-12"
              style={{ color: accent }}
              fill={filled ? "currentColor" : "none"}
              strokeWidth={filled ? 1.5 : 2}
            />
          </div>
          <h3 className="mb-3 text-2xl font-bold text-white">{emptyTitle}</h3>
          <p className="mb-8 text-lg text-white/85">{emptyText}</p>
          <Button
            onClick={() => navigate("/")}
            className="h-12 rounded-full px-8 text-base font-bold text-white shadow-lg transition-transform hover:scale-105"
            style={{ background: accent }}
          >
            {ctaText}
          </Button>
        </div>
      )}
    </div>
  );
};
