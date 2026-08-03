-- Remove a legacy debug-only uniqueness rule that blocks legitimate
-- duplicate inventory rows when part_number is NULL or uses the 'NA' placeholder.
-- Physical bins/containers are identified by items.id, not by a unique
-- client/name/description combination.

begin;

drop index if exists public.debug_unique_items_without_part;

commit;
