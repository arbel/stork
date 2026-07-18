interface GirlIconProps {
  className?: string;
}

export const GirlIcon: React.FC<GirlIconProps> = ({ className = "w-16 h-16" }) => {
  return (
    <img 
      src="/girl.svg" 
      alt="Girl" 
      className={className}
    />
  );
};