import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ArrowLeft, MessageSquare, Send } from "lucide-react";
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
        title: "Error",
        description: "You must be logged in to submit feedback.",
        variant: "destructive"
      });
      return;
    }

    if (!subject.trim() || !message.trim()) {
      toast({
        title: "Error",
        description: "Please fill in both subject and message.",
        variant: "destructive"
      });
      return;
    }

    if (subject.length > 200) {
      toast({
        title: "Error",
        description: "Subject must be less than 200 characters.",
        variant: "destructive"
      });
      return;
    }

    if (message.length > 2000) {
      toast({
        title: "Error",
        description: "Message must be less than 2000 characters.",
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
        title: "Feedback Submitted",
        description: "Thank you for your feedback! We appreciate it."
      });

      setSubject("");
      setMessage("");
    } catch (error) {
      console.error('Error submitting feedback:', error);
      toast({
        title: "Error",
        description: "Failed to submit feedback. Please try again.",
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
            size="icon"
            onClick={() => navigate("/")}
            className="h-14 w-14 text-white hover:bg-white/10"
          >
            <ArrowLeft className="w-10 h-10" />
          </Button>
          
          <h1 className="text-xl font-bold text-white truncate flex-1 text-center mx-4">
            Send Feedback
          </h1>
          
          <div className="w-10"></div>
        </div>
      </div>

      <div className="p-4 max-w-lg mx-auto">
        <div className="text-center mb-6">
          <div className="inline-flex items-center space-x-3 bg-white/90 backdrop-blur-md px-6 py-3 rounded-full shadow-lg">
            <MessageSquare className="w-6 h-6 text-primary" />
            <span className="text-primary font-bold text-lg">We Value Your Feedback</span>
          </div>
        </div>

        <Card className="p-6 bg-white/95 backdrop-blur-md">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="subject">Subject</Label>
              <Input
                id="subject"
                placeholder="What's this about?"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                maxLength={200}
                disabled={isSubmitting}
              />
              <p className="text-xs text-muted-foreground text-right">
                {subject.length}/200
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="message">Message</Label>
              <Textarea
                id="message"
                placeholder="Tell us what you think, report a bug, or suggest a feature..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                maxLength={2000}
                disabled={isSubmitting}
                className="min-h-[150px]"
              />
              <p className="text-xs text-muted-foreground text-right">
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
                  Submitting...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Send className="w-4 h-4" />
                  Submit Feedback
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