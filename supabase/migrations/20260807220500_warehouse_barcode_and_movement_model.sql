-- Warehouse/container model for barcode-driven inventory operations.
-- Existing items remain the physical container records; this migration adds
-- durable container identity, warehouse location metadata, and a movement ledger.

begin;

-- ---------------------------------------------------------------------------
-- Physical container identity
-- ---------------------------------------------------------------------------

create sequence if not exists public.g8_item_barcode_seq start with 1;

alter table public.items
  add column if not exists initial_quantity numeric(14, 3),
  add column if not exists container_status text not null default 'available',
  add column if not exists emptied_at timestamptz;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.items'::regclass
      and conname = 'items_container_status_ck'
  ) then
    alter table public.items
      add constraint items_container_status_ck
      check (container_status in ('available', 'empty', 'hold', 'quarantine'));
  end if;
end
$$;

do $$
declare
  max_existing bigint := 0;
begin
  select coalesce(
    max((substring(barcode from '^G8I-([0-9]+)$'))::bigint),
    0
  )
  into max_existing
  from public.items
  where barcode ~ '^G8I-[0-9]+$';

  perform setval(
    'public.g8_item_barcode_seq',
    greatest(max_existing + 1, 1),
    false
  );
end
$$;

create or replace function public.assign_g8_item_barcode()
returns trigger
language plpgsql
as $$
begin
  if new.barcode is null or length(trim(new.barcode)) = 0 then
    new.barcode := 'G8I-' || lpad(
      nextval('public.g8_item_barcode_seq')::text,
      8,
      '0'
    );
  end if;
  return new;
end
$$;

drop trigger if exists items_assign_g8_barcode on public.items;

create trigger items_assign_g8_barcode
before insert on public.items
for each row execute function public.assign_g8_item_barcode();

update public.items
set barcode = 'G8I-' || lpad(
  nextval('public.g8_item_barcode_seq')::text,
  8,
  '0'
)
where barcode is null or length(trim(barcode)) = 0;

-- ---------------------------------------------------------------------------
-- Structured warehouse locations
-- ---------------------------------------------------------------------------

alter table public.locations
  add column if not exists barcode text,
  add column if not exists location_type text not null default 'shelf',
  add column if not exists zone text,
  add column if not exists rack text,
  add column if not exists shelf text,
  add column if not exists bin_position text,
  add column if not exists is_system boolean not null default false,
  add column if not exists active boolean not null default true;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.locations'::regclass
      and conname = 'locations_type_ck'
  ) then
    alter table public.locations
      add constraint locations_type_ck
      check (location_type in ('staging', 'rack', 'shelf', 'bin', 'floor', 'other'));
  end if;
end
$$;

-- Give legacy free-form locations collision-safe barcodes. New structured
-- locations use human-readable G8L codes below.
update public.locations
set barcode = 'G8L-LEGACY-' || lpad(id::text, 6, '0')
where barcode is null or length(trim(barcode)) = 0;

create unique index if not exists locations_barcode_uq
  on public.locations (lower(barcode))
  where barcode is not null;

create or replace function public.assign_g8_location_barcode()
returns trigger
language plpgsql
as $$
declare
  generated text;
begin
  if new.barcode is null or length(trim(new.barcode)) = 0 then
    generated := regexp_replace(upper(trim(new.code)), '[^A-Z0-9]+', '-', 'g');
    generated := trim(both '-' from generated);
    if generated = '' then
      generated := 'LOC';
    end if;
    new.barcode := 'G8L-' || generated;
  end if;
  return new;
end
$$;

drop trigger if exists locations_assign_g8_barcode on public.locations;

create trigger locations_assign_g8_barcode
before insert or update of code, barcode on public.locations
for each row execute function public.assign_g8_location_barcode();

-- Permanent staging area for all new imports/receipts before put-away.
insert into public.locations (
  code,
  description,
  barcode,
  location_type,
  zone,
  is_system,
  active
)
values (
  'STAGING',
  'Temporary receiving and inventory staging area',
  'G8L-STAGING',
  'staging',
  'STAGING',
  true,
  true
)
on conflict (code) do update
set
  description = excluded.description,
  barcode = excluded.barcode,
  location_type = excluded.location_type,
  zone = excluded.zone,
  is_system = true,
  active = true;

-- Resin storage: four equal racks A-D, ten fixed shelf locations each.
insert into public.locations (
  code,
  description,
  barcode,
  location_type,
  zone,
  rack,
  shelf,
  active
)
select
  format('RES-%s-S%s', rack_name, lpad(shelf_number::text, 2, '0')),
  format('Resin Rack %s Shelf %s', rack_name, lpad(shelf_number::text, 2, '0')),
  format('G8L-RES-%s-S%s', rack_name, lpad(shelf_number::text, 2, '0')),
  'shelf',
  'RESIN',
  rack_name,
  lpad(shelf_number::text, 2, '0'),
  true
from unnest(array['A','B','C','D']) as rack_name
cross join generate_series(1, 10) as shelf_number
on conflict (code) do update
set
  description = excluded.description,
  barcode = excluded.barcode,
  location_type = excluded.location_type,
  zone = excluded.zone,
  rack = excluded.rack,
  shelf = excluded.shelf,
  active = true;

-- Upper warehouse racks from the supplied layout: RA-RG, shelves 1-4.
insert into public.locations (
  code,
  description,
  barcode,
  location_type,
  zone,
  rack,
  shelf,
  active
)
select
  format('%s-S%s', rack_name, lpad(shelf_number::text, 2, '0')),
  format('Rack %s Shelf %s', rack_name, lpad(shelf_number::text, 2, '0')),
  format('G8L-%s-S%s', rack_name, lpad(shelf_number::text, 2, '0')),
  'shelf',
  'WAREHOUSE',
  rack_name,
  lpad(shelf_number::text, 2, '0'),
  true
