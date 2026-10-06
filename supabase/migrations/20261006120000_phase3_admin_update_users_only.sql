-- Phase 3: an admin may enable/disable ordinary users only.
-- Before this, the policy only stopped admins from changing THEMSELVES, so an admin
-- could still disable another admin by calling the API directly. Now the target row
-- must have role = 'user'. (The browser still cannot change 'role' at all: only the
-- is_disabled column is grantable for UPDATE.)

drop policy "profiles: admin update others" on public.profiles;

create policy "profiles: admin update users"
  on public.profiles for update to authenticated
  using (
    (select public.is_admin())
    and role = 'user'
    and id <> (select auth.uid())
  )
  with check (
    (select public.is_admin())
    and role = 'user'
    and id <> (select auth.uid())
  );
