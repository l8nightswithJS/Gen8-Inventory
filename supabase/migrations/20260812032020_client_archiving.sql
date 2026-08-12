begin;

alter table public.clients
  add column if not exists archived_at timestamptz;

create index if not exists clients_active_name_idx
  on public.clients (name)
  where archived_at is null;

comment on column public.clients.archived_at is
  'When set, the client is archived and hidden from normal application views without deleting inventory history.';

commit;
