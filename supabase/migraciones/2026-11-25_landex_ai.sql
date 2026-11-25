-- LANDEX AI: registro de consultas (para límite diario y control de costo). Solo la función del servidor inserta.
create table if not exists public.ai_consultas (
  id bigint generated always as identity primary key,
  usuario uuid not null references auth.users(id) on delete cascade,
  fase text not null check (fase in ('partidas','incisos')),
  tokens_entrada int not null default 0,
  tokens_salida int not null default 0,
  creada timestamptz not null default now()
);
create index if not exists ai_consultas_usuario_creada on public.ai_consultas (usuario, creada desc);
alter table public.ai_consultas enable row level security;
drop policy if exists ai_consultas_staff on public.ai_consultas;
create policy ai_consultas_staff on public.ai_consultas for select using (public.es_staff());
