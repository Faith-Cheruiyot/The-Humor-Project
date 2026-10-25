-- Public cards keep captions separate from the original uploaded image.
alter table public.photo_generations
  add column upvotes integer not null default 0 check (upvotes >= 0),
  add column downvotes integer not null default 0 check (downvotes >= 0);

alter table public.photo_generations drop constraint photo_generations_owned_image_path;
alter table public.photo_generations add constraint photo_generations_owned_image_path check (
  image_path in (
    created_by::text || '/' || id::text || '.jpg',
    created_by::text || '/' || id::text || '.png',
    created_by::text || '/' || id::text || '.webp'
  )
);
alter table public.photo_generations drop constraint photo_generations_width_check;
alter table public.photo_generations drop constraint photo_generations_height_check;
alter table public.photo_generations add constraint photo_generations_width_check check (width between 128 and 200000);
alter table public.photo_generations add constraint photo_generations_height_check check (height between 128 and 200000);
alter table public.photo_generations add constraint photo_generations_pixel_limit check (width::bigint * height::bigint <= 25000000);

create index photo_generations_feed_created_idx on public.photo_generations (created_at desc, id desc);

drop policy "Members can read their own photo generations" on public.photo_generations;
create policy "Everyone can read the meme feed" on public.photo_generations
  for select to anon, authenticated using (true);

-- Optional scene context is not part of the public feed. Only the trigger can
-- change vote totals, and creators cannot supply their own totals or timestamps.
revoke all on table public.photo_generations from public, anon, authenticated;
grant select (id, created_at, created_by, caption, image_path, width, height, upvotes, downvotes)
  on public.photo_generations to anon, authenticated;
grant insert (id, created_by, caption, context, image_path, model, width, height)
  on public.photo_generations to authenticated;

update storage.buckets set allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
  where id = 'caption-memes';

drop policy "Members can read their own meme images" on storage.objects;
create policy "Everyone can view published meme images" on storage.objects
  for select to anon, authenticated using (
    bucket_id = 'caption-memes' and (
      (storage.foldername(name))[1] = (select auth.uid()::text)
      or exists (select 1 from public.photo_generations as generation where generation.image_path = name)
    )
  );

create table public.photo_votes (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  generation_id uuid not null references public.photo_generations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  value smallint not null check (value in (-1, 1)),
  unique (user_id, generation_id)
);
create index photo_votes_generation_id_idx on public.photo_votes (generation_id);
alter table public.photo_votes enable row level security;

create policy "Members can read their own meme votes" on public.photo_votes
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Members can cast their own meme votes" on public.photo_votes
  for insert to authenticated with check ((select auth.uid()) = user_id);

revoke all on table public.photo_votes from public, anon, authenticated;
grant select on table public.photo_votes to authenticated;
grant insert (generation_id, user_id, value) on public.photo_votes to authenticated;

create or replace function private.update_photo_vote_counts()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    if (select auth.uid()) is distinct from new.user_id then
      raise exception 'Invalid vote owner' using errcode = '42501';
    end if;
    update public.photo_generations
      set upvotes = upvotes + case when new.value = 1 then 1 else 0 end,
          downvotes = downvotes + case when new.value = -1 then 1 else 0 end
      where id = new.generation_id;
    return new;
  end if;
  update public.photo_generations
    set upvotes = greatest(upvotes - case when old.value = 1 then 1 else 0 end, 0),
        downvotes = greatest(downvotes - case when old.value = -1 then 1 else 0 end, 0)
    where id = old.generation_id;
  return old;
end;
$$;
revoke all on function private.update_photo_vote_counts() from public, anon, authenticated;
create trigger photo_votes_update_counts after insert or delete on public.photo_votes
  for each row execute function private.update_photo_vote_counts();
