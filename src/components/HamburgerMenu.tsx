import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Menu, 
  Heart, 
  Settings, 
  Cog,
  LogOut, 
  Mail,
  UserPlus,
  Crown,
  User,
  Sparkles,
  X,
  MessageSquare
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useSwipe } from "@/contexts/SwipeContext";
import { supabase } from "@/integrations/supabase/client";

export const HamburgerMenu = () => {
  const [open, setOpen] = useState(false);
  const [partnerProfile, setPartnerProfile] = useState<any>(null);
  const navigate = useNavigate();
  const { user, signOut, profile } = useAuth();
  const { matches, likedNames, passedNames, partnership } = useSwipe();

  const isAdmin = partnership?.user1_id === user?.id;

  // Load partner profile information
  useEffect(() => {
    const loadPartnerProfile = async () => {
      if (!partnership || !user) {
        setPartnerProfile(null);
        return;
      }

      const partnerId = partnership.user1_id === user.id ? partnership.user2_id : partnership.user1_id;
      if (!partnerId) {
        setPartnerProfile(null);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('first_name, email')
          .eq('user_id', partnerId)
          .maybeSingle();

        if (!error && data) {
          setPartnerProfile(data);
        }
      } catch (error) {
        console.error('Error loading partner profile:', error);
      }
    };

    loadPartnerProfile();
  }, [partnership, user]);

  // Swipe gesture to open menu
  useEffect(() => {
    let touchStartX = 0;
    let touchEndX = 0;
    const minSwipeDistance = 50;

    const handleTouchStart = (e: TouchEvent) => {
      touchStartX = e.touches[0].clientX;
    };

    const handleTouchEnd = (e: TouchEvent) => {
      touchEndX = e.changedTouches[0].clientX;
      const swipeDistance = touchEndX - touchStartX;
      
      // Only trigger if swipe started from left edge (within 30px) and swiped right
      if (touchStartX < 30 && swipeDistance > minSwipeDistance) {
        setOpen(true);
      }
    };

    document.addEventListener('touchstart', handleTouchStart);
    document.addEventListener('touchend', handleTouchEnd);

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, []);

  const handleNavigation = (route: string) => {
    navigate(route);
    setOpen(false);
  };

  const getInitials = (email: string) => {
    return email.split('@')[0].slice(0, 2).toUpperCase();
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="h-14 w-14">
          <Menu className="h-12 w-12 text-white" />
        </Button>
      </SheetTrigger>
      
      <SheetContent side="left" className="w-80">
        <SheetHeader className="pb-4">
          <SheetTitle className="flex items-center space-x-3">
            <Heart className="h-6 w-6 text-love fill-current" />
            <span className="text-xl">Stork</span>
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-2">
          {/* Matches */}
          <Button
            variant="ghost"
            className="w-full justify-start space-x-3 text-base py-3 h-auto"
            onClick={() => handleNavigation("/matches")}
          >
            <Sparkles className="h-5 w-5 text-[#5CC1B6]" />
            <span>Matches</span>
            {matches.length > 0 && (
              <Badge variant="secondary" className="ml-auto bg-[#5CC1B6]/20 text-[#5CC1B6] text-sm">
                {matches.length}
              </Badge>
            )}
          </Button>

          {/* Liked */}
          <Button
            variant="ghost"
            className="w-full justify-start space-x-3 text-base py-3 h-auto"
            onClick={() => handleNavigation("/liked")}
          >
            <Heart className="h-5 w-5 text-[#22C55E] fill-current" />
            <span>Liked</span>
            {likedNames.length > 0 && (
              <Badge variant="secondary" className="ml-auto bg-[#22C55E]/20 text-[#22C55E] text-sm">
                {likedNames.length}
              </Badge>
            )}
          </Button>

          {/* Passed */}
          <Button
            variant="ghost"
            className="w-full justify-start space-x-3 text-base py-3 h-auto"
            onClick={() => handleNavigation("/passed")}
          >
            <X className="h-5 w-5 text-[#EF5185]" />
            <span>Passed</span>
            {passedNames.length > 0 && (
              <Badge variant="secondary" className="ml-auto bg-[#EF5185]/20 text-[#EF5185] text-sm">
                {passedNames.length}
              </Badge>
            )}
          </Button>

          {/* My Preferences */}
          <Button
            variant="ghost"
            className="w-full justify-start space-x-3 text-base py-3 h-auto"
            onClick={() => handleNavigation("/preferences")}
          >
            <Settings className="h-5 w-5" />
            <span>My Preferences</span>
          </Button>

          {/* Settings */}
          <Button
            variant="ghost"
            className="w-full justify-start space-x-3 text-base py-3 h-auto"
            onClick={() => handleNavigation("/settings")}
          >
            <Cog className="h-5 w-5" />
            <span>Settings</span>
          </Button>

          {/* Feedback */}
          <Button
            variant="ghost"
            className="w-full justify-start space-x-3 text-base py-3 h-auto"
            onClick={() => handleNavigation("/feedback")}
          >
            <MessageSquare className="h-5 w-5" />
            <span>Send Feedback</span>
          </Button>

          <Separator className="my-4" />

          {/* Users Section */}
          <div className="space-y-3">
            <div className="px-3 py-2">
              <h4 className="text-base font-medium text-muted-foreground">Users</h4>
            </div>

            {/* Current User */}
            {user && (
              <div className="flex items-center space-x-3 px-3 py-2 bg-muted/30 rounded-lg">
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {getInitials(user.email!)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 text-left">
                  <div className="flex items-center space-x-2">
                    <p className="text-base font-medium text-foreground">
                      {profile?.first_name || user.email?.split('@')[0]}
                    </p>
                    {isAdmin ? (
                      <Crown className="h-4 w-4 text-yellow-500" />
                    ) : (
                      <User className="h-4 w-4 text-blue-500" />
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">You</p>
                </div>
              </div>
            )}

            {/* Partner */}
            {partnership?.status === 'active' && partnerProfile ? (
              <div className="flex items-center space-x-3 px-3 py-2 bg-muted/30 rounded-lg">
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-muted text-muted-foreground">
                    {getInitials(partnerProfile.email)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 text-left">
                  <div className="flex items-center space-x-2">
                    <p className="text-base font-medium text-foreground">
                      {partnerProfile.first_name || partnerProfile.email?.split('@')[0]}
                    </p>
                    {!isAdmin ? (
                      <Crown className="h-4 w-4 text-yellow-500" />
                    ) : (
                      <User className="h-4 w-4 text-blue-500" />
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">Partner</p>
                </div>
              </div>
            ) : partnership?.status === 'pending' ? (
              <>
                <div className="px-3 py-2 bg-muted/30 rounded-lg">
                  <p className="text-base font-medium text-foreground">Invitation Sent</p>
                  <p className="text-sm text-muted-foreground">Waiting for partner to join</p>
                </div>
                <Button
                  variant="ghost"
                  className="w-full justify-start space-x-3 text-base py-3 h-auto"
                  onClick={() => handleNavigation("/partner/invite")}
                >
                  <Mail className="h-5 w-5" />
                  <span>Resend Invitation</span>
                </Button>
              </>
            ) : (
              <Button
                variant="ghost"
                className="w-full justify-start space-x-3 text-base py-3 h-auto"
                onClick={() => handleNavigation("/partner/invite")}
              >
                <UserPlus className="h-5 w-5" />
                <span>Invite Partner</span>
              </Button>
            )}
          </div>

        </div>

        {/* Bottom section */}
        <div className="absolute bottom-4 left-4 right-4">
          <Separator className="mb-4" />
          <Button
            variant="ghost"
            className="w-full justify-start space-x-3 text-base text-muted-foreground py-3 h-auto"
            onClick={signOut}
          >
            <LogOut className="h-5 w-5" />
            <span>Sign Out</span>
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};