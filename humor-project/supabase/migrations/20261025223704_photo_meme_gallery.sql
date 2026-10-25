-- Each member keeps a private, append-only history of finished photo memes.
create table public.photo_generations (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  created_by uuid not null references auth.users(id) on delete cascade,
  caption text not null check (char_length(btrim(caption)) between 1 and 180),
  context text not null default '' check (char_length(context) <= 500),
  image_path text not null unique,
  model text not null,
  width integer not null check (width between 128 and 1600),
  height integer not null check (height between 128 and 1600),
  constraint photo_generations_owned_image_path
    check (image_path = created_by::text || '/' || id::text || '.jpg')
);

-- Supports both the ownership policy and stable gallery pagination.
create index photo_generations_owner_created_idx
  on public.photo_generations (created_by, created_at desc, id desc);

alter table public.photo_generations enable row level security;

create policy "Members can read their own photo generations"
  on public.photo_generations for select to authenticated
  using ((select auth.uid()) = created_by);

create policy "Members can create their own photo generations"
  on public.photo_generations for insert to authenticated
  with check ((select auth.uid()) = created_by);

revoke all on table public.photo_generations from public, anon, authenticated;
grant select, insert on table public.photo_generations to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('caption-memes', 'caption-memes', false, 5242880, array['image/jpeg'])
on conflict (id) do nothing;

create policy "Members can upload their own meme images"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'caption-memes' and (storage.foldername(name))[1] = (select auth.uid()::text));

create policy "Members can read their own meme images"
  on storage.objects for select to authenticated
  using (bucket_id = 'caption-memes' and (storage.foldername(name))[1] = (select auth.uid()::text));

-- Allows the server to remove an upload if its gallery row fails to save.
create policy "Members can remove their own meme images"
  on storage.objects for delete to authenticated
  using (bucket_id = 'caption-memes' and (storage.foldername(name))[1] = (select auth.uid()::text));
