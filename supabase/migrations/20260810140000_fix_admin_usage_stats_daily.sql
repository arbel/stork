-- Fix: the daily-activity series came back as bare date strings, so the Daily Activity
-- chart read as all-zero. Cause: the `daily` CTE has a column named `d`, and the outer
-- query also aliased the CTE table as `d` (`from daily d`). `to_jsonb(d)` then bound to
-- the column (a text date) instead of the row, dropping likes/passes. Renamed the table
-- alias to `dd` so to_jsonb() serializes the whole row. Only the daily branch changes.

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
  )
  select jsonb_build_object(
    'total_users', (select count(*) from profiles),
    'users',    coalesce((select jsonb_agg(to_jsonb(u)) from users u), '[]'::jsonb),
    'partners', coalesce((select jsonb_agg(jsonb_build_array(user1_id, user2_id)) from match_per_partnership), '[]'::jsonb),
    'daily',    coalesce((select jsonb_agg(to_jsonb(dd)) from daily dd), '[]'::jsonb),
    'dau',      coalesce((select jsonb_agg(to_jsonb(x)) from dau x), '[]'::jsonb),
    'totals', jsonb_build_object(
      'likes',   coalesce((select sum(liked)  from swipe_agg), 0),
      'passes',  coalesce((select sum(passed) from swipe_agg), 0),
      'matches', coalesce((select sum(match_count) from match_per_partnership), 0)
    )
  ) into result;

  return result;
end;
$$;
