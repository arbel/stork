import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { MessageSquare, Mail, User, Calendar, Check, Eye } from "lucide-react";

interface FeedbackItem {
  id: string;
  user_id: string;
  user_email: string;
  user_name: string | null;
  subject: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export const AdminFeedback = () => {
  const [feedback, setFeedback] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread'>('unread');

  useEffect(() => {
    loadFeedback();
  }, []);

  const loadFeedback = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('feedback')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setFeedback(data || []);
    } catch (error) {
      console.error('Error loading feedback:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      const { error } = await supabase
        .from('feedback')
        .update({ is_read: true })
        .eq('id', id);

      if (error) throw error;
      
      setFeedback(prev => 
        prev.map(item => 
          item.id === id ? { ...item, is_read: true } : item
        )
      );
    } catch (error) {
      console.error('Error marking feedback as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const unreadIds = feedback.filter(f => !f.is_read).map(f => f.id);
      if (unreadIds.length === 0) return;

      const { error } = await supabase
        .from('feedback')
        .update({ is_read: true })
        .in('id', unreadIds);

      if (error) throw error;
      
      setFeedback(prev => 
        prev.map(item => ({ ...item, is_read: true }))
      );
    } catch (error) {
      console.error('Error marking all feedback as read:', error);
    }
  };

  const filteredFeedback = filter === 'unread' 
    ? feedback.filter(f => !f.is_read)
    : feedback;

  const unreadCount = feedback.filter(f => !f.is_read).length;

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center space-x-3">
            <MessageSquare className="w-8 h-8 text-blue-500" />
            <div>
              <p className="text-2xl font-bold">{feedback.length}</p>
              <p className="text-sm text-muted-foreground">Total Feedback</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center space-x-3">
            <Mail className="w-8 h-8 text-orange-500" />
            <div>
              <p className="text-2xl font-bold">{unreadCount}</p>
              <p className="text-sm text-muted-foreground">Unread</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center space-x-3">
            <Check className="w-8 h-8 text-green-500" />
            <div>
              <p className="text-2xl font-bold">{feedback.length - unreadCount}</p>
              <p className="text-sm text-muted-foreground">Read</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filter and Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant={filter === 'unread' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('unread')}
          >
            Unread ({unreadCount})
          </Button>
          <Button
            variant={filter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('all')}
          >
            All ({feedback.length})
          </Button>
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={markAllAsRead}>
            <Check className="w-4 h-4 mr-2" />
            Mark All as Read
          </Button>
        )}
      </div>

      {/* Feedback List */}
      <div className="space-y-4">
        {filteredFeedback.length === 0 ? (
          <Card className="p-8 text-center">
            <MessageSquare className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              {filter === 'unread' ? 'No unread feedback' : 'No feedback yet'}
            </p>
          </Card>
        ) : (
          filteredFeedback.map((item) => (
            <Card 
              key={item.id} 
              className={`p-4 ${!item.is_read ? 'border-l-4 border-l-orange-500 bg-orange-50/50' : ''}`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="font-semibold truncate">{item.subject}</h4>
                    {!item.is_read && (
                      <Badge variant="secondary" className="bg-orange-100 text-orange-700">
                        New
                      </Badge>
                    )}
                  </div>
                  
                  <p className="text-sm text-foreground whitespace-pre-wrap mb-3">
                    {item.message}
                  </p>
                  
                  <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <User className="w-3 h-3" />
                      {item.user_name || 'Anonymous'}
                    </span>
                    <span className="flex items-center gap-1">
                      <Mail className="w-3 h-3" />
                      {item.user_email}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(item.created_at).toLocaleString()}
                    </span>
                  </div>
                </div>
                
                {!item.is_read && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => markAsRead(item.id)}
                    className="shrink-0"
                  >
                    <Eye className="w-4 h-4 mr-1" />
                    Mark Read
                  </Button>
                )}
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};