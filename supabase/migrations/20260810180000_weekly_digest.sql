-- Weekly digest email support.
-- 1) Per-user opaque unsubscribe token for one-click unsubscribe links.
-- 2) partnerships.last_digest_sent_at so each email covers only what's new since the last one.
-- 3) get_weekly_digest_data(): server-side assembly of each active couple's digest payload
--    (service role only). Content window = since the last digest (or last 7 days the first time).

-- ---- unsubscribe token ----
alter table public.profiles
  add column if not exists email_unsub_token uuid not null default gen_random_uuid();
create unique index if not exists profiles_email_unsub_token_key on public.profiles (email_unsub_token);

-- ---- per-couple digest watermark ----
alter table public.partnerships
  add column if not exists last_digest_sent_at timestamptz;

-- ---- digest data assembly ----
-- One object per ACTIVE partnership where at least one partner swiped in the last 7 days.
-- Each carries both partners, NEW shared matches since the last digest (+ all-time count),
-- and each partner's NEW likes since the last digest — most recent first.
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
      -- Everything since the last email; first time, fall back to the past week.
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
    -- Each shared name + when the match completed (the later of the two likes).
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
      -- All of this period's likes for each partner, most recent first (no cap).
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

revoke execute on function public.get_weekly_digest_data() from public, anon, authenticated;
grant execute on function public.get_weekly_digest_data() to service_role;

-- Mark a set of partnerships as just-emailed, so the next digest only covers newer activity.
create or replace function public.mark_digests_sent(p_ids uuid[])
returns void
language sql
volatile
security definer
set search_path to 'public'
as $$
  update public.partnerships set last_digest_sent_at = now() where id = any(p_ids);
$$;
revoke execute on function public.mark_digests_sent(uuid[]) from public, anon, authenticated;
grant execute on function public.mark_digests_sent(uuid[]) to service_role;

-- Public one-click unsubscribe: flip emailUpdates off by token, return first name for the page.
create or replace function public.unsubscribe_email_updates(p_token uuid)
returns text
language plpgsql
volatile
security definer
set search_path to 'public'
as $$
declare
  fname text;
begin
  update public.profiles
    set preferences = jsonb_set(coalesce(preferences, '{}'::jsonb), '{emailUpdates}', 'false'::jsonb, true)
    where email_unsub_token = p_token
    returning first_name into fname;
  return fname;
end;
$$;
revoke execute on function public.unsubscribe_email_updates(uuid) from public, anon, authenticated;
grant execute on function public.unsubscribe_email_updates(uuid) to service_role;
