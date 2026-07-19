import { useState, useEffect, useCallback, useRef } from "react";
import { Check } from "lucide-react";
import confetti from "canvas-confetti";
import { BoyIcon } from "./icons/BoyIcon";
import { GirlIcon } from "./icons/GirlIcon";
import { UnisexIcon } from "./icons/UnisexIcon";
import { GenderDistributionBar } from "./GenderDistributionBar";
import { BabyName } from "@/contexts/SwipeContext";

interface MatchCelebrationProps {
  matchedName: BabyName;
  onContinue: () => void;
}

export const MatchCelebration = ({ matchedName, onContinue }: MatchCelebrationProps) => {
  const [timeLeft, setTimeLeft] = useState(5);
  const [isVisible, setIsVisible] = useState(false);
  const [cardAnimated, setCardAnimated] = useState(false);

  // Keep track of all confetti timers so we can cancel them on close
  const timeoutsRef = useRef<number[]>([]);
  const intervalRef = useRef<number | null>(null);

  const clearConfettiTimers = () => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    timeoutsRef.current.forEach((id) => clearTimeout(id));
    timeoutsRef.current = [];
  };

  const fireConfetti = useCallback(() => {
    const duration = 3000;
    const end = Date.now() + duration;

    const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#ffeaa7', '#ff9ff3', '#54a0ff', '#5f27cd', '#00d2d3', '#f368e0'];

    // Initial big burst from center
    confetti({
      particleCount: 100,
      spread: 100,
      origin: { y: 0.5, x: 0.5 },
      colors,
      startVelocity: 45,
      gravity: 0.8,
      scalar: 1.2,
    });

    // Side cannons
    const sideTimeout = window.setTimeout(() => {
      confetti({
        particleCount: 50,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.6 },
        colors,
        startVelocity: 55,
      });
      confetti({
        particleCount: 50,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.6 },
        colors,
        startVelocity: 55,
      });
    }, 200);
    timeoutsRef.current.push(sideTimeout);

    // Continuous fireworks effect
    intervalRef.current = window.setInterval(() => {
      if (Date.now() > end) {
        if (intervalRef.current !== null) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        return;
      }

      // Random positions
      confetti({
        particleCount: 30,
        spread: 60,
        origin: { 
          x: Math.random(), 
          y: Math.random() * 0.4 
        },
        colors,
        startVelocity: 30,
        gravity: 1.2,
        scalar: 0.9,
        drift: Math.random() - 0.5,
      });
    }, 150);

    // Extra bursts at intervals
    const extra1 = window.setTimeout(() => {
      confetti({
        particleCount: 80,
        spread: 120,
        origin: { y: 0.3, x: 0.3 },
        colors,
        startVelocity: 40,
      });
    }, 500);

    const extra2 = window.setTimeout(() => {
      confetti({
        particleCount: 80,
        spread: 120,
        origin: { y: 0.3, x: 0.7 },
        colors,
        startVelocity: 40,
      });
    }, 700);

    const extra3 = window.setTimeout(() => {
      confetti({
        particleCount: 120,
        spread: 180,
        origin: { y: 0.4, x: 0.5 },
        colors,
        startVelocity: 50,
        gravity: 0.6,
      });
    }, 1000);

    // Stars burst
    const stars = window.setTimeout(() => {
      confetti({
        particleCount: 60,
        spread: 360,
        origin: { y: 0.5, x: 0.5 },
        colors,
        shapes: ['star'],
        scalar: 1.5,
        startVelocity: 35,
      });
    }, 1500);

    timeoutsRef.current.push(extra1, extra2, extra3, stars);
  }, []);

  // Fade in animation on mount
  useEffect(() => {
    const fadeInTimer = window.setTimeout(() => {
      setIsVisible(true);
      fireConfetti();
    }, 100);

    // Start card animation after a brief delay
    const cardTimer = window.setTimeout(() => {
      setCardAnimated(true);
    }, 200);

    timeoutsRef.current.push(fadeInTimer, cardTimer);

    return () => {
      clearConfettiTimers();
    };
  }, [fireConfetti]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setIsVisible(false);
          setTimeout(() => onContinue(), 300);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [onContinue]);

  const getGenderIcon = () => {
    const iconProps = { className: "w-16 h-16" };
    switch(matchedName.gender) {
      case 'male':
        return <BoyIcon {...iconProps} />;
      case 'female':
        return <GirlIcon {...iconProps} />;
      default:
        return <UnisexIcon {...iconProps} />;
    }
  };

  const getNameColor = () => {
    const male = matchedName.maleOccurrences || 0;
    const female = matchedName.femaleOccurrences || 0;
    const total = male + female;
    if (total === 0) return '#8DC53F';
    const malePercentage = (male / total) * 100;
    const femalePercentage = (female / total) * 100;
    if (malePercentage >= 75) return '#65BADF';
    if (femalePercentage >= 75) return '#EF5185';
    return '#8DC53F';
  };

  const handleContinue = () => {
    clearConfettiTimers();
    if ((confetti as any).reset) {
      (confetti as any).reset();
    }
    setIsVisible(false);
    setTimeout(() => onContinue(), 300);
  };

  return (
    <div 
      className={`fixed z-50 flex items-center justify-center transition-opacity duration-500 pb-[20vh] ${isVisible ? 'opacity-100' : 'opacity-0'}`}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100dvh',
        margin: 0,
        padding: 0,
        zIndex: 9999
      }}
    >
      {/* Dark background */}
      <div 
        className="absolute bg-gray-900/90"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100dvh',
          overflow: 'hidden'
        }}
      />

      {/* Match card with spin and scale animation */}
      <div 
        className={`relative bg-white rounded-3xl p-6 mx-4 max-w-sm w-full text-center shadow-2xl z-20 ${
          cardAnimated ? 'card-entrance-complete' : 'card-entrance-start'
        }`}
      >
        {/* Hearts decoration */}
        <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
          <div className="flex space-x-1">
            <span className="text-2xl animate-bounce" style={{ animationDelay: '0s' }}>💕</span>
            <span className="text-3xl animate-bounce" style={{ animationDelay: '0.1s' }}>💖</span>
            <span className="text-2xl animate-bounce" style={{ animationDelay: '0.2s' }}>💕</span>
          </div>
        </div>

        {/* Hebrew text: "You both like the name" */}
        <h1 className="text-lg font-bold text-primary mt-4 mb-4" style={{ fontFamily: 'Noto Sans Hebrew, sans-serif' }}>
          שניכם אוהבים את השם
        </h1>

        {/* Gender icon */}
        <div className="flex justify-center mb-3">
          {getGenderIcon()}
        </div>

        {/* Name */}
        <h2 
          className="text-4xl font-bold mb-4" 
          style={{ color: getNameColor(), fontFamily: 'Noto Sans Hebrew, sans-serif' }}
        >
          {matchedName.displayName || matchedName.name}
        </h2>

        {/* Gender Distribution Bar */}
        {(matchedName.maleOccurrences !== undefined || matchedName.femaleOccurrences !== undefined) && (
          <div className="mb-6 px-2">
            <GenderDistributionBar 
              maleOccurrences={matchedName.maleOccurrences || 0}
              femaleOccurrences={matchedName.femaleOccurrences || 0}
            />
          </div>
        )}

        {/* Continue button with timer */}
        <button
          onClick={handleContinue}
          className="relative bg-primary text-white rounded-full w-14 h-14 flex items-center justify-center hover:scale-105 transition-transform mx-auto"
        >
          <Check className="w-5 h-5" />
          
          {/* Timer ring */}
          <svg 
            className="absolute inset-0 w-14 h-14 transform -rotate-90"
            viewBox="0 0 56 56"
          >
            <circle
              cx="28"
              cy="28"
              r="24"
              stroke="currentColor"
              strokeWidth="3"
              fill="none"
              className="text-primary/20"
            />
            <circle
              cx="28"
              cy="28"
              r="24"
              stroke="currentColor"
              strokeWidth="3"
              fill="none"
              strokeLinecap="round"
              className="text-white"
              style={{
                strokeDasharray: `${2 * Math.PI * 24}`,
                strokeDashoffset: `${2 * Math.PI * 24 * (1 - (5 - timeLeft) / 5)}`,
                transition: 'stroke-dashoffset 1s linear'
              }}
            />
          </svg>
        </button>
      </div>

      {/* CSS for card animations */}
      <style>{`
        .card-entrance-start {
          transform: scale(0.92) translateY(24px);
          opacity: 0;
        }

        .card-entrance-complete {
          transform: scale(1) translateY(0);
          opacity: 1;
          animation: card-rise-in 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }

        @keyframes card-rise-in {
          0% {
            transform: scale(0.92) translateY(24px);
            opacity: 0;
          }
          70% {
            transform: scale(1.02) translateY(-6px);
            opacity: 1;
          }
          100% {
            transform: scale(1) translateY(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
};
