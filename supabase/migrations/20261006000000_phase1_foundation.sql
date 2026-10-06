-- Phase 1: database foundation (profiles + tts_requests), signup trigger, is_admin(), RLS.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text,
  role        text not null default 'user' check (role in ('user', 'admin')),
  is_disabled boolean not null default false,
  created_at  timestamptz not null default now()
);

create table public.tts_requests (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles (id) on delete cascade,
  text          text not null,
  char_count    integer not null,
  voice_name    text not null,
  language_code text not null,
  status        text not null check (status in ('success', 'error')),
  error_message text,
  created_at    timestamptz not null default now()
);

create index tts_requests_user_created_idx
  on public.tts_requests (user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Signup trigger: every new auth user gets a profile row with role 'user'.
-- SECURITY DEFINER because the new user has no permission to insert profiles.
-- ---------------------------------------------------------------------------
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- is_admin(): used by RLS policies. SECURITY DEFINER so that checking the
-- profiles table inside a profiles policy does not recurse forever.
-- A disabled admin is not treated as an admin.
-- ---------------------------------------------------------------------------
create function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
      and not is_disabled
  );
$$;

-- ---------------------------------------------------------------------------
-- Privileges: start from nothing, then grant only what is needed.
-- (Supabase grants broad default privileges on new public tables.)
-- ---------------------------------------------------------------------------
revoke all on public.profiles     from anon, authenticated;
revoke all on public.tts_requests from anon, authenticated;

grant select on public.profiles     to authenticated;
grant select on public.tts_requests to authenticated;

-- Column-level grant: the ONLY thing the browser may ever update is is_disabled
-- (and RLS below limits that to admins). 'role' can never be changed from the browser.
grant update (is_disabled) on public.profiles to authenticated;

revoke execute on function public.is_admin()        from public, anon;
grant  execute on function public.is_admin()        to authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.profiles     enable row level security;
alter table public.tts_requests enable row level security;

-- profiles: users read their own row; admins read all rows.
create policy "profiles: read own"
  on public.profiles for select to authenticated
  using (id = (select auth.uid()));

create policy "profiles: admin read all"
  on public.profiles for select to authenticated
  using ((select public.is_admin()));

-- profiles: admins may enable/disable OTHER users (not themselves).
-- Combined with the column grant above, only is_disabled is changeable.
create policy "profiles: admin update others"
  on public.profiles for update to authenticated
  using ((select public.is_admin()) and id <> (select auth.uid()))
  with check ((select public.is_admin()) and id <> (select auth.uid()));

-- tts_requests: read-only from the browser. No insert/update/delete policies
-- and no such grants, so only the server (service role) can write.
create policy "tts_requests: read own"
  on public.tts_requests for select to authenticated
  using (user_id = (select auth.uid()));

create policy "tts_requests: admin read all"
  on public.tts_requests for select to authenticated
  using ((select public.is_admin()));
