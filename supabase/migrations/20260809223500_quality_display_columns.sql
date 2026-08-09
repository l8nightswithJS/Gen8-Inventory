begin;

-- Existing client settings override application preset defaults. Append the
-- new system-owned Quality column once without disturbing each client's
-- existing column order/customization.
update public.client_inventory_settings
set
  display_columns = case
    when jsonb_typeof(display_columns) = 'array'
      and not (display_columns ? 'quality_status')
      then display_columns || '["quality_status"]'::jsonb
    when display_columns is null
      then '["part_number","inventory_location","total_quantity","uom","quality_status","status"]'::jsonb
    else display_columns
  end,
  updated_at = now();

commit;
