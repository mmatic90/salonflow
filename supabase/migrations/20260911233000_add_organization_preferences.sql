-- SalonFlow organization appearance preferences

alter table public.organizations
  add column if not exists theme text not null default 'sand';

alter table public.organizations
  drop constraint if exists organizations_theme_check;

alter table public.organizations
  add constraint organizations_theme_check
  check (theme in ('sand', 'rose', 'slate'));

alter table public.organizations
  drop constraint if exists organizations_locale_check;

alter table public.organizations
  add constraint organizations_locale_check
  check (locale in ('hr', 'en', 'it'));
