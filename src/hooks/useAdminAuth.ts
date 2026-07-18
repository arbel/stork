import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { User } from "@supabase/supabase-js";

export const useAdminAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Check initial auth state
    checkAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          await checkAdminStatus(session.user);
        } else {
          setUser(null);
          setIsAdmin(false);
          setLoading(false);
          if (window.location.pathname.startsWith('/admin') && window.location.pathname !== '/admin/login') {
            navigate('/admin/login');
          }
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [navigate]);

  const checkAuth = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await checkAdminStatus(user);
      } else {
        setLoading(false);
        if (window.location.pathname.startsWith('/admin') && window.location.pathname !== '/admin/login') {
          navigate('/admin/login');
        }
      }
    } catch (error) {
      setLoading(false);
      if (window.location.pathname.startsWith('/admin') && window.location.pathname !== '/admin/login') {
        navigate('/admin/login');
      }
    }
  };

  const checkAdminStatus = async (user: User) => {
    try {
      const { data: adminData, error } = await supabase
        .from('admin_users')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle();

      if (error || !adminData) {
        setUser(null);
        setIsAdmin(false);
        await supabase.auth.signOut();
        if (window.location.pathname.startsWith('/admin')) {
          navigate('/admin/login');
        }
      } else {
        setUser(user);
        setIsAdmin(true);
      }
    } catch (error) {
      setUser(null);
      setIsAdmin(false);
      await supabase.auth.signOut();
      if (window.location.pathname.startsWith('/admin')) {
        navigate('/admin/login');
      }
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate('/admin/login');
  };

  return {
    user,
    loading,
    isAdmin,
    signOut
  };
};