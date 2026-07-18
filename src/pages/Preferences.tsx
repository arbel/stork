import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SearchableSelect, SearchableSelectItem } from "@/components/ui/searchable-select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Save, Baby, Globe, Languages, User } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useSwipe } from "@/contexts/SwipeContext";

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

const Preferences = () => {
  const navigate = useNavigate();
  const { profile, updateProfile, user } = useAuth();
  const { partnership } = useSwipe();
  const [loading, setLoading] = useState(false);
  
  // Check if user is admin of the partnership
  const isAdmin = partnership?.user1_id === user?.id;
  
  const [gender, setGender] = useState<'male' | 'female' | 'unknown'>(profile?.preferences?.gender || "unknown");
  const [country, setCountry] = useState(profile?.preferences?.country || "");
  const [language, setLanguage] = useState(profile?.preferences?.language || "");

  useEffect(() => {
    if (profile?.preferences) {
      setGender(profile.preferences.gender);
      setCountry(profile.preferences.country);
      setLanguage(profile.preferences.language);
    }
  }, [profile]);

  const handleSave = async () => {
    setLoading(true);
    await updateProfile({
      preferences: {
        gender: gender as 'male' | 'female' | 'unknown',
        country,
        language
      }
    });
    setLoading(false);
  };

  const getSelectedCountry = () => countries.find(c => c.code === country);
  const getSelectedLanguage = () => languages.find(l => l.code === language);

  return (
    <div 
      className="min-h-screen"
      style={{
        backgroundImage: 'url(/bg-base.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed'
      }}
    >
      {/* Header */}
      <div className="sticky top-0 z-50 p-4">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/")}
            className="p-2 text-white hover:bg-white/10"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          
          <h1 className="text-lg font-bold text-white truncate flex-1 text-center mx-4">
            My Preferences
          </h1>
          
          <div className="w-10"></div>
        </div>
      </div>

      <div className="p-4">
        <div className="max-w-md mx-auto space-y-6">
        {/* Read-only message for partners */}
        {!isAdmin && (
          <Card className="p-4 border-blue-200 bg-blue-50">
            <div className="flex items-center space-x-3">
              <User className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-sm font-medium text-blue-900">Partner Access</p>
                <p className="text-xs text-blue-700">Preferences are managed by your partnership admin</p>
              </div>
            </div>
          </Card>
        )}

        {/* Baby Gender */}
        <Card className="p-6">
          <div className="flex items-center space-x-3 mb-4">
            <Baby className="w-6 h-6 text-primary" />
            <div>
              <h3 className="font-semibold text-foreground">Baby's Gender</h3>
              <p className="text-sm text-muted-foreground">Help us suggest the perfect names</p>
            </div>
          </div>
          
          <RadioGroup 
            value={gender} 
            onValueChange={isAdmin ? (value) => setGender(value as 'male' | 'female' | 'unknown') : undefined}
            className="space-y-3"
            disabled={!isAdmin}
          >
            <div className={`flex items-center space-x-3 p-3 rounded-lg border transition-colors ${
              isAdmin ? 'hover:bg-muted/50 cursor-pointer' : 'opacity-60 cursor-not-allowed'
            }`}>
              <RadioGroupItem value="male" id="male" disabled={!isAdmin} />
              <Label htmlFor="male" className={`flex-1 flex items-center space-x-2 ${
                isAdmin ? 'cursor-pointer' : 'cursor-not-allowed'
              }`}>
                <span className="text-lg">👶🏻</span>
                <span>Boy</span>
              </Label>
            </div>
            <div className={`flex items-center space-x-3 p-3 rounded-lg border transition-colors ${
              isAdmin ? 'hover:bg-muted/50 cursor-pointer' : 'opacity-60 cursor-not-allowed'
            }`}>
              <RadioGroupItem value="female" id="female" disabled={!isAdmin} />
              <Label htmlFor="female" className={`flex-1 flex items-center space-x-2 ${
                isAdmin ? 'cursor-pointer' : 'cursor-not-allowed'
              }`}>
                <span className="text-lg">👧🏻</span>
                <span>Girl</span>
              </Label>
            </div>
            <div className={`flex items-center space-x-3 p-3 rounded-lg border transition-colors ${
              isAdmin ? 'hover:bg-muted/50 cursor-pointer' : 'opacity-60 cursor-not-allowed'
            }`}>
              <RadioGroupItem value="unknown" id="unknown" disabled={!isAdmin} />
              <Label htmlFor="unknown" className={`flex-1 flex items-center space-x-2 ${
                isAdmin ? 'cursor-pointer' : 'cursor-not-allowed'
              }`}>
                <span className="text-lg">❓</span>
                <span>I don't know yet</span>
              </Label>
            </div>
          </RadioGroup>
        </Card>

        {/* Country */}
        <Card className="p-6">
          <div className="flex items-center space-x-3 mb-4">
            <Globe className="w-6 h-6 text-primary" />
            <div>
              <h3 className="font-semibold text-foreground">Your Location</h3>
              <p className="text-sm text-muted-foreground">Names that fit your culture</p>
            </div>
          </div>
          
          <SearchableSelect 
            value={country} 
            onValueChange={isAdmin ? setCountry : undefined}
            disabled={!isAdmin}
            placeholder={getSelectedCountry() ? (
              <div className="flex items-center space-x-2">
                <span>{getSelectedCountry()?.flag}</span>
                <span>{getSelectedCountry()?.name}</span>
              </div>
            ) : "Select your country"}
            className={`w-full ${!isAdmin ? 'opacity-60' : ''}`}
          >
            {countries.map((country) => (
              <SearchableSelectItem key={country.code} value={country.code} searchText="">
                <div className="flex items-center space-x-2">
                  <span>{country.flag}</span>
                  <span>{country.name}</span>
                </div>
              </SearchableSelectItem>
            ))}
          </SearchableSelect>
        </Card>

        {/* Language */}
        <Card className="p-6">
          <div className="flex items-center space-x-3 mb-4">
            <Languages className="w-6 h-6 text-primary" />
            <div>
              <h3 className="font-semibold text-foreground">Preferred Language</h3>
              <p className="text-sm text-muted-foreground">Names in your language</p>
            </div>
          </div>
          
          <SearchableSelect 
            value={language} 
            onValueChange={isAdmin ? setLanguage : undefined}
            disabled={!isAdmin}
            placeholder={getSelectedLanguage() ? (
              <div className="flex items-center space-x-2">
                <span>{getSelectedLanguage()?.name}</span>
                <span className="text-muted-foreground">({getSelectedLanguage()?.native})</span>
              </div>
            ) : "Select your preferred language"}
            className={`w-full ${!isAdmin ? 'opacity-60' : ''}`}
          >
            {languages.map((lang) => (
              <SearchableSelectItem key={lang.code} value={lang.code} searchText="">
                <div className="flex items-center space-x-2">
                  <span>{lang.name}</span>
                  <span className="text-muted-foreground">({lang.native})</span>
                </div>
              </SearchableSelectItem>
            ))}
          </SearchableSelect>
        </Card>

        {/* Save Button - Only for admins */}
        {isAdmin && (
          <Button
            onClick={handleSave}
            disabled={loading || !gender || !country || !language}
            className="w-full h-12 love-button"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Preferences
              </>
            )}
          </Button>
        )}
        </div>
      </div>
    </div>
  );
};

export default Preferences;