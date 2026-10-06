-- The public profile directory remains readable, but profile writes belong to
-- the signed-in user represented by the row.
alter table public.profiles enable row level security;

drop policy if exists "Profiles are visible to everyone" on public.profiles;
create policy "Profiles are visible to everyone"
  on public.profiles
  for select
  to anon, authenticated
  using (true);

drop policy if exists "Users can create their own profile" on public.profiles;
create policy "Users can create their own profile"
  on public.profiles
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
  on public.profiles
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create table public.caption_generations (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  created_by uuid not null references auth.users(id) on delete cascade,
  prompt text not null check (char_length(btrim(prompt)) between 5 and 500),
  caption text not null check (char_length(btrim(caption)) between 1 and 300),
  model text not null,
  upvotes integer not null default 0 check (upvotes >= 0),
  downvotes integer not null default 0 check (downvotes >= 0)
);

create index caption_generations_created_at_idx
  on public.caption_generations (created_at desc);

create index caption_generations_created_by_idx
  on public.caption_generations (created_by);

create table public.caption_votes (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  generation_id uuid not null references public.caption_generations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  value smallint not null check (value in (-1, 1)),
  unique (user_id, generation_id)
);

create index caption_votes_generation_id_idx
  on public.caption_votes (generation_id);

alter table public.caption_generations enable row level security;
alter table public.caption_votes enable row level security;

create policy "Caption generations are visible to everyone"
  on public.caption_generations
  for select
  to anon, authenticated
  using (true);

create policy "Signed-in users can create their own captions"
  on public.caption_generations
  for insert
  to authenticated
  with check ((select auth.uid()) = created_by);

create policy "Users can read their own caption votes"
  on public.caption_votes
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Signed-in users can cast their own caption votes"
  on public.caption_votes
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

-- Public cards need scores, but readers should not be able to inspect the
-- identity of each voter. A private trigger maintains the public counters.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create or replace function private.update_caption_vote_counts()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    update public.caption_generations
    set upvotes = upvotes + case when new.value = 1 then 1 else 0 end,
        downvotes = downvotes + case when new.value = -1 then 1 else 0 end
    where id = new.generation_id;
    return new;
  end if;

  update public.caption_generations
  set upvotes = greatest(upvotes - case when old.value = 1 then 1 else 0 end, 0),
      downvotes = greatest(downvotes - case when old.value = -1 then 1 else 0 end, 0)
  where id = old.generation_id;
  return old;
end;
$$;

revoke all on function private.update_caption_vote_counts() from public, anon, authenticated;

create trigger caption_votes_update_counts
  after insert or delete on public.caption_votes
  for each row execute function private.update_caption_vote_counts();

-- Explicit grants keep the Data API surface aligned with the RLS policies.
revoke all on table public.profiles from public, anon, authenticated;
grant select on table public.profiles to anon, authenticated;
grant insert, update on table public.profiles to authenticated;

revoke all on table public.caption_generations from public, anon, authenticated;
grant select on table public.caption_generations to anon, authenticated;
grant insert on table public.caption_generations to authenticated;

revoke all on table public.caption_votes from public, anon, authenticated;
grant select, insert on table public.caption_votes to authenticated;
