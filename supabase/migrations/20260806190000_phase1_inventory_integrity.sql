-- Phase 1 inventory integrity foundation.
-- Supports decimal stock, units of measure, structured import review,
-- and separate internal/vendor barcode semantics.

begin;

alter table public.inventory
  alter column quantity type numeric(14, 3)
  using quantity::numeric;

alter table public.items
  alter column reorder_level type numeric(14, 3)
  using reorder_level::numeric,
  alter column low_stock_threshold type numeric(14, 3)
  using low_stock_threshold::numeric;

alter table public.items
  add column if not exists uom text,
  add column if not exists vendor_barcode text,
  add column if not exists review_status text not null default 'clear',
  add column if not exists review_issues jsonb not null default '[]'::jsonb,
  add column if not exists reviewed_at timestamptz;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.items'::regclass
      and conname = 'items_uom_nonblank_ck'
  ) then
    alter table public.items
      add constraint items_uom_nonblank_ck
      check (uom is null or length(trim(uom)) > 0);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.items'::regclass
      and conname = 'items_review_status_ck'
  ) then
    alter table public.items
      add constraint items_review_status_ck
      check (review_status in ('clear', 'needs_review'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.items'::regclass
      and conname = 'items_review_issues_array_ck'
  ) then
    alter table public.items
      add constraint items_review_issues_array_ck
      check (jsonb_typeof(review_issues) = 'array');
  end if;
end
$$;

create index if not exists items_vendor_barcode_idx
  on public.items (vendor_barcode)
  where vendor_barcode is not null and length(trim(vendor_barcode)) > 0;

create index if not exists items_review_status_idx
  on public.items (review_status)
  where review_status = 'needs_review';

comment on column public.items.barcode is
  'Unique internal inventory/container barcode used for one-record scan resolution.';

comment on column public.items.vendor_barcode is
  'Non-unique manufacturer or supplier barcode; may repeat across containers or lots.';

comment on column public.items.uom is
  'Unit of measure for this inventory record, for example lb, kg, pieces, boxes, or bags.';

comment on column public.items.review_status is
  'Structured data-quality state. needs_review indicates unresolved imported quantity or location data.';

comment on column public.items.review_issues is
  'Array of structured import/data-quality issues retained until an administrator resolves them.';

commit;
