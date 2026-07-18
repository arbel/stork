import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { SearchableSelect, SearchableSelectItem } from "@/components/ui/searchable-select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Heart, Globe, Baby, Languages, ArrowRight, Sparkles } from "lucide-react";
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
    title: "Tell Us About You",
    description: "Your name",
    icon: <Heart className="w-8 h-8 text-primary" />
  },
  {
    title: "Baby's Gender",
    description: "Help us suggest the perfect names",
    icon: <Baby className="w-8 h-8 text-primary" />
  },
  {
    title: "Your Location",
    description: "Names that fit your culture",
    icon: <Globe className="w-8 h-8 text-primary" />
  },
  {
    title: "Preferred Language",
    description: "Names in your language",
    icon: <Languages className="w-8 h-8 text-primary" />
  }
];

const countries = [
  { code: "US", name: "United States", flag: "🇺🇸" },
  { code: "UK", name: "United Kingdom", flag: "🇬🇧" },
  { code: "CA", name: "Canada", flag: "🇨🇦" },
  { code: "AU", name: "Australia", flag: "🇦🇺" },
  { code: "DE", name: "Germany", flag: "🇩🇪" },
  { code: "FR", name: "France", flag: "🇫🇷" },
  { code: "ES", name: "Spain", flag: "🇪🇸" },
  { code: "IT", name: "Italy", flag: "🇮🇹" },
  { code: "IL", name: "Israel", flag: "🇮🇱" },
  { code: "JP", name: "Japan", flag: "🇯🇵" },
  { code: "KR", name: "South Korea", flag: "🇰🇷" },
  { code: "IN", name: "India", flag: "🇮🇳" },
  { code: "BR", name: "Brazil", flag: "🇧🇷" },
  { code: "MX", name: "Mexico", flag: "🇲🇽" },
  { code: "CN", name: "China", flag: "🇨🇳" },
];

const languages = [
  { code: "en", name: "English", native: "English" },
  { code: "es", name: "Spanish", native: "Español" },
  { code: "fr", name: "French", native: "Français" },
  { code: "de", name: "German", native: "Deutsch" },
  { code: "it", name: "Italian", native: "Italiano" },
  { code: "pt", name: "Portuguese", native: "Português" },
  { code: "he", name: "Hebrew", native: "עברית" },
  { code: "ja", name: "Japanese", native: "日本語" },
  { code: "ko", name: "Korean", native: "한국어" },
  { code: "zh", name: "Chinese", native: "中文" },
  { code: "hi", name: "Hindi", native: "हिन्दी" },
];

// Smart language suggestions based on country
const getRecommendedLanguage = (countryCode: string): string => {
  const countryToLanguage: Record<string, string> = {
    "US": "en", "UK": "en", "CA": "en", "AU": "en",
    "DE": "de",
    "FR": "fr", 
    "ES": "es", "MX": "es",
    "IT": "it",
    "IL": "he",
    "JP": "ja",
    "KR": "ko", 
    "IN": "hi",
    "BR": "pt",
    "CN": "zh"
  };
  
  return countryToLanguage[countryCode] || "en";
};

