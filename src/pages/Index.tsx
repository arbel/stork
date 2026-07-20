import { SwipeInterface } from "@/components/SwipeInterface";
import { Onboarding } from "@/components/Onboarding";
import { Navigate } from "react-router-dom";
import { HamburgerMenu } from "@/components/HamburgerMenu";
import { StorkLoader } from "@/components/StorkLoader";
import storkWordmark from "@/assets/stork-logo.svg";
import { useSwipe } from "@/contexts/SwipeContext";
import { useAuth } from "@/contexts/AuthContext";
import heroImage from "@/assets/baby-hero.jpg";

const Index = () => {
  const { user, profile, loading, profileLoading } = useAuth();
  const { isOnboardingComplete } = useSwipe();

  // Wait for auth and profile loading states. profileLoading is set synchronously whenever a
  // profile fetch is pending, so this wait is bounded — unlike the old `user && !profile`
  // condition, which spun forever when a session's user had no profile row (deleted account).
  // If the fetch settles with no profile, the user flows to Onboarding, which creates one.
  if (loading || profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <StorkLoader message="רגע אחד…" tone="dark" />
      </div>
    );
  }

  // Safety net for invited users: if a magic-link redirect dropped the /join/:code path and
  // landed a brand-new user here, send them back to the invite page once — otherwise the
  // fresh-signup/onboarding flow would create their own partnership instead of joining.
  const pendingInvite = typeof window !== 'undefined' ? localStorage.getItem('pending_invite_code') : null;
  if (
    user && pendingInvite && !isOnboardingComplete &&
    !sessionStorage.getItem('invite_recovery_done')
  ) {
    sessionStorage.setItem('invite_recovery_done', '1');
    return <Navigate to={`/join/${pendingInvite}`} replace />;
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
