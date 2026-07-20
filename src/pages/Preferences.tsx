import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowRight, Save, Baby, User, Check } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useSwipe } from "@/contexts/SwipeContext";

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

const Preferences = () => {
  const navigate = useNavigate();
  const { profile, updateProfile, user } = useAuth();
  const { partnership } = useSwipe();
  const [loading, setLoading] = useState(false);

  // Check if user is admin of the partnership
  const isAdmin = partnership?.user1_id === user?.id;

  const [gender, setGender] = useState<'male' | 'female' | 'unknown'>(profile?.preferences?.gender || "unknown");
  const [originGroups, setOriginGroups] = useState<string[]>(
    (profile?.preferences as { originGroups?: string[] })?.originGroups ?? ALL_ORIGIN_GROUPS
  );

  useEffect(() => {
    if (profile?.preferences) {
      setGender(profile.preferences.gender);
      const saved = (profile.preferences as { originGroups?: string[] }).originGroups;
      setOriginGroups(saved && saved.length ? saved : ALL_ORIGIN_GROUPS);
    }
  }, [profile]);

  const toggleOriginGroup = (value: string) => {
    if (!isAdmin) return;
    setOriginGroups((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    );
  };

  const handleSave = async () => {
    setLoading(true);
    await updateProfile({
      preferences: {
        gender: gender as 'male' | 'female' | 'unknown',
        language: 'he',
        originGroups: originGroups.length ? originGroups : ALL_ORIGIN_GROUPS,
      }
    });
    setLoading(false);
  };

  const genderOptions = [
    { value: 'male', emoji: '👶', label: 'בן' },
    { value: 'female', emoji: '👧', label: 'בת' },
    { value: 'unknown', emoji: '👶👶', label: 'עדיין לא יודעים' },
  ] as const;

  return (
    <div
      className="h-[100dvh] flex flex-col"
      style={{
        backgroundImage: 'url(/bg-base.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {/* Header */}
      <div className="shrink-0 p-4">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/")}
            className="p-2 text-white hover:bg-white/10"
          >
            <ArrowRight className="w-5 h-5" />
          </Button>

          <h1 className="text-lg font-bold text-white truncate flex-1 text-center mx-4">
            ההעדפות שלי
          </h1>

          <div className="w-10"></div>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-4 pb-6">
        <div className="max-w-md mx-auto space-y-6">
          {/* Read-only message for partners */}
          {!isAdmin && (
            <Card className="p-4 border-blue-200 bg-blue-50">
              <div className="flex items-center gap-3">
                <User className="w-5 h-5 text-blue-600 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-blue-900">גישת בן/בת זוג</p>
                  <p className="text-xs text-blue-700">ההעדפות מנוהלות על ידי מנהל השותפות</p>
                </div>
              </div>
            </Card>
          )}

          {/* Baby Gender */}
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <Baby className="w-6 h-6 text-primary shrink-0" />
              <div>
                <h3 className="font-semibold text-foreground">מין התינוק</h3>
                <p className="text-sm text-muted-foreground">כדי שנוכל להציע את השמות המושלמים</p>
              </div>
            </div>

            <div className="space-y-3" role="radiogroup" aria-label="מין התינוק">
              {genderOptions.map((opt) => {
                const selected = gender === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => { if (isAdmin) setGender(opt.value); }}
                    disabled={!isAdmin}
                    className={`w-full flex items-center gap-3 rounded-[14px] border-[1.5px] px-3.5 py-3.5 text-start transition-colors ${
                      selected ? 'border-[#E8508A] bg-[#FDF2F6]' : 'border-[#ECECEC] bg-white'
                    } ${isAdmin ? 'cursor-pointer' : 'opacity-60 cursor-not-allowed'}`}
                  >
                    <span
                      className="rounded-full flex-shrink-0 box-border"
                      style={{ width: 20, height: 20, border: selected ? '6px solid #E8508A' : '2px solid #D2D2D2' }}
                    />
                    <span className="text-[19px] leading-none">{opt.emoji}</span>
                    <span className="text-[15px] font-bold text-[#23282B]">{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </Card>

          {/* Name origin filter */}
          <Card className="p-6">
            <div className="mb-4">
              <div className="text-[12px] font-bold text-[#E8508A] tracking-wide">מקור השמות</div>
              <h3 className="text-[22px] font-extrabold text-foreground mt-1">אילו שמות להציג?</h3>
              <p className="text-sm text-muted-foreground mt-1">בחרו את הקטגוריות שמעניינות אתכם</p>
            </div>

            <div className={`grid grid-cols-2 gap-2.5 ${isAdmin ? '' : 'opacity-60'}`}>
              {originGroupOptions.map((opt) => {
                const selected = originGroups.includes(opt.value);
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => toggleOriginGroup(opt.value)}
                    disabled={!isAdmin}
                    aria-pressed={selected}
                    className={`flex w-full items-center justify-center gap-1 whitespace-nowrap rounded-full border-[1.5px] px-3 py-2.5 text-[14px] font-bold transition-colors ${
                      selected
                        ? 'border-[#24C065] bg-[#EAF9F0] text-[#1E9E52]'
                        : 'border-[#ECECEC] bg-[#F7F7F5] text-[#8C8478]'
                    } ${isAdmin ? '' : 'cursor-not-allowed'}`}
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
          </Card>
        </div>
      </div>

      {/* Pinned Save Button - Only for admins */}
      {isAdmin && (
        <div
          className="shrink-0 px-4 pt-3 bg-white/10 backdrop-blur-sm"
          style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 0.75rem)' }}
        >
          <div className="max-w-md mx-auto">
            <Button
              onClick={handleSave}
              disabled={loading || !gender}
              className="w-full h-12 rounded-[14px] bg-[#E8508A] hover:bg-[#D6447D] text-white font-extrabold shadow-[0_12px_26px_-12px_rgba(232,80,138,.6)] transition-colors"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white ml-2" />
                  שומר...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 ml-2" />
                  שמירת ההעדפות
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Preferences;