export const Onboarding = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [firstName, setFirstName] = useState<string>("");
  const [gender, setGender] = useState<string>("");
  const [country, setCountry] = useState<string>("");
  const [language, setLanguage] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [adminName, setAdminName] = useState<string>("");
  
  const { updateProfile, profile, user } = useAuth();
  const { partnership } = useSwipe();

  // Check if user is a partner joining with inherited preferences
  const prefs = profile?.preferences as { gender?: string; country?: string; language?: string } | undefined;
  const isPartnerWithInheritedPrefs = profile?.partner_name === 'partner' && prefs && 
    prefs.gender && prefs.country && prefs.language;
    
  console.log('Onboarding - partner check:', {
    partner_name: profile?.partner_name,
    preferences: prefs,
    isPartnerWithInheritedPrefs
  });

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
          setAdminName(data.first_name || data.email?.split('@')[0] || 'your partner');
        }
      }
    };
    loadAdminName();
  }, [isPartnerWithInheritedPrefs, partnership]);

  const canProceed = () => {
    // For partners with inherited preferences, only need first name
    if (isPartnerWithInheritedPrefs) {
      console.log('Partner with inherited prefs - canProceed:', firstName !== "");
      return firstName !== "";
    }
    
    // For regular users, check based on current step
    console.log('Regular user - step:', currentStep, 'values:', { firstName, gender, country, language });
    switch (currentStep) {
      case 0: return firstName !== "";
      case 1: return gender !== "";
      case 2: return country !== "";
      case 3: {
        const result = language !== "";
        console.log('Language step canProceed:', result, 'language:', language);
        return result;
      }
      default: return false;
    }
  };

  const handleNext = async () => {
    console.log('handleNext called - step:', currentStep, 'canProceed:', canProceed(), 'loading:', loading);
    // For partners with inherited preferences, complete onboarding immediately
    if (isPartnerWithInheritedPrefs) {
      setLoading(true);
      try {
        await updateProfile({ 
          first_name: firstName
        });
        
        toast({
          title: "Welcome to the partnership! 🎉",
          description: "You're all set to start finding baby names together!",
          duration: 3000,
        });
      } catch (error) {
        console.error('Error saving name:', error);
        toast({
          title: "Error saving your name",
          description: "Please try again.",
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
      
      // Auto-suggest language when country is selected
      if (currentStep === 2 && country && !language) {
        const recommendedLang = getRecommendedLanguage(country);
        setLanguage(recommendedLang);
      }
    } else {
      // Complete onboarding
      setLoading(true);
      try {
        console.log('Completing onboarding with current values:', { 
          firstName, 
          gender, 
          country, 
          language, 
          currentStep 
        });
        
        // Validate all required fields
        if (!firstName.trim()) {
          throw new Error('First name is required');
        }
        if (!gender || gender === '') {
          throw new Error('Please select a gender preference');
        }
        if (!country) {
          throw new Error('Please select your country');
        }
        if (!language) {
          throw new Error('Please select your preferred language');
        }
        
        const preferences = {
          gender: gender as 'male' | 'female' | 'unknown',
          country,
          language
        };
        
        console.log('About to update profile with validated data:', { 
          first_name: firstName,
          preferences
        });
        
        await updateProfile({ 
          first_name: firstName,
          preferences
        });
        
        console.log('Profile update successful');
        
        toast({
          title: "Welcome to Stork! 🎉",
          description: "Let's find the perfect name for your little one!",
          duration: 3000,
        });
      } catch (error) {
        console.error('Error saving preferences:', error);
        toast({
          title: "Error saving preferences",
          description: "Please try again.",
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

  const getSelectedCountry = () => countries.find(c => c.code === country);
  const getSelectedLanguage = () => languages.find(l => l.code === language);

  // For partners with inherited preferences, show simplified onboarding
  if (isPartnerWithInheritedPrefs) {
    const inheritedCountry = countries.find(c => c.code === prefs?.country);
    const inheritedLanguage = languages.find(l => l.code === prefs?.language);
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
            <h1 className="text-2xl font-bold text-white mb-2">Welcome to Stork!</h1>
            <p className="text-white/90">
              You've joined with <strong>{adminName || 'your partner'}</strong>
            </p>
          </div>

          {/* Step Content */}
          <Card className="p-6 mb-6">
            <div className="text-center mb-6">
              <div className="flex justify-center mb-3">
                <Heart className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-xl font-semibold text-foreground mb-2">
                Complete Your Profile
              </h2>
              <p className="text-muted-foreground">
                Your preferences have been inherited from your partner
              </p>
            </div>

            <div className="space-y-4">
              {/* Name Input */}
              <div className="space-y-2">
                <Label htmlFor="firstName">Your Name</Label>
                <Input
                  id="firstName"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Enter your first name"
                  className="w-full"
                />
              </div>

              {/* Inherited Preferences Display */}
              <div className="space-y-3 pt-4 border-t">
                <Label className="text-sm text-muted-foreground">Inherited Preferences:</Label>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <span className="text-sm font-medium">Baby's Gender:</span>
                    <div className="flex items-center space-x-2">
                      <span className="text-lg">
                        {inheritedGender === 'male' ? '👶🏻' : inheritedGender === 'female' ? '👧🏻' : '❓'}
                      </span>
                      <span className="capitalize">{inheritedGender === 'unknown' ? "Don't know yet" : inheritedGender}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <span className="text-sm font-medium">Location:</span>
                    <div className="flex items-center space-x-2">
                      <span>{inheritedCountry?.flag}</span>
                      <span>{inheritedCountry?.name}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <span className="text-sm font-medium">Language:</span>
                    <div className="flex items-center space-x-2">
                      <span>{inheritedLanguage?.name}</span>
                      <span className="text-muted-foreground">({inheritedLanguage?.native})</span>
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
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Saving...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Start Swiping Together!
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
          <h1 className="text-2xl font-bold text-white">Welcome to Stork</h1>
          <p className="text-white/90">Let's personalize your experience</p>
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
                <Label htmlFor="firstName">Your Name</Label>
                <Input
                  id="firstName"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Enter your first name"
                  className="w-full"
                />
              </div>
            </div>
          )}

          {/* Step 2: Gender Selection */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <RadioGroup value={gender} onValueChange={setGender} className="space-y-3">
                <div className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                  <RadioGroupItem value="male" id="male" />
                  <Label htmlFor="male" className="flex-1 cursor-pointer flex items-center space-x-2">
                    <span className="text-lg">👶🏻</span>
                    <span>Boy</span>
                  </Label>
                </div>
                <div className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                  <RadioGroupItem value="female" id="female" />
                  <Label htmlFor="female" className="flex-1 cursor-pointer flex items-center space-x-2">
                    <span className="text-lg">👧🏻</span>
                    <span>Girl</span>
                  </Label>
                </div>
                <div className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                  <RadioGroupItem value="unknown" id="unknown" />
                  <Label htmlFor="unknown" className="flex-1 cursor-pointer flex items-center space-x-2">
                    <span className="text-lg">❓</span>
                    <span>I don't know yet</span>
                  </Label>
                </div>
              </RadioGroup>
            </div>
          )}

          {/* Step 3: Country Selection */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <SearchableSelect 
                value={country} 
                onValueChange={(value) => {
                  setCountry(value);
                  // Auto-suggest language based on country
                  if (!language) {
                    const recommendedLang = getRecommendedLanguage(value);
                    setLanguage(recommendedLang);
                  }
                }}
                placeholder={getSelectedCountry() ? (
                  <div className="flex items-center space-x-2">
                    <span>{getSelectedCountry()?.flag}</span>
                    <span>{getSelectedCountry()?.name}</span>
                  </div>
                ) : "Select your country"}
                className="w-full"
              >
                {countries.map((country) => (
                  <SearchableSelectItem 
                    key={country.code} 
                    value={country.code} 
                    searchText={country.name.toLowerCase()}
                  >
                    <div className="flex items-center space-x-2">
                      <span>{country.flag}</span>
                      <span>{country.name}</span>
                    </div>
                  </SearchableSelectItem>
                ))}
              </SearchableSelect>
              {country && (
                <div className="text-center">
                  <Badge variant="secondary" className="bg-primary/10 text-primary">
                    Great choice! Names popular in {getSelectedCountry()?.name}
                  </Badge>
                  {language && (
                    <div className="mt-2">
                      <Badge variant="secondary" className="bg-secondary/20 text-secondary-foreground text-xs">
                        Suggested: {getSelectedLanguage()?.name} names
                      </Badge>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Step 4: Language Selection */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <SearchableSelect 
                value={language} 
                onValueChange={setLanguage}
                placeholder={getSelectedLanguage() ? (
                  <div className="flex items-center space-x-2">
                    <span>{getSelectedLanguage()?.name}</span>
                    <span className="text-muted-foreground">({getSelectedLanguage()?.native})</span>
                  </div>
                ) : "Select your preferred language"}
                className="w-full"
              >
                {languages.map((lang) => (
                  <SearchableSelectItem 
                    key={lang.code} 
                    value={lang.code} 
                    searchText={lang.name.toLowerCase()}
                  >
                    <div className="flex items-center space-x-2">
                      <span>{lang.name}</span>
                      <span className="text-muted-foreground">({lang.native})</span>
                    </div>
                  </SearchableSelectItem>
                ))}
              </SearchableSelect>
              {language && (
                <div className="text-center space-y-2">
                  <Badge variant="secondary" className="bg-primary/10 text-primary">
                    Perfect! Names in {getSelectedLanguage()?.name}
                  </Badge>
                  {country && language === getRecommendedLanguage(country) && (
                    <div>
                      <Badge variant="secondary" className="bg-match/20 text-match text-xs">
                        ✨ Perfect match for {getSelectedCountry()?.name}!
                      </Badge>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </Card>

        {/* Navigation Buttons */}
        <div className="flex space-x-3">
          {currentStep > 0 && (
            <Button
              variant="outline"
              onClick={handleBack}
              className="flex-1"
            >
              Back
            </Button>
          )}
          <Button
            onClick={() => {
              console.log('Button clicked!', { canProceed: canProceed(), loading, currentStep, language });
              handleNext();
            }}
            disabled={!canProceed() || loading}
            className={`${currentStep === 0 ? 'flex-1' : 'flex-1'} love-button`}
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Saving...
              </>
            ) : currentStep === steps.length - 1 ? (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Start Swiping!
              </>
            ) : (
              <>
                Next
                <ArrowRight className="w-4 h-4 ml-2" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};