-- =====================================================================
-- 001_theme_light
--
-- O aplicativo passou a ter um unico tema oficial: claro ("light").
-- Bancos criados antes desta versao tem `settings.theme` com o check
-- `in ('dark', 'gold')` e default 'dark' — o app nao conseguiria salvar.
--
-- Esta migracao:
--   1. libera o valor 'light' no check;
--   2. troca o default para 'light';
--   3. mantem as linhas antigas intactas ('dark' e 'gold' continuam validos).
--
-- Rode uma unica vez no SQL Editor do Supabase.
-- Seguro para reexecutar.
-- =====================================================================

alter table public.settings
  drop constraint if exists settings_theme_check;

alter table public.settings
  add constraint settings_theme_check
  check (theme in ('light', 'dark', 'gold'));

alter table public.settings
  alter column theme set default 'light';
