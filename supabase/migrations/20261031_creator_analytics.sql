create or replace function public.get_creator_analytics(target_user uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  analytics jsonb;
begin
  if (select auth.uid()) is null or (select auth.uid()) <> target_user then
    raise exception 'You can only view your own creator analytics';
  end if;

  select jsonb_build_object(
    'clips', (
      select count(*) from public.posts p where p.user_id = target_user
    ),
    'likes', (
      select coalesce(sum(p.likes_count), 0) from public.posts p where p.user_id = target_user
    ),
    'comments', (
      select coalesce(sum(p.comments_count), 0) from public.posts p where p.user_id = target_user
    ),
    'followers', (
      select count(*) from public.follows f
      where f.following_id = target_user and f.status = 'accepted'
    ),
    'following', (
      select count(*) from public.follows f
      where f.follower_id = target_user and f.status = 'accepted'
    ),
    'daily', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'date', days.day::date,
          'clips', coalesce(day_stats.clips, 0),
          'likes', coalesce(day_stats.likes, 0),
          'comments', coalesce(day_stats.comments, 0)
        )
        order by days.day
      )
      from generate_series(current_date - 29, current_date, interval '1 day') as days(day)
      left join lateral (
        select
          count(*) as clips,
          coalesce(sum(p.likes_count), 0) as likes,
          coalesce(sum(p.comments_count), 0) as comments
        from public.posts p
        where p.user_id = target_user
          and p.created_at >= days.day
          and p.created_at < days.day + interval '1 day'
      ) as day_stats on true
    ), '[]'::jsonb)
  )
  into analytics;

  return analytics;
end;
$$;

revoke all on function public.get_creator_analytics(uuid) from public, anon;
grant execute on function public.get_creator_analytics(uuid) to authenticated;
