interface BoyIconProps {
  className?: string;
}

export const BoyIcon: React.FC<BoyIconProps> = ({ className = "w-16 h-16" }) => {
  return (
    <img 
      src="/boy.svg" 
      alt="Boy" 
      className={className}
    />
  );
};