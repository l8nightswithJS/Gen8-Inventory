-- Keep the items identity sequence ahead of any explicitly restored/imported IDs.
-- This is safe to run repeatedly.

begin;

select setval(
  pg_get_serial_sequence('public.items', 'id'),
  coalesce((select max(id) from public.items), 0) + 1,
  false
);

commit;
