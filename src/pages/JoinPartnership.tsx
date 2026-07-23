import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { devSkipOtp } from '@/lib/devAuth';
import { useAuth } from '@/contexts/AuthContext';
import { useSwipe } from '@/contexts/SwipeContext';
import { toast } from '@/hooks/use-toast';
import { Heart, Lock, Layers, ArrowLeft } from 'lucide-react';
import storkLogo from '@/assets/stork-logo.svg';

const FONT = "'Assistant', system-ui, sans-serif";

const bgStyle = {
  backgroundImage: 'url(/bg-base.webp)',
  backgroundSize: 'cover',
  backgroundPosition: 'center',
} as const;

interface InviterInfo {
  name: string;
  email: string;
  status: string;
}

const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

// Teal hero + white bottom-sheet shell shared by every join sub-screen.
const Shell = ({
  headline,
  children,
}: {
  headline: React.ReactNode;
  children: React.ReactNode;
}) => (
  <div className="min-h-[100dvh] w-full flex justify-center" style={{ ...bgStyle, fontFamily: FONT }}>
    <div className="w-full max-w-md flex flex-col min-h-[100dvh]">
      <div className="text-center px-6 pt-9">
        <img src={storkLogo} alt="Stork" className="inline-block w-[120px] h-auto" />
        <div className="text-white font-extrabold text-[21px] leading-[1.3] mt-5">{headline}</div>
      </div>
      <div className="flex-1" />
      <div className="bg-white rounded-t-[30px] px-[22px] pt-[22px] pb-6 shadow-[0_-14px_34px_-20px_rgba(0,0,0,.35)]">
        {children}
      </div>
    </div>
  </div>
);

const features = [
  { Icon: Layers, text: 'עוברים על שמות בהחלקה — כמו דייטינג, לשמות' },
  { Icon: Heart, text: 'שם ששניכם אהבתם הופך ל"מאצ\'" משותף' },
  { Icon: Lock, text: 'בחינם, פרטי, ורק לשניכם' },
];

const ctaClass =
  'w-full flex items-center justify-center gap-2 rounded-[14px] bg-[#E8508A] text-white font-extrabold text-[16px] py-4 shadow-[0_12px_26px_-12px_rgba(232,80,138,.6)] disabled:opacity-50 disabled:shadow-none transition-all';
