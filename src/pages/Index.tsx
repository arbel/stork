import { SwipeInterface } from "@/components/SwipeInterface";
import { Onboarding } from "@/components/Onboarding";
import { HamburgerMenu } from "@/components/HamburgerMenu";
import { StorkLoader } from "@/components/StorkLoader";
import storkWordmark from "@/assets/stork-logo.svg";
import { useSwipe } from "@/contexts/SwipeContext";
import { useAuth } from "@/contexts/AuthContext";
import heroImage from "@/assets/baby-hero.jpg";

const Index = () => {
  const { user, profile, loading, profileLoading } = useAuth();
  const { isOnboardingComplete } = useSwipe();

  // Wait for auth and profile loading states
  // Also wait if we have a user but profile hasn't loaded yet (prevents flash)
  if (loading || profileLoading || (user && !profile)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <StorkLoader message="רגע אחד…" tone="dark" />
      </div>
    );
  }

  if (!isOnboardingComplete) {
    return <Onboarding />;
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Header with Hamburger Menu and Stork Title */}
      <div className="absolute top-6 left-0 right-0 z-20 flex items-center justify-between px-4">
        <HamburgerMenu />
        <img src={storkWordmark} alt="Stork" className="h-14 w-auto absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" />
      </div>
      
      {/* Main Content */}
      <SwipeInterface />
    </div>
  );
};

export default Index;
