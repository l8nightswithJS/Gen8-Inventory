begin;

alter table public.inventory_movements
  add column if not exists actor_user_id uuid references public.users(id) on delete set null,
  add column if not exists actor_email text;

create index if not exists inventory_movements_actor_idx
  on public.inventory_movements (actor_user_id, created_at desc)
  where actor_user_id is not null;

comment on column public.inventory_movements.actor_user_id is
  'Authenticated application user who performed the warehouse operation when available.';

comment on column public.inventory_movements.actor_email is
  'Snapshot of the authenticated user email for readable audit history.';

commit;
