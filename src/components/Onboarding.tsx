import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Heart, Baby, ArrowLeft, Sparkles } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useSwipe } from "@/contexts/SwipeContext";
import { supabase } from "@/integrations/supabase/client";

interface OnboardingStep {
  title: string;
  description: string;
  icon: React.ReactNode;
}

const steps: OnboardingStep[] = [
  {
    title: "ספרו לנו עליכם",
    description: "השם שלכם",
    icon: <Heart className="w-8 h-8 text-primary" />
  },
  {
    title: "מין התינוק",
    description: "כדי שנוכל להציע את השמות המושלמים",
    icon: <Baby className="w-8 h-8 text-primary" />
  }
];

export const Onboarding = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [firstName, setFirstName] = useState<string>("");
  const [gender, setGender] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [adminName, setAdminName] = useState<string>("");

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
    // For partners with inherited preferences, only need first name
    if (isPartnerWithInheritedPrefs) {
      return firstName !== "";
    }

    // For regular users, check based on current step
    switch (currentStep) {
      case 0: return firstName !== "";
      case 1: return gender !== "";
      default: return false;
    }
  };

  const handleNext = async () => {
    // For partners with inherited preferences, complete onboarding immediately
    if (isPartnerWithInheritedPrefs) {
      setLoading(true);
      try {
        await updateProfile({
          first_name: firstName
        });

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
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      // Complete onboarding
      setLoading(true);
      try {
        // Validate all required fields
        if (!firstName.trim()) {
          throw new Error('נדרש שם פרטי');
        }
        if (!gender || gender === '') {
          throw new Error('אנא בחרו את מין התינוק');
        }

        const preferences = {
          gender: gender as 'male' | 'female' | 'unknown',
          language: 'he'
        };

        await updateProfile({
          first_name: firstName,
          preferences
        });

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
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  // For partners with inherited preferences, show simplified onboarding
  if (isPartnerWithInheritedPrefs) {
    const inheritedGender = prefs?.gender;

    return (
      <div
        className="min-h-screen flex items-center justify-center p-4"
        style={{
          backgroundImage: 'url(/bg-base.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      >
        <div className="relative z-10 w-full max-w-md">
          {/* Header */}
          <div className="text-center mb-6">
            <Heart className="w-10 h-10 text-white mx-auto mb-3" />
            <h1 className="text-2xl font-bold text-white mb-2">ברוכים הבאים לסטורק!</h1>
            <p className="text-white/90">
              הצטרפתם אל <strong>{adminName || 'בן/בת הזוג שלך'}</strong>
            </p>
          </div>

          {/* Step Content */}
          <Card className="p-6 mb-6">
            <div className="text-center mb-6">
              <div className="flex justify-center mb-3">
                <Heart className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-xl font-semibold text-foreground mb-2">
                השלימו את הפרופיל שלכם
              </h2>
              <p className="text-muted-foreground">
                ההעדפות שלכם נורשו מבן/בת הזוג
              </p>
            </div>

            <div className="space-y-4">
              {/* Name Input */}
              <div className="space-y-2">
                <Label htmlFor="firstName">השם שלכם</Label>
                <Input
                  id="firstName"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="הזינו את שמכם הפרטי"
                  className="w-full"
                />
              </div>

              {/* Inherited Preferences Display */}
              <div className="space-y-3 pt-4 border-t">
                <Label className="text-sm text-muted-foreground">העדפות שנורשו:</Label>

                <div className="space-y-2">
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <span className="text-sm font-medium">מין התינוק:</span>
                    <div className="flex items-center space-x-2 space-x-reverse">
                      <span className="text-lg">
                        {inheritedGender === 'male' ? '👶🏻' : inheritedGender === 'female' ? '👧🏻' : '❓'}
                      </span>
                      <span>{inheritedGender === 'male' ? 'בן' : inheritedGender === 'female' ? 'בת' : 'עדיין לא יודעים'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Complete Button */}
          <Button
            onClick={handleNext}
            disabled={!canProceed() || loading}
            className="w-full love-button"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white ml-2" />
                שומר...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 ml-2" />
                מתחילים להחליק יחד!
              </>
            )}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        backgroundImage: 'url(/bg-base.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      }}
    >
      <div className="relative z-10 w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <Heart className="w-10 h-10 text-white mx-auto mb-3" />
          <h1 className="text-2xl font-bold text-white">ברוכים הבאים לסטורק</h1>
          <p className="text-white/90">בואו נתאים לכם את החוויה</p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            {steps.map((_, index) => (
              <div
                key={index}
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                  index <= currentStep
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {index + 1}
              </div>
            ))}
          </div>
          <div className="w-full bg-muted rounded-full h-2">
            <div
              className="bg-primary h-2 rounded-full transition-all duration-300"
              style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Step Content */}
        <Card className="p-6 mb-6">
          <div className="text-center mb-6">
            <div className="flex justify-center mb-3">
              {steps[currentStep].icon}
            </div>
            <h2 className="text-xl font-semibold text-foreground mb-2">
              {steps[currentStep].title}
            </h2>
            <p className="text-muted-foreground">
              {steps[currentStep].description}
            </p>
          </div>

          {/* Step 1: Name */}
          {currentStep === 0 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">השם שלכם</Label>
                <Input
                  id="firstName"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="הזינו את שמכם הפרטי"
                  className="w-full"
                />
              </div>
            </div>
          )}

          {/* Step 2: Gender Selection */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <RadioGroup value={gender} onValueChange={setGender} className="space-y-3">
                <div className="flex items-center space-x-3 space-x-reverse p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                  <RadioGroupItem value="male" id="male" />
                  <Label htmlFor="male" className="flex-1 cursor-pointer flex items-center space-x-2 space-x-reverse">
                    <span className="text-lg">👶🏻</span>
                    <span>בן</span>
                  </Label>
                </div>
                <div className="flex items-center space-x-3 space-x-reverse p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                  <RadioGroupItem value="female" id="female" />
                  <Label htmlFor="female" className="flex-1 cursor-pointer flex items-center space-x-2 space-x-reverse">
                    <span className="text-lg">👧🏻</span>
                    <span>בת</span>
                  </Label>
                </div>
                <div className="flex items-center space-x-3 space-x-reverse p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                  <RadioGroupItem value="unknown" id="unknown" />
                  <Label htmlFor="unknown" className="flex-1 cursor-pointer flex items-center space-x-2 space-x-reverse">
                    <span className="text-lg">❓</span>
                    <span>עדיין לא יודעים</span>
                  </Label>
                </div>
              </RadioGroup>
            </div>
          )}
        </Card>

        {/* Navigation Buttons */}
        <div className="flex space-x-3 space-x-reverse">
          {currentStep > 0 && (
            <Button
              variant="outline"
              onClick={handleBack}
              className="flex-1"
            >
              חזרה
            </Button>
          )}
          <Button
            onClick={handleNext}
            disabled={!canProceed() || loading}
            className="flex-1 love-button"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white ml-2" />
                שומר...
              </>
            ) : currentStep === steps.length - 1 ? (
              <>
                <Sparkles className="w-4 h-4 ml-2" />
                מתחילים להחליק!
              </>
            ) : (
              <>
                הבא
                <ArrowLeft className="w-4 h-4 mr-2" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};
