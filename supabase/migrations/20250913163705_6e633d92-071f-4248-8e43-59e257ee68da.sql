-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_partnership_ended ON public.partnerships;

-- Function to notify when partner disconnects/leaves partnership
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

-- Create trigger for partnership deletion and status changes
DROP TRIGGER IF EXISTS on_partnership_ended ON public.partnerships;
CREATE TRIGGER on_partnership_ended
  AFTER DELETE OR UPDATE ON public.partnerships
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_partner_disconnected();