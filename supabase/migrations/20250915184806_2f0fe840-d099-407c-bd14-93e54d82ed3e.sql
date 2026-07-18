CREATE OR REPLACE FUNCTION public.join_partnership_by_invite(invite_code_param text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  partnership_record public.partnerships;
  main_user_profile public.profiles;
  result jsonb;
  partnership_count integer;
  existing_status text;
  existing_user2_id uuid;
  safe_preferences jsonb;
BEGIN
  -- Get the current user ID
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('error', 'Authentication required');
  END IF;

  -- Debug: Log the invite code and user attempting to join
  RAISE LOG 'User % attempting to join with invite code: %', auth.uid(), invite_code_param;

  -- First, check if the invite code exists at all
  SELECT COUNT(*) INTO partnership_count
  FROM public.partnerships
  WHERE invite_code = invite_code_param;
  
  IF partnership_count = 0 THEN
    RAISE LOG 'Invite code % not found in database', invite_code_param;
    RETURN jsonb_build_object('error', 'Invalid invite code - code not found');
  END IF;

  -- Check the status of the partnership with this invite code
  SELECT status, user2_id INTO existing_status, existing_user2_id
  FROM public.partnerships
  WHERE invite_code = invite_code_param;
  
  RAISE LOG 'Partnership with invite code % has status: %, user2_id: %', 
    invite_code_param, existing_status, existing_user2_id;

  -- Find the partnership by invite code with specific criteria
  SELECT * INTO partnership_record
  FROM public.partnerships
  WHERE invite_code = invite_code_param
    AND status = 'pending'
    AND user2_id IS NULL;

  -- Check if partnership exists with detailed error messages
  IF NOT FOUND THEN
    IF existing_status != 'pending' THEN
      RETURN jsonb_build_object('error', 'This partnership invitation has already been used');
    ELSIF existing_user2_id IS NOT NULL THEN
      RETURN jsonb_build_object('error', 'This partnership is already full');
    ELSE
      RETURN jsonb_build_object('error', 'Partnership not available for joining');
    END IF;
  END IF;

  -- Prevent users from joining their own partnership
  IF partnership_record.user1_id = auth.uid() THEN
    RETURN jsonb_build_object('error', 'Cannot join your own partnership');
  END IF;

  -- Get main user's profile for preference inheritance
  SELECT * INTO main_user_profile
  FROM public.profiles
  WHERE user_id = partnership_record.user1_id;

  -- Safely handle preferences - ensure valid JSON
  BEGIN
    IF main_user_profile.preferences IS NOT NULL AND jsonb_typeof(main_user_profile.preferences) = 'object' THEN
      safe_preferences := main_user_profile.preferences;
    ELSE
      safe_preferences := '{"gender": "unknown", "country": "", "language": "en"}'::jsonb;
    END IF;
  EXCEPTION
    WHEN OTHERS THEN
      -- If there's any JSON error, use default preferences
      safe_preferences := '{"gender": "unknown", "country": "", "language": "en"}'::jsonb;
  END;

  -- Update the partnership to add the joining user
  UPDATE public.partnerships
  SET user2_id = auth.uid(), status = 'active'
  WHERE id = partnership_record.id;

  -- Update the joining user's profile with inherited preferences
  UPDATE public.profiles
  SET 
    preferences = safe_preferences,
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

  RAISE LOG 'Successfully joined partnership % for user %', partnership_record.id, auth.uid();
  
  RETURN jsonb_build_object('success', true, 'partnership', result);

EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error in join_partnership_by_invite: %', SQLERRM;
    RETURN jsonb_build_object('error', 'Failed to join partnership: ' || SQLERRM);
END;
$function$;