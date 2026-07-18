import { useState, useRef, useEffect, useCallback, memo } from "react";
import { Card } from "@/components/ui/card";
import { Heart, X } from "lucide-react";
import { BoyIcon } from "./icons/BoyIcon";
import { GirlIcon } from "./icons/GirlIcon";
import { UnisexIcon } from "./icons/UnisexIcon";
import { GenderDistributionBar } from "./GenderDistributionBar";
import { BabyName } from "@/contexts/SwipeContext";

interface SwipeCardProps {
  name: BabyName;
  onSwipe: (direction: 'left' | 'right') => void;
  triggerAnimation?: 'left' | 'right' | null;
  onDragChange?: (direction: 'left' | 'right' | null, offset: number) => void;
  maleOccurrences?: number;
  femaleOccurrences?: number;
}

const SwipeCard = memo(({ name, onSwipe, triggerAnimation, onDragChange, maleOccurrences = 0, femaleOccurrences = 0 }: SwipeCardProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [dragDirection, setDragDirection] = useState<'left' | 'right' | null>(null);
  const [dragOffset, setDragOffset] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const startX = useRef(0);
  const animationRef = useRef<number | null>(null);
  // Ensures a single gesture commits at most one swipe (touchend + mouseup can both fire,
  // and the unique index would otherwise reject the duplicate write anyway).
  const hasSwipedRef = useRef(false);

  // Reset the guard whenever a new card is shown.
  useEffect(() => {
    hasSwipedRef.current = false;
  }, [name.name]);

  const commitSwipe = useCallback((direction: 'left' | 'right') => {
    if (hasSwipedRef.current) return;
    hasSwipedRef.current = true;
    // Clear the parent's like/dislike background overlay — otherwise a manual (drag) swipe
    // leaves the green/red tint stuck on, since the drag never reports a reset to the parent.
    onDragChange?.(null, 0);
    onSwipe(direction);
  }, [onSwipe, onDragChange]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    hasSwipedRef.current = false;
    setIsDragging(true);
    startX.current = e.touches[0].clientX;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging) return;
    e.preventDefault();
    
    const currentX = e.touches[0].clientX;
    const deltaX = currentX - startX.current;
    
    // Use requestAnimationFrame for smoother animations
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    
    animationRef.current = requestAnimationFrame(() => {
      setDragOffset(deltaX);
      
      if (Math.abs(deltaX) > 50) {
        const direction = deltaX > 0 ? 'right' : 'left';
        setDragDirection(direction);
        // Notify parent about drag direction for background color
        onDragChange?.(direction, Math.abs(deltaX));
      } else {
        setDragDirection(null);
        onDragChange?.(null, 0);
      }
    });
  }, [isDragging, onDragChange]);

  const handleTouchEnd = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    
    if (Math.abs(dragOffset) > 100) {
      commitSwipe(dragOffset > 0 ? 'right' : 'left');
    } else {
      // Snap back - immediately reset drag state
      onDragChange?.(null, 0);
      setDragOffset(0);
      setDragDirection(null);
    }
    setIsDragging(false);
  }, [dragOffset, commitSwipe, onDragChange]);

  const handleMouseDown = (e: React.MouseEvent) => {
    hasSwipedRef.current = false;
    setIsDragging(true);
    startX.current = e.clientX;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    
    const deltaX = e.clientX - startX.current;
    setDragOffset(deltaX);
    
    if (Math.abs(deltaX) > 50) {
      const direction = deltaX > 0 ? 'right' : 'left';
      setDragDirection(direction);
      onDragChange?.(direction, Math.abs(deltaX));
    } else {
      setDragDirection(null);
      onDragChange?.(null, 0);
    }
  };

  const handleMouseUp = () => {
    if (Math.abs(dragOffset) > 100) {
      commitSwipe(dragOffset > 0 ? 'right' : 'left');
    } else {
      // Snap back - immediately reset drag state
      onDragChange?.(null, 0);
      setDragOffset(0);
      setDragDirection(null);
    }
    setIsDragging(false);
  };

  // Handle button animation trigger - just for visual animation, no swipe logic
  useEffect(() => {
    console.log('SwipeCard useEffect triggered, triggerAnimation:', triggerAnimation);
    if (triggerAnimation) {
      setIsAnimating(true);
      setDragDirection(triggerAnimation);
      setDragOffset(triggerAnimation === 'right' ? 400 : -400);
      
      const timeoutId = setTimeout(() => {
        console.log('SwipeCard animation complete - visual only');
        setIsAnimating(false);
        setDragDirection(null);
        setDragOffset(0);
      }, 500);
      
      return () => {
        console.log('SwipeCard useEffect cleanup');
        clearTimeout(timeoutId);
      };
    } else {
      // Reset immediately when triggerAnimation becomes null
      setIsAnimating(false);
      setDragDirection(null);
      setDragOffset(0);
    }
  }, [triggerAnimation]);

  const getCardClassName = useCallback(() => {
    return "swipe-card w-[calc(100vw-48px)] max-w-[340px] aspect-[4/5] cursor-grab select-none touch-none bg-white border border-white/30 rounded-3xl shadow-2xl will-change-transform";
  }, []);

  const cardStyle = {
    transform: (isDragging || isAnimating) ? `translate3d(${dragOffset}px, 0, 0) rotate(${dragOffset * 0.08}deg)` : 'translate3d(0, 0, 0)',
    transition: isAnimating ? 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)' : isDragging ? 'none' : 'transform 0.2s ease-out',
  };

  const getGenderIcon = () => {
    switch(name.gender) {
      case 'male':
        return <BoyIcon className="h-20 w-auto" />;
      case 'female':
        return <GirlIcon className="h-20 w-auto" />;
      default:
        return <UnisexIcon className="h-20 w-auto" />;
    }
  };

  // Determine name color based on 75% threshold
  const getNameColor = () => {
    const total = maleOccurrences + femaleOccurrences;
    if (total > 0) {
      const malePercentage = (maleOccurrences / total) * 100;
      const femalePercentage = (femaleOccurrences / total) * 100;
      if (malePercentage >= 75) return '#65BADF';
      if (femalePercentage >= 75) return '#EF5185';
      return '#8DC53F';
    }
    // Fallback to gender-based if no occurrence data
    switch(name.gender) {
      case 'male': return '#65BADF';
      case 'female': return '#EF5185';
      default: return '#8DC53F';
    }
  };

  return (
    <Card 
      ref={cardRef}
      className={getCardClassName()}
      style={cardStyle}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleMouseDown}
      onMouseMove={isDragging ? handleMouseMove : undefined}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <div className="flex flex-col h-full text-center relative">
        {/* Gender Distribution - full height with bar at bottom */}
        {(maleOccurrences > 0 || femaleOccurrences > 0) ? (
          <GenderDistributionBar
            maleOccurrences={maleOccurrences}
            femaleOccurrences={femaleOccurrences}
            displayName={name.displayName || name.name}
            showNameDisplay={true}
          />
        ) : (
          /* Fallback for names without occurrence data */
          <div className="flex-1 flex flex-col items-center justify-center p-4">
            <div className="flex justify-center mb-4">
              {getGenderIcon()}
            </div>
            <h2 className="text-5xl sm:text-6xl font-bold" style={{ color: getNameColor() }}>{name.displayName || name.name}</h2>
          </div>
        )}
        
        {(dragDirection === 'right' || triggerAnimation === 'right') && (
          <div className="absolute top-4 right-4 pointer-events-none">
            <Heart className="w-16 h-16 text-[#8DC53F] fill-current animate-pulse" />
          </div>
        )}
        
        {(dragDirection === 'left' || triggerAnimation === 'left') && (
          <div className="absolute top-4 left-4 pointer-events-none">
            <X className="w-16 h-16 text-[#EF5185] animate-pulse" strokeWidth={3} />
          </div>
        )}
      </div>
    </Card>
  );
});

SwipeCard.displayName = 'SwipeCard';

export { SwipeCard };