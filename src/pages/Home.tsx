import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { AuthGate } from "@/components/AuthGate";
import { StorkLoader } from "@/components/StorkLoader";
import Index from "./Index";
import Landing from "./Landing";

/**
 * Root route gate: signed-out visitors get the marketing landing page;
 * the CTA (or an existing session) leads into the normal AuthGate → app flow.
 */
const Home = () => {
  const { user, loading } = useAuth();
  const [started, setStarted] = useState(false);

  if (user || started) {
    return (
      <AuthGate>
        <Index />
      </AuthGate>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <StorkLoader message="רגע אחד…" tone="dark" />
      </div>
    );
  }

  return <Landing onStart={() => setStarted(true)} />;
};

export default Home;
