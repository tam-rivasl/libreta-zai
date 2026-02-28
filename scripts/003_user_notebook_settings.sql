create table if not exists public.user_notebook_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  font text not null default 'times',
  icons text not null default 'bold',
  theme text not null default 'classic',
  accent_color text not null default '#8b4513',
  paper_color text not null default '#f5ecd8',
  ink_color text not null default '#3a2518',
  line_color text not null default '#d4c5a9',
  cover_image_url text,
  cover_image_urls text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_notebook_settings_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_notebook_settings_updated_at on public.user_notebook_settings;
create trigger trg_notebook_settings_updated_at
before update on public.user_notebook_settings
for each row
execute function public.set_notebook_settings_updated_at();

alter table public.user_notebook_settings enable row level security;

drop policy if exists "notebook_settings_select_own" on public.user_notebook_settings;
create policy "notebook_settings_select_own"
on public.user_notebook_settings
for select
using (auth.uid() = user_id);

drop policy if exists "notebook_settings_insert_own" on public.user_notebook_settings;
create policy "notebook_settings_insert_own"
on public.user_notebook_settings
for insert
with check (auth.uid() = user_id);

drop policy if exists "notebook_settings_update_own" on public.user_notebook_settings;
create policy "notebook_settings_update_own"
on public.user_notebook_settings
for update
using (auth.uid() = user_id);

drop policy if exists "notebook_settings_delete_own" on public.user_notebook_settings;
create policy "notebook_settings_delete_own"
on public.user_notebook_settings
for delete
using (auth.uid() = user_id);
