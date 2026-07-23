import { useState, useEffect } from "react";
import { Heart, ArrowLeft, Sparkles, Copy, Check } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useSwipe } from "@/contexts/SwipeContext";
import { supabase } from "@/integrations/supabase/client";
import { buildInviteUrl } from "@/lib/appUrl";

const FONT = "'Assistant', system-ui, sans-serif";

const genderOptions = [
  { value: "male", emoji: "👶", label: "בן" },
  { value: "female", emoji: "👧", label: "בת" },
  { value: "unknown", emoji: "👶👶", label: "עדיין לא יודעים", sub: "או שאתם מצפים לתאומים" },
];

// Origin groups the user can include/exclude. Values match the names.origin_group column.
const originGroupOptions = [
  { value: "biblical", label: "מקראי" },
  { value: "hebrew", label: "עברי / מודרני" },
  { value: "ethiopian", label: "אתיופי" },
  { value: "arabic", label: "ערבי" },
  { value: "sephardi", label: "ספרדי / לדינו" },
  { value: "european", label: "אירופי" },
  { value: "slavic", label: "רוסי / סלאבי" },
  { value: "yiddish", label: "יידיש" },
  { value: "persian_aramaic", label: "פרסי / ארמי" },
];
const ALL_ORIGIN_GROUPS = originGroupOptions.map((o) => o.value);

const bgStyle = {
  backgroundImage: "url(/bg-base.webp)",
  backgroundSize: "cover",
  backgroundPosition: "center",
} as const;

const ProgressDots = ({ step }: { step: number }) => (
  <div className="flex justify-center gap-2 mt-4">
    {[0, 1, 2, 3].map((i) => (
      <span
        key={i}
        className="h-1.5 rounded-full transition-all duration-300"
        style={{ width: i === step ? 22 : 6, background: i === step ? "#fff" : "rgba(255,255,255,.5)" }}
      />
    ))}
  </div>
);

export const Onboarding = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [firstName, setFirstName] = useState<string>("");
  const [gender, setGender] = useState<string>("");
  const [originGroups, setOriginGroups] = useState<string[]>(ALL_ORIGIN_GROUPS);
  const [loading, setLoading] = useState(false);
  const [adminName, setAdminName] = useState<string>("");
  const [inviteCode, setInviteCode] = useState<string>("");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const { updateProfile, profile, user } = useAuth();
  const { partnership } = useSwipe();

  // Check if user is a partner joining with inherited preferences
  const prefs = profile?.preferences as { gender?: string } | undefined;
  const isPartnerWithInheritedPrefs = profile?.partner_name === 'partner' && prefs &&
    prefs.gender;

  // Load admin's name for partners
  useEffect(() => {
    const loadAdminName = async () => {
      if (isPartnerWithInheritedPrefs && partnership?.user1_id) {
        const { data } = await supabase
          .from('profiles')
          .select('first_name, email')
          .eq('user_id', partnership.user1_id)
          .maybeSingle();

        if (data) {
          setAdminName(data.first_name || data.email?.split('@')[0] || 'בן/בת הזוג שלך');
        }
      }
    };
    loadAdminName();
  }, [isPartnerWithInheritedPrefs, partnership]);

  const canProceed = () => {
    if (isPartnerWithInheritedPrefs) {
      return firstName !== "";
    }
    switch (currentStep) {
      case 0: return firstName !== "";
      case 1: return gender !== "";
      case 2: return originGroups.length > 0; // must keep at least one origin
      case 3: return true; // partner invite is optional
      default: return false;
    }
  };

  const toggleOriginGroup = (value: string) => {
    setOriginGroups((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    );
  };

  const inviteUrl = inviteCode ? buildInviteUrl(inviteCode) : "";

  // Create (or load) the pending partnership so we have an invite link to share.
  const ensureInvite = async () => {
    if (!user || inviteCode || inviteLoading) return;
    setInviteLoading(true);
    try {
      // Take the most recent existing partnership. Using .maybeSingle() here would ERROR when the
      // user already has >1 row, and (unchecked) fall through to INSERT a duplicate — the source of
      // the orphan partnerships. Order + limit(1) avoids that.
      const { data: existing, error: existingError } = await supabase
        .from('partnerships')
        .select('invite_code')
        .eq('user1_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (existingError) throw existingError;

      if (existing?.invite_code) {
        setInviteCode(existing.invite_code);
      } else {
        const { data: newPartnership, error } = await supabase
          .from('partnerships')
          .insert({ user1_id: user.id, status: 'pending' })
          .select('invite_code')
          .single();
        if (error) throw error;
        setInviteCode(newPartnership.invite_code);
      }
    } catch (error) {
      console.error('Error creating invite:', error);
      toast({
        title: "שגיאה ביצירת ההזמנה",
        description: "אפשר להזמין את בן/בת הזוג גם מאוחר יותר.",
        variant: "destructive",
      });
    } finally {
      setInviteLoading(false);
    }
  };

  const copyInvite = async () => {
    if (!inviteUrl) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({ title: "הקישור הועתק!", description: "שתפו אותו עם בן/בת הזוג." });
    } catch {
      toast({
        title: "ההעתקה נכשלה",
        description: "אנא העתיקו את הקישור ידנית.",
        variant: "destructive",
      });
    }
  };

  // Persist name + preferences, completing onboarding.
  const completeOnboarding = async () => {
    setLoading(true);
    try {
      if (!firstName.trim()) throw new Error('נדרש שם פרטי');
      if (!gender) throw new Error('אנא בחרו את מין התינוק');

      const preferences = {
        gender: gender as 'male' | 'female' | 'unknown',
        language: 'he',
        // Empty selection = no filtering (show everything) rather than an empty deck.
        originGroups: originGroups.length ? originGroups : ALL_ORIGIN_GROUPS,
      };

      await updateProfile({ first_name: firstName, preferences });

      toast({
        title: "ברוכים הבאים לסטורק! 🎉",
        description: "בואו נמצא את השם המושלם לקטן/ה שלכם!",
        duration: 3000,
      });
    } catch (error) {
      console.error('Error saving preferences:', error);
      toast({
        title: "שגיאה בשמירת ההעדפות",
        description: "אנא נסו שוב.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleNext = async () => {
    // For partners with inherited preferences, complete onboarding immediately
    if (isPartnerWithInheritedPrefs) {
      setLoading(true);
      try {
        await updateProfile({ first_name: firstName });
        toast({
          title: "ברוכים הבאים לשותפות! 🎉",
          description: "אתם מוכנים למצוא יחד שמות לתינוק!",
          duration: 3000,
        });
      } catch (error) {
        console.error('Error saving name:', error);
        toast({
          title: "שגיאה בשמירת השם",
          description: "אנא נסו שוב.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
      return;
    }

    // Regular onboarding flow
    if (currentStep === 0) {
      setCurrentStep(1);
    } else if (currentStep === 1) {
      setCurrentStep(2);
    } else if (currentStep === 2) {
      // Moving to the partner-invite step — prepare the invite link.
      // NB: don't save preferences yet, or onboarding would complete and unmount this screen.
      setCurrentStep(3);
      ensureInvite();
    } else {
      await completeOnboarding();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const inputClass =
    "w-full rounded-xl border-[1.5px] border-[#E7E7E7] px-4 py-[15px] text-[15px] font-medium text-[#23282B] placeholder:text-[#B4B4B4] outline-none focus:border-[#24C065] transition-colors";
  const primaryBtnClass =
    "flex items-center justify-center gap-2 rounded-[14px] bg-[#24C065] font-extrabold text-white shadow-[0_12px_26px_-12px_rgba(36,192,101,.6)] disabled:opacity-50 disabled:shadow-none transition-all hover:bg-[#1FAE5A]";

  // For partners with inherited preferences, show simplified onboarding
  if (isPartnerWithInheritedPrefs) {
    const inheritedGender = prefs?.gender;
    const genderLabel = inheritedGender === 'male' ? 'בן' : inheritedGender === 'female' ? 'בת' : 'עדיין לא יודעים';
    const genderEmoji = inheritedGender === 'male' ? '👶' : inheritedGender === 'female' ? '👧' : '👶👶';

    return (
      <div className="min-h-[100dvh] w-full flex justify-center" style={{ ...bgStyle, fontFamily: FONT }}>
        <div className="w-full max-w-md flex flex-col min-h-[100dvh]">
          {/* Hero */}
          <div className="text-center px-6 pt-11">
            <Heart className="mx-auto text-white" style={{ width: 34, height: 34 }} strokeWidth={2} />
            <div className="text-[22px] font-extrabold text-white mt-2">ברוכים הבאים ל-Stork</div>
            <div className="text-sm font-medium text-[#E4F5F1] mt-1">
              הצטרפתם אל <strong>{adminName || 'בן/בת הזוג שלך'}</strong>
            </div>
          </div>

          <div className="flex-1" />

          {/* Bottom sheet */}
          <div
            className="bg-white rounded-t-[30px] px-6 pt-7 shadow-[0_-14px_34px_-20px_rgba(0,0,0,.35)]"
            style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 2rem)' }}
          >
            <div className="text-[12px] font-bold text-[#E8508A] tracking-wide">השלמת הפרופיל</div>
            <div className="text-[23px] font-extrabold text-[#23282B] mt-1.5">השלימו את הפרופיל שלכם</div>
            <div className="text-sm font-medium text-[#8C8478] mt-1">ההעדפות שלכם נורשו מבן/בת הזוג</div>

            <div className="text-[13px] font-bold text-[#5A554C] mt-5 mb-2">השם שלכם</div>
            <input
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="הזינו את שמכם הפרטי"
              className={inputClass}
            />

            {/* Inherited gender */}
            <div className="text-[13px] font-bold text-[#5A554C] mt-5 mb-2">מין התינוק</div>
            <div className="flex items-center gap-3 rounded-[14px] border-[1.5px] border-[#ECECEC] bg-[#F7F7F5] px-3.5 py-3.5">
              <span className="text-[19px]">{genderEmoji}</span>
              <span className="text-[15px] font-bold text-[#23282B]">{genderLabel}</span>
            </div>

            <button
              onClick={handleNext}
              disabled={!canProceed() || loading}
              className={`${primaryBtnClass} w-full mt-5 py-4 text-[15px]`}
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                  שומר...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" fill="currentColor" strokeWidth={0} />
                  מתחילים להחליק יחד!
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] w-full flex justify-center" style={{ ...bgStyle, fontFamily: FONT }}>
      <div className="w-full max-w-md flex flex-col min-h-[100dvh]">
        {/* Hero */}
        <div className="text-center px-6 pt-11">
          <Heart
            className="mx-auto text-white"
            style={{ width: currentStep === 0 ? 34 : 30, height: currentStep === 0 ? 34 : 30 }}
            strokeWidth={2}
          />
          <div className={`font-extrabold text-white mt-2 ${currentStep === 0 ? 'text-[24px]' : 'text-[22px]'}`}>
            ברוכים הבאים ל-Stork
          </div>
          {currentStep === 0 && (
            <div className="text-sm font-medium text-[#E4F5F1] mt-1">בואו נתאים את החוויה עבורכם</div>
          )}
          <ProgressDots step={currentStep} />
        </div>

        <div className="flex-1" />

        {/* Bottom sheet */}
        <div
          className="bg-white rounded-t-[30px] px-6 pt-7 shadow-[0_-14px_34px_-20px_rgba(0,0,0,.35)]"
          style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 2rem)' }}
        >
          {currentStep === 0 && (
            <>
              <div className="text-[12px] font-bold text-[#E8508A] tracking-wide">שלב 1 · עליכם</div>
              <div className="text-[23px] font-extrabold text-[#23282B] mt-1.5">ספרו לנו עליכם</div>
              <div className="text-sm font-medium text-[#8C8478] mt-1">איך לקרוא לכם?</div>

              <div className="text-[13px] font-bold text-[#5A554C] mt-5 mb-2">השם שלכם</div>
              <input
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && canProceed()) handleNext(); }}
                placeholder="הזינו את שמכם הפרטי"
                className={inputClass}
                autoFocus
              />

              <button
                onClick={handleNext}
                disabled={!canProceed() || loading}
                className={`${primaryBtnClass} w-full mt-5 py-4 text-[15px]`}
              >
                הבא
                <ArrowLeft className="w-[18px] h-[18px]" />
              </button>
            </>
          )}

          {currentStep === 1 && (
            <>
              <div className="text-[12px] font-bold text-[#E8508A] tracking-wide">שלב 2 · מין התינוק</div>
              <div className="text-[23px] font-extrabold text-[#23282B] mt-1.5">בן, בת, או הפתעה?</div>
              <div className="text-sm font-medium text-[#8C8478] mt-1">עוזר לנו להציע את השמות המושלמים</div>

              <div className="flex flex-col gap-2.5 mt-[18px]">
                {genderOptions.map((opt) => {
                  const selected = gender === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setGender(opt.value)}
                      className={`flex items-center gap-3 rounded-[14px] border-[1.5px] px-3.5 py-3.5 text-start transition-colors ${
                        selected ? 'border-[#E8508A] bg-[#FDF2F6]' : 'border-[#ECECEC] bg-white'
                      }`}
                    >
                      <span
                        className="rounded-full flex-shrink-0 box-border"
                        style={{
                          width: 20,
                          height: 20,
                          border: selected ? '6px solid #E8508A' : '2px solid #D2D2D2',
                        }}
                      />
                      <span className="text-[19px] leading-none">{opt.emoji}</span>
                      <span className="leading-[1.25]">
                        <span className="block text-[15px] font-bold text-[#23282B]">{opt.label}</span>
                        {opt.sub && (
                          <span className="block text-[12px] font-semibold text-[#9A928A]">{opt.sub}</span>
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="flex gap-3 mt-[18px]">
                <button
                  onClick={handleBack}
                  disabled={loading}
                  className="rounded-[14px] bg-[#F3F3F3] font-extrabold text-[#8C8478] py-[15px] px-4 disabled:opacity-50"
                  style={{ flex: "0 0 36%" }}
                >
                  חזרה
                </button>
                <button
                  onClick={handleNext}
                  disabled={!canProceed() || loading}
                  className={`${primaryBtnClass} flex-1 py-[15px] px-3 text-[14px] whitespace-nowrap`}
                >
                  הבא
                  <ArrowLeft className="w-[18px] h-[18px]" />
                </button>
              </div>
            </>
          )}

          {currentStep === 2 && (
            <>
              <div className="text-[12px] font-bold text-[#E8508A] tracking-wide">שלב 3 · מקור השמות</div>
              <div className="text-[23px] font-extrabold text-[#23282B] mt-1.5">אילו שמות להציג?</div>
              <div className="text-sm font-medium text-[#8C8478] mt-1">בחרו את הקטגוריות שמעניינות אתכם</div>

              <div className="grid grid-cols-2 gap-2.5 mt-[18px]">
                {originGroupOptions.map((opt) => {
                  const selected = originGroups.includes(opt.value);
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => toggleOriginGroup(opt.value)}
                      aria-pressed={selected}
                      className={`flex w-full items-center justify-center gap-1 whitespace-nowrap rounded-full border-[1.5px] px-3 py-2.5 text-[14px] font-bold transition-colors ${
                        selected
                          ? 'border-[#24C065] bg-[#EAF9F0] text-[#1E9E52]'
                          : 'border-[#ECECEC] bg-[#F7F7F5] text-[#8C8478]'
                      }`}
                    >
                      <Check
                        aria-hidden
                        strokeWidth={3}
                        className={`w-4 h-4 flex-shrink-0 transition-opacity ${selected ? 'opacity-100' : 'opacity-0'}`}
                      />
                      {opt.label}
                    </button>
                  );
                })}
              </div>

              <div className="text-center text-[12.5px] font-semibold text-[#9A928A] mt-4">
                אפשר לשנות בכל רגע מההגדרות
              </div>

              <div className="flex gap-3 mt-[18px]">
                <button
                  onClick={handleBack}
                  disabled={loading}
                  className="rounded-[14px] bg-[#F3F3F3] font-extrabold text-[#8C8478] py-[15px] px-4 disabled:opacity-50"
                  style={{ flex: "0 0 36%" }}
                >
                  חזרה
                </button>
                <button
                  onClick={handleNext}
                  disabled={!canProceed() || loading}
                  className={`${primaryBtnClass} flex-1 py-[15px] px-3 text-[14px] whitespace-nowrap`}
                >
                  הבא
                  <ArrowLeft className="w-[18px] h-[18px]" />
                </button>
              </div>
            </>
          )}

          {currentStep === 3 && (
            <>
              <div className="text-[12px] font-bold text-[#E8508A] tracking-wide">שלב 4 · בן/בת זוג</div>
              <div className="text-[23px] font-extrabold text-[#23282B] mt-1.5">בוחרים שמות יחד</div>
              <div className="text-sm font-medium text-[#8C8478] mt-1">
                שתפו את הקישור — תקבלו התראה כשבן/בת הזוג יצטרפו!
              </div>

              <div className="flex gap-2 mt-[18px]">
                <button
                  type="button"
                  onClick={copyInvite}
                  disabled={!inviteUrl}
                  aria-label="העתקת הקישור"
                  className="flex-shrink-0 w-12 rounded-xl bg-[#F3F3F3] flex items-center justify-center disabled:opacity-50 transition-colors hover:bg-[#EAEAEA]"
                >
                  {copied ? (
                    <Check className="w-[18px] h-[18px] text-[#1E9E52]" />
                  ) : (
                    <Copy className="w-[18px] h-[18px] text-[#5A554C]" />
                  )}
                </button>
                <div
                  dir="ltr"
                  className="flex-1 min-w-0 rounded-xl border-[1.5px] border-[#E7E7E7] px-3 py-[13px] text-[12px] font-semibold text-[#8C8478] whitespace-nowrap overflow-hidden text-ellipsis"
                >
                  {inviteLoading ? "יוצר קישור…" : inviteUrl || "—"}
                </div>
              </div>

              <div className="flex gap-3 mt-[18px]">
                <button
                  onClick={handleBack}
                  disabled={loading}
                  className="rounded-[14px] bg-[#F3F3F3] font-extrabold text-[#8C8478] py-[15px] px-4 disabled:opacity-50"
                  style={{ flex: "0 0 30%" }}
                >
                  חזרה
                </button>
                <button
                  onClick={handleNext}
                  disabled={loading}
                  className={`${primaryBtnClass} flex-1 py-[15px] px-3 text-[14px] whitespace-nowrap`}
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                      שומר...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 flex-shrink-0" fill="currentColor" strokeWidth={0} />
                      מתחילים להחליק!
                    </>
                  )}
                </button>
              </div>

              <button
                onClick={completeOnboarding}
                disabled={loading}
                className="w-full mt-3 font-bold text-[13.5px] text-[#2AA697] disabled:opacity-50"
              >
                אפשר להזמין גם מאוחר יותר · דילוג ←
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
