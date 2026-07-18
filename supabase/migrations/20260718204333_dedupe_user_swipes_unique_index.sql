-- Guarantee one saved choice per (user, name, partnership context); latest choice wins.

-- 1) Collapse any existing duplicates, keeping the most recent row per
--    (user_id, name, partnership context). NULL partnership_id is treated as a single
--    "solo" context via COALESCE to the zero UUID.
DELETE FROM public.user_swipes us
USING public.user_swipes newer
WHERE us.user_id = newer.user_id
  AND us.name = newer.name
  AND COALESCE(us.partnership_id, '00000000-0000-0000-0000-000000000000'::uuid)
      = COALESCE(newer.partnership_id, '00000000-0000-0000-0000-000000000000'::uuid)
  AND us.created_at < newer.created_at;

-- 2) Enforce it going forward. NULLS NOT DISTINCT makes a NULL partnership_id collapse to a
--    single context (equivalent to the COALESCE above) while keeping the index on the plain
--    columns so PostgREST .upsert({ onConflict: 'user_id,name,partnership_id' }) can target it.
DROP INDEX IF EXISTS public.user_swipes_one_choice_per_name_context_idx;
CREATE UNIQUE INDEX user_swipes_one_choice_per_name_context_idx
ON public.user_swipes (user_id, name, partnership_id) NULLS NOT DISTINCT;
