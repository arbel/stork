interface UnisexIconProps {
  className?: string;
}

export const UnisexIcon: React.FC<UnisexIconProps> = ({ className = "w-16 h-16" }) => {
  return (
    <img 
      src="/unisex.svg" 
      alt="Unisex" 
      className={className}
    />
  );
};