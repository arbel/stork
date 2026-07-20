-- Security hardening (audit remediation).

-- =========================================================================================
-- (A) get_partnership_by_invite_code: stop leaking the inviter's email + UUID to anyone holding
-- a code. Return only a display name + status (enough for the pre-auth invite preview).
-- =========================================================================================
DROP FUNCTION IF EXISTS public.get_partnership_by_invite_code(text);
CREATE FUNCTION public.get_partnership_by_invite_code(invite_code_param text)
RETURNS TABLE(inviter_name text, status text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(pr.first_name, 'your partner') AS inviter_name,
    p.status
  FROM partnerships p
  LEFT JOIN profiles pr ON pr.user_id = p.user1_id
  WHERE p.invite_code = invite_code_param
  LIMIT 1;
END;
$function$;

-- =========================================================================================
-- (B) join_partnership_by_invite: re-add the occupancy guard removed during the re-join rewrites.
-- Claim the slot only when it's free (user2_id IS NULL) or the caller already holds it; reject
-- when a DIFFERENT partner occupies it. Prevents an invite-code holder from evicting the partner
-- and reading their data. Keeps the carry-swipes behaviour.
-- =========================================================================================
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
    RETURN jsonb_build_object('error', 'Invalid invite code - code not found');
  END IF;

  IF partnership_record.user1_id = auth.uid() THEN
    RETURN jsonb_build_object('error', 'Cannot join your own partnership');
  END IF;

  -- Idempotent: caller already IS the partner on this invite.
  IF partnership_record.user2_id = auth.uid() THEN
    UPDATE public.partnerships SET status = 'active'
    WHERE id = partnership_record.id RETURNING * INTO partnership_record;

    DELETE FROM public.user_swipes s
    WHERE s.user_id = auth.uid() AND s.partnership_id IS DISTINCT FROM partnership_record.id
      AND EXISTS (SELECT 1 FROM public.user_swipes t
                  WHERE t.user_id = auth.uid() AND t.name = s.name AND t.partnership_id = partnership_record.id);
    UPDATE public.user_swipes SET partnership_id = partnership_record.id
    WHERE user_id = auth.uid() AND partnership_id IS DISTINCT FROM partnership_record.id;

    SELECT to_jsonb(p.*) INTO result FROM public.partnerships p WHERE id = partnership_record.id;
    RETURN jsonb_build_object('success', true, 'already_member', true, 'partnership', result);
  END IF;

  -- GUARD: slot occupied by someone else -> reject (no hijack).
  IF partnership_record.user2_id IS NOT NULL THEN
    RETURN jsonb_build_object('error', 'This partnership is already full');
  END IF;

  -- Detach caller from any other active partnership (swipes carried below).
  UPDATE public.partnerships SET status = 'ended'
  WHERE id <> partnership_record.id AND status = 'active'
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

  UPDATE public.partnerships SET user2_id = auth.uid(), status = 'active'
  WHERE id = partnership_record.id RETURNING * INTO partnership_record;

  UPDATE public.profiles SET preferences = safe_preferences, partner_name = 'partner'
  WHERE user_id = auth.uid();

  -- Carry the joiner's swipes into this partnership (drop unique-index collisions first).
  DELETE FROM public.user_swipes s
  WHERE s.user_id = auth.uid() AND s.partnership_id IS DISTINCT FROM partnership_record.id
    AND EXISTS (SELECT 1 FROM public.user_swipes t
                WHERE t.user_id = auth.uid() AND t.name = s.name AND t.partnership_id = partnership_record.id);
  UPDATE public.user_swipes SET partnership_id = partnership_record.id
  WHERE user_id = auth.uid() AND partnership_id IS DISTINCT FROM partnership_record.id;

  INSERT INTO public.notifications (user_id, type, title, message)
  VALUES
    (partnership_record.user1_id, 'partner_joined', 'Partner Joined!',
     'Your partner has joined and you can now start finding baby names together!'),
    (auth.uid(), 'partnership_active', 'Partnership Active!',
     'You''ve successfully joined a partnership! Start swiping to find baby names.');

  FOR matched_name IN
    SELECT s1.name FROM public.user_swipes s1
    JOIN public.user_swipes s2 ON s2.name = s1.name AND s2.partnership_id = s1.partnership_id
    WHERE s1.partnership_id = partnership_record.id
      AND s1.action = 'like' AND s2.action = 'like'
      AND s1.user_id = partnership_record.user1_id AND s2.user_id = auth.uid()
  LOOP
    INSERT INTO public.notifications (user_id, type, title, message)
    VALUES
      (partnership_record.user1_id, 'match', 'It''s a match! 🎉', 'You and your partner both liked ' || matched_name || '.'),
      (auth.uid(), 'match', 'It''s a match! 🎉', 'You and your partner both liked ' || matched_name || '.');
  END LOOP;

  SELECT to_jsonb(p.*) INTO result FROM public.partnerships p WHERE id = partnership_record.id;
  RETURN jsonb_build_object('success', true, 'partnership', result);

EXCEPTION WHEN OTHERS THEN
  RAISE LOG 'Error in join_partnership_by_invite: %', SQLERRM;
  RETURN jsonb_build_object('error', 'Failed to join partnership: ' || SQLERRM);
END;
$function$;

-- =========================================================================================
-- (C) Close the email-keyed admin bootstrap window: remove any unclaimed admin rows (user_id NULL),
-- which an attacker could claim by registering that email (email confirmations are off).
-- =========================================================================================
DELETE FROM public.admin_users WHERE user_id IS NULL;

-- =========================================================================================
-- (D) Partnerships policy hardening.
-- Drop the leaky "anyone with any invite_code can read every partnership row" policy (invite
-- previews go through the SECURITY DEFINER RPC) and the redundant join-via-UPDATE policy (joining
-- goes through join_partnership_by_invite). Add a WITH CHECK so a member can't update the row to
-- one they're no longer part of (e.g. reassign user1 to a stranger).
-- =========================================================================================
DROP POLICY IF EXISTS "Anyone can view partnerships by invite code" ON public.partnerships;
DROP POLICY IF EXISTS "Users can join partnerships via invite code" ON public.partnerships;

DROP POLICY IF EXISTS "Users can update partnerships they're part of" ON public.partnerships;
CREATE POLICY "Users can update partnerships they're part of"
ON public.partnerships FOR UPDATE
USING (auth.uid() = user1_id OR auth.uid() = user2_id)
WITH CHECK (auth.uid() = user1_id OR auth.uid() = user2_id);

-- Admin-ownership transfer removes the caller from the row, so it can't go through the (now
-- WITH CHECK-constrained) member UPDATE policy. Do it in a SECURITY DEFINER function instead.
CREATE OR REPLACE FUNCTION public.transfer_partnership_ownership()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RETURN; END IF;
  UPDATE public.partnerships
  SET user1_id = user2_id, user2_id = NULL, status = 'pending'
  WHERE user1_id = auth.uid() AND user2_id IS NOT NULL AND status = 'active';
END;
$$;
GRANT EXECUTE ON FUNCTION public.transfer_partnership_ownership() TO authenticated;

-- =========================================================================================
-- (E) Recommender similarity functions: pin search_path and stop PUBLIC from triggering the
-- expensive full-table delete + O(n^2) recompute (DoS). They're only invoked by trusted automation.
-- =========================================================================================
ALTER FUNCTION public.calculate_user_similarities() SET search_path = public;
ALTER FUNCTION public.calculate_name_similarities() SET search_path = public;
REVOKE EXECUTE ON FUNCTION public.calculate_user_similarities() FROM public;
REVOKE EXECUTE ON FUNCTION public.calculate_name_similarities() FROM public;
GRANT EXECUTE ON FUNCTION public.calculate_user_similarities() TO service_role;
GRANT EXECUTE ON FUNCTION public.calculate_name_similarities() TO service_role;
