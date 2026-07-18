import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { ArrowRight, Save, Baby, User } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useSwipe } from "@/contexts/SwipeContext";

const Preferences = () => {
  const navigate = useNavigate();
  const { profile, updateProfile, user } = useAuth();
  const { partnership } = useSwipe();
  const [loading, setLoading] = useState(false);

  // Check if user is admin of the partnership
  const isAdmin = partnership?.user1_id === user?.id;

  const [gender, setGender] = useState<'male' | 'female' | 'unknown'>(profile?.preferences?.gender || "unknown");

  useEffect(() => {
    if (profile?.preferences) {
      setGender(profile.preferences.gender);
    }
  }, [profile]);

  const handleSave = async () => {
    setLoading(true);
    await updateProfile({
      preferences: {
        gender: gender as 'male' | 'female' | 'unknown',
        language: 'he'
      }
    });
    setLoading(false);
  };

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
            <ArrowRight className="w-5 h-5" />
          </Button>

          <h1 className="text-lg font-bold text-white truncate flex-1 text-center mx-4">
            ההעדפות שלי
          </h1>

          <div className="w-10"></div>
        </div>
      </div>

      <div className="p-4">
        <div className="max-w-md mx-auto space-y-6">
        {/* Read-only message for partners */}
        {!isAdmin && (
          <Card className="p-4 border-blue-200 bg-blue-50">
            <div className="flex items-center space-x-3 space-x-reverse">
              <User className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-sm font-medium text-blue-900">גישת בן/בת זוג</p>
                <p className="text-xs text-blue-700">ההעדפות מנוהלות על ידי מנהל השותפות</p>
              </div>
            </div>
          </Card>
        )}

        {/* Baby Gender */}
        <Card className="p-6">
          <div className="flex items-center space-x-3 space-x-reverse mb-4">
            <Baby className="w-6 h-6 text-primary" />
            <div>
              <h3 className="font-semibold text-foreground">מין התינוק</h3>
              <p className="text-sm text-muted-foreground">כדי שנוכל להציע את השמות המושלמים</p>
            </div>
          </div>

          <RadioGroup
            value={gender}
            onValueChange={isAdmin ? (value) => setGender(value as 'male' | 'female' | 'unknown') : undefined}
            className="space-y-3"
            disabled={!isAdmin}
          >
            <div className={`flex items-center space-x-3 space-x-reverse p-3 rounded-lg border transition-colors ${
              isAdmin ? 'hover:bg-muted/50 cursor-pointer' : 'opacity-60 cursor-not-allowed'
            }`}>
              <RadioGroupItem value="male" id="male" disabled={!isAdmin} />
              <Label htmlFor="male" className={`flex-1 flex items-center space-x-2 space-x-reverse ${
                isAdmin ? 'cursor-pointer' : 'cursor-not-allowed'
              }`}>
                <span className="text-lg">👶🏻</span>
                <span>בן</span>
              </Label>
            </div>
            <div className={`flex items-center space-x-3 space-x-reverse p-3 rounded-lg border transition-colors ${
              isAdmin ? 'hover:bg-muted/50 cursor-pointer' : 'opacity-60 cursor-not-allowed'
            }`}>
              <RadioGroupItem value="female" id="female" disabled={!isAdmin} />
              <Label htmlFor="female" className={`flex-1 flex items-center space-x-2 space-x-reverse ${
                isAdmin ? 'cursor-pointer' : 'cursor-not-allowed'
              }`}>
                <span className="text-lg">👧🏻</span>
                <span>בת</span>
              </Label>
            </div>
            <div className={`flex items-center space-x-3 space-x-reverse p-3 rounded-lg border transition-colors ${
              isAdmin ? 'hover:bg-muted/50 cursor-pointer' : 'opacity-60 cursor-not-allowed'
            }`}>
              <RadioGroupItem value="unknown" id="unknown" disabled={!isAdmin} />
              <Label htmlFor="unknown" className={`flex-1 flex items-center space-x-2 space-x-reverse ${
                isAdmin ? 'cursor-pointer' : 'cursor-not-allowed'
              }`}>
                <span className="text-lg">❓</span>
                <span>עדיין לא יודעים</span>
              </Label>
            </div>
          </RadioGroup>
        </Card>

        {/* Save Button - Only for admins */}
        {isAdmin && (
          <Button
            onClick={handleSave}
            disabled={loading || !gender}
            className="w-full h-12 love-button"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white ml-2" />
                שומר...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 ml-2" />
                שמירת העדפות
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
