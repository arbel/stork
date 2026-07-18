import { useState, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { KeyRound } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import storkLogo from "@/assets/stork.svg";

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
    if (!otp || otp.length !== 6) return;
    
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
      style={{ height: '100dvh', minHeight: '100vh' }}
    >
      {step === 'email' ? (
        <>
          {/* Top Section - Header & Input - Fixed height */}
          <div className="shrink-0 px-6 pt-4">
            <div className="text-center mb-2">
              <h1 className="text-3xl sm:text-6xl md:text-7xl font-bold tracking-wider mb-1">STORK</h1>
              <p className="text-base sm:text-xl md:text-2xl opacity-90 mb-1">בוחרים יחד את השם המושלם</p>
              <h2 className="text-base sm:text-xl font-medium">התחברות או הרשמה</h2>
            </div>
            
            <div className="max-w-md mx-auto w-full">
              <Input
                id="email"
                type="email"
                dir="ltr"
                placeholder="אימייל"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-12 sm:h-16 bg-teal-600/60 border-teal-300/50 text-white placeholder:text-teal-100 text-left px-4 sm:px-6 rounded-full text-base sm:text-lg backdrop-blur-sm w-full"
              />
            </div>
          </div>

          {/* Middle Section - Stork Image - Flexible, fills remaining space */}
          <div className="flex-1 flex items-center justify-center px-4 py-2 overflow-hidden min-h-0">
            <img 
              src={storkLogo} 
              alt="Stork carrying baby" 
              className="w-full h-full object-contain max-h-full"
            />
          </div>

          {/* Bottom Section - Button - Fixed at bottom */}
          <div className="shrink-0 px-6 pb-6">
            <div className="max-w-md mx-auto">
              <Button
                onClick={handleSendOTP}
                disabled={loading || !email}
                className="w-full h-12 sm:h-16 bg-stone-700 hover:bg-stone-800 text-white rounded-full text-base sm:text-lg font-medium shadow-lg"
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
            </div>
          </div>
        </>
      ) : (
        <>
          {/* OTP Step */}
          <div className="h-screen flex flex-col justify-center px-6">
            <div className="text-center mb-8 max-w-md mx-auto">
              <KeyRound className="w-12 h-12 mx-auto mb-4 opacity-90" />
              <h2 className="text-xl font-semibold mb-2">
                הזינו את קוד האימות
              </h2>
              <p className="text-sm opacity-80 mb-6">
                שלחנו קוד בן 6 ספרות אל <strong>{email}</strong>
              </p>

              <div className="space-y-6">
                <Input
                  id="otp"
                  type="text"
                  placeholder="123456"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  required
                  className="h-12 sm:h-16 bg-teal-600/60 border-teal-300/50 text-white placeholder:text-teal-100 text-center text-lg sm:text-xl tracking-widest rounded-full backdrop-blur-sm"
                  maxLength={6}
                  dir="ltr"
                  autoComplete="one-time-code"
                />

                <Button
                  onClick={handleVerifyOTP}
                  disabled={loading || otp.length !== 6}
                  className="w-full h-12 sm:h-16 bg-stone-700 hover:bg-stone-800 text-white rounded-full text-base sm:text-lg font-medium shadow-lg"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
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
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};