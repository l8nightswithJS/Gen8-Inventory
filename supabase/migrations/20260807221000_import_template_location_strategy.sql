begin;

alter table public.client_import_templates
  add column if not exists location_strategy text not null default 'staging';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.client_import_templates'::regclass
      and conname = 'client_import_templates_location_strategy_ck'
  ) then
    alter table public.client_import_templates
      add constraint client_import_templates_location_strategy_ck
      check (location_strategy in ('staging', 'file', 'selected'));
  end if;
end
$$;

commit;
