create table if not exists public.profile_preferences (
  id uuid primary key references public.profiles (id) on delete cascade,
  email_notifications boolean not null default true,
  location_lat double precision,
  location_lon double precision,
  updated_at timestamptz not null default now(),
  check (location_lat is null or location_lat between -90 and 90),
  check (location_lon is null or location_lon between -180 and 180)
);

alter table public.profile_preferences enable row level security;
grant select, insert, update on public.profile_preferences to authenticated;
drop policy if exists "Riders manage their private preferences" on public.profile_preferences;
create policy "Riders manage their private preferences"
  on public.profile_preferences for all
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'email_notifications'
  ) then
    execute '
      insert into public.profile_preferences (id, email_notifications)
      select id, coalesce(email_notifications, true)
      from public.profiles
      on conflict (id) do nothing
    ';
  end if;
end;
$$;

alter table public.profiles drop column if exists email_notifications;
alter table public.profiles drop constraint if exists profiles_location_check;
alter table public.profiles add constraint profiles_location_check check (char_length(location) <= 120);

alter table public.posts add column if not exists comments_count integer not null default 0 check (comments_count >= 0);
alter table public.posts add column if not exists location_lat double precision;
alter table public.posts add column if not exists location_lon double precision;
alter table public.posts drop constraint if exists posts_location_check;
alter table public.posts add constraint posts_location_check check (char_length(location) between 1 and 120);
alter table public.posts drop constraint if exists posts_caption_nonempty_check;
alter table public.posts add constraint posts_caption_nonempty_check check (char_length(btrim(caption)) between 1 and 280);
alter table public.posts drop constraint if exists posts_location_lat_check;
alter table public.posts drop constraint if exists posts_location_lon_check;
alter table public.posts add constraint posts_location_lat_check check (location_lat is null or location_lat between -90 and 90);
alter table public.posts add constraint posts_location_lon_check check (location_lon is null or location_lon between -180 and 180);

create table if not exists public.follows (
  follower_id uuid not null references public.profiles (id) on delete cascade,
  following_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id),
  check (follower_id <> following_id)
);
create index if not exists follows_following_status_idx on public.follows (following_id, status);
create index if not exists follows_follower_status_idx on public.follows (follower_id, status);
alter table public.follows enable row level security;
grant select, insert, update, delete on public.follows to authenticated;

create table if not exists public.blocked_users (
  blocker_id uuid not null references public.profiles (id) on delete cascade,
  blocked_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);
alter table public.blocked_users enable row level security;
grant select, insert, delete on public.blocked_users to authenticated;

create table if not exists public.shared_clips (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  recipient_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  check (sender_id <> recipient_id),
  unique (post_id, sender_id, recipient_id)
);

create or replace function public.is_blocked_between(first_user uuid, second_user uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.blocked_users b
    where ((b.blocker_id = first_user and b.blocked_id = second_user)
       or (b.blocker_id = second_user and b.blocked_id = first_user))
      and ((select auth.uid()) = first_user or (select auth.uid()) = second_user)
  );
$$;

create or replace function public.search_riders(search_term text, result_limit integer default 8)
returns table (
  id uuid,
  username text,
  display_name text,
  avatar_url text,
  discipline text,
  location text,
  profile_visibility text
)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id,
         p.username,
         p.display_name,
         p.avatar_url,
         p.discipline,
         case when p.profile_visibility = 'public' then p.location else '' end,
         p.profile_visibility
  from public.profiles p
  where ((select auth.uid()) is null or p.id <> (select auth.uid()))
    and ((select auth.uid()) is not null or p.profile_visibility = 'public')
    and (search_term is null or p.username ilike '%' || trim(both '@' from search_term) || '%')
    and not public.is_blocked_between(p.id, (select auth.uid()))
  order by p.username
  limit greatest(1, least(coalesce(result_limit, 8), 30));
$$;

create or replace function public.can_view_profile(target_user uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = target_user
      and (
        p.profile_visibility = 'public'
        or p.id = (select auth.uid())
        or exists (
          select 1 from public.follows f
          where f.follower_id = (select auth.uid())
            and f.following_id = p.id
            and f.status = 'accepted'
        )
        or exists (
          select 1 from public.follows f
          where f.follower_id = p.id
            and f.following_id = (select auth.uid())
        )
        or exists (
          select 1
          from public.shared_clips s
          join public.posts shared_post on shared_post.id = s.post_id
          where (s.sender_id = (select auth.uid()) or s.recipient_id = (select auth.uid()))
            and (
              p.id in (s.sender_id, s.recipient_id)
              or shared_post.user_id = p.id
            )
        )
      )
  )
  and (
    target_user = (select auth.uid())
    or (select auth.uid()) is null
    or not exists (
      select 1 from public.blocked_users b
      where (b.blocker_id = target_user and b.blocked_id = (select auth.uid()))
         or (b.blocker_id = (select auth.uid()) and b.blocked_id = target_user)
    )
  );
$$;

drop policy if exists "Public profiles are visible; private profiles are owner-only" on public.profiles;
drop policy if exists "Profiles are visible according to privacy and blocks" on public.profiles;
create policy "Profiles are visible according to privacy and blocks"
  on public.profiles for select
  using (public.can_view_profile(id));

drop policy if exists "Riders can create their own profile" on public.profiles;
drop policy if exists "Riders can update their own profile" on public.profiles;
create policy "Riders can create their own profile"
  on public.profiles for insert
  with check ((select auth.uid()) = id);
create policy "Riders can update their own profile"
  on public.profiles for update
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

drop policy if exists "Users can view relevant blocks" on public.blocked_users;
drop policy if exists "Users can manage their own blocks" on public.blocked_users;
drop policy if exists "Users can remove their own blocks" on public.blocked_users;
create policy "Users can view relevant blocks"
  on public.blocked_users for select
  using (blocker_id = (select auth.uid()) or blocked_id = (select auth.uid()));
create policy "Users can manage their own blocks"
  on public.blocked_users for insert
  with check (blocker_id = (select auth.uid()) and blocker_id <> blocked_id);
create policy "Users can remove their own blocks"
  on public.blocked_users for delete
  using (blocker_id = (select auth.uid()));

create or replace function public.remove_blocked_follows()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.follows
  where (follower_id = new.blocker_id and following_id = new.blocked_id)
     or (follower_id = new.blocked_id and following_id = new.blocker_id);
  return new;
end;
$$;
drop trigger if exists remove_follows_after_block on public.blocked_users;
create trigger remove_follows_after_block
  after insert on public.blocked_users
  for each row execute procedure public.remove_blocked_follows();

drop policy if exists "Riders can read relevant follows" on public.follows;
drop policy if exists "Riders can follow other accounts" on public.follows;
drop policy if exists "Profile owners can accept follow requests" on public.follows;
drop policy if exists "Riders can cancel their follows" on public.follows;
create policy "Riders can read relevant follows"
  on public.follows for select
  using (
    follower_id = (select auth.uid())
    or following_id = (select auth.uid())
    or (status = 'accepted' and public.can_view_profile(following_id))
  );
create policy "Riders can follow other accounts"
  on public.follows for insert
  with check (
    follower_id = (select auth.uid())
    and follower_id <> following_id
    and not public.is_blocked_between(follower_id, following_id)
  );
create policy "Profile owners can accept follow requests"
  on public.follows for update
  using (following_id = (select auth.uid()) and status = 'pending')
  with check (following_id = (select auth.uid()));
create policy "Riders can cancel their follows"
  on public.follows for delete
  using (follower_id = (select auth.uid()) or following_id = (select auth.uid()));

create or replace function public.set_follow_status()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.follower_id = new.following_id then
    raise exception 'You cannot follow your own account';
  end if;
  if public.is_blocked_between(new.follower_id, new.following_id) then
    raise exception 'This rider cannot be followed';
  end if;
  if exists (
    select 1 from public.profiles p
    where p.id = new.following_id and p.profile_visibility = 'public'
  ) then
    new.status := 'accepted';
  else
    new.status := 'pending';
  end if;
  return new;
end;
$$;
drop trigger if exists set_follow_status_before_insert on public.follows;
create trigger set_follow_status_before_insert
  before insert on public.follows
  for each row execute procedure public.set_follow_status();

revoke update on public.follows from authenticated;
grant update (status) on public.follows to authenticated;

