import { Star } from "lucide-react";
import { BoyIcon } from "./icons/BoyIcon";
import { GirlIcon } from "./icons/GirlIcon";

interface GenderDistributionBarProps {
  maleOccurrences: number;
  femaleOccurrences: number;
  displayName?: string;
  showNameDisplay?: boolean;
  originCategory?: string;
  meaning?: string;
  popularity?: { rank: number; group: string } | null;
}

// Hebrew labels for the generated origin_category slugs. "uncertain" intentionally has no tag.
export const ORIGIN_LABELS: Record<string, string> = {
  biblical: "שם מקראי",
  nature: "מעולם הטבע",
  virtue: "תכונה ורגש",
  geographic: "שם מקום",
  modern: "עברי מודרני",
  foreign: "מקור לועזי",
};

export const GenderDistributionBar = ({
  maleOccurrences,
  femaleOccurrences,
  displayName,
  showNameDisplay = false,
  originCategory,
  meaning,
  popularity = null
}: GenderDistributionBarProps) => {
  const total = maleOccurrences + femaleOccurrences;
  
  if (total === 0) {
    return <div className="text-sm text-muted-foreground">No data</div>;
  }
  
  const malePercentage = Math.round((maleOccurrences / total) * 100);
  const femalePercentage = Math.round((femaleOccurrences / total) * 100);
  
  // Determine name color based on 75% threshold
  const getNameColor = () => {
    if (malePercentage >= 75) return '#65BADF'; // Male blue
    if (femalePercentage >= 75) return '#EF5185'; // Female pink
    return '#8DC53F'; // Unisex green
  };
  
  const originLabel = originCategory ? ORIGIN_LABELS[originCategory] : undefined;

  if (showNameDisplay) {
    return (
      <div className="w-full h-full flex flex-col">
        {/* Name + origin tag + meaning - centered in card */}
        {displayName && (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 px-6 min-h-0">
            <h2
              className="text-5xl sm:text-6xl font-bold"
              style={{ color: getNameColor(), fontFamily: 'system-ui' }}
            >
              {displayName}
            </h2>

            {/* One-line meaning */}
            {meaning && (
              <p className="mt-2 text-base sm:text-lg text-gray-700 leading-snug text-center max-w-[28ch]">
                {meaning}
              </p>
            )}

            {/* Origin tag */}
            {originLabel && (
              <div className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3.5 py-1.5 text-sm font-semibold text-slate-600">
                <Star className="w-3.5 h-3.5" strokeWidth={2} />
                {originLabel}
              </div>
            )}
          </div>
        )}

        {/* Popularity - above the gender distribution */}
        {popularity && (
          <div className="px-4">
            <p className="text-sm sm:text-base text-gray-700 text-center leading-snug">
              <span className="font-bold">פופולריות:</span>{' '}
              מקום {popularity.rank} בשמות ה{popularity.group}
            </p>
            <div className="mt-3 border-t border-gray-200" />
          </div>
        )}

        {/* Distribution at bottom with even spacing */}
        <div className="flex items-center gap-3 px-4 pb-4 pt-3">
          {/* Girl icon and percentage on left */}
          <div className="flex flex-col items-center min-w-[40px]">
            <GirlIcon className="w-8 h-8" />
            <span className="text-xs font-bold text-[#f0abcd] mt-1">{femalePercentage}%</span>
          </div>

          {/* Distribution Bar in center */}
          <div className="flex-1 flex h-5 rounded-full overflow-hidden">
            {femalePercentage > 0 && (
              <div 
                className="bg-[#f0abcd]"
                style={{ width: `${femalePercentage}%` }}
              />
            )}
            {malePercentage > 0 && (
              <div 
                className="bg-[#7fb3d5]"
                style={{ width: `${malePercentage}%` }}
              />
            )}
          </div>

          {/* Boy icon and percentage on right */}
          <div className="flex flex-col items-center min-w-[40px]">
            <BoyIcon className="w-8 h-8" />
            <span className="text-xs font-bold text-[#7fb3d5] mt-1">{malePercentage}%</span>
          </div>
        </div>
      </div>
    );
  }
  
  // Compact version for table view
  return (
    <div className="w-full">
      <div className="flex items-center gap-2">
        <GirlIcon className="w-6 h-6" />
        <div className="flex-1 flex h-6 rounded-full overflow-hidden bg-muted">
          {femalePercentage > 0 && (
            <div 
              className="bg-[#f0abcd]"
              style={{ width: `${femalePercentage}%` }}
            />
          )}
          {malePercentage > 0 && (
            <div 
              className="bg-[#7fb3d5]"
              style={{ width: `${malePercentage}%` }}
            />
          )}
        </div>
        <BoyIcon className="w-6 h-6" />
      </div>
      <div className="flex justify-between text-xs font-bold mt-1">
        <span className="text-[#f0abcd]">{femalePercentage}%</span>
        <span className="text-[#7fb3d5]">{malePercentage}%</span>
      </div>
    </div>
  );
};
