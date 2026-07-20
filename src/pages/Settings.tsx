import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowRight, Trash2, UserMinus, AlertTriangle, UserX, Edit, Save, X as XIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useSwipe } from "@/contexts/SwipeContext";
import { supabase } from "@/integrations/supabase/client";

import { toast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const Settings = () => {
  const navigate = useNavigate();
  const { user, profile, signOut, updateProfile } = useAuth();
  const { partnership, resetAll } = useSwipe();
  const [loading, setLoading] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [editingEmail, setEditingEmail] = useState(false);
  const [tempName, setTempName] = useState(profile?.first_name || '');
  const [tempEmail, setTempEmail] = useState(user?.email || '');
  const [partnerProfile, setPartnerProfile] = useState<{ first_name: string | null; email: string } | null>(null);

  const isAdmin = partnership?.user1_id === user?.id;

  // Load partner profile information
  useEffect(() => {
    const loadPartnerProfile = async () => {
      if (!partnership || !user || partnership.status !== 'active') {
        setPartnerProfile(null);
        return;
      }

      const partnerId = partnership.user1_id === user.id ? partnership.user2_id : partnership.user1_id;
      if (!partnerId) {
        setPartnerProfile(null);
        return;
      }

      try {
        console.log('Loading partner profile for partnerId:', partnerId);
        const { data, error } = await supabase
          .from('profiles')
          .select('first_name, email')
          .eq('user_id', partnerId)
          .maybeSingle();

        console.log('Partner profile result:', { data, error });
        if (!error && data) {
          setPartnerProfile(data);
        } else if (error) {
          console.error('Error fetching partner profile:', error);
        }
      } catch (error) {
        console.error('Error loading partner profile:', error);
      }
    };

    loadPartnerProfile();
  }, [partnership, user]);

  const handleClearSelections = async () => {
    setLoading(true);
    try {
      // Validate that user and partnership are loaded
      if (!user) {
        throw new Error('המשתמש לא נטען. אנא רעננו את הדף ונסו שוב.');
      }
      
      if (!partnership) {
        throw new Error('השותפות לא נטענה. אנא רעננו את הדף ונסו שוב.');
      }

      console.log('Clearing selections for user:', user.id, 'in partnership:', partnership.id);
      
      // Delete user's swipes from database
      const { error } = await supabase
        .from('user_swipes')
        .delete()
        .eq('user_id', user.id)
        .eq('partnership_id', partnership.id);

      if (error) {
        throw error;
      }

      console.log('Database deletion completed successfully');

      // Clear local state
      resetAll();

      toast({
        title: "הבחירות נמחקו",
        description: "כל בחירות השמות שלך נמחקו. אפשר להתחיל מחדש!",
      });
    } catch (error) {
      console.error('Error clearing selections:', error);
      toast({
        title: "שגיאה",
        description: error instanceof Error ? error.message : "מחיקת הבחירות נכשלה. אנא נסו שוב.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnectPartner = async () => {
    if (!partnership || !user) return;

    setLoading(true);
    try {
      // Unlink BOTH users' swipes from the partnership (kept, not deleted) then delete it, via a
      // SECURITY DEFINER RPC. Deleting the partnership directly would CASCADE-delete the swipes.
      const { error } = await supabase.rpc('disconnect_partner' as never);
      if (error) throw error;

      toast({
        title: "בן/בת הזוג נותקו",
        description: "בן/בת הזוג נותקו. בחירות השמות נשמרו.",
      });

      // Refresh page to update state
      window.location.reload();
    } catch (error) {
      console.error('Error disconnecting partner:', error);
      toast({
        title: "שגיאה",
        description: "ניתוק בן/בת הזוג נכשל. אנא נסו שוב.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLeavePartnership = async () => {
    if (!partnership || !user) {
      console.error('Cannot leave partnership: missing partnership or user', { partnership, user });
      return;
    }

    setLoading(true);
    try {
      console.log('Leaving partnership:', partnership.id, 'user:', user.id);
      
      // Keep the leaving user's picks — just unlink them from the partnership (become "solo"),
      // so they survive and get re-pointed if/when the user joins a new partnership.
      const { error: swipeError } = await supabase
        .from('user_swipes')
        .update({ partnership_id: null })
        .eq('user_id', user.id);

      if (swipeError) {
        console.error('Error unlinking swipes:', swipeError);
      }

      // Reset the partnership - call secure database function to avoid RLS issues
      const { error: partnershipError } = await supabase.rpc('leave_partnership');

      if (partnershipError) {
        console.error('Error updating partnership via RPC:', partnershipError);
        throw partnershipError;
      }

      // Notify the admin that their partner left
      await supabase
        .from('notifications')
        .insert({
          user_id: partnership.user1_id,
          type: 'partner_left',
          title: 'בן/בת הזוג עזבו',
          message: 'בן/בת הזוג עזבו את השותפות. אפשר להזמין בן/בת זוג חדשים בכל עת.'
        });

      // Keep the user's name AND preferences from the partnership so they don't have to re-onboard.
      // Only clear the "inherited partner" marker, since they now own these preferences themselves.
      await supabase
        .from('profiles')
        .update({ partner_name: null })
        .eq('user_id', user.id);

      toast({
        title: "עזבת את השותפות",
        description: "עזבת את השותפות. עכשיו אפשר להצטרף לשותפות אחרת.",
      });

      // Refresh page to update state
      window.location.reload();
    } catch (error) {
      console.error('Error leaving partnership:', error);
      toast({
        title: "שגיאה",
        description: "עזיבת השותפות נכשלה. אנא נסו שוב.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!user) return;
    
    setDeletingAccount(true);
    try {
      if (partnership) {
        const isAdmin = partnership.user1_id === user.id;

        if (isAdmin && partnership.user2_id) {
          // Admin leaving with a partner: hand ownership to the partner (keeps the partnership and
          // the partner's swipes) via a SECURITY DEFINER RPC — a direct update can't remove self.
          const { error } = await supabase.rpc('transfer_partnership_ownership' as never);
          if (error) throw error;
          await supabase.from('notifications').insert({
            user_id: partnership.user2_id,
            type: 'partnership_transferred',
            title: 'השותפות הועברה',
            message: 'אתם כעת מנהלי השותפות. בן/בת הזוג הקודמים מחקו את החשבון שלהם.',
          });
        } else if (isAdmin && !partnership.user2_id) {
          // Admin with no partner: safe to delete the empty partnership.
          const { error } = await supabase.from('partnerships').delete().eq('id', partnership.id);
          if (error) throw error;
        } else {
          // Partner leaving: detach via leave_partnership (preserves the admin's partnership + swipes;
          // a direct delete would silently fail under RLS and leave a dangling partner reference).
          const { error } = await supabase.rpc('leave_partnership');
          if (error) throw error;
          await supabase.from('notifications').insert({
            user_id: partnership.user1_id,
            type: 'partner_left',
            title: 'בן/בת הזוג עזבו',
            message: 'בן/בת הזוג מחקו את החשבון שלהם. אפשר להזמין בן/בת זוג חדשים בכל עת.',
          });
        }
      }

      // Delete user's swipes
      await supabase
        .from('user_swipes')
        .delete()
        .eq('user_id', user.id);

      // Delete user's notifications
      await supabase
        .from('notifications')
        .delete()
        .eq('user_id', user.id);

      // Delete user's name recommendations
      await supabase
        .from('name_recommendations')
        .delete()
        .eq('user_id', user.id);

      // Delete user's profile
      await supabase
        .from('profiles')
        .delete()
        .eq('user_id', user.id);

      // Finally attempt to delete the auth user via edge function (best-effort)
      const { error } = await supabase.functions.invoke('delete-user-account');
      
      if (error) {
        console.error('Error deleting auth user (auth.users):', error);
        // We deliberately do NOT throw here so that app data deletion can still
        // be considered successful even if the auth record fails to delete.
      }

      toast({
        title: "החשבון נמחק",
        description: "החשבון שלך נמחק לצמיתות.",
      });

      // Sign out and redirect
      await signOut();
      navigate('/');
      
    } catch (error: any) {
      console.error('Error deleting account:', error);
      toast({
        title: "שגיאה",
        description: "מחיקת החשבון נכשלה. אנא נסו שוב או פנו לתמיכה.",
        variant: "destructive",
      });
    } finally {
      setDeletingAccount(false);
    }
  };

  const handleUpdateName = async () => {
    try {
      await updateProfile({ first_name: tempName });
      setEditingName(false);
      toast({
        title: "השם עודכן",
        description: "השם שלך עודכן בהצלחה.",
      });
    } catch (error) {
      toast({
        title: "שגיאה",
        description: "עדכון השם נכשל. אנא נסו שוב.",
        variant: "destructive",
      });
    }
  };

  const handleUpdateEmail = async () => {
    try {
      const { error } = await supabase.auth.updateUser({ email: tempEmail });
      if (error) throw error;
      
      setEditingEmail(false);
      toast({
        title: "בקשת עדכון אימייל נשלחה",
        description: "בדקו בכתובת האימייל החדשה קישור לאישור.",
      });
    } catch (error: any) {
      toast({
        title: "שגיאה",
        description: error.message || "עדכון האימייל נכשל. אנא נסו שוב.",
        variant: "destructive",
      });
    }
  };

  const cancelNameEdit = () => {
    setTempName(profile?.first_name || '');
    setEditingName(false);
  };

  const cancelEmailEdit = () => {
    setTempEmail(user?.email || '');
    setEditingEmail(false);
  };

  return (
    <div 
      className="min-h-screen overflow-y-auto"
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
            הגדרות
          </h1>
          
          <div className="w-10"></div>
        </div>
      </div>

      <div className="p-4">
        <div className="max-w-md mx-auto space-y-6">
        {/* User Info */}
        <Card className="p-6">
          <h3 className="font-semibold text-foreground mb-4">הפרופיל שלך</h3>
          <div className="space-y-4">
            {/* Name Field */}
            <div className="flex items-center justify-between">
              <div className="flex-1">
                {editingName && isAdmin ? (
                  <div className="space-y-2">
                    <Label htmlFor="name">שם</Label>
                    <div className="flex space-x-2 space-x-reverse">
                      <Input
                        id="name"
                        value={tempName}
                        onChange={(e) => setTempName(e.target.value)}
                        placeholder="הזינו את שמכם"
                        className="flex-1"
                      />
                      <Button size="sm" onClick={handleUpdateName}>
                        <Save className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="outline" onClick={cancelNameEdit}>
                        <XIcon className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <p><span className="font-medium">שם:</span> {profile?.first_name || 'לא הוגדר'}</p>
                    {isAdmin && (
                      <Button size="sm" variant="ghost" onClick={() => setEditingName(true)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Partner Field */}
            <p>
              <span className="font-medium">בן/בת זוג:</span>{' '}
              {partnerProfile 
                ? (partnerProfile.first_name || partnerProfile.email?.split('@')[0]) 
                : 'לא מחובר'}
            </p>

            {/* Partner Email Field */}
            {partnerProfile && (
              <p>
                <span className="font-medium">אימייל של בן/בת הזוג:</span>{' '}
                {partnerProfile.email}
              </p>
            )}

            {/* Email Field */}
            <div className="flex items-center justify-between">
              <div className="flex-1">
                {editingEmail && isAdmin ? (
                  <div className="space-y-2">
                    <Label htmlFor="email">אימייל</Label>
                    <div className="flex space-x-2 space-x-reverse">
                      <Input
                        id="email"
                        dir="ltr"
                        type="email"
                        value={tempEmail}
                        onChange={(e) => setTempEmail(e.target.value)}
                        placeholder="הזינו את האימייל שלכם"
                        className="flex-1"
                      />
                      <Button size="sm" onClick={handleUpdateEmail}>
                        <Save className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="outline" onClick={cancelEmailEdit}>
                        <XIcon className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <p><span className="font-medium">אימייל:</span> {user?.email}</p>
                    {isAdmin && (
                      <Button size="sm" variant="ghost" onClick={() => setEditingEmail(true)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {isAdmin ? (
              <p className="text-sm text-primary font-medium">👑 מנהל/ת השותפות</p>
            ) : (
              <p className="text-sm text-muted-foreground">👤 בן/בת זוג (ההגדרות מנוהלות על ידי המנהל/ת)</p>
            )}
          </div>
        </Card>

        {/* Clear Selections */}
        <Card className="p-6">
          <div className="flex items-start space-x-3 space-x-reverse">
            <Trash2 className="w-6 h-6 text-destructive mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-foreground mb-2">מחיקת הבחירות שלי</h3>
              <p className="text-sm text-muted-foreground mb-4">
                מחקו את כל השמות שאהבתם ודילגתם עליהם כדי להתחיל מחדש. הפעולה לא תשפיע על הבחירות של בן/בת הזוג.
              </p>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button 
                      variant="destructive" 
                      disabled={loading || !user || !partnership}
                    >
                      <Trash2 className="w-4 h-4 ml-2" />
                      {!user || !partnership ? 'טוען...' : 'מחיקת הבחירות שלי'}
                    </Button>
                  </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>למחוק את הבחירות שלך?</AlertDialogTitle>
                    <AlertDialogDescription>
                      פעולה זו תמחק לצמיתות את כל השמות שאהבתם ודילגתם עליהם. תתחילו מדף חלק, אך הבחירות של בן/בת הזוג יישארו ללא שינוי.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>ביטול</AlertDialogCancel>
                    <AlertDialogAction onClick={handleClearSelections}>
                      כן, למחוק הכל
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </Card>

        {/* Admin Controls */}
        {isAdmin && partnership?.user2_id && (
          <Card className="p-6 border-destructive/20">
            <div className="flex items-start space-x-3 space-x-reverse">
              <AlertTriangle className="w-6 h-6 text-destructive mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-foreground mb-2">ניתוק בן/בת הזוג</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  כמנהלי השותפות, אפשר לנתק את בן/בת הזוג. בחירות השמות שלכם יישמרו, אך הבחירות של בן/בת הזוג יימחקו.
                </p>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" disabled={loading}>
                      <UserMinus className="w-4 h-4 ml-2" />
                      ניתוק בן/בת הזוג
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>לנתק את בן/בת הזוג?</AlertDialogTitle>
                      <AlertDialogDescription>
                        פעולה זו תנתק את בן/בת הזוג מהשותפות. בחירות השמות שלכם יישמרו, אך הבחירות של בן/בת הזוג יימחקו. תצטרכו להזמין אותם מחדש כדי להמשיך יחד.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>ביטול</AlertDialogCancel>
                      <AlertDialogAction onClick={handleDisconnectPartner}>
                        כן, לנתק את בן/בת הזוג
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </Card>
        )}

        {/* Partner Leave Partnership Option */}
        {!isAdmin && partnership?.user2_id === user?.id && (
          <Card className="p-6 border-destructive/20">
            <div className="flex items-start space-x-3 space-x-reverse">
              <UserMinus className="w-6 h-6 text-destructive mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-foreground mb-2">עזיבת השותפות</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  התנתקו מבן/בת הזוג הנוכחיים והצטרפו לשותפות אחרת. בחירות השמות שלכם עבור שותפות זו יימחקו.
                </p>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" disabled={loading}>
                      <UserMinus className="w-4 h-4 ml-2" />
                      עזיבת השותפות
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>לעזוב את השותפות?</AlertDialogTitle>
                      <AlertDialogDescription>
                        פעולה זו תנתק אתכם מבן/בת הזוג הנוכחיים. בחירות השמות שלכם יימחקו ותוכלו להצטרף לשותפות אחרת. המנהל/ת יצטרכו ליצור שותפות חדשה.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>ביטול</AlertDialogCancel>
                      <AlertDialogAction onClick={handleLeavePartnership}>
                        כן, לעזוב את השותפות
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </Card>
        )}

        {/* Delete Account */}
        <Card className="p-6 border-destructive/50 bg-white">
          <div className="flex items-start space-x-3 space-x-reverse">
            <UserX className="w-6 h-6 text-destructive mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-foreground mb-2">מחיקת חשבון</h3>
              <div className="text-sm text-muted-foreground mb-4 space-y-2">
                <p><strong>⚠️ לא ניתן לבטל פעולה זו.</strong></p>
                <p>מחיקת החשבון תסיר לצמיתות:</p>
                <ul className="list-disc list-inside ml-2 space-y-1">
                  <li>את כל בחירות השמות וההעדפות שלכם</li>
                  <li>את הפרופיל ונתוני החשבון שלכם</li>
                  <li>את כל ההתראות וההמלצות</li>
                </ul>
                {partnership && partnership.user1_id === user?.id && partnership.user2_id && (
                  <div className="mt-3 p-3 bg-warning/10 border border-warning/20 rounded-md">
                    <p className="text-warning-foreground font-medium">
                      🔄 העברת שותפות: מכיוון שאתם המנהלים, הבעלות תועבר לבן/בת הזוג.
                      הם יהפכו למנהלים החדשים ויוכלו להמשיך להשתמש בשותפות.
                    </p>
                  </div>
                )}
              </div>
              
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" disabled={deletingAccount}>
                    <UserX className="w-4 h-4 ml-2" />
                    {deletingAccount ? 'מוחק...' : 'מחיקת החשבון שלי'}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center space-x-2 space-x-reverse">
                      <AlertTriangle className="w-5 h-5 text-destructive" />
                      <span>למחוק את החשבון לצמיתות?</span>
                    </AlertDialogTitle>
                    <AlertDialogDescription className="space-y-3">
                      <p>פעולה זו <strong>תמחק לצמיתות את החשבון שלכם</strong> ואת כל הנתונים הקשורים:</p>
                      <ul className="list-disc list-inside space-y-1 text-sm">
                        <li>פרטי פרופיל והעדפות</li>
                        <li>כל בחירות השמות (לייקים ודילוגים)</li>
                        <li>התראות והמלצות</li>
                        <li>גישה לחשבון ופרטי התחברות</li>
                      </ul>
                      
                      {partnership && partnership.user1_id === user?.id && partnership.user2_id && (
                        <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                          <p className="text-blue-800 font-medium text-sm">
                            בן/בת הזוג יהפכו למנהלי השותפות החדשים ויוכלו להמשיך להשתמש בשירות.
                          </p>
                        </div>
                      )}
                      
                      <p className="font-medium text-destructive">
                        לא ניתן לבטל פעולה זו. האם אתם בטוחים לחלוטין?
                      </p>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>ביטול</AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={handleDeleteAccount}
                      className="bg-destructive hover:bg-destructive/90"
                    >
                      כן, למחוק לצמיתות
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </Card>
        </div>
      </div>
    </div>
  );
};

export default Settings;