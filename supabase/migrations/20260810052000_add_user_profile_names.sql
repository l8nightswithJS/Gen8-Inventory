-- Add managed profile identity fields for personalized authenticated UI.

alter table public.users
  add column if not exists first_name text,
  add column if not exists last_name text;

alter table public.users
  drop constraint if exists users_first_name_length_check;

alter table public.users
  add constraint users_first_name_length_check
  check (first_name is null or char_length(first_name) <= 100);

alter table public.users
  drop constraint if exists users_last_name_length_check;

alter table public.users
  add constraint users_last_name_length_check
  check (last_name is null or char_length(last_name) <= 100);
