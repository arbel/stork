import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { Shield, User, Lock } from "lucide-react";

const AdminLogin = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Simple hardcoded admin credentials for now
    if (username !== "admin" || password !== "1234") {
      toast({
        title: "Access Denied",
        description: "Invalid admin credentials.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    
    try {
      // Set admin session in localStorage for simplicity
      localStorage.setItem("admin_authenticated", "true");
      localStorage.setItem("admin_login_time", Date.now().toString());
      
      toast({
        title: "Login Successful",
        description: "Welcome to the admin panel!",
      });
      
      // Redirect to admin dashboard
      navigate("/admin");
      
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Access Denied Alert - keeping for UI consistency */}
        <div className="bg-red-500/90 backdrop-blur-sm text-white p-4 rounded-lg text-center">
          <h2 className="font-semibold text-lg mb-2">Access Restricted</h2>
          <p className="text-sm opacity-90">
            Admin access is restricted to authorized users only.
          </p>
        </div>

        {/* Login Card */}
        <Card className="bg-white/95 backdrop-blur-sm border-0 shadow-2xl">
          <div className="p-8">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-pink-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="w-8 h-8 text-pink-500" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900">Stork Admin Panel</h1>
              <p className="text-gray-600 mt-2">
                Secure access for authorized administrators
              </p>
            </div>

            {/* Login Form */}
            <form onSubmit={handleLogin} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Admin Username
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <Input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="pl-10 h-12 bg-gray-50 border-gray-200 focus:border-pink-500 focus:ring-pink-500"
                    placeholder="Enter username"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Admin Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 h-12 bg-gray-50 border-gray-200 focus:border-pink-500 focus:ring-pink-500"
                    placeholder="Enter password"
                    required
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading || !username || !password}
                className="w-full h-12 bg-pink-500 hover:bg-pink-600 text-white font-medium rounded-lg transition-colors"
              >
                {loading ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white animate-spin rounded-full"></div>
                    <span>Authenticating...</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <Shield className="w-4 h-4" />
                    <span>Access Admin Panel</span>
                  </div>
                )}
              </Button>
            </form>

            {/* Footer */}
            <p className="text-xs text-gray-500 text-center mt-6">
              Authorized access only. All activities are logged and monitored.
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default AdminLogin;
