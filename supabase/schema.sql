create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null unique check (char_length(username) between 3 and 24),
  display_name text not null default 'Mountain rider' check (char_length(display_name) between 1 and 50),
  bio text not null default '' check (char_length(bio) <= 280),
  location text not null default '' check (char_length(location) <= 80),
  discipline text not null default 'Skier' check (discipline in ('Skier', 'Snowboarder', 'Freeride skier', 'Freestyle skier', 'Splitboarder', 'Other')),
  avatar_url text,
  cover_url text,
  profile_visibility text not null default 'public' check (profile_visibility in ('public', 'private')),
  email_notifications boolean not null default true,
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
grant usage on schema public to anon, authenticated;
grant select on public.profiles to anon, authenticated;
grant insert, update on public.profiles to authenticated;

drop policy if exists "Public profiles are visible; private profiles are owner-only" on public.profiles;
drop policy if exists "Riders can create their own profile" on public.profiles;
drop policy if exists "Riders can update their own profile" on public.profiles;

create policy "Public profiles are visible; private profiles are owner-only"
  on public.profiles for select
  using (profile_visibility = 'public' or (select auth.uid()) = id);

create policy "Riders can create their own profile"
  on public.profiles for insert
  with check ((select auth.uid()) = id);

create policy "Riders can update their own profile"
  on public.profiles for update
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  caption text not null check (char_length(caption) between 1 and 280),
  location text not null check (char_length(location) between 1 and 120),
  video_path text not null unique,
  likes_count integer not null default 0 check (likes_count >= 0),
  created_at timestamptz not null default now()
);

create index if not exists posts_created_at_idx on public.posts (created_at desc);
alter table public.posts enable row level security;
grant select on public.posts to anon, authenticated;
grant insert, delete on public.posts to authenticated;

drop policy if exists "Public riders can view posts" on public.posts;
drop policy if exists "Riders can create their own posts" on public.posts;
drop policy if exists "Riders can delete their own posts" on public.posts;

create policy "Public riders can view posts"
  on public.posts for select
  using (
    exists (
      select 1
      from public.profiles
      where profiles.id = posts.user_id
        and (profiles.profile_visibility = 'public' or profiles.id = (select auth.uid()))
    )
  );

create policy "Riders can create their own posts"
  on public.posts for insert
  with check (
    (select auth.uid()) = user_id
    and video_path like (select auth.uid())::text || '/%'
  );

create policy "Riders can delete their own posts"
  on public.posts for delete
  using ((select auth.uid()) = user_id);

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

  insert into public.profiles (id, username, display_name)
  values (
    new.id,
    base_username || '_' || left(replace(new.id::text, '-', ''), 8),
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''), 'Mountain rider')
  );
  return new;
end;
$$;

drop trigger if exists create_profile_after_signup on auth.users;
create trigger create_profile_after_signup
  after insert on auth.users
  for each row execute procedure public.create_profile_for_new_user();

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('profile-images', 'profile-images', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Profile images are publicly readable" on storage.objects;
drop policy if exists "Riders can upload their own profile images" on storage.objects;
drop policy if exists "Riders can update their own profile images" on storage.objects;
drop policy if exists "Riders can delete their own profile images" on storage.objects;

create policy "Profile images are publicly readable"
  on storage.objects for select
  using (bucket_id = 'profile-images');

create policy "Riders can upload their own profile images"
  on storage.objects for insert
  with check (
    bucket_id = 'profile-images'
    and (select auth.uid())::text = (storage.foldername(name))[1]
  );

create policy "Riders can update their own profile images"
  on storage.objects for update
  using (
    bucket_id = 'profile-images'
    and (select auth.uid())::text = (storage.foldername(name))[1]
  )
  with check (
    bucket_id = 'profile-images'
    and (select auth.uid())::text = (storage.foldername(name))[1]
  );

create policy "Riders can delete their own profile images"
  on storage.objects for delete
  using (
    bucket_id = 'profile-images'
    and (select auth.uid())::text = (storage.foldername(name))[1]
  );

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('clips', 'clips', false, 52428800, array['video/mp4', 'video/quicktime', 'video/webm'])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Riders can view public clips" on storage.objects;
drop policy if exists "Riders can upload their own clips" on storage.objects;
drop policy if exists "Riders can delete their own clips" on storage.objects;

create policy "Riders can view public clips"
  on storage.objects for select
  using (
    bucket_id = 'clips'
    and exists (
      select 1
      from public.profiles
      where profiles.id::text = (storage.foldername(name))[1]
        and (profiles.profile_visibility = 'public' or profiles.id = (select auth.uid()))
    )
  );

create policy "Riders can upload their own clips"
  on storage.objects for insert
  with check (
    bucket_id = 'clips'
    and (select auth.uid())::text = (storage.foldername(name))[1]
  );

create policy "Riders can delete their own clips"
  on storage.objects for delete
  using (
    bucket_id = 'clips'
    and (select auth.uid())::text = (storage.foldername(name))[1]
  );