from unnest(array['RA','RB','RC','RD','RE','RF','RG']) as rack_name
cross join generate_series(1, 4) as shelf_number
on conflict (code) do update
set
  description = excluded.description,
  barcode = excluded.barcode,
  location_type = excluded.location_type,
  zone = excluded.zone,
  rack = excluded.rack,
  shelf = excluded.shelf,
  active = true;

-- ---------------------------------------------------------------------------
-- Inventory movement / consumption ledger
-- ---------------------------------------------------------------------------

create table if not exists public.inventory_movements (
  id bigint generated by default as identity primary key,
  item_id bigint not null references public.items(id) on delete restrict,
  movement_type text not null,
  from_location_id bigint references public.locations(id) on delete set null,
  to_location_id bigint references public.locations(id) on delete set null,
  quantity numeric(14, 3) not null default 0,
  source_quantity_before numeric(14, 3),
  source_quantity_after numeric(14, 3),
  destination_quantity_before numeric(14, 3),
  destination_quantity_after numeric(14, 3),
  uom text,
  reason text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.inventory_movements'::regclass
      and conname = 'inventory_movements_type_ck'
  ) then
    alter table public.inventory_movements
      add constraint inventory_movements_type_ck
      check (
        movement_type in (
          'opening_balance',
          'import',
          'receipt',
          'transfer',
          'consumption',
          'adjustment',
          'empty',
          'review_resolution'
        )
      );
  end if;
end
$$;

create index if not exists inventory_movements_item_created_idx
  on public.inventory_movements (item_id, created_at desc);

create index if not exists inventory_movements_from_location_idx
  on public.inventory_movements (from_location_id, created_at desc)
  where from_location_id is not null;

create index if not exists inventory_movements_to_location_idx
  on public.inventory_movements (to_location_id, created_at desc)
  where to_location_id is not null;

alter table public.inventory_movements enable row level security;
revoke all on table public.inventory_movements from anon, authenticated;
grant all privileges on table public.inventory_movements to service_role;
grant usage, select on all sequences in schema public to service_role;

-- Establish current balances as the opening audit point without changing them.
insert into public.inventory_movements (
  item_id,
  movement_type,
  to_location_id,
  quantity,
  destination_quantity_before,
  destination_quantity_after,
  uom,
  reason,
  metadata
)
select
  inventory.item_id,
  'opening_balance',
  inventory.location_id,
  inventory.quantity,
  0,
  inventory.quantity,
  items.uom,
  'Opening balance created during warehouse barcode migration',
  jsonb_build_object('migration', '20260807220500')
from public.inventory as inventory
join public.items as items on items.id = inventory.item_id
where not exists (
  select 1
  from public.inventory_movements as movement
  where movement.item_id = inventory.item_id
    and movement.to_location_id = inventory.location_id
    and movement.movement_type = 'opening_balance'
    and movement.metadata ->> 'migration' = '20260807220500'
);

-- Capture the original container quantity from current stock when not already set.
update public.items as item
set initial_quantity = balance.total_quantity
from (
  select item_id, sum(quantity)::numeric(14, 3) as total_quantity
  from public.inventory
  group by item_id
) as balance
where item.id = balance.item_id
  and item.initial_quantity is null;

update public.items as item
set
  container_status = case
    when coalesce(balance.total_quantity, 0) <= 0 then 'empty'
    else item.container_status
  end,
  emptied_at = case
    when coalesce(balance.total_quantity, 0) <= 0
      then coalesce(item.emptied_at, now())
    else null
  end
from (
  select items.id,
         coalesce(sum(inventory.quantity), 0)::numeric as total_quantity
  from public.items as items
  left join public.inventory as inventory on inventory.item_id = items.id
  group by items.id
) as balance
where item.id = balance.id;

-- ---------------------------------------------------------------------------
-- Canonicalize legacy resin attributes so the Phase 2 profile displays them.
-- ---------------------------------------------------------------------------

update public.items as item
set attributes = (
  item.attributes
  || jsonb_strip_nulls(
    jsonb_build_object(
      'label_name', coalesce(
        nullif(item.attributes ->> 'label_name', ''),
        nullif(item.attributes ->> 'Label Name', '')
      ),
      'manufacturer', coalesce(
        nullif(item.attributes ->> 'manufacturer', ''),
        nullif(item.attributes ->> 'MFG', ''),
        nullif(item.attributes ->> 'Manufacturer', '')
      ),
      'material_type', coalesce(
        nullif(item.attributes ->> 'material_type', ''),
        nullif(item.attributes ->> 'Type', '')
      ),
      'color', coalesce(
        nullif(item.attributes ->> 'color', ''),
        nullif(item.attributes ->> 'Color', '')
      ),
      'additive', coalesce(
        nullif(item.attributes ->> 'additive', ''),
        nullif(item.attributes ->> 'Additive', '')
      ),
      'on_order', coalesce(
        nullif(item.attributes ->> 'on_order', ''),
        nullif(item.attributes ->> 'On Order', '')
      )
    )
  )
)
  - 'Label Name'
  - 'MFG'
  - 'Manufacturer'
  - 'Type'
  - 'Color'
  - 'Additive'
  - 'On Order'
from public.client_inventory_settings as settings
where settings.client_id = item.client_id
  and settings.profile_key = 'resin';

comment on column public.items.barcode is
  'Permanent unique internal container barcode (G8I namespace).';

comment on column public.items.initial_quantity is
  'Original quantity recorded when the physical inventory container was received/imported.';

comment on table public.inventory_movements is
  'Append-only operational ledger for receipts, transfers, consumption, adjustments, and empty-container events.';

commit;
