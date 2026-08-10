-- Add a Day 0–7 retention curve to the admin usage-stats RPC.
-- For each day offset since signup, count users who were active (swiped) that calendar day,
-- over the users old enough to have reached that day. Day 0 = signup day.

create or replace function public.get_admin_usage_stats()
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public'
as $$
declare
  result jsonb;
begin
  if not public.is_current_user_admin() then
    raise exception 'not authorized';
  end if;

  with swipe_agg as (
    select
      user_id,
      count(*) filter (where action = 'like')::int as liked,
      count(*) filter (where action = 'pass')::int as passed,
      count(*)::int                                 as total,
      max(created_at)                               as last_activity
    from user_swipes
    group by user_id
  ),
  match_per_partnership as (
    select
      p.id, p.user1_id, p.user2_id,
      (
        select count(*) from (
          select name from user_swipes
            where partnership_id = p.id and user_id = p.user1_id and action = 'like'
          intersect
          select name from user_swipes
            where partnership_id = p.id and user_id = p.user2_id and action = 'like'
        ) t
      )::int as match_count
    from partnerships p
    where p.status = 'active' and p.user1_id is not null and p.user2_id is not null
  ),
  match_per_user as (
    select user1_id as user_id, match_count from match_per_partnership
    union all
    select user2_id as user_id, match_count from match_per_partnership
  ),
  users as (
    select
      pr.user_id,
      pr.email,
      pr.first_name,
      coalesce(pr.preferences->>'country', 'N/A')  as region,
      coalesce(pr.preferences->>'language', 'N/A') as language,
      pr.created_at,
      sa.last_activity,
      au.last_sign_in_at              as last_sign_in,
      coalesce(sa.liked, 0)          as liked_count,
      coalesce(sa.passed, 0)         as passed_count,
      coalesce(sa.total, 0)          as total_reviewed,
      coalesce(mu.match_count, 0)    as matched_count
    from profiles pr
    left join swipe_agg sa      on sa.user_id = pr.user_id
    left join match_per_user mu on mu.user_id = pr.user_id
    left join auth.users au     on au.id      = pr.user_id
  ),
  daily as (
    select
      to_char((created_at at time zone 'UTC')::date, 'YYYY-MM-DD') as d,
      count(*) filter (where action = 'like')::int  as likes,
      count(*) filter (where action = 'pass')::int  as passes
    from user_swipes
    where created_at >= (now() - interval '30 days')
    group by 1
  ),
  dau as (
    select
      to_char((created_at at time zone 'UTC')::date, 'YYYY-MM-DD') as d,
      array_agg(distinct user_id)                                  as user_ids
    from user_swipes
    where created_at >= (now() - interval '30 days')
    group by 1
  ),
  signup as (
    select user_id, (created_at at time zone 'UTC')::date as signup_date from profiles
  ),
  active_days as (
    select distinct user_id, (created_at at time zone 'UTC')::date as d from user_swipes
  ),
  user_day as (
    select
      s.user_id,
      n as day_offset,
      (s.signup_date + n) as target_date,
      (s.signup_date + n) <= (now() at time zone 'UTC')::date as eligible
    from signup s cross join generate_series(0, 7) as n
  ),
  retention as (
    select
      ud.day_offset,
      count(*) filter (where ud.eligible)::int                                as eligible,
      count(*) filter (where ud.eligible and ad.user_id is not null)::int     as retained
    from user_day ud
    left join active_days ad on ad.user_id = ud.user_id and ad.d = ud.target_date
    group by ud.day_offset
  )
  select jsonb_build_object(
    'total_users', (select count(*) from profiles),
    'users',    coalesce((select jsonb_agg(to_jsonb(u)) from users u), '[]'::jsonb),
    'partners', coalesce((select jsonb_agg(jsonb_build_array(user1_id, user2_id)) from match_per_partnership), '[]'::jsonb),
    'daily',    coalesce((select jsonb_agg(to_jsonb(dd)) from daily dd), '[]'::jsonb),
    'dau',      coalesce((select jsonb_agg(to_jsonb(x)) from dau x), '[]'::jsonb),
    'retention', coalesce((select jsonb_agg(to_jsonb(r) order by r.day_offset) from retention r), '[]'::jsonb),
    'totals', jsonb_build_object(
      'likes',   coalesce((select sum(liked)  from swipe_agg), 0),
      'passes',  coalesce((select sum(passed) from swipe_agg), 0),
      'matches', coalesce((select sum(match_count) from match_per_partnership), 0)
    )
  ) into result;

  return result;
end;
$$;
