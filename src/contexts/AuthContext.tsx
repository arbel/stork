
import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/integrations/supabase/client'
import { toast } from '@/hooks/use-toast'

interface Profile {
  id: string
  user_id: string
  email: string
  first_name?: string
  partner_name?: string
  preferences: any
  created_at: string
  updated_at: string
}

interface AuthContextType {
  user: User | null
  session: Session | null
  profile: Profile | null
  loading: boolean
  profileLoading: boolean
  signInWithEmail: (email: string) => Promise<void>
  verifyOtp: (email: string, token: string) => Promise<void>
  signOut: () => Promise<void>
  updateProfile: (updates: Partial<Profile>) => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [profileLoading, setProfileLoading] = useState(false)

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        setProfileLoading(true)
        await loadProfile(session.user.id)
        setProfileLoading(false)
      }
      setLoading(false)
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      // Don't log user emails / auth state (PII in the browser console).
      setSession(session)
      setUser(session?.user ?? null)
      
      if (session?.user) {
        // Defer profile loading to prevent deadlocks
        setTimeout(() => {
          loadProfile(session.user.id)
        }, 0)
      } else {
        setProfile(null)
      }
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const loadProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) {
        console.error('Error loading profile:', error);
      }

      const profileRow = Array.isArray(data) ? data[0] : data;
      setProfile(profileRow || null);
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  }

  const signInWithEmail = async (email: string) => {
    try {
      // Normalize: whitespace/uppercase from autofill or paste makes GoTrue reject the address
      // with "Unable to validate email address: invalid format".
      const cleanEmail = email.trim().toLowerCase();

      const { error } = await supabase.auth.signInWithOtp({
        email: cleanEmail,
        options: {
          shouldCreateUser: true,
          // Built-in Supabase email sends a magic LINK (template editing needs custom SMTP).
          // Without this, the link redirects to the Site URL (app root) and drops the
          // /join/:code path — so an invited user lands in fresh signup instead of joining.
          // Returning to the exact page they started on preserves the invite context.
          emailRedirectTo: `${window.location.origin}${window.location.pathname}`,
        },
      })

      console.log('OTP request result:', { error });

      if (error) throw error

      toast({
        title: "הקוד נשלח! 📧",
        description: "בדקו את האימייל לקוד האימות בן 6 הספרות.",
        duration: 5000,
      })
    } catch (error: any) {
      console.error('Error sending OTP:', error)
      toast({
        title: "שגיאה בשליחת הקוד",
        description: error.message,
        variant: "destructive",
      })
      throw error
    }
  }

  const verifyOtp = async (email: string, token: string) => {
    try {
      // Must match the normalized address used when the code was sent.
      const { error } = await supabase.auth.verifyOtp({
        email: email.trim().toLowerCase(),
        token: token.trim(),
        type: 'email',
      })

      if (error) throw error

      toast({
        title: "ברוכים הבאים! 🎉",
        description: "התחברתם בהצלחה!",
        duration: 3000,
      })
    } catch (error: any) {
      console.error('Error verifying OTP:', error)
      toast({
        title: "קוד לא תקין",
        description: error.message === 'Token has expired or is invalid' 
          ? "הקוד פג תוקף או שגוי. אנא נסו שוב."
          : error.message,
        variant: "destructive",
      })
      throw error
    }
  }

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      
      toast({
        title: "התנתקתם בהצלחה",
        description: "נתראה בפעם הבאה!",
      })
    } catch (error: any) {
      toast({
        title: "שגיאה בהתנתקות",
        description: error.message,
        variant: "destructive",
      })
    }
  }

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) return

    try {
      console.log('Updating profile with:', updates);
      
      // Try to update first, then insert if it doesn't exist
      const { data: existingProfileData, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1);

      const existingProfile = Array.isArray(existingProfileData) ? existingProfileData[0] : existingProfileData;

      let result;
      if (existingProfile) {
        // Update existing profile
        result = await supabase
          .from('profiles')
          .update({
            email: user.email!,
            ...updates,
          })
          .eq('user_id', user.id);
      } else {
        // Insert new profile
        result = await supabase
          .from('profiles')
          .insert({
            user_id: user.id,
            email: user.email!,
            ...updates,
          });
      }

      if (result.error) throw result.error;

      await loadProfile(user.id);
      
      toast({
        title: "הפרופיל עודכן!",
        description: "ההעדפות שלכם נשמרו.",
      });
    } catch (error: any) {
      console.error('Error updating profile:', error);
      toast({
        title: "שגיאה בעדכון הפרופיל",
        description: error.message,
        variant: "destructive",
      });
      throw error; // Re-throw so onboarding can handle it
    }
  }

  const value = {
    user,
    session,
    profile,
    loading,
    profileLoading,
    signInWithEmail,
    verifyOtp,
    signOut,
    updateProfile,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
