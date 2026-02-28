-- Ensure storage buckets used by the app exist and are public.
insert into storage.buckets (id, name, public)
values ('photos', 'photos', true)
on conflict (id) do update set public = excluded.public;

insert into storage.buckets (id, name, public)
values ('videos', 'videos', true)
on conflict (id) do update set public = excluded.public;

-- Public read access for photos.
drop policy if exists "photos_select_public" on storage.objects;
create policy "photos_select_public"
on storage.objects
for select
using (bucket_id = 'photos');

-- Authenticated users can write only inside their own folder: {auth.uid()}/...
drop policy if exists "photos_insert_own_folder" on storage.objects;
create policy "photos_insert_own_folder"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'photos'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "photos_update_own_folder" on storage.objects;
create policy "photos_update_own_folder"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'photos'
  and auth.uid()::text = (storage.foldername(name))[1]
)
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

-- Public read access for videos.
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

drop policy if exists "videos_update_own_folder" on storage.objects;
create policy "videos_update_own_folder"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'videos'
  and auth.uid()::text = (storage.foldername(name))[1]
)
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
