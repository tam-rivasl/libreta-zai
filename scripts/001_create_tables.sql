-- Profiles table
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'Usuario',
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
create policy "profiles_select_own" on public.profiles for select using (auth.uid() = id);
create policy "profiles_insert_own" on public.profiles for insert with check (auth.uid() = id);
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id);

-- Writings table (shared writings)
create table if not exists public.writings (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  content text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  shared boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.writings enable row level security;
create policy "writings_select" on public.writings for select using (
  shared = true or auth.uid() = user_id
);
create policy "writings_insert" on public.writings for insert with check (auth.uid() = user_id);
create policy "writings_update" on public.writings for update using (auth.uid() = user_id);
create policy "writings_delete" on public.writings for delete using (auth.uid() = user_id);

-- Gallery table (photos)
create table if not exists public.gallery (
  id uuid primary key default gen_random_uuid(),
  title text not null default '',
  image_url text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.gallery enable row level security;
create policy "gallery_select" on public.gallery for select using (true);
create policy "gallery_insert" on public.gallery for insert with check (auth.uid() = user_id);
create policy "gallery_update" on public.gallery for update using (auth.uid() = user_id);
create policy "gallery_delete" on public.gallery for delete using (auth.uid() = user_id);

-- Music table
create table if not exists public.music (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  artist text not null default '',
  file_url text,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.music enable row level security;
create policy "music_select" on public.music for select using (true);
create policy "music_insert" on public.music for insert with check (auth.uid() = user_id);
create policy "music_update" on public.music for update using (auth.uid() = user_id);
create policy "music_delete" on public.music for delete using (auth.uid() = user_id);

-- Videos table
create table if not exists public.videos (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  file_url text,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.videos enable row level security;
create policy "videos_select" on public.videos for select using (true);
create policy "videos_insert" on public.videos for insert with check (auth.uid() = user_id);
create policy "videos_update" on public.videos for update using (auth.uid() = user_id);
create policy "videos_delete" on public.videos for delete using (auth.uid() = user_id);

-- Audio notes table
create table if not exists public.audio_notes (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  duration text not null default '0:00',
  file_url text,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.audio_notes enable row level security;
create policy "audio_notes_select" on public.audio_notes for select using (true);
create policy "audio_notes_insert" on public.audio_notes for insert with check (auth.uid() = user_id);
create policy "audio_notes_update" on public.audio_notes for update using (auth.uid() = user_id);
create policy "audio_notes_delete" on public.audio_notes for delete using (auth.uid() = user_id);

-- Personal notes table (private per user)
create table if not exists public.personal_notes (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  content text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.personal_notes enable row level security;
create policy "personal_notes_select_own" on public.personal_notes for select using (auth.uid() = user_id);
create policy "personal_notes_insert_own" on public.personal_notes for insert with check (auth.uid() = user_id);
create policy "personal_notes_update_own" on public.personal_notes for update using (auth.uid() = user_id);
create policy "personal_notes_delete_own" on public.personal_notes for delete using (auth.uid() = user_id);

-- Auto-create profile trigger
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', 'Usuario')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- Storage buckets used by the app
insert into storage.buckets (id, name, public)
values ('photos', 'photos', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('videos', 'videos', true)
on conflict (id) do nothing;

-- Storage policies for photos/videos
drop policy if exists "photos_select_public" on storage.objects;
create policy "photos_select_public"
on storage.objects
for select
using (bucket_id = 'photos');

drop policy if exists "photos_insert_own_folder" on storage.objects;
create policy "photos_insert_own_folder"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'photos'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "photos_delete_own_folder" on storage.objects;
create policy "photos_delete_own_folder"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'photos'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "videos_select_public" on storage.objects;
create policy "videos_select_public"
on storage.objects
for select
using (bucket_id = 'videos');

drop policy if exists "videos_insert_own_folder" on storage.objects;
create policy "videos_insert_own_folder"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'videos'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "videos_delete_own_folder" on storage.objects;
create policy "videos_delete_own_folder"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'videos'
  and auth.uid()::text = (storage.foldername(name))[1]
);
