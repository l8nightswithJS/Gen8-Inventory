begin;

update public.client_inventory_settings
set
  display_columns = case profile_key
    when 'resin' then '[
      "part_number",
      "name",
      "manufacturer",
      "lot_number",
      "material_type",
      "color",
      "inventory_location",
      "total_quantity",
      "uom",
      "container_status",
      "status"
    ]'::jsonb
    when 'molded_parts' then '[
      "part_number",
      "description",
      "revision",
      "lot_number",
      "mold_number",
      "cavity",
      "condition",
      "inventory_location",
      "total_quantity",
      "uom",
      "container_status",
      "status"
    ]'::jsonb
    when 'general' then '[
      "part_number",
      "name",
      "description",
      "lot_number",
      "inventory_location",
      "total_quantity",
      "uom",
      "container_status",
      "status"
    ]'::jsonb
    else display_columns
  end,
  updated_at = now()
where profile_key in ('resin', 'molded_parts', 'general');

update public.client_import_templates
set location_strategy = 'staging'
where location_strategy is null;

commit;
