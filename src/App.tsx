import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { SwipeProvider } from "@/contexts/SwipeContext";
import { AuthGate } from "@/components/AuthGate";
import Home from "./pages/Home";
import Matches from "./pages/Matches";
import Liked from "./pages/Liked";
import Passed from "./pages/Passed";
import Preferences from "./pages/Preferences";
import FindName from "./pages/FindName";
import Settings from "./pages/Settings";
import Notifications from "./pages/Notifications";
import { PartnerInvite } from "./pages/PartnerInvite";
import { JoinPartnership } from "./pages/JoinPartnership";
import NotFound from "./pages/NotFound";
import Feedback from "./pages/Feedback";
import AdminLogin from "./pages/AdminLogin";
import AdminDashboard from "./pages/AdminDashboard";
import { AdminGuard } from "./components/AdminGuard";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <SwipeProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              {/* Admin Routes - Separate from main app */}
              <Route path="/admin/login" element={<AdminLogin />} />
              <Route path="/admin" element={<AdminGuard><AdminDashboard /></AdminGuard>} />
              
              {/* Main App Routes */}
              <Route path="/join/:inviteCode" element={<JoinPartnership />} />
              <Route path="/" element={<Home />} />
              <Route path="/find-name" element={<AuthGate><FindName /></AuthGate>} />
              <Route path="/matches" element={<AuthGate><Matches /></AuthGate>} />
              <Route path="/liked" element={<AuthGate><Liked /></AuthGate>} />
              <Route path="/passed" element={<AuthGate><Passed /></AuthGate>} />
              <Route path="/preferences" element={<AuthGate><Preferences /></AuthGate>} />
              <Route path="/settings" element={<AuthGate><Settings /></AuthGate>} />
              <Route path="/notifications" element={<AuthGate><Notifications /></AuthGate>} />
              <Route path="/feedback" element={<AuthGate><Feedback /></AuthGate>} />
              <Route path="/partner/invite" element={<AuthGate><PartnerInvite /></AuthGate>} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </SwipeProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