create or replace function public.can_view_post(target_post uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.posts p
    join public.profiles owner on owner.id = p.user_id
    where p.id = target_post
      and (
        p.user_id = (select auth.uid())
        or (
          not public.is_blocked_between(p.user_id, (select auth.uid()))
          and (
            owner.profile_visibility = 'public'
            or exists (
              select 1 from public.follows f
              where f.follower_id = (select auth.uid())
                and f.following_id = p.user_id
                and f.status = 'accepted'
            )
            or exists (
              select 1 from public.shared_clips s
              where s.post_id = p.id
                and (s.sender_id = (select auth.uid()) or s.recipient_id = (select auth.uid()))
            )
          )
        )
      )
  );
$$;

drop policy if exists "Public riders can view posts" on public.posts;
drop policy if exists "Riders can view posts they are allowed to see" on public.posts;
create policy "Riders can view posts they are allowed to see"
  on public.posts for select
  using (public.can_view_post(id));

create table if not exists public.post_likes (
  post_id uuid not null references public.posts (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);
alter table public.post_likes enable row level security;
grant select, insert, delete on public.post_likes to authenticated;
drop policy if exists "Users can view likes on visible posts" on public.post_likes;
drop policy if exists "Users can like visible posts" on public.post_likes;
drop policy if exists "Users can remove their own likes" on public.post_likes;
create policy "Users can view likes on visible posts"
  on public.post_likes for select
  using (public.can_view_post(post_id));
create policy "Users can like visible posts"
  on public.post_likes for insert
  with check (user_id = (select auth.uid()) and public.can_view_post(post_id));
create policy "Users can remove their own likes"
  on public.post_likes for delete
  using (user_id = (select auth.uid()));

create or replace function public.refresh_post_like_count()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.posts
  set likes_count = (select count(*) from public.post_likes where post_id = coalesce(new.post_id, old.post_id))
  where id = coalesce(new.post_id, old.post_id);
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;
drop trigger if exists refresh_post_like_count on public.post_likes;
create trigger refresh_post_like_count
  after insert or delete on public.post_likes
  for each row execute procedure public.refresh_post_like_count();

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 1000),
  created_at timestamptz not null default now()
);
alter table public.comments drop constraint if exists comments_body_nonempty_check;
alter table public.comments add constraint comments_body_nonempty_check check (char_length(btrim(body)) between 1 and 1000);
create index if not exists comments_post_created_at_idx on public.comments (post_id, created_at);
alter table public.comments enable row level security;
grant select, insert, delete on public.comments to authenticated;
grant select on public.comments to anon;
drop policy if exists "Users can view comments on visible posts" on public.comments;
drop policy if exists "Users can comment on visible posts" on public.comments;
drop policy if exists "Users can delete their own comments" on public.comments;
create policy "Users can view comments on visible posts"
  on public.comments for select
  using (public.can_view_post(post_id));
create policy "Users can comment on visible posts"
  on public.comments for insert
  with check (
    user_id = (select auth.uid())
    and public.can_view_post(post_id)
    and not exists (
      select 1 from public.posts p
      where p.id = post_id
        and public.is_blocked_between(p.user_id, (select auth.uid()))
    )
  );
create policy "Users can delete their own comments"
  on public.comments for delete
  using (user_id = (select auth.uid()));

create or replace function public.refresh_post_comment_count()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.posts
  set comments_count = (select count(*) from public.comments where post_id = coalesce(new.post_id, old.post_id))
  where id = coalesce(new.post_id, old.post_id);
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;
drop trigger if exists refresh_post_comment_count on public.comments;
create trigger refresh_post_comment_count
  after insert or delete on public.comments
  for each row execute procedure public.refresh_post_comment_count();

create index if not exists shared_clips_recipient_created_idx on public.shared_clips (recipient_id, created_at desc);
alter table public.shared_clips enable row level security;
grant select, insert, delete on public.shared_clips to authenticated;
drop policy if exists "Only share participants can view a clip share" on public.shared_clips;
drop policy if exists "Senders can share clips with riders" on public.shared_clips;
drop policy if exists "Senders can delete their clip shares" on public.shared_clips;
create policy "Only share participants can view a clip share"
  on public.shared_clips for select
  using (sender_id = (select auth.uid()) or recipient_id = (select auth.uid()));
create policy "Senders can share clips with riders"
  on public.shared_clips for insert
  with check (
    sender_id = (select auth.uid())
    and sender_id <> recipient_id
    and public.can_view_post(post_id)
    and not public.is_blocked_between(sender_id, recipient_id)
  );
create policy "Senders can delete their clip shares"
  on public.shared_clips for delete
  using (sender_id = (select auth.uid()));

