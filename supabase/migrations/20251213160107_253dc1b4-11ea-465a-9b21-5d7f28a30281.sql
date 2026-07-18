-- Create function to allow a user (partner) to leave a partnership safely
CREATE OR REPLACE FUNCTION public.leave_partnership()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Set user2_id to null and status back to 'pending' for partnerships
  -- where the current user is the partner (user2) and partnership is active
  UPDATE public.partnerships
  SET 
    user2_id = NULL,
    status = 'pending'
  WHERE 
    user2_id = auth.uid()
    AND status = 'active';
END;
$$;