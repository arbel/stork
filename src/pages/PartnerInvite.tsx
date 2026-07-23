import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowRight, Copy, RefreshCw, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { buildInviteUrl } from "@/lib/appUrl";
import { useAuth } from "@/contexts/AuthContext";
import { useSwipe } from "@/contexts/SwipeContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export const PartnerInvite = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { refreshPartnership } = useSwipe();
  const [inviteCode, setInviteCode] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [canceling, setCanceling] = useState(false);

  useEffect(() => {
    if (!user) return;
    
    const loadOrCreatePartnership = async () => {
      // Most recent existing partnership. .maybeSingle() alone errors when >1 row exists and would
      // fall through to creating a duplicate; order + limit(1) prevents that.
      const { data: existing, error: existingError } = await supabase
        .from('partnerships')
        .select('*')
        .eq('user1_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (existingError) {
        toast({ title: "שגיאה בטעינת ההזמנה", description: existingError.message, variant: "destructive" });
        return;
      }

      if (existing) {
        setInviteCode(existing.invite_code);
      } else {
        // Create new partnership
        const { data: newPartnership, error } = await supabase
          .from('partnerships')
          .insert({
            user1_id: user.id,
            status: 'pending'
          })
          .select()
          .single();

        if (error) {
          toast({
            title: "שגיאה ביצירת ההזמנה",
            description: error.message,
            variant: "destructive",
          });
        } else {
          setInviteCode(newPartnership.invite_code);
        }
      }
    };

    loadOrCreatePartnership();
  }, [user]);

  const inviteUrl = inviteCode ? buildInviteUrl(inviteCode) : "";

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      toast({
        title: "הועתק ללוח!",
        description: "שתפו קישור זה עם בן/בת הזוג.",
      });
    } catch (error) {
      toast({
        title: "ההעתקה נכשלה",
        description: "אנא העתיקו את הקישור ידנית.",
        variant: "destructive",
      });
    }
  };


  const regenerateInviteCode = async () => {
    if (!user || !inviteCode) return;
    
    setRegenerating(true);
    try {
      // Generate new invite code by updating the partnership
      const { data: updatedPartnership, error } = await supabase
        .from('partnerships')
        .update({
          invite_code: crypto.randomUUID().replace(/-/g, '').substring(0, 16)
        })
        .eq('user1_id', user.id)
        .select()
        .single();

      if (error) {
        throw error;
      }

      setInviteCode(updatedPartnership.invite_code);
      toast({
        title: "נוצר קישור הזמנה חדש!",
        description: "קישור ההזמנה הישן כבר לא בתוקף. שתפו את החדש עם בן/בת הזוג.",
      });
    } catch (error: any) {
      toast({
        title: "יצירת ההזמנה מחדש נכשלה",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setRegenerating(false);
    }
  };

  const cancelInvite = async () => {
    if (!user) return;
    
    setCanceling(true);
    try {
      // Delete the pending partnership
      const { error } = await supabase
        .from('partnerships')
        .delete()
        .eq('user1_id', user.id)
        .eq('status', 'pending');

      if (error) {
        throw error;
      }

      toast({
        title: "ההזמנה בוטלה",
        description: "הזמנת בן/בת הזוג בוטלה.",
      });

      // Refresh partnership state in context immediately
      await refreshPartnership();
      
      // Small delay to ensure state propagates
      setTimeout(() => {
        navigate("/");
      }, 100);
    } catch (error: any) {
      toast({
        title: "ביטול ההזמנה נכשל",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setCanceling(false);
    }
  };

  return (
    <div 
      className="min-h-screen"
      style={{
        backgroundImage: 'url(/bg-base.webp)',
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
            הזמנת בן/בת זוג
          </h1>
          
          <div className="w-10"></div>
        </div>
      </div>

      <div className="max-w-md mx-auto p-4">

        <Card>
          <CardHeader>
            <CardTitle className="text-center">הזמינו את בן/בת הזוג</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center text-muted-foreground">
              <p>שתפו קישור זה עם בן/בת הזוג כדי לבחור יחד שמות לתינוק!</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">קישור הזמנה</label>
              <div className="flex space-x-2 space-x-reverse">
                <Input
                  value={inviteUrl}
                  readOnly
                  className="flex-1"
                />
                <Button variant="outline" size="icon" onClick={copyToClipboard}>
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-4">
              <Button
                variant="outline"
                onClick={regenerateInviteCode}
                disabled={regenerating || canceling}
                className="w-full"
              >
                <RefreshCw className={`w-4 h-4 ml-2 ${regenerating ? 'animate-spin' : ''}`} />
                יצירת קישור חדש
              </Button>
              
              <Button variant="outline" onClick={() => navigate("/")} className="w-full">
                סיום
              </Button>
              
              <div className="text-center">
                <button 
                  onClick={cancelInvite}
                  disabled={canceling}
                  className="text-sm text-destructive hover:text-destructive/80 underline-offset-4 hover:underline disabled:opacity-50"
                >
                  {canceling ? 'מבטל...' : 'ביטול ההזמנה'}
                </button>
              </div>
            </div>

            <div className="text-xs text-muted-foreground text-center space-y-2">
              <p>בן/בת הזוג יוכלו להצטרף באמצעות קישור זה. תקבלו התראה כשהם יצטרפו!</p>
              <p className="text-warning">אם קישור ההזמנה פג תוקף, לחצו על כפתור הרענון כדי ליצור קישור חדש.</p>
              <p className="text-muted-foreground">לחצו על "ביטול ההזמנה" אם אינכם רוצים עוד להזמין בן/בת זוג.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};