-- Resin and other bulk materials are commonly tracked in fractional pounds.
-- Preserve imported decimals instead of forcing every inventory quantity to an integer.

begin;

alter table public.inventory
  alter column quantity type numeric(14, 3)
  using quantity::numeric;

commit;
