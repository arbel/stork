-- One-round-trip boot for the app: partnership + own swipes + partner likes + partner
-- profile in a single RPC. The client previously ran these as sequential queries
-- (partnership first, then the rest), paying ~300ms of region latency per hop.
--
-- SECURITY INVOKER on purpose: every read goes through the existing RLS policies, so this
-- exposes exactly what the client could already query — just in one round trip.
--
-- Partnership choice mirrors the client's pickPrimaryPartnership(): an ACTIVE partnership
-- always wins over stray pending/orphan rows, then most recent.

CREATE OR REPLACE FUNCTION public.get_boot_data()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
WITH me AS (
  SELECT auth.uid() AS uid
),
p AS (
  SELECT pt.*
  FROM public.partnerships pt, me
  WHERE pt.user1_id = me.uid OR pt.user2_id = me.uid
  ORDER BY (pt.status = 'active') DESC, pt.created_at DESC
  LIMIT 1
),
partner AS (
  SELECT CASE WHEN p.user1_id = me.uid THEN p.user2_id ELSE p.user1_id END AS pid
  FROM p, me
)
SELECT jsonb_build_object(
  'partnership', (SELECT to_jsonb(p) FROM p),
  'my_swipes', COALESCE(
    (SELECT jsonb_agg(jsonb_build_object('name', s.name, 'action', s.action))
     FROM public.user_swipes s, me
     WHERE s.user_id = me.uid
       AND s.partnership_id IS NOT DISTINCT FROM (SELECT id FROM p)),
    '[]'::jsonb
  ),
  'partner_likes', COALESCE(
    (SELECT jsonb_agg(s.name)
     FROM public.user_swipes s, p, partner
     WHERE s.partnership_id = p.id
       AND s.user_id = partner.pid
       AND s.action = 'like'),
    '[]'::jsonb
  ),
  'partner_profile', (
    SELECT jsonb_build_object('first_name', pr.first_name, 'preferences', pr.preferences)
    FROM public.profiles pr, partner
    WHERE pr.user_id = partner.pid
  )
);
$$;

GRANT EXECUTE ON FUNCTION public.get_boot_data() TO authenticated;
