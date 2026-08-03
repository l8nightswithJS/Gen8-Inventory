-- Allow separate physical bins/containers to share the same material identity.
-- Each row remains uniquely identified by items.id.

begin;

-- The initial schema made client + part number + normalized lot unique.
-- That prevents representing multiple physical bins of the same material.
drop index if exists public.items_client_part_lot_uq;

-- Keep the same lookup path indexed for filtering/searching, but allow duplicates.
create index if not exists items_client_part_lot_idx
  on public.items (
    client_id,
    part_number,
    coalesce(nullif(trim(lot_number), ''), '')
  );

commit;