create or replace function public.can_view_clip_path(object_path text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.posts p
    where p.video_path = object_path
      and public.can_view_post(p.id)
  );
$$;

drop policy if exists "Riders can view public clips" on storage.objects;


drop policy if exists "Riders can create their own posts" on public.posts;
create policy "Riders can create their own posts"
  on public.posts for insert
  with check (
    (select auth.uid()) = user_id
    and video_path like (select auth.uid())::text || '/%'
    and char_length(caption) between 1 and 280
    and char_length(location) between 1 and 120
    and likes_count = 0
    and comments_count = 0
  );

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  reported_user_id uuid not null references public.profiles (id) on delete cascade,
  post_id uuid references public.posts (id) on delete set null,
  reason text not null check (reason in ('spam', 'harassment', 'unsafe', 'copyright', 'other')),
  details text not null default '' check (char_length(details) <= 1000),
  created_at timestamptz not null default now(),
  check (reporter_id <> reported_user_id)
);
alter table public.reports enable row level security;
grant select, insert on public.reports to authenticated;
drop policy if exists "Reporters can view their own reports" on public.reports;
drop policy if exists "Riders can submit reports" on public.reports;
create policy "Reporters can view their own reports"
  on public.reports for select
  using (reporter_id = (select auth.uid()));
create policy "Riders can submit reports"
  on public.reports for insert
  with check (
    reporter_id = (select auth.uid())
    and reporter_id <> reported_user_id
    and (post_id is null or exists (
      select 1 from public.posts p
      where p.id = post_id and p.user_id = reported_user_id
    ))
  );

create or replace function public.get_follow_counts(target_profile_id uuid)
returns table (followers bigint, following bigint)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.can_view_profile(target_profile_id) then
    raise exception 'This rider profile is not available';
  end if;
  return query
    select
      (select count(*) from public.follows f where f.following_id = target_profile_id and f.status = 'accepted'),
      (select count(*) from public.follows f where f.follower_id = target_profile_id and f.status = 'accepted');
end;
$$;

create or replace function public.create_profile_for_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  base_username text;
begin
  base_username := lower(regexp_replace(
    coalesce(new.raw_user_meta_data ->> 'username', split_part(coalesce(new.email, 'rider'), '@', 1)),
    '[^a-z0-9_]', '', 'g'
  ));
  base_username := left(base_username, 15);
  if char_length(base_username) < 3 then
    base_username := 'rider';
  end if;

  insert into public.profiles (id, username, display_name, location)
  values (
    new.id,
    base_username || '_' || left(replace(new.id::text, '-', ''), 8),
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''), 'Mountain rider'),
    left(coalesce(new.raw_user_meta_data ->> 'location', ''), 120)
  );
  insert into public.profile_preferences (id, location_lat, location_lon)
  values (
    new.id,
    nullif(new.raw_user_meta_data ->> 'location_lat', '')::double precision,
    nullif(new.raw_user_meta_data ->> 'location_lon', '')::double precision
  );
  return new;
end;
$$;

drop policy if exists "Riders can view clips they are allowed to see" on storage.objects;
create policy "Riders can view clips they are allowed to see"
  on storage.objects for select
  using (
    bucket_id = 'clips'
    and (
      (select auth.uid())::text = (storage.foldername(name))[1]
      or public.can_view_clip_path(name)
    )
  );

revoke all on function public.is_blocked_between(uuid, uuid) from public, anon;
grant execute on function public.is_blocked_between(uuid, uuid) to authenticated;
grant execute on function public.search_riders(text, integer) to anon, authenticated;
grant execute on function public.can_view_profile(uuid) to anon, authenticated;
grant execute on function public.can_view_post(uuid) to anon, authenticated;
grant execute on function public.can_view_clip_path(text) to authenticated;
grant execute on function public.get_follow_counts(uuid) to authenticated;
revoke all on function public.set_follow_status() from public, anon, authenticated;
revoke all on function public.remove_blocked_follows() from public, anon, authenticated;
revoke all on function public.refresh_post_like_count() from public, anon, authenticated;
revoke all on function public.refresh_post_comment_count() from public, anon, authenticated;
revoke all on function public.create_profile_for_new_user() from public, anon, authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('clips', 'clips', false, 52428800, array['video/mp4', 'video/quicktime', 'video/webm', 'video/x-m4v'])
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;
