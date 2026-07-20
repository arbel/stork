import { useState, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { KeyRound } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { devSkipOtp } from "@/lib/devAuth";
import storkLogo from "@/assets/stork.svg";
import storkWordmark from "@/assets/stork-logo.svg";

interface AuthGateProps {
  children: ReactNode;
}

export const AuthGate = ({ children }: AuthGateProps) => {
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'email' | 'otp'>('email');
  const { user, signInWithEmail, verifyOtp } = useAuth();

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    
    setLoading(true);

    // DEV ONLY: try to skip the OTP code step entirely.
    if (import.meta.env.DEV) {
      try {
        if (await devSkipOtp(email)) return; // auth state change unmounts this screen
      } catch (error) {
        console.warn('[dev] OTP bypass errored, falling back to code flow:', error);
      }
    }

    try {
      await signInWithEmail(email);
      setStep('otp');
    } catch (error) {
      // Error handling is in the auth context
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp || otp.length < 6) return;
    
    setLoading(true);
    try {
      await verifyOtp(email, otp);
      // Don't set loading to false here - let the auth state change handle it
    } catch (error) {
      // Error handling is in the auth context
      setLoading(false); // Only set to false on error
    }
  };

  const handleBackToEmail = () => {
    setStep('email');
    setOtp('');
  };

  // If user is authenticated, show the children
  if (user) {
    return <>{children}</>;
  }

  // Show authentication form
  return (
    <div
      className="bg-gradient-to-br from-teal-400 via-teal-500 to-teal-600 text-white flex flex-col overflow-hidden"
      style={{ height: '100dvh' }}
    >
      {step === 'email' ? (
        <div
          className="flex-1 flex flex-col min-h-0 px-6"
          style={{
            paddingTop: 'max(env(safe-area-inset-top), 1.5rem)',
            paddingBottom: 'calc(env(safe-area-inset-bottom) + 2.5rem)',
          }}
        >
          {/* Header — pinned to top */}
          <div className="shrink-0 text-center">
            <img src={storkWordmark} alt="Stork" className="mx-auto h-16 sm:h-24 w-auto mb-1" />
            <p className="text-lg sm:text-2xl opacity-90">בוחרים יחד את השם המושלם</p>
            <h2 className="text-base sm:text-xl font-medium mt-1">התחברות או הרשמה</h2>
          </div>

          {/* Art — centered in the flexible zone, height-capped so it never clips */}
          <div className="flex-1 flex items-center justify-center min-h-0 py-4">
            <img
              src={storkLogo}
              alt="Stork carrying baby"
              className="max-h-full max-w-full w-auto object-contain"
            />
          </div>

          {/* Input + CTA — one bottom group, always visible */}
          <form onSubmit={handleSendOTP} noValidate className="shrink-0 w-full max-w-md mx-auto space-y-3">
            <Input
              id="email"
              type="email"
              dir="ltr"
              inputMode="email"
              placeholder="אימייל"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
              className="h-12 sm:h-16 bg-teal-600/60 border-teal-300/50 text-white placeholder:text-teal-100 text-right px-4 sm:px-6 rounded-full text-base sm:text-lg backdrop-blur-sm w-full"
            />
            <Button
              type="submit"
              disabled={loading || !email}
              className="w-full h-12 sm:h-16 bg-[#E8508A] hover:bg-[#D6447D] text-white rounded-full text-base sm:text-lg font-semibold shadow-lg"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white ml-2" />
                  שולח קוד...
                </>
              ) : (
                'שליחת קוד התחברות'
              )}
            </Button>
          </form>
        </div>
      ) : (
        <>
          {/* OTP Step */}
          <div
            className="flex-1 flex flex-col justify-center px-6"
            style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 2.5rem)' }}
          >
            <div className="text-center mb-8 max-w-md mx-auto">
              <KeyRound className="w-12 h-12 mx-auto mb-4 opacity-90" />
              <h2 className="text-xl font-semibold mb-2">
                הזינו את קוד האימות
              </h2>
              <p className="text-sm opacity-80 mb-6">
                שלחנו קוד אימות אל <strong>{email}</strong>
              </p>

              <form onSubmit={handleVerifyOTP} className="space-y-6">
                <Input
                  id="otp"
                  type="text"
                  inputMode="numeric"
                  placeholder="123456"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 8))}
                  required
                  autoFocus
                  className="h-12 sm:h-16 bg-teal-600/60 border-teal-300/50 text-white placeholder:text-teal-100 text-center text-lg sm:text-xl tracking-widest rounded-full backdrop-blur-sm"
                  maxLength={8}
                  dir="ltr"
                  autoComplete="one-time-code"
                />

                <Button
                  type="submit"
                  disabled={loading || otp.length < 6}
                  className="w-full h-12 sm:h-16 bg-[#E8508A] hover:bg-[#D6447D] text-white rounded-full text-base sm:text-lg font-semibold shadow-lg"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white ml-2" />
                      מאמת...
                    </>
                  ) : (
                    'אימות הקוד'
                  )}
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleBackToEmail}
                  className="w-full text-white/80 hover:text-white hover:bg-white/10"
                >
                  שינוי כתובת אימייל
                </Button>
              </form>
            </div>
          </div>
        </>
      )}
    </div>
  );
};