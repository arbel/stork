import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ArrowRight, MessageSquare, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

const Feedback = () => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast({
        title: "שגיאה",
        description: "עליכם להתחבר כדי לשלוח משוב.",
        variant: "destructive"
      });
      return;
    }

    if (!subject.trim() || !message.trim()) {
      toast({
        title: "שגיאה",
        description: "אנא מלאו גם נושא וגם הודעה.",
        variant: "destructive"
      });
      return;
    }

    if (subject.length > 200) {
      toast({
        title: "שגיאה",
        description: "הנושא חייב להיות קצר מ-200 תווים.",
        variant: "destructive"
      });
      return;
    }

    if (message.length > 2000) {
      toast({
        title: "שגיאה",
        description: "ההודעה חייבת להיות קצרה מ-2000 תווים.",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from('feedback')
        .insert({
          user_id: user.id,
          user_email: user.email || '',
          user_name: profile?.first_name || null,
          subject: subject.trim(),
          message: message.trim()
        });

      if (error) throw error;

      toast({
        title: "המשוב נשלח",
        description: "תודה על המשוב! אנחנו מעריכים את זה."
      });

      setSubject("");
      setMessage("");
    } catch (error) {
      console.error('Error submitting feedback:', error);
      toast({
        title: "שגיאה",
        description: "שליחת המשוב נכשלה. אנא נסו שוב.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div 
      className="h-screen overflow-y-auto smooth-scroll pb-8"
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
            size="icon"
            onClick={() => navigate("/")}
            className="h-14 w-14 text-white hover:bg-white/10"
          >
            <ArrowRight className="w-10 h-10" />
          </Button>
          
          <h1 className="text-xl font-bold text-white truncate flex-1 text-center mx-4">
            שליחת משוב
          </h1>
          
          <div className="w-10"></div>
        </div>
      </div>

      <div className="p-4 max-w-lg mx-auto">
        <div className="text-center mb-6">
          <div className="inline-flex items-center space-x-3 space-x-reverse bg-white/90 backdrop-blur-md px-6 py-3 rounded-full shadow-lg">
            <MessageSquare className="w-6 h-6 text-primary" />
            <span className="text-primary font-bold text-lg">חשוב לנו לשמוע מכם</span>
          </div>
        </div>

        <Card className="p-6 bg-white/95 backdrop-blur-md">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="subject">נושא</Label>
              <Input
                id="subject"
                placeholder="במה מדובר?"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                maxLength={200}
                disabled={isSubmitting}
              />
              <p className="text-xs text-muted-foreground text-left">
                {subject.length}/200
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="message">הודעה</Label>
              <Textarea
                id="message"
                placeholder="ספרו לנו מה דעתכם, דווחו על באג או הציעו פיצ'ר..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                maxLength={2000}
                disabled={isSubmitting}
                className="min-h-[150px]"
              />
              <p className="text-xs text-muted-foreground text-left">
                {message.length}/2000
              </p>
            </div>

            <Button 
              type="submit" 
              className="w-full"
              disabled={isSubmitting || !subject.trim() || !message.trim()}
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  שולח...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Send className="w-4 h-4" />
                  שליחת משוב
                </span>
              )}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default Feedback;