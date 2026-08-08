begin;

-- Preserve any legacy generic barcode as a vendor barcode when possible,
-- then replace it with the permanent internal G8I container identifier.
update public.items
set
  vendor_barcode = coalesce(
    nullif(trim(vendor_barcode), ''),
    nullif(trim(barcode), '')
  ),
  barcode = null
where barcode is not null
  and length(trim(barcode)) > 0
  and barcode !~ '^G8I-[0-9]{8}$';

update public.items
set barcode = 'G8I-' || lpad(
  nextval('public.g8_item_barcode_seq')::text,
  8,
  '0'
)
where barcode is null or length(trim(barcode)) = 0;

comment on column public.items.vendor_barcode is
  'Optional non-unique manufacturer, supplier, or preserved legacy barcode.';

commit;
