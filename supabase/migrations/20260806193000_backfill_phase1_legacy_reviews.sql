-- Convert legacy bulk-import artifacts into the Phase 1 structured review model.
-- Safe to run repeatedly after 20260806190000_phase1_inventory_integrity.sql.

begin;

-- Legacy ambiguous quantities were stored as custom attributes instead of an
-- official inventory balance. Preserve the source value as a review issue.
with legacy_quantity_review as (
  select
    id,
    coalesce(
      attributes ->> 'On Hand (Review)',
      attributes ->> 'on_hand_review',
      attributes ->> 'On Hand Review',
      attributes ->> 'on hand review'
    ) as source_value
  from public.items
  where
    attributes ? 'On Hand (Review)'
    or attributes ? 'on_hand_review'
    or attributes ? 'On Hand Review'
    or attributes ? 'on hand review'
)
update public.items as item
set
  review_status = 'needs_review',
  review_issues = case
    when item.review_issues @> '[{"type":"ambiguous_quantity"}]'::jsonb
      then item.review_issues
    else item.review_issues || jsonb_build_array(
      jsonb_build_object(
        'type', 'ambiguous_quantity',
        'field', 'quantity',
        'source_value', legacy.source_value,
        'message', 'Legacy imported On Hand value is ambiguous and needs review.'
      )
    )
  end,
  reviewed_at = null
from legacy_quantity_review as legacy
where item.id = legacy.id;

-- Preserve the location text attached to legacy ambiguous-quantity rows before
-- removing the duplicated custom Location attribute. This gives the reviewer
-- the original placement context even when no official balance was created.
with legacy_location_review as (
  select
    id,
    coalesce(
      attributes ->> 'Location',
      attributes ->> 'location',
      attributes ->> 'Locations',
      attributes ->> 'locations'
    ) as source_value
  from public.items
  where
    (
      attributes ? 'On Hand (Review)'
      or attributes ? 'on_hand_review'
      or attributes ? 'On Hand Review'
      or attributes ? 'on hand review'
    )
    and (
      attributes ? 'Location'
      or attributes ? 'location'
      or attributes ? 'Locations'
      or attributes ? 'locations'
    )
)
update public.items as item
set
  review_status = 'needs_review',
  review_issues = case
    when legacy.source_value ~ '[,;/]'
      and not (
        item.review_issues @> '[{"type":"location_allocation"}]'::jsonb
      )
      then item.review_issues || jsonb_build_array(
        jsonb_build_object(
          'type', 'location_allocation',
          'field', 'location',
          'source_value', legacy.source_value,
          'message', 'Legacy import contains multiple locations. Quantity must be allocated to individual locations.'
        )
      )
    when legacy.source_value !~ '[,;/]'
      and not (
        item.review_issues @> '[{"type":"location_confirmation"}]'::jsonb
      )
      then item.review_issues || jsonb_build_array(
        jsonb_build_object(
          'type', 'location_confirmation',
          'field', 'location',
          'source_value', legacy.source_value,
          'message', 'Confirm this imported location when resolving the quantity.'
        )
      )
    else item.review_issues
  end,
  reviewed_at = null
from legacy_location_review as legacy
where item.id = legacy.id
  and legacy.source_value is not null
  and length(trim(legacy.source_value)) > 0;

-- Earlier imports created one synthetic location code for values such as
-- "A1,B4" or "A1/B5". Mark those records for allocation review while keeping
-- the current balance intact until an administrator resolves it.
with combined_locations as (
  select
    inventory.item_id,
    string_agg(distinct location.code, ', ' order by location.code) as source_value
  from public.inventory as inventory
  join public.locations as location
    on location.id = inventory.location_id
  where location.code ~ '[,;/]'
  group by inventory.item_id
)
update public.items as item
set
  review_status = 'needs_review',
  review_issues = case
    when item.review_issues @> '[{"type":"location_allocation"}]'::jsonb
      then item.review_issues
    else item.review_issues || jsonb_build_array(
      jsonb_build_object(
        'type', 'location_allocation',
        'field', 'location',
        'source_value', combined.source_value,
        'message', 'Legacy import contains multiple locations. Quantity must be allocated to individual locations.'
      )
    )
  end,
  reviewed_at = null
from combined_locations as combined
where item.id = combined.item_id;

-- Actual inventory/location relationships are now authoritative. Remove the
-- old duplicated operational values from custom attributes without touching
-- client-specific descriptive fields.
update public.items
set attributes = attributes
  - 'Location'
  - 'location'
  - 'Locations'
  - 'locations'
  - 'On Hand'
  - 'on_hand'
  - 'On Hand (Review)'
  - 'on_hand_review'
  - 'On Hand Review'
  - 'on hand review'
  - 'Quantity'
  - 'quantity'
where
  attributes ?| array[
    'Location',
    'location',
    'Locations',
    'locations',
    'On Hand',
    'on_hand',
    'On Hand (Review)',
    'on_hand_review',
    'On Hand Review',
    'on hand review',
    'Quantity',
    'quantity'
  ];

commit;
