-- Fix notification security by restricting who can insert notifications
-- Drop the overly permissive policy
DROP POLICY IF EXISTS "System can insert notifications for users" ON public.notifications;
DROP POLICY IF EXISTS "Functions can insert notifications" ON public.notifications;

-- Create a more secure policy that only allows users to insert notifications for themselves
-- This policy is for edge cases where a user might create their own notification
DROP POLICY IF EXISTS "Users can insert their own notifications only" ON public.notifications;
CREATE POLICY "Users can insert their own notifications only" 
ON public.notifications 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- For system-generated notifications (like partnership events), we'll rely on
-- the database functions using SECURITY DEFINER to bypass RLS policies
-- This is the secure way to handle system notifications

-- Ensure the existing functions have proper security definer settings
-- Update the notify_partner_joined function to use security definer
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

-- Update the notify_partner_disconnected function to use security definer  
CREATE OR REPLACE FUNCTION public.notify_partner_disconnected()
RETURNS TRIGGER AS $$
BEGIN
  -- When a partnership is deleted, notify both users
  IF TG_OP = 'DELETE' THEN
    -- Notify user1
    INSERT INTO public.notifications (user_id, type, title, message)
    VALUES (
      OLD.user1_id,
      'partner_disconnected',
      'Partnership Ended',
      'Your partner has left the partnership. You can create a new partnership anytime!'
    );
    
    -- Notify user2 if they exist
    IF OLD.user2_id IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, type, title, message)
      VALUES (
        OLD.user2_id,
        'partner_disconnected',
        'Partnership Ended',
        'Your partner has left the partnership. You can create a new partnership anytime!'
      );
    END IF;
    
    RETURN OLD;
  END IF;
  
  -- When partnership status changes from active to something else
  IF TG_OP = 'UPDATE' AND OLD.status = 'active' AND NEW.status != 'active' THEN
    -- Notify user1
    INSERT INTO public.notifications (user_id, type, title, message)
    VALUES (
      NEW.user1_id,
      'partner_disconnected',
      'Partnership Status Changed',
      'Your partnership status has changed. Check your partnership settings.'
    );
    
    -- Notify user2 if they exist
    IF NEW.user2_id IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, type, title, message)
      VALUES (
        NEW.user2_id,
        'partner_disconnected',
        'Partnership Status Changed',
        'Your partnership status has changed. Check your partnership settings.'
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;