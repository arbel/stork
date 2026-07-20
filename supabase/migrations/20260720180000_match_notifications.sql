-- Match notifications: when a swipe completes a match, notify the partner who
-- ISN'T holding the phone (the swiper gets the live celebration client-side).
-- The client presents unread 'match_found' rows on the swipe screen: one row →
-- full celebration, several → a summary ("N new matches since your last visit").

-- Structured payload so clients can read the matched name / partnership without
-- parsing the human-readable message.
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS data JSONB;

-- Idempotency: at most one match notification per (user, partnership, name).
-- Re-swipes, upsert retries and undo/redo cycles can't create duplicates.
CREATE UNIQUE INDEX IF NOT EXISTS notifications_match_found_unique
  ON public.notifications (user_id, (data->>'partnership_id'), (data->>'name'))
  WHERE type = 'match_found';

-- ---------------------------------------------------------------------------
-- Create: fires on any write that can complete a match:
--   INSERT                  — first-time like
--   UPDATE OF action        — pass → like (swipes are upserts, latest wins)
--   UPDATE OF partnership_id — solo swipes re-attached when a partner joins
--                              (this is the bulk case: notify BOTH sides)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.notify_match_found()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_partner_id uuid;
  v_is_reattach boolean;
BEGIN
  IF NEW.action <> 'like' OR NEW.partnership_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT CASE WHEN p.user1_id = NEW.user_id THEN p.user2_id ELSE p.user1_id END
    INTO v_partner_id
    FROM public.partnerships p
   WHERE p.id = NEW.partnership_id;

  IF v_partner_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- A match exists only if the partner already liked this name in this partnership.
  IF NOT EXISTS (
    SELECT 1
      FROM public.user_swipes s
     WHERE s.partnership_id = NEW.partnership_id
       AND s.user_id = v_partner_id
       AND s.name = NEW.name
       AND s.action = 'like'
  ) THEN
    RETURN NEW;
  END IF;

  -- Receiver-only: the actively-swiping user sees the celebration live, so only
  -- the partner gets a row…
  INSERT INTO public.notifications (user_id, type, title, message, data)
  VALUES (
    v_partner_id,
    'match_found',
    'התאמה חדשה! 🎉',
    'שניכם אוהבים את השם ' || NEW.name,
    jsonb_build_object('name', NEW.name, 'partnership_id', NEW.partnership_id)
  )
  ON CONFLICT DO NOTHING;

  -- …except on bulk re-attach (partner just joined and their solo likes moved
  -- into the partnership): nobody was actively swiping these, so the joining
  -- user should hear about the matches too.
  v_is_reattach := TG_OP = 'UPDATE' AND OLD.partnership_id IS NULL;
  IF v_is_reattach THEN
    INSERT INTO public.notifications (user_id, type, title, message, data)
    VALUES (
      NEW.user_id,
      'match_found',
      'התאמה חדשה! 🎉',
      'שניכם אוהבים את השם ' || NEW.name,
      jsonb_build_object('name', NEW.name, 'partnership_id', NEW.partnership_id)
    )
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_swipe_match_found ON public.user_swipes;
CREATE TRIGGER on_swipe_match_found
  AFTER INSERT OR UPDATE OF action, partnership_id ON public.user_swipes
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_match_found();

-- ---------------------------------------------------------------------------
-- Retract: a like that dissolved (undo/DELETE, or like → pass) removes the
-- match, so remove any still-UNREAD match notification about it for both
-- partners. Already-read/seen notifications are left alone.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.retract_match_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.action = 'like'
     AND OLD.partnership_id IS NOT NULL
     AND (TG_OP = 'DELETE' OR NEW.action <> 'like') THEN
    DELETE FROM public.notifications n
     WHERE n.type = 'match_found'
       AND n.read = false
       AND n.data->>'name' = OLD.name
       AND n.data->>'partnership_id' = OLD.partnership_id::text
       AND n.user_id IN (
         SELECT p.user1_id FROM public.partnerships p WHERE p.id = OLD.partnership_id
         UNION
         SELECT p.user2_id FROM public.partnerships p WHERE p.id = OLD.partnership_id
       );
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS on_swipe_match_retract ON public.user_swipes;
CREATE TRIGGER on_swipe_match_retract
  AFTER DELETE OR UPDATE OF action ON public.user_swipes
  FOR EACH ROW
  EXECUTE FUNCTION public.retract_match_notification();
