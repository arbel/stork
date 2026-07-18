-- Rewrite join_partnership_by_invite so that an EXISTING user joining a new invite works cleanly:
--   * Idempotent: if the caller is already the partner on this invite, drop them straight into the app.
--   * Detach the caller from any prior ACTIVE partnership (their own swipes are preserved, not deleted).
--   * Claim / replace the partner slot on the invite even if it was previously marked "used"/active.
--   * Re-compute matches immediately against the inviter's likes and insert match notifications.
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
  safe_preferences jsonb;
  matched_name text;
BEGIN
  -- Require an authenticated caller
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('error', 'Authentication required');
  END IF;

  -- Locate the partnership for this invite code (regardless of status)
  SELECT * INTO partnership_record
  FROM public.partnerships
  WHERE invite_code = invite_code_param
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE LOG 'Invite code % not found', invite_code_param;
    RETURN jsonb_build_object('error', 'Invalid invite code - code not found');
  END IF;

  -- The inviter cannot join their own invite
  IF partnership_record.user1_id = auth.uid() THEN
    RETURN jsonb_build_object('error', 'Cannot join your own partnership');
  END IF;

  -- Idempotent path: caller is already the partner on this invite -> just ensure it's active and return.
  IF partnership_record.user2_id = auth.uid() THEN
    UPDATE public.partnerships
    SET status = 'active'
    WHERE id = partnership_record.id
    RETURNING * INTO partnership_record;

    SELECT to_jsonb(p.*) INTO result FROM public.partnerships p WHERE id = partnership_record.id;
    RETURN jsonb_build_object('success', true, 'already_member', true, 'partnership', result);
  END IF;

  -- Detach the caller from any OTHER active partnership. We only flip status to 'ended';
  -- their user_swipes rows keep their old partnership_id and are NOT deleted.
  UPDATE public.partnerships
  SET status = 'ended'
  WHERE id <> partnership_record.id
    AND status = 'active'
    AND (user1_id = auth.uid() OR user2_id = auth.uid());

  -- Inherit the inviter's preferences (defensively validated)
  SELECT * INTO main_user_profile FROM public.profiles WHERE user_id = partnership_record.user1_id;
  BEGIN
    IF main_user_profile.preferences IS NOT NULL AND jsonb_typeof(main_user_profile.preferences) = 'object' THEN
      safe_preferences := main_user_profile.preferences;
    ELSE
      safe_preferences := '{"gender": "unknown", "country": "", "language": "en"}'::jsonb;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    safe_preferences := '{"gender": "unknown", "country": "", "language": "en"}'::jsonb;
  END;

  -- Claim / replace the partner slot on this invite, even if it was previously marked used.
  UPDATE public.partnerships
  SET user2_id = auth.uid(), status = 'active'
  WHERE id = partnership_record.id
  RETURNING * INTO partnership_record;

  UPDATE public.profiles
  SET preferences = safe_preferences,
      partner_name = 'partner'
  WHERE user_id = auth.uid();

  -- Join notifications for both sides
  INSERT INTO public.notifications (user_id, type, title, message)
  VALUES
    (partnership_record.user1_id, 'partner_joined', 'Partner Joined!',
     'Your partner has joined and you can now start finding baby names together!'),
    (auth.uid(), 'partnership_active', 'Partnership Active!',
     'You''ve successfully joined a partnership! Start swiping to find baby names.');

  -- Re-compute matches immediately: any name both the inviter and the joining user have liked
  -- inside THIS partnership. Notify both users once per matched name.
  FOR matched_name IN
    SELECT s1.name
    FROM public.user_swipes s1
    JOIN public.user_swipes s2
      ON s2.name = s1.name
     AND s2.partnership_id = s1.partnership_id
    WHERE s1.partnership_id = partnership_record.id
      AND s1.action = 'like' AND s2.action = 'like'
      AND s1.user_id = partnership_record.user1_id
      AND s2.user_id = auth.uid()
  LOOP
    INSERT INTO public.notifications (user_id, type, title, message)
    VALUES
      (partnership_record.user1_id, 'match', 'It''s a match! 🎉',
       'You and your partner both liked ' || matched_name || '.'),
      (auth.uid(), 'match', 'It''s a match! 🎉',
       'You and your partner both liked ' || matched_name || '.');
  END LOOP;

  SELECT to_jsonb(p.*) INTO result FROM public.partnerships p WHERE id = partnership_record.id;
  RAISE LOG 'User % joined partnership %', auth.uid(), partnership_record.id;
  RETURN jsonb_build_object('success', true, 'partnership', result);

EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error in join_partnership_by_invite: %', SQLERRM;
    RETURN jsonb_build_object('error', 'Failed to join partnership: ' || SQLERRM);
END;
$function$;
