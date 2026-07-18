import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useSwipe } from '@/contexts/SwipeContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';
import { Heart, KeyRound, User } from 'lucide-react';

interface InviterInfo {
  name: string;
  email: string;
  status: string;
}

export const JoinPartnership = () => {
  const { inviteCode } = useParams<{ inviteCode: string }>();
  const { user, signInWithEmail, verifyOtp } = useAuth();
  const { refreshPartnership, partnership } = useSwipe();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Inviter info
  const [inviterInfo, setInviterInfo] = useState<InviterInfo | null>(null);
  const [inviterLoading, setInviterLoading] = useState(true);
  
  // Auth state
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [authStep, setAuthStep] = useState<'email' | 'otp'>('email');
  const [authLoading, setAuthLoading] = useState(false);

  // Fetch inviter info on mount
  useEffect(() => {
    const fetchInviterInfo = async () => {
      if (!inviteCode) {
        setError('Invalid invite link');
        setInviterLoading(false);
        return;
      }

      try {
        const { data, error: fetchError } = await supabase.rpc('get_partnership_by_invite_code', {
          invite_code_param: inviteCode
        });

        if (fetchError || !data || data.length === 0) {
          setError('This invite link is invalid or has expired');
          setInviterLoading(false);
          return;
        }

        const partnershipData = data[0];
        setInviterInfo({
          name: partnershipData.inviter_name || 'Someone',
          email: partnershipData.inviter_email || '',
          status: partnershipData.status
        });

        // Note: we deliberately do NOT block on status here. Whether the invite is pending,
        // active, or already "used" is decided by join_partnership_by_invite — an existing
        // account re-joining, or the assigned partner returning, is a valid flow the RPC handles.
      } catch (err) {
        console.error('Error fetching inviter info:', err);
        setError('Failed to load invitation details');
      } finally {
        setInviterLoading(false);
      }
    };

    fetchInviterInfo();
  }, [inviteCode]);

  useEffect(() => {
    console.log('JoinPartnership component loaded with inviteCode:', inviteCode);
    console.log('Current user:', user?.email);
    
    if (!inviteCode) {
      setError('Invalid invite link');
      return;
    }

    // If user is authenticated and already has an active partnership, redirect to main screen
    if (user && partnership?.status === 'active') {
      console.log('User already has active partnership, redirecting to main screen');
      toast({
        title: "Already in partnership",
        description: "You're already in an active partnership!",
        duration: 2000,
      });
      navigate('/');
      return;
    }
  }, [inviteCode, user, partnership, navigate]);

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    
    setAuthLoading(true);
    try {
      await signInWithEmail(email);
      setAuthStep('otp');
    } catch (error) {
      // Error handling is in the auth context
    } finally {
      setAuthLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp || otp.length !== 6) return;
    
    setAuthLoading(true);
    try {
      await verifyOtp(email, otp);
    } catch (error) {
      setAuthLoading(false);
    }
  };

  const joinPartnership = async () => {
    if (!user) return;

    console.log('Starting secure join partnership process via function');
    setLoading(true);
    
    try {
      const { data, error } = await supabase
        .rpc('join_partnership_by_invite', {
          invite_code_param: inviteCode
        });

      console.log('Join partnership function result:', { data, error });

      if (error) {
        throw error;
      }

      const result = data as any;
      
      if (result?.error) {
        throw new Error(result.error);
      }

      if (!result?.success) {
        throw new Error('Join partnership failed');
      }

      console.log('Successfully joined partnership:', result.partnership);
      await refreshPartnership();

      toast({
        title: "Partnership joined! 🎉",
        description: "You can now start swiping to find baby names together!",
        duration: 3000,
      });

      // Redirect to home - the simplified Onboarding flow will handle the rest
      window.location.href = '/';
      
    } catch (error: any) {
      console.error('Error joining partnership:', error);
      toast({
        title: "Failed to join partnership",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading || inviterLoading) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center"
        style={{
          backgroundImage: 'url(/bg-base.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      >
        <div className="p-8 text-center text-white">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4" />
          <p>{loading ? 'Joining partnership...' : 'Loading invitation...'}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center p-4"
        style={{
          backgroundImage: 'url(/bg-base.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      >
        <div className="text-center max-w-md text-white">
          <Heart className="w-12 h-12 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-4">Partnership Error</h1>
          <p className="mb-6">{error}</p>
          <Button onClick={() => navigate('/')} className="bg-white text-primary hover:bg-white/90">
            Go to Home
          </Button>
        </div>
      </div>
    );
  }

  // Not logged in - show simple auth form with inviter info
  if (!user) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center p-4"
        style={{
          backgroundImage: 'url(/bg-base.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      >
        <div className="text-center max-w-sm w-full">
          <Heart className="w-12 h-12 text-white mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Join Partnership</h1>
          
          {/* Inviter Info Card */}
          {inviterInfo && (
            <div className="bg-white/15 backdrop-blur-sm rounded-xl p-4 mb-6 border border-white/20">
              <div className="flex items-center justify-center mb-2">
                <User className="w-8 h-8 text-white/80" />
              </div>
              <p className="text-white/80 text-xs uppercase tracking-wider mb-1">Invited by</p>
              <p className="text-white font-semibold text-lg">{inviterInfo.name}</p>
              {inviterInfo.email && (
                <p className="text-white/70 text-sm">{inviterInfo.email}</p>
              )}
            </div>
          )}
          
          <p className="text-white/90 mb-6 text-sm">Enter your email to join and start finding baby names together!</p>
          
          {authStep === 'email' ? (
            <div className="space-y-4">
              <Input
                type="email"
                placeholder="Your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-12 bg-white/20 border-white/30 text-white placeholder:text-white/60 rounded-full px-5"
              />
              <Button
                onClick={handleSendOTP}
                disabled={authLoading || !email}
                className="w-full h-12 bg-white text-primary hover:bg-white/90 rounded-full font-medium"
              >
                {authLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mr-2" />
                    Sending Code...
                  </>
                ) : (
                  'Send Sign In Code'
                )}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-center mb-2">
                <KeyRound className="w-8 h-8 text-white/90" />
              </div>
              <p className="text-white/80 text-sm">
                Enter the 6-digit code sent to <strong>{email}</strong>
              </p>
              <Input
                type="text"
                placeholder="123456"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="h-12 bg-white/20 border-white/30 text-white placeholder:text-white/60 text-center text-xl tracking-widest rounded-full"
                maxLength={6}
                autoComplete="one-time-code"
              />
              <Button
                onClick={handleVerifyOTP}
                disabled={authLoading || otp.length !== 6}
                className="w-full h-12 bg-white text-primary hover:bg-white/90 rounded-full font-medium"
              >
                {authLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mr-2" />
                    Verifying...
                  </>
                ) : (
                  'Verify & Join'
                )}
              </Button>
              <Button
                variant="ghost"
                onClick={() => { setAuthStep('email'); setOtp(''); }}
                className="w-full text-white/80 hover:text-white hover:bg-white/10"
              >
                Change Email
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Logged in - show join button
  return (
    <div 
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        backgroundImage: 'url(/bg-base.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      }}
    >
      <div className="text-center max-w-sm w-full">
        <Heart className="w-12 h-12 text-white mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-white mb-2">Join Partnership</h1>
        <p className="text-white/90 mb-6 text-sm">You've been invited to find baby names together!</p>
        
        <div className="bg-white/10 backdrop-blur-sm p-4 rounded-lg mb-6">
          <p className="text-sm text-white/80">Joining as</p>
          <p className="font-medium text-white">{user.email}</p>
        </div>
        
        <Button 
          onClick={joinPartnership}
          disabled={loading}
          className="w-full h-12 bg-white text-primary hover:bg-white/90 rounded-full font-medium"
        >
          {loading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mr-2" />
              Joining...
            </>
          ) : (
            'Join Partnership'
          )}
        </Button>
      </div>
    </div>
  );
};
