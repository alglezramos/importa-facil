-- LANDEX AI: niveles de acceso, caché y costo.
alter table public.ai_consultas add column if not exists cache boolean not null default false;
alter table public.ai_consultas add column if not exists costo_usd numeric(10,6) not null default 0;

-- Acceso de cliente otorgado a mano por el equipo (además de los clientes con operación).
create table if not exists public.ai_accesos (
  usuario uuid primary key references auth.users(id) on delete cascade,
  nivel text not null default 'cliente' check (nivel in ('cliente')),
  otorgado_por uuid references auth.users(id),
  creado timestamptz not null default now()
);
alter table public.ai_accesos enable row level security;
drop policy if exists ai_accesos_ver on public.ai_accesos;
create policy ai_accesos_ver on public.ai_accesos for select using (usuario = auth.uid() or public.es_staff());
drop policy if exists ai_accesos_alta on public.ai_accesos;
create policy ai_accesos_alta on public.ai_accesos for insert with check (public.es_staff());
drop policy if exists ai_accesos_baja on public.ai_accesos;
create policy ai_accesos_baja on public.ai_accesos for delete using (public.es_staff());

-- Caché de respuestas (solo la usa la función del servidor).
create table if not exists public.ai_cache (
  clave text primary key,
  resultado jsonb not null,
  creada timestamptz not null default now()
);
alter table public.ai_cache enable row level security;
