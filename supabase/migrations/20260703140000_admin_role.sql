-- Admin role: is_admin flag, email on profiles, RLS policies, delete RPC

alter table public.profiles
  add column if not exists is_admin boolean not null default false,
  add column if not exists email text;

-- Sync email from auth.users for existing profiles
update public.profiles p
set email = u.email
from auth.users u
where p.id = u.id and p.email is distinct from u.email;

-- Update signup trigger to copy email
create or replace function public.handle_new_user()
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

-- Helper: check if current user is admin
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select p.is_admin from public.profiles p where p.id = auth.uid()),
    false
  );
$$;

-- Admin policies: profiles
create policy "Admins can view all profiles"
  on public.profiles
  for select
  using (public.is_admin());

create policy "Admins can update all profiles"
  on public.profiles
  for update
  using (public.is_admin())
  with check (public.is_admin());

-- Admin policies: game_levels
create policy "Admins can insert game levels"
  on public.game_levels
  for insert
  with check (public.is_admin());

create policy "Admins can update game levels"
  on public.game_levels
  for update
  using (public.is_admin())
  with check (public.is_admin());

create policy "Admins can delete game levels"
  on public.game_levels
  for delete
  using (public.is_admin());

-- Admin policies: questions
create policy "Admins can insert questions"
  on public.questions
  for insert
  with check (public.is_admin());

create policy "Admins can update questions"
  on public.questions
  for update
  using (public.is_admin())
  with check (public.is_admin());

create policy "Admins can delete questions"
  on public.questions
  for delete
  using (public.is_admin());

-- Admin policies: answers
create policy "Admins can insert answers"
  on public.answers
  for insert
  with check (public.is_admin());

create policy "Admins can update answers"
  on public.answers
  for update
  using (public.is_admin())
  with check (public.is_admin());

create policy "Admins can delete answers"
  on public.answers
  for delete
  using (public.is_admin());

-- Admin policies: games
create policy "Admins can view all games"
  on public.games
  for select
  using (public.is_admin());

create policy "Admins can insert games"
  on public.games
  for insert
  with check (public.is_admin());

create policy "Admins can update all games"
  on public.games
  for update
  using (public.is_admin())
  with check (public.is_admin());

create policy "Admins can delete all games"
  on public.games
  for delete
  using (public.is_admin());

-- Admin policies: user_answers
create policy "Admins can view all user answers"
  on public.user_answers
  for select
  using (public.is_admin());

create policy "Admins can delete user answers"
  on public.user_answers
  for delete
  using (public.is_admin());

-- Secure RPC: admin deletes a user (cascades via FK)
create or replace function public.admin_delete_user(target_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Access denied: admin only';
  end if;

  if target_id = auth.uid() then
    raise exception 'Cannot delete your own account';
  end if;

  delete from auth.users where id = target_id;
end;
$$;
