begin;

alter table public.items
  add column if not exists archived_at timestamptz;

create index if not exists items_active_client_idx
  on public.items (client_id, archived_at)
  where archived_at is null;

comment on column public.items.archived_at is
  'Soft-delete timestamp. Container history and movement ledger remain preserved.';

commit;
