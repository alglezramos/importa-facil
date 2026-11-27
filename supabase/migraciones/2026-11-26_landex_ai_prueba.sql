-- LANDEX AI: nivel "prueba" para cuentas de prueba del equipo (cupo del equipo).
alter table public.ai_accesos drop constraint if exists ai_accesos_nivel_check;
alter table public.ai_accesos add constraint ai_accesos_nivel_check check (nivel in ('cliente','prueba'));
