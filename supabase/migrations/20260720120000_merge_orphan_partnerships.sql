-- One-off data cleanup: merge orphan partnerships into the user's real active partnership.
--
-- The pre-fix invite flow could leave a user as user1 of an empty "pending, no partner"
-- partnership (created by onboarding's invite step) while they were already user2 of the real
-- ACTIVE partnership. The client then loaded the orphan (most-recent row) and showed the user as
-- an admin with no partner (split-brain). The client now prefers the active partnership, but the
-- orphan rows — and any swipes recorded under them — still linger and hide those swipes from the
-- partner and the admin panel.
--
-- For each such orphan this re-points the owner's swipes to their active partnership (dropping any
-- that would collide on the unique (user_id, name, partnership_id) index), then deletes the orphan.
-- Because user_swipes.partnership_id is ON DELETE CASCADE, swipes are re-pointed BEFORE the delete.
-- Only PENDING orphans whose owner has an ACTIVE partnership are touched, so genuine pending
-- invites are left alone. On a fresh database this matches nothing and is a no-op. Idempotent.

DO $$
DECLARE
  orphan RECORD;
  active_pid UUID;
BEGIN
  FOR orphan IN
    SELECT id, user1_id
    FROM public.partnerships
    WHERE status = 'pending' AND user2_id IS NULL
  LOOP
    -- The real partnership the owner actually participates in.
    SELECT ap.id INTO active_pid
    FROM public.partnerships ap
    WHERE ap.status = 'active'
      AND (ap.user1_id = orphan.user1_id OR ap.user2_id = orphan.user1_id)
    ORDER BY ap.created_at DESC
    LIMIT 1;

    IF active_pid IS NULL THEN
      CONTINUE;  -- genuine pending invite with no active partnership; leave it alone
    END IF;

    -- Drop orphan swipes that would duplicate an existing swipe under the active partnership.
    DELETE FROM public.user_swipes s
    WHERE s.partnership_id = orphan.id
      AND EXISTS (
        SELECT 1 FROM public.user_swipes t
        WHERE t.user_id = s.user_id
          AND t.name = s.name
          AND t.partnership_id = active_pid
      );

    -- Move the remaining orphan swipes onto the active partnership.
    UPDATE public.user_swipes
    SET partnership_id = active_pid
    WHERE partnership_id = orphan.id;

    -- Delete the orphan; its swipes are already re-pointed, so nothing is cascaded away.
    DELETE FROM public.partnerships WHERE id = orphan.id;
  END LOOP;
END $$;
