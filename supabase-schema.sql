-- Course Tracker — Supabase schema
-- Run this in the Supabase SQL editor. Then create a Storage bucket named "media" (private).

-- ---------- Tables ----------
create table if not exists public.progress (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  lesson_id text not null,
  status text not null,
  completed_at bigint,
  updated_at bigint not null,
  deleted int not null default 0
);

create table if not exists public.notes (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  lesson_id text not null,
  markdown text,
  updated_at bigint not null,
  deleted int not null default 0
);

create table if not exists public.flairs (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  lesson_id text not null,
  kind text not null,
  created_at bigint,
  updated_at bigint not null,
  deleted int not null default 0
);

create table if not exists public.media (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  lesson_id text not null,
  kind text not null,
  mime text,
  storage_path text,
  created_at bigint,
  updated_at bigint not null,
  deleted int not null default 0
);

create index if not exists progress_user_updated on public.progress (user_id, updated_at);
create index if not exists notes_user_updated on public.notes (user_id, updated_at);
create index if not exists flairs_user_updated on public.flairs (user_id, updated_at);
create index if not exists media_user_updated on public.media (user_id, updated_at);

-- ---------- Row Level Security ----------
alter table public.progress enable row level security;
alter table public.notes enable row level security;
alter table public.flairs enable row level security;
alter table public.media enable row level security;

do $$
declare t text;
begin
  foreach t in array array['progress','notes','flairs','media'] loop
    execute format('drop policy if exists "own rows" on public.%I;', t);
    execute format(
      'create policy "own rows" on public.%I for all using (auth.uid() = user_id) with check (auth.uid() = user_id);',
      t
    );
  end loop;
end $$;

-- ---------- Storage bucket policies ----------
-- After creating a private bucket called "media", run:
insert into storage.buckets (id, name, public)
values ('media', 'media', false)
on conflict (id) do nothing;

drop policy if exists "own media read" on storage.objects;
create policy "own media read" on storage.objects for select
  using (bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "own media write" on storage.objects;
create policy "own media write" on storage.objects for insert
  with check (bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "own media update" on storage.objects;
create policy "own media update" on storage.objects for update
  using (bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "own media delete" on storage.objects;
create policy "own media delete" on storage.objects for delete
  using (bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text);
