import { BoyIcon } from "./icons/BoyIcon";
import { GirlIcon } from "./icons/GirlIcon";

interface GenderDistributionBarProps {
  maleOccurrences: number;
  femaleOccurrences: number;
  displayName?: string;
  showNameDisplay?: boolean;
}

export const GenderDistributionBar = ({ 
  maleOccurrences, 
  femaleOccurrences,
  displayName,
  showNameDisplay = false
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
  
  if (showNameDisplay) {
    return (
      <div className="w-full h-full flex flex-col">
        {/* Name Display - centered in card */}
        {displayName && (
          <div className="flex-1 flex items-center justify-center">
            <h2 
              className="text-5xl sm:text-6xl font-bold"
              style={{ color: getNameColor(), fontFamily: 'system-ui' }}
            >
              {displayName}
            </h2>
          </div>
        )}

        {/* Distribution at bottom with even spacing */}
        <div className="flex items-center gap-3 px-4 pb-4">
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