const inputClass =
  'w-full rounded-[14px] border-[1.5px] border-[#E7E7E7] px-4 py-[15px] text-[15px] font-medium text-[#23282B] placeholder:text-[#B4B4B4] outline-none focus:border-[#E8508A] transition-colors';

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
  const [screen, setScreen] = useState<'intro' | 'email'>('intro');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [authStep, setAuthStep] = useState<'email' | 'otp'>('email');
  const [authLoading, setAuthLoading] = useState(false);

  // Fetch inviter info on mount
  useEffect(() => {
    const fetchInviterInfo = async () => {
      if (!inviteCode) {
        setError('קישור הזמנה לא תקין');
        setInviterLoading(false);
        return;
      }

      try {
        const { data, error: fetchError } = await supabase.rpc('get_partnership_by_invite_code', {
          invite_code_param: inviteCode
        });

        if (fetchError || !data || data.length === 0) {
          setError('קישור הזמנה זה אינו תקין או פג תוקף');
          setInviterLoading(false);
          return;
        }

        const partnershipData = data[0];
        setInviterInfo({
          name: partnershipData.inviter_name || 'מישהו',
          email: partnershipData.inviter_email || '',
          status: partnershipData.status
        });

        // Note: we deliberately do NOT block on status here. Whether the invite is pending,
        // active, or already "used" is decided by join_partnership_by_invite — an existing
        // account re-joining, or the assigned partner returning, is a valid flow the RPC handles.
      } catch (err) {
        console.error('Error fetching inviter info:', err);
        setError('טעינת פרטי ההזמנה נכשלה');
      } finally {
        setInviterLoading(false);
      }
    };

    fetchInviterInfo();
  }, [inviteCode]);

  useEffect(() => {
    if (!inviteCode) {
      setError('קישור הזמנה לא תקין');
      return;
    }

    // Remember the invite so that if a magic-link redirect drops the /join path and lands the
    // user at the app root, Index can route them back here instead of the fresh-signup flow.
    localStorage.setItem('pending_invite_code', inviteCode);

    // If user is authenticated and already has an active partnership, redirect to main screen
    if (user && partnership?.status === 'active') {
      console.log('User already has active partnership, redirecting to main screen');
      toast({
        title: "כבר בשותפות",
        description: "אתם כבר בשותפות פעילה!",
        duration: 2000,
      });
      navigate('/');
      return;
    }
  }, [inviteCode, user, partnership, navigate]);

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidEmail(email)) return;

    setAuthLoading(true);

    // DEV ONLY: skip the OTP code step entirely.
    if (import.meta.env.DEV) {
      try {
        if (await devSkipOtp(email)) return; // auth state change re-renders into the join step
      } catch (error) {
        console.warn('[dev] OTP bypass errored, falling back to code flow:', error);
      }
    }

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
    if (!otp || otp.length < 6) return;

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
        throw new Error('ההצטרפות לשותפות נכשלה');
      }

      console.log('Successfully joined partnership:', result.partnership);
      localStorage.removeItem('pending_invite_code');
      sessionStorage.removeItem('invite_recovery_done');

      // Re-attach any "solo" swipes (unlinked when leaving a prior partnership) to the one we just
      // joined, so picks carry over. Safety net that works even before the server-side carry RPC is
      // applied; a freshly-joined partnership has no swipes yet, so there's nothing to collide with.
      const joinedId = (result.partnership as any)?.id;
      if (joinedId && user) {
        const { error: reattachError } = await supabase
          .from('user_swipes')
          .update({ partnership_id: joinedId })
          .eq('user_id', user.id)
          .is('partnership_id', null);
        if (reattachError) console.error('Error re-attaching solo swipes:', reattachError);
      }

      await refreshPartnership();

      toast({
        title: "הצטרפתם לשותפות! 🎉",
        description: "עכשיו אפשר להתחיל להחליק ולבחור יחד שמות לתינוק!",
        duration: 3000,
      });

      // Redirect to home - the simplified Onboarding flow will handle the rest
      window.location.href = '/';

    } catch (error: any) {
      console.error('Error joining partnership:', error);
      toast({
        title: "ההצטרפות לשותפות נכשלה",
        description: error.message || "אנא נסו שוב.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const inviterName = inviterInfo?.name || 'מישהו';
  const inviterInitial = inviterName.trim().charAt(0) || '?';

  const InviterCard = () => (
    <div className="flex items-center gap-3 bg-[#FDF2F6] rounded-2xl px-3.5 py-3">
      <div className="w-11 h-11 rounded-full bg-[#E8508A] text-white font-extrabold text-[20px] flex items-center justify-center flex-shrink-0">
        {inviterInitial}
      </div>
      <div className="min-w-0 text-start">
        <div className="text-[11px] font-semibold text-[#C77BA0]">הוזמנתם על ידי</div>
        <div className="text-[16px] font-extrabold text-[#23282B] leading-[1.1]">{inviterName}</div>
        {inviterInfo?.email && (
          <div dir="ltr" className="text-[12px] font-medium text-[#9A928A] whitespace-nowrap overflow-hidden text-ellipsis text-right">
            {inviterInfo.email}
          </div>
        )}
      </div>
    </div>
  );

  if (loading || inviterLoading) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center" style={bgStyle}>
        <div className="p-8 text-center text-white">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4" />
          <p style={{ fontFamily: FONT }}>{loading ? 'מצטרף לשותפות...' : 'טוען הזמנה...'}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Shell headline={<>אופס…<br />משהו השתבש</>}>
        <div className="text-[12px] font-bold text-[#E8508A] tracking-wide">שגיאת שותפות</div>
        <div className="text-[15px] font-medium text-[#5A554C] mt-2 leading-[1.5]">{error}</div>
        <button onClick={() => navigate('/')} className={`${ctaClass} mt-5`}>
          למסך הבית
        </button>
      </Shell>
    );
  }

  // Not logged in — 2-screen cold-visitor flow: intro → email → OTP.
  if (!user) {
    // OTP entry
    if (authStep === 'otp') {
      return (
        <Shell headline={<>כמעט שם —<br />נשאר רק הקוד</>}>
          <div className="text-[12px] font-bold text-[#E8508A] tracking-wide">אימות</div>
          <div className="text-[15px] font-medium text-[#5A554C] mt-2 leading-[1.5]">
            הזינו את קוד האימות שנשלח אל <strong className="text-[#23282B]">{email}</strong>
          </div>
          <form onSubmit={handleVerifyOTP} className="mt-4">
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              dir="ltr"
              placeholder="123456"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 8))}
              maxLength={8}
              className={`${inputClass} text-center text-xl tracking-[0.4em]`}
              autoFocus
            />
            <button type="submit" disabled={authLoading || otp.length < 6} className={`${ctaClass} mt-3`}>
              {authLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                  מאמת...
                </>
              ) : (
                'אימות והצטרפות'
              )}
            </button>
          </form>
          <button
            onClick={() => { setAuthStep('email'); setOtp(''); }}
            className="w-full mt-3 font-bold text-[13.5px] text-[#9A928A]"
          >
            שינוי כתובת האימייל
          </button>
        </Shell>
      );
    }

    // Screen 2 — email entry
    if (screen === 'email') {
      return (
        <Shell headline={<>כמעט שם —<br />נשאר רק אימייל</>}>
          <InviterCard />
          <form onSubmit={handleSendOTP}>
            <input
              type="email"
              dir="ltr"
              placeholder="כתובת האימייל שלכם"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={`${inputClass} mt-4 text-right`}
              autoFocus
            />
            <button type="submit" disabled={authLoading || !isValidEmail(email)} className={`${ctaClass} mt-3`}>
              {authLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                  שולח קוד...
                </>
              ) : (
                'שלחו לי קוד כניסה'
              )}
            </button>
          </form>
          <div className="text-center mt-2.5 text-[12px] font-semibold text-[#9A928A]">
            נשלח קוד חד-פעמי לאימות · בחינם, ללא התחייבות
          </div>
        </Shell>
      );
    }

    // Screen 1 — intro / "what is Stork"
    return (
      <Shell headline={<>{inviterName} מזמין/ה אתכם<br />לבחור שם יחד</>}>
        <div className="text-[12px] font-bold text-[#E8508A] tracking-wide">מה זה Stork?</div>
        <div className="text-[14px] font-medium text-[#5A554C] mt-1.5 leading-[1.5]">
          אפליקציה לזוגות לבחירת שם לתינוק. עוברים על שמות בהחלקה — וכששניכם אוהבים את אותו שם, זה מאצ'.
        </div>
        <div className="flex flex-col gap-3 mt-4">
          {features.map(({ Icon, text }, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-[38px] h-[38px] rounded-[11px] bg-[#FDF2F6] flex items-center justify-center flex-shrink-0">
                <Icon className="w-[19px] h-[19px] text-[#E8508A]" strokeWidth={2} />
              </div>
              <div className="text-[13.5px] font-semibold text-[#3A3630] text-start">{text}</div>
            </div>
          ))}
        </div>
        <button onClick={() => setScreen('email')} className={`${ctaClass} mt-[18px]`}>
          בואו נתחיל
          <ArrowLeft className="w-[18px] h-[18px]" />
        </button>
      </Shell>
    );
  }

  // Logged in — confirm and join
  return (
    <Shell headline={<>{inviterName} מזמין/ה אתכם<br />לבחור שם יחד</>}>
      <InviterCard />
      <div className="mt-4 rounded-[14px] border-[1.5px] border-[#ECECEC] bg-[#F7F7F5] px-4 py-3.5">
        <div className="text-[12px] font-semibold text-[#9A928A]">מצטרפים בתור</div>
        <div dir="ltr" className="text-[15px] font-bold text-[#23282B] text-right whitespace-nowrap overflow-hidden text-ellipsis">
          {user.email}
        </div>
      </div>
      <button onClick={joinPartnership} disabled={loading} className={`${ctaClass} mt-4`}>
        {loading ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
            מצטרף...
          </>
        ) : (
          'הצטרפות לשותפות'
        )}
      </button>
    </Shell>
  );
};
