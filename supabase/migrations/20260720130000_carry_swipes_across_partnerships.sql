-- Fix: swiping opinions were lost when a user changed partnerships.
--
-- user_swipes are scoped by partnership_id (both the loader and match computation filter on it).
-- join_partnership_by_invite only flipped the old partnership to 'ended' and left the joiner's
-- swipes under that old id — so the app, which loads swipes for the CURRENT partnership, showed
-- them as gone. Swipes were never deleted, just stranded.
--
-- A user's opinion on a name is theirs regardless of partner, so their swipes should follow them
-- into whatever partnership they're currently in (and then matches recompute against the new
-- partner). This migration:
--   (1) BACKFILL: consolidate every user's swipes into their current active partnership.
--   (2) Rewrite join_partnership_by_invite to re-point the joiner's swipes on every future join.
-- Both respect the unique (user_id, name, partnership_id) index by dropping collisions first.

-- (1) BACKFILL --------------------------------------------------------------------------------
DO $$
DECLARE
  rec RECORD;
BEGIN
  FOR rec IN
    SELECT DISTINCT ON (u.uid) u.uid AS user_id, p.id AS active_pid
    FROM public.partnerships p
    CROSS JOIN LATERAL (VALUES (p.user1_id), (p.user2_id)) AS u(uid)
    WHERE p.status = 'active' AND u.uid IS NOT NULL
    ORDER BY u.uid, p.created_at DESC
  LOOP
    DELETE FROM public.user_swipes s
    WHERE s.user_id = rec.user_id
      AND s.partnership_id IS DISTINCT FROM rec.active_pid
      AND EXISTS (
        SELECT 1 FROM public.user_swipes t
        WHERE t.user_id = rec.user_id AND t.name = s.name AND t.partnership_id = rec.active_pid
      );

    UPDATE public.user_swipes
    SET partnership_id = rec.active_pid
    WHERE user_id = rec.user_id
      AND partnership_id IS DISTINCT FROM rec.active_pid;
  END LOOP;
END $$;

-- (2) RPC: re-point the joiner's swipes on join -----------------------------------------------
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
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('error', 'Authentication required');
  END IF;

  SELECT * INTO partnership_record
  FROM public.partnerships
  WHERE invite_code = invite_code_param
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE LOG 'Invite code % not found', invite_code_param;
    RETURN jsonb_build_object('error', 'Invalid invite code - code not found');
  END IF;

  IF partnership_record.user1_id = auth.uid() THEN
    RETURN jsonb_build_object('error', 'Cannot join your own partnership');
  END IF;

  -- Idempotent path: caller is already the partner on this invite.
  IF partnership_record.user2_id = auth.uid() THEN
    UPDATE public.partnerships
    SET status = 'active'
    WHERE id = partnership_record.id
    RETURNING * INTO partnership_record;

    -- Consolidate any stray swipes into this partnership too.
    DELETE FROM public.user_swipes s
    WHERE s.user_id = auth.uid()
      AND s.partnership_id IS DISTINCT FROM partnership_record.id
      AND EXISTS (SELECT 1 FROM public.user_swipes t
                  WHERE t.user_id = auth.uid() AND t.name = s.name
                    AND t.partnership_id = partnership_record.id);
    UPDATE public.user_swipes
    SET partnership_id = partnership_record.id
    WHERE user_id = auth.uid()
      AND partnership_id IS DISTINCT FROM partnership_record.id;

    SELECT to_jsonb(p.*) INTO result FROM public.partnerships p WHERE id = partnership_record.id;
    RETURN jsonb_build_object('success', true, 'already_member', true, 'partnership', result);
  END IF;

  -- Detach the caller from any OTHER active partnership (status only; swipes carried below).
  UPDATE public.partnerships
  SET status = 'ended'
  WHERE id <> partnership_record.id
    AND status = 'active'
    AND (user1_id = auth.uid() OR user2_id = auth.uid());

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

  UPDATE public.partnerships
  SET user2_id = auth.uid(), status = 'active'
  WHERE id = partnership_record.id
  RETURNING * INTO partnership_record;

  UPDATE public.profiles
  SET preferences = safe_preferences,
      partner_name = 'partner'
  WHERE user_id = auth.uid();

  -- Carry the joiner's existing swipes into THIS partnership so their picks aren't lost and
  -- matches can be computed. Drop collisions first (unique on user_id,name,partnership_id).
  DELETE FROM public.user_swipes s
  WHERE s.user_id = auth.uid()
    AND s.partnership_id IS DISTINCT FROM partnership_record.id
    AND EXISTS (SELECT 1 FROM public.user_swipes t
                WHERE t.user_id = auth.uid() AND t.name = s.name
                  AND t.partnership_id = partnership_record.id);
  UPDATE public.user_swipes
  SET partnership_id = partnership_record.id
  WHERE user_id = auth.uid()
    AND partnership_id IS DISTINCT FROM partnership_record.id;

  INSERT INTO public.notifications (user_id, type, title, message)
  VALUES
    (partnership_record.user1_id, 'partner_joined', 'Partner Joined!',
     'Your partner has joined and you can now start finding baby names together!'),
    (auth.uid(), 'partnership_active', 'Partnership Active!',
     'You''ve successfully joined a partnership! Start swiping to find baby names.');

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
