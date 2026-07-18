-- Fix the critical security vulnerability in partnership visibility
-- Remove the overly permissive SELECT policy and replace with secure approach

-- First, drop the insecure policy
DROP POLICY IF EXISTS "Partnership visibility" ON public.partnerships;

-- Create a secure SELECT policy that only allows viewing partnerships you're already part of
DROP POLICY IF EXISTS "Secure partnership visibility" ON public.partnerships;
CREATE POLICY "Secure partnership visibility" 
ON public.partnerships 
FOR SELECT 
USING (
  -- Only allow viewing if you're already a member of the partnership
  (auth.uid() = user1_id) OR 
  (auth.uid() = user2_id)
);

-- Create a secure function to handle joining partnerships via invite code
-- This function runs with elevated privileges and can safely validate invite codes
CREATE OR REPLACE FUNCTION public.join_partnership_by_invite(invite_code_param text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  partnership_record public.partnerships;
  main_user_profile public.profiles;
  result jsonb;
BEGIN
  -- Get the current user ID
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('error', 'Authentication required');
  END IF;

  -- Find the partnership by invite code
  SELECT * INTO partnership_record
  FROM public.partnerships
  WHERE invite_code = invite_code_param
    AND status = 'pending'
    AND user2_id IS NULL;

  -- Check if partnership exists
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Invalid or expired invite code');
  END IF;

  -- Prevent users from joining their own partnership
  IF partnership_record.user1_id = auth.uid() THEN
    RETURN jsonb_build_object('error', 'Cannot join your own partnership');
  END IF;

  -- Get main user's profile for preference inheritance
  SELECT * INTO main_user_profile
  FROM public.profiles
  WHERE user_id = partnership_record.user1_id;

  -- Update the partnership to add the joining user
  UPDATE public.partnerships
  SET user2_id = auth.uid(), status = 'active'
  WHERE id = partnership_record.id;

  -- Update the joining user's profile with inherited preferences
  UPDATE public.profiles
  SET 
    preferences = COALESCE(main_user_profile.preferences, '{"gender": "unknown", "country": "", "language": "en"}'::jsonb),
    partner_name = 'partner'
  WHERE user_id = auth.uid();

  -- Create notifications for both users
  INSERT INTO public.notifications (user_id, type, title, message)
  VALUES 
    (partnership_record.user1_id, 'partner_joined', 'Partner Joined!', 'Your partner has joined and you can now start finding baby names together!'),
    (auth.uid(), 'partnership_active', 'Partnership Active!', 'You''ve successfully joined a partnership! Start swiping to find baby names.');

  -- Return success with partnership details
  SELECT to_jsonb(p.*) INTO result
  FROM public.partnerships p
  WHERE id = partnership_record.id;

  RETURN jsonb_build_object('success', true, 'partnership', result);

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('error', 'Failed to join partnership: ' || SQLERRM);
END;
$$;