-- All fixtures, ratings, and score changes are rolled back.
begin;
create temporary table photo_gallery_qa_rows as
  select gen_random_uuid() as id, id as created_by,
    row_number() over (order by created_at, id) as n
  from auth.users order by created_at, id limit 2;
grant select on photo_gallery_qa_rows to anon, authenticated;
insert into public.photo_generations (id, created_by, caption, context, image_path, model, width, height)
  select id, created_by, 'Public feed check', 'Private scene context',
    created_by::text || '/' || id::text || '.jpg', 'qa', 128, 128 from photo_gallery_qa_rows;

set local role anon;
do $$ begin
  if (select count(id) from public.photo_generations where id in (select id from photo_gallery_qa_rows)) <> 2 then
    raise exception 'Guests must see both members posts';
  end if;
  if has_column_privilege('anon', 'public.photo_generations', 'context', 'select') then
    raise exception 'Scene context must not be public';
  end if;
  if has_table_privilege('anon', 'public.photo_votes', 'select') or has_column_privilege('anon', 'public.photo_votes', 'value', 'insert') then
    raise exception 'Guests must not read or cast individual votes';
  end if;
end $$;

set local role authenticated;
select set_config('request.jwt.claim.sub', (select created_by::text from photo_gallery_qa_rows where n = 1), true);
do $$
declare
  target_id uuid := (select id from photo_gallery_qa_rows where n = 2);
  my_user uuid := (select created_by from photo_gallery_qa_rows where n = 1);
  other_user uuid := (select created_by from photo_gallery_qa_rows where n = 2);
  test_id uuid := gen_random_uuid();
begin
  if other_user is null then raise exception 'Two accounts are needed for this check'; end if;
  begin
    insert into public.photo_generations (id, created_by, caption, image_path, model, width, height)
      values (test_id, other_user, 'Must be rejected', other_user::text || '/' || test_id::text || '.jpg', 'qa', 128, 128);
    raise exception 'Cross-owner post accepted';
  exception when insufficient_privilege then null;
  end;
  insert into public.photo_votes (generation_id, user_id, value) values (target_id, my_user, 1);
  if not exists (select 1 from public.photo_generations where id = target_id and upvotes = 1 and downvotes = 0) then
    raise exception 'Vote totals were not maintained';
  end if;
  begin
    insert into public.photo_votes (generation_id, user_id, value) values (target_id, my_user, -1);
    raise exception 'Duplicate rating accepted';
  exception when unique_violation then null;
  end;
  begin
    insert into public.photo_votes (generation_id, user_id, value) values (target_id, other_user, -1);
    raise exception 'Forged voter identity accepted';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.photo_votes (generation_id, user_id, value)
      values ((select id from photo_gallery_qa_rows where n = 1), my_user, 0);
    raise exception 'Invalid rating accepted';
  exception when check_violation then null;
  end;
  begin
    update public.photo_generations set upvotes = 999 where id = target_id;
    raise exception 'Direct total manipulation accepted';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.photo_generations (id, created_by, caption, image_path, model, width, height, upvotes)
      values (test_id, my_user, 'Forged total', my_user::text || '/' || test_id::text || '.jpg', 'qa', 128, 128, 999);
    raise exception 'Forged initial vote total accepted';
  exception when insufficient_privilege then null;
  end;
end $$;

select set_config('request.jwt.claim.sub', (select created_by::text from photo_gallery_qa_rows where n = 2), true);
insert into public.photo_votes (generation_id, user_id, value)
  select id, created_by, -1 from photo_gallery_qa_rows where n = 2;
do $$ begin
  if (select count(*) from public.photo_votes where generation_id in (select id from photo_gallery_qa_rows)) <> 1 then
    raise exception 'Members can read another members individual vote';
  end if;
  if not exists (select 1 from public.photo_generations where id = (select id from photo_gallery_qa_rows where n = 2) and upvotes = 1 and downvotes = 1) then
    raise exception 'Public totals are incorrect';
  end if;
end $$;
reset role;
select 'Public feed, private context and votes, ownership, duplicate prevention, and protected vote totals passed' as checks;
rollback;
