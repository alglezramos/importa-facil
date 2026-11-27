-- Tipo de cambio diario (BCCR vía Hacienda) y tasas de Selectivo validadas por el equipo.
create table if not exists public.tipo_cambio (
  fecha date primary key,
  venta numeric(10,2) not null,
  compra numeric(10,2) not null,
  fuente text not null,
  fecha_bccr text,
  obtenido timestamptz not null default now()
);
alter table public.tipo_cambio enable row level security;
drop policy if exists tipo_cambio_ver on public.tipo_cambio;
create policy tipo_cambio_ver on public.tipo_cambio for select using (true);

create table if not exists public.tasas_validadas (
  inciso text primary key,
  sc numeric(6,4) not null check (sc >= 0 and sc <= 2),
  otros numeric(6,4) not null default 0,
  fuente text not null default 'TICA',
  validado_por uuid references auth.users(id),
  validado_en timestamptz not null default now()
);
alter table public.tasas_validadas enable row level security;
drop policy if exists tasas_ver on public.tasas_validadas;
create policy tasas_ver on public.tasas_validadas for select using (true);
drop policy if exists tasas_alta on public.tasas_validadas;
create policy tasas_alta on public.tasas_validadas for insert with check (public.es_staff());
drop policy if exists tasas_cambio on public.tasas_validadas;
create policy tasas_cambio on public.tasas_validadas for update using (public.es_staff());
