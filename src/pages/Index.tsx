import { SwipeInterface } from "@/components/SwipeInterface";
import { Onboarding } from "@/components/Onboarding";
import { HamburgerMenu } from "@/components/HamburgerMenu";
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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isOnboardingComplete) {
    return <Onboarding />;
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Header with Hamburger Menu and Stork Title */}
      <div className="absolute top-4 left-0 right-0 z-20 flex items-center justify-between px-4">
        <HamburgerMenu />
        <h1 className="text-3xl font-bold text-white absolute left-1/2 transform -translate-x-1/2">Stork</h1>
      </div>
      
      {/* Main Content */}
      <SwipeInterface />
    </div>
  );
};

export default Index;
