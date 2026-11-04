-- =====================================================================
--  FITRAH TRIBUNE — SUPABASE SCHEMA
-- =====================================================================
--  Run this once in the Supabase SQL editor (Dashboard → SQL Editor →
--  New query → paste → Run). It is safe to run again: every statement
--  replaces what it creates.
--
--  How it works
--  ------------
--  The site's engine stores everything as "collections" of JSON records
--  (articles, threads, cases, …). They all live in ONE table, `fitr_records`.
--
--  Nobody can read or write that table directly. Row Level Security is on
--  and there are no policies, so the anon and authenticated roles see
--  nothing. The only way in is through four functions:
--
--      fitr_list(coll)          every record in a collection the caller may see
--      fitr_get(coll, id)       one record, or null
--      fitr_save(coll, item)    insert or update; returns the saved record
--      fitr_remove(coll, id)    delete
--
--  Each function checks the caller's email (from their Supabase sign-in)
--  against the permission rules in CLAUDE.md. Those checks are the real
--  rules: the buttons on the site are only a convenience. If a rule in
--  CLAUDE.md changes, change it here too.
--
--  Emails never travel to someone who shouldn't see them. Each record's
--  email (a writer's, a Tribunee's, a note sender's) is kept in the
--  `owner` column, not inside the JSON, and is only added back to the
--  record for the people allowed to see it.
-- =====================================================================

create table if not exists public.fitr_records (
  coll        text        not null,
  id          text        not null,
  owner       text,                         -- lowercase email this record belongs to
  data        jsonb       not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  primary key (coll, id)
);
create index if not exists fitr_records_owner on public.fitr_records (coll, owner);
create index if not exists fitr_records_case on public.fitr_records ((data ->> 'caseId')) where coll = 'casemsgs';

alter table public.fitr_records enable row level security;
revoke all on public.fitr_records from anon, authenticated;

-- ── Who is calling ────────────────────────────────────────────────────

-- The signed-in user's email, lowercase; '' for guests.
create or replace function public.fitr_email() returns text
language sql stable as $$
  select lower(coalesce(auth.jwt() ->> 'email', ''))
$$;

create or replace function public.fitr_is_fiwa() returns boolean
language sql stable as $$
  select public.fitr_email() like '%@fiwa.sch.id'
$$;

-- A Tribunee: a FIWA account on the allowlist.
create or replace function public.fitr_is_tribunee() returns boolean
language sql stable security definer set search_path = public as $$
  select public.fitr_is_fiwa() and exists (
    select 1 from public.fitr_records
    where coll = 'allowlist' and owner = public.fitr_email())
$$;

-- An admin: an allowlist entry with "admin": true.
create or replace function public.fitr_is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select public.fitr_is_fiwa() and exists (
    select 1 from public.fitr_records
    where coll = 'allowlist' and owner = public.fitr_email()
      and coalesce((data ->> 'admin')::boolean, false))
$$;

-- ── Helpers ───────────────────────────────────────────────────────────

-- Statuses that close a feedback note (NOTE_STATUSES in the engine).
create or replace function public.fitr_final_status(s text) returns boolean
language sql immutable as $$
  select coalesce(s, '') in ('corrected', 'checked', 'passed', 'answered')
$$;

-- Which field in each collection holds the record's email.
create or replace function public.fitr_email_field(coll text) returns text
language sql immutable as $$
  select case coll
    when 'articles'  then 'authorEmail'
    when 'threads'   then 'authorEmail'
    when 'casemsgs'  then 'authorEmail'
    when 'cases'     then 'submitterEmail'
    when 'drafts'    then 'email'
    when 'tribunees' then 'email'
    when 'allowlist' then 'email'
  end
$$;

create or replace function public.fitr_known(coll text) returns boolean
language sql immutable as $$
  select coll in ('articles', 'editions', 'corrections', 'featured', 'newsTabs', 'threads',
                  'tribunees', 'allowlist', 'cases', 'casemsgs', 'drafts')
$$;

-- A stored row as the caller is allowed to see it: the JSON plus id and
-- timestamps (in milliseconds, like Date.now()), plus the email only for
-- those allowed. Returns null if the caller may not see the row at all.
create or replace function public.fitr_view(r public.fitr_records) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  me       text    := public.fitr_email();
  trib     boolean := public.fitr_is_tribunee();
  admin    boolean := public.fitr_is_admin();
  mine     boolean := r.owner is not null and r.owner = me;
  out      jsonb   := r.data;
  c        public.fitr_records;
  field    text    := public.fitr_email_field(r.coll);
begin
  -- Who may see the row at all.
  case r.coll
    when 'articles' then
      if coalesce(r.data ->> 'visibility', 'public') = 'fiwa' and not public.fitr_is_fiwa() then return null; end if;
    when 'threads' then
      -- FIWA-first: announcements are public, the rest of the feed is for
      -- FIWA accounts (the mudir's advice, Oct 2026).
      if coalesce(r.data ->> 'category', 'general') <> 'announcement' and not public.fitr_is_fiwa() then return null; end if;
    when 'drafts' then
      if not mine then return null; end if;
    when 'allowlist' then
      if not (mine or admin) then return null; end if;
    when 'cases' then
      if not (mine or trib) then return null; end if;
    when 'casemsgs' then
      select * into c from public.fitr_records where coll = 'cases' and id = r.data ->> 'caseId';
      if not found then return null; end if;
      if not ((c.owner is not null and c.owner = me) or trib) then return null; end if;
      -- Editors' replies show as "Fitrah Tribune Editors" to the reader;
      -- only the team sees which admin wrote one.
      if r.data ->> 'side' = 'tribune' and not trib then out := out - 'author'; end if;
    else
      if not public.fitr_known(r.coll) then return null; end if;
  end case;

  -- Who may see the email.
  if field is not null and r.owner is not null and (
       mine
       or (admin and r.coll in ('articles', 'threads', 'tribunees', 'allowlist', 'drafts'))
       or (admin and r.coll = 'casemsgs' and r.data ->> 'side' = 'tribune')
     ) then
    out := out || jsonb_build_object(field, r.owner);
  end if;

  return out || jsonb_build_object(
    'id', r.id,
    'createdAt', (extract(epoch from r.created_at) * 1000)::bigint,
    'updatedAt', (extract(epoch from r.updated_at) * 1000)::bigint);
end $$;

-- ── Read ──────────────────────────────────────────────────────────────

create or replace function public.fitr_list(coll text) returns setof jsonb
language sql stable security definer set search_path = public as $$
  select v from (
    select public.fitr_view(r) as v from public.fitr_records r where r.coll = fitr_list.coll
  ) s where v is not null
$$;

create or replace function public.fitr_get(coll text, id text) returns jsonb
language sql stable security definer set search_path = public as $$
  select public.fitr_view(r) from public.fitr_records r
  where r.coll = fitr_get.coll and r.id = fitr_get.id
$$;

-- ── Write ─────────────────────────────────────────────────────────────

create or replace function public.fitr_save(coll text, item jsonb) returns jsonb
language plpgsql volatile security definer set search_path = public as $$
declare
  me     text    := public.fitr_email();
  trib   boolean := public.fitr_is_tribunee();
  admin  boolean := public.fitr_is_admin();
  field  text    := public.fitr_email_field(coll);
  rid    text    := nullif(item ->> 'id', '');
  old    public.fitr_records;
  exists_ boolean := false;
  owner_ text;
  data_  jsonb;
  c      public.fitr_records;
  frozen_keys text[] := array['bio', 'photo', 'photoAspect', 'photoFit'];
begin
  if not public.fitr_known(coll) then raise exception 'Unknown collection %', coll; end if;
  if me = '' then raise exception 'Please sign in first'; end if;

  if rid is not null then
    select * into old from public.fitr_records r where r.coll = fitr_save.coll and r.id = rid for update;
    exists_ := found;
  else
    rid := left(coll, 3) || '-' || (extract(epoch from clock_timestamp()) * 1000)::bigint
           || '-' || substr(md5(random()::text), 1, 5);
  end if;

  -- What gets stored: the JSON without id/timestamps (they are columns)
  -- and without the email (it goes in `owner`).
  data_ := item - 'id' - 'createdAt' - 'updatedAt';
  if field is not null then data_ := data_ - field; end if;

  -- Whose record it is. For Tribunees and the allowlist, an admin sets
  -- the email; for everything else it is whoever first saved it.
  if coll in ('tribunees', 'allowlist') then
    owner_ := nullif(lower(trim(coalesce(item ->> field, ''))), '');
    if exists_ and not admin then owner_ := old.owner; end if;
  elsif exists_ then
    owner_ := old.owner;
  else
    owner_ := me;
  end if;

  case coll
    when 'articles', 'featured', 'newsTabs' then
      if not trib then raise exception 'Only Tribunees can do that'; end if;

    when 'editions' then
      if not admin then raise exception 'Only admins can manage editions'; end if;

    when 'corrections' then
      -- Tribunees log one when they edit a story; only admins change the log.
      if not (admin or (trib and not exists_)) then raise exception 'Only admins can change the corrections log'; end if;

    when 'threads' then
      if exists_ then
        if not admin then raise exception 'Only admins can change posts'; end if;
      else
        if not trib then raise exception 'Only Tribunees can post to the forum'; end if;
        if data_ ->> 'category' = 'announcement' and not admin then raise exception 'Only admins can post announcements'; end if;
        if coalesce((data_ ->> 'pinned')::boolean, false) and not admin then raise exception 'Only admins can pin posts'; end if;
      end if;

    when 'tribunees' then
      if not exists_ then
        if not admin then raise exception 'Only admins can add Tribunees'; end if;
      elsif not admin then
        -- A Tribunee edits only their own photo and bio.
        if not (trib and old.owner = me) then raise exception 'You can only edit your own profile'; end if;
        if (data_ - frozen_keys) is distinct from (old.data - frozen_keys) then
          raise exception 'Only admins can change names, roles, grades and credits';
        end if;
      end if;

    when 'allowlist' then
      if not admin then raise exception 'Only admins can change the allowlist'; end if;
      if owner_ is null then raise exception 'An allowlist entry needs an email'; end if;

    when 'drafts' then
      if not trib then raise exception 'Only Tribunees have a Writer''s desk'; end if;
      if exists_ and old.owner is distinct from me then raise exception 'Not your draft'; end if;

    when 'cases' then
      if not exists_ then
        -- A new note always starts as Received.
        data_ := (data_ - 'closedAt' - 'closedBy') || '{"status": "received"}'::jsonb;
      elsif admin then
        -- A closed note is frozen; the only change allowed is reopening it.
        if public.fitr_final_status(old.data ->> 'status') and public.fitr_final_status(data_ ->> 'status') then
          raise exception 'This note is closed. Reopen it first.';
        end if;
        -- Admins act on the note; they don't rewrite what the reader chose.
        data_ := data_ || jsonb_build_object('showName', old.data -> 'showName');
        if old.data ? 'submitterName' then data_ := data_ || jsonb_build_object('submitterName', old.data -> 'submitterName');
        else data_ := data_ - 'submitterName'; end if;
      else
        -- The sender only "touches" their open note when adding to it.
        if old.owner is distinct from me then raise exception 'This is not your note'; end if;
        if public.fitr_final_status(old.data ->> 'status') then raise exception 'This note is closed'; end if;
        data_ := old.data;
      end if;
      -- The sender decides whether the editors see their name.
      if not coalesce((data_ ->> 'showName')::boolean, false) then data_ := data_ - 'submitterName'; end if;

    when 'casemsgs' then
      if exists_ then raise exception 'Messages can''t be edited'; end if;
      select * into c from public.fitr_records r where r.coll = 'cases' and r.id = data_ ->> 'caseId';
      if not found then raise exception 'Note not found'; end if;
      if public.fitr_final_status(c.data ->> 'status') then raise exception 'This note is closed'; end if;
      if data_ ->> 'side' = 'tribune' then
        if not admin then raise exception 'Only admins can reply to notes'; end if;
      elsif data_ ->> 'side' = 'reader' then
        if c.owner is distinct from me then raise exception 'This is not your note'; end if;
        if not coalesce((c.data ->> 'showName')::boolean, false) then data_ := data_ - 'author'; end if;
      else
        raise exception 'Unknown message side';
      end if;
  end case;

  if exists_ then
    update public.fitr_records r set owner = owner_, data = data_, updated_at = now()
    where r.coll = fitr_save.coll and r.id = rid;
  else
    insert into public.fitr_records (coll, id, owner, data) values (coll, rid, owner_, data_);
  end if;

  return public.fitr_get(coll, rid);
end $$;

create or replace function public.fitr_remove(coll text, id text) returns void
language plpgsql volatile security definer set search_path = public as $$
declare
  me     text    := public.fitr_email();
  trib   boolean := public.fitr_is_tribunee();
  admin  boolean := public.fitr_is_admin();
  old    public.fitr_records;
begin
  select * into old from public.fitr_records r where r.coll = fitr_remove.coll and r.id = fitr_remove.id;
  if not found then return; end if;

  case coll
    when 'articles', 'featured', 'newsTabs' then
      if not trib then raise exception 'Only Tribunees can do that'; end if;
    when 'editions', 'corrections', 'tribunees', 'allowlist' then
      if not admin then raise exception 'Only admins can do that'; end if;
    when 'threads' then
      -- Admins delete anything; a Tribunee deletes only their own posts.
      if not (admin or (trib and old.owner = me)) then raise exception 'You can only delete your own posts'; end if;
    when 'drafts' then
      if old.owner is distinct from me then raise exception 'Not your draft'; end if;
    else
      -- Feedback notes and their messages are never deleted.
      raise exception 'That can''t be deleted';
  end case;

  delete from public.fitr_records r where r.coll = fitr_remove.coll and r.id = fitr_remove.id;
end $$;

-- Only the four doors (and the two role checks) are callable from the site.
revoke all on function public.fitr_view(public.fitr_records) from public, anon, authenticated;
grant execute on function public.fitr_list(text), public.fitr_get(text, text),
  public.fitr_save(text, jsonb), public.fitr_remove(text, text),
  public.fitr_is_tribunee(), public.fitr_is_admin()
  to anon, authenticated;

-- =====================================================================
--  STORAGE — photos and PDFs
-- =====================================================================
--  Images pasted into articles, forum posts and profiles are uploaded to
--  the public "media" bucket; the record keeps only the link. Anyone can
--  view them; only Tribunees can upload.
-- =====================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('media', 'media', true, 15728640,
        array['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'application/pdf'])
on conflict (id) do update set public = true, file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "fitr media: Tribunees upload" on storage.objects;
create policy "fitr media: Tribunees upload" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'media' and public.fitr_is_tribunee());
