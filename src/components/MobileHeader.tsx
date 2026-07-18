import { Button } from "@/components/ui/button";
import { ArrowLeft, Menu } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { HamburgerMenu } from "@/components/HamburgerMenu";

interface MobileHeaderProps {
  title: string;
  showBackButton?: boolean;
  backPath?: string;
  rightContent?: React.ReactNode;
}

export const MobileHeader = ({ 
  title, 
  showBackButton = true, 
  backPath = "/",
  rightContent 
}: MobileHeaderProps) => {
  const navigate = useNavigate();

  return (
    <div className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border/50 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <HamburgerMenu />
          {showBackButton && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(backPath)}
              className="h-14 w-14"
            >
              <ArrowLeft className="w-10 h-10" />
            </Button>
          )}
        </div>
        
        <h1 className="text-xl font-bold text-foreground truncate flex-1 text-center mx-4">
          {title}
        </h1>
        
        <div className="flex items-center space-x-2">
          {rightContent}
        </div>
      </div>
    </div>
  );
};