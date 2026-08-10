alter table public.user_clients
  add column if not exists access_level text not null default 'edit';

alter table public.user_clients
  drop constraint if exists user_clients_access_level_check;

alter table public.user_clients
  add constraint user_clients_access_level_check
  check (access_level in ('read', 'edit'));

alter table public.users
  drop constraint if exists users_role_check;

update public.users
set role = 'inventory_staff'
where role = 'staff';

update public.users
set role = 'external_viewer'
where role = 'viewer';

alter table public.users
  add constraint users_role_check
  check (role in ('admin', 'inventory_staff', 'project_user', 'external_viewer'));

create index if not exists idx_user_clients_user_access
  on public.user_clients(user_id, access_level);

create index if not exists idx_user_clients_client_access
  on public.user_clients(client_id, access_level);
