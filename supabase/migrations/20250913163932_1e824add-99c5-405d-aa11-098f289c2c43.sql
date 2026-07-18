-- First check current policies and drop the problematic ones
DROP POLICY IF EXISTS "Users can insert their own notifications only" ON public.notifications;
DROP POLICY IF EXISTS "System can insert notifications for users" ON public.notifications;
DROP POLICY IF EXISTS "Functions can insert notifications" ON public.notifications;

-- Create a secure policy that only allows users to insert notifications for themselves
DROP POLICY IF EXISTS "Users can insert their own notifications only" ON public.notifications;
CREATE POLICY "Users can insert their own notifications only" 
ON public.notifications 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Update the notification functions to use SECURITY DEFINER so they can bypass RLS
-- This allows system-generated notifications while preventing user abuse
CREATE OR REPLACE FUNCTION public.notify_partner_joined()
RETURNS TRIGGER AS $$
BEGIN
  -- Notify user1 when user2 joins
  IF OLD.user2_id IS NULL AND NEW.user2_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, type, title, message)
    VALUES (
      NEW.user1_id,
      'partner_joined',
      'Partner Joined!',
      'Your partner has joined and you can now start finding baby names together!'
    );
    
    -- Also notify the new partner
    INSERT INTO public.notifications (user_id, type, title, message)
    VALUES (
      NEW.user2_id,
      'partnership_active',
      'Partnership Active!',
      'You''ve successfully joined a partnership! Start swiping to find baby names.'
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;