import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

interface AdminGuardProps {
  children: React.ReactNode;
}

export const AdminGuard = ({ children }: AdminGuardProps) => {
  const [loading, setLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    checkAdminAuth();
  }, []);

  const checkAdminAuth = () => {
    try {
      const isAuthenticated = localStorage.getItem("admin_authenticated");
      const loginTime = localStorage.getItem("admin_login_time");
      
      if (!isAuthenticated || isAuthenticated !== "true") {
        navigate('/admin/login');
        return;
      }

      // Check if session is still valid (24 hours)
      if (loginTime) {
        const loginTimestamp = parseInt(loginTime);
        const currentTime = Date.now();
        const twentyFourHours = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
        
        if (currentTime - loginTimestamp > twentyFourHours) {
          // Session expired
          localStorage.removeItem("admin_authenticated");
          localStorage.removeItem("admin_login_time");
          navigate('/admin/login');
          return;
        }
      }

      setIsAuthorized(true);
    } catch (error) {
      console.error("Admin auth check failed:", error);
      navigate('/admin/login');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAuthorized) {
    return null;
  }

  return <>{children}</>;
};