-- Add sample_matches to the digest payload: up to 8 of the couple's existing shared names
-- (most recent first), used as a fallback when there are no NEW matches this period so the
-- matches block is never empty for an engaged couple.
create or replace function public.get_weekly_digest_data()
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public'
as $$
declare
  result jsonb;
begin
  with active_p as (
    select
      p.id, p.user1_id, p.user2_id,
      coalesce(p.last_digest_sent_at, now() - interval '7 days') as window_start
    from partnerships p
    where p.status = 'active'
      and p.user1_id is not null and p.user2_id is not null
      and exists (
        select 1 from user_swipes s
        where s.created_at >= now() - interval '7 days'
          and (s.user_id = p.user1_id or s.user_id = p.user2_id)
      )
  ),
  shared as (
    select ap.id as pid, us1.name, greatest(us1.created_at, us2.created_at) as matched_at
    from active_p ap
    join user_swipes us1 on us1.partnership_id = ap.id and us1.user_id = ap.user1_id and us1.action = 'like'
    join user_swipes us2 on us2.partnership_id = ap.id and us2.user_id = ap.user2_id and us2.action = 'like' and us2.name = us1.name
  )
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'partnership_id', ap.id,
      'u1', (
        select jsonb_build_object(
          'id', pr.user_id, 'email', pr.email, 'first_name', pr.first_name,
          'unsub_token', pr.email_unsub_token,
          'email_enabled', coalesce((pr.preferences->>'emailUpdates')::boolean, true)
        ) from profiles pr where pr.user_id = ap.user1_id
      ),
      'u2', (
        select jsonb_build_object(
          'id', pr.user_id, 'email', pr.email, 'first_name', pr.first_name,
          'unsub_token', pr.email_unsub_token,
          'email_enabled', coalesce((pr.preferences->>'emailUpdates')::boolean, true)
        ) from profiles pr where pr.user_id = ap.user2_id
      ),
      'matches_count', (select count(*) from shared sh where sh.pid = ap.id),
      'new_matches', (
        select coalesce(jsonb_agg(jsonb_build_object('name', t.name, 'meaning', n.meaning) order by t.matched_at desc), '[]'::jsonb)
        from (
          select name, matched_at from shared
          where pid = ap.id and matched_at > ap.window_start
          order by matched_at desc
        ) t
        left join names n on n.name = t.name
      ),
      -- Fallback sample of existing matches (regardless of window), most recent first.
      'sample_matches', (
        select coalesce(jsonb_agg(jsonb_build_object('name', t.name, 'meaning', n.meaning) order by t.matched_at desc), '[]'::jsonb)
        from (
          select name, matched_at from shared
          where pid = ap.id
          order by matched_at desc limit 8
        ) t
        left join names n on n.name = t.name
      ),
      'u1_likes', (
        select coalesce(jsonb_agg(x.name order by x.created_at desc), '[]'::jsonb)
        from (
          select name, created_at from user_swipes
          where partnership_id = ap.id and user_id = ap.user1_id and action = 'like'
            and created_at > ap.window_start
        ) x
      ),
      'u2_likes', (
        select coalesce(jsonb_agg(x.name order by x.created_at desc), '[]'::jsonb)
        from (
          select name, created_at from user_swipes
          where partnership_id = ap.id and user_id = ap.user2_id and action = 'like'
            and created_at > ap.window_start
        ) x
      )
    )
  ), '[]'::jsonb)
  into result
  from active_p ap;

  return result;
end;
$$;
