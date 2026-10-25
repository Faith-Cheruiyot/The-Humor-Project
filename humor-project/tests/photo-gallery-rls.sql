-- Run against the connected project. All fixture rows are rolled back.
begin;
create temporary table photo_gallery_qa_rows as
  select gen_random_uuid() as id, id as created_by,
    row_number() over (order by created_at, id) as n
  from auth.users order by created_at, id limit 2;
grant select on photo_gallery_qa_rows to authenticated;

insert into public.photo_generations (id, created_by, caption, image_path, model, width, height)
  select id, created_by, 'Gallery ownership check',
    created_by::text || '/' || id::text || '.jpg', 'qa', 128, 128
  from photo_gallery_qa_rows;

set local role authenticated;
select set_config('request.jwt.claim.sub', (select created_by::text from photo_gallery_qa_rows where n = 1), true);
do $$
declare
  test_id uuid := gen_random_uuid();
  other_user uuid := (select created_by from photo_gallery_qa_rows where n = 2);
begin
  if other_user is null then raise exception 'Two existing accounts are needed for this check'; end if;
  if (select count(*) from public.photo_generations where id in (select id from photo_gallery_qa_rows)) <> 1 then
    raise exception 'Gallery ownership read policy failed';
  end if;
  begin
    insert into public.photo_generations (id, created_by, caption, image_path, model, width, height)
      values (test_id, other_user, 'Must be rejected', other_user::text || '/' || test_id::text || '.jpg', 'qa', 128, 128);
    raise exception 'Cross-owner insert unexpectedly accepted';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;
do $$
begin
  if has_table_privilege('anon', 'public.photo_generations', 'select') then
    raise exception 'Anonymous gallery access must be denied';
  end if;
  if not exists (select 1 from storage.buckets where id = 'caption-memes' and public = false) then
    raise exception 'Meme bucket must be private';
  end if;
end $$;
select 'Owner read isolation, cross-owner insert denial, anonymous denial, and private storage passed' as checks;
rollback;
