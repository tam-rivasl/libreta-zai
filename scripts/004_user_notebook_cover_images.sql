alter table if exists public.user_notebook_settings
add column if not exists cover_image_urls text[] not null default '{}';

update public.user_notebook_settings
set cover_image_urls = array_append(cover_image_urls, cover_image_url)
where cover_image_url is not null
  and not (cover_image_url = any(cover_image_urls));
