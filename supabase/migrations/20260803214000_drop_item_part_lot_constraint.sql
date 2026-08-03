-- Allow multiple physical bins/containers to share the same client, part number, and lot.
-- The live database may represent the old rule as a table constraint rather than only an index.

begin;

alter table public.items
  drop constraint if exists items_client_part_lot_uq;

drop index if exists public.items_client_part_lot_uq;

create index if not exists items_client_part_lot_idx
  on public.items (
    client_id,
    part_number,
    coalesce(nullif(trim(lot_number), ''), '')
  );

commit;
