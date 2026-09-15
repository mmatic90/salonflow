-- Expand SalonFlow organization themes to match the current appearance UI.

alter table public.organizations
  drop constraint if exists organizations_theme_check;

alter table public.organizations
  add constraint organizations_theme_check
  check (theme in ('sand', 'rose', 'slate', 'sage', 'ocean', 'plum'));
