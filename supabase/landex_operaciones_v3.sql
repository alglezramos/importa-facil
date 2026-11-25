create table public.ldx_hitos (
 cotizacion_id uuid not null references public.cotizaciones(id) on delete restrict,
 etapa text not null check (etapa in ('documentos','recoleccion','origen','transito','llegada','aduana','levante','entrega','descarga','cierre')),
 estado text not null default 'pendiente' check (estado in ('pendiente','en_curso','completado','no_aplica')),
 prevista date, real date, responsable text not null default '', nota_publica text not null default '',
 actualizado timestamptz not null default now(), primary key(cotizacion_id,etapa),
 check (estado <> 'completado' or real is not null)
);
create table public.ldx_crm (
 solicitud_id uuid primary key references public.solicitudes(id) on delete restrict,
 responsable text not null default '', siguiente_accion text not null default '', fecha_accion date,
 motivo_perdida text not null default '', actualizado timestamptz not null default now()
);
create table public.ldx_contactos (
 id uuid primary key default gen_random_uuid(), solicitud_id uuid not null references public.solicitudes(id) on delete restrict,
 detalle text not null check (length(trim(detalle))>0), creado timestamptz not null default now(), autor uuid not null default auth.uid()
);
create table public.ldx_finanzas (
 id uuid primary key default gen_random_uuid(), cotizacion_id uuid not null references public.cotizaciones(id) on delete restrict,
 tipo text not null check (tipo in ('ingreso','costo','anticipo','cobro','pago')),
 concepto text not null check(length(trim(concepto))>0), monto numeric(14,2) not null check(monto>0),
 fecha date not null, creado timestamptz not null default now()
);
create table public.ldx_proveedores (
 id uuid primary key default gen_random_uuid(), nombre text not null check(length(trim(nombre))>0), categoria text not null,
 contacto text not null default '', email text not null default '', telefono text not null default '',
 sla text not null default '', contrato text not null default '', evaluacion integer check(evaluacion between 1 and 5),
 notas text not null default '', activo boolean not null default true
);
alter table public.ldx_hitos enable row level security;
alter table public.ldx_crm enable row level security;
alter table public.ldx_contactos enable row level security;
alter table public.ldx_finanzas enable row level security;
alter table public.ldx_proveedores enable row level security;
revoke all on public.ldx_hitos,public.ldx_crm,public.ldx_contactos,public.ldx_finanzas,public.ldx_proveedores from anon, authenticated;
grant select,insert,update on public.ldx_hitos,public.ldx_crm,public.ldx_proveedores to authenticated;
grant select,insert on public.ldx_contactos,public.ldx_finanzas to authenticated;
create policy ldx_hitos_lectura on public.ldx_hitos for select to authenticated using (public.es_staff() or exists(select 1 from public.cotizaciones c where c.id=cotizacion_id and c.cliente_id=auth.uid()));
create policy ldx_hitos_insert on public.ldx_hitos for insert to authenticated with check (public.es_staff());
create policy ldx_hitos_update on public.ldx_hitos for update to authenticated using(public.es_staff()) with check(public.es_staff());
create policy ldx_crm_staff on public.ldx_crm for all to authenticated using(public.es_staff()) with check(public.es_staff());
create policy ldx_contactos_staff on public.ldx_contactos for select to authenticated using(public.es_staff());
create policy ldx_contactos_insert on public.ldx_contactos for insert to authenticated with check(public.es_staff() and autor=auth.uid());
create policy ldx_finanzas_operador on public.ldx_finanzas for select to authenticated using(public.es_operador());
create policy ldx_finanzas_insert on public.ldx_finanzas for insert to authenticated with check(public.es_operador());
create policy ldx_proveedores_operador on public.ldx_proveedores for all to authenticated using(public.es_operador()) with check(public.es_operador());
create index ldx_contactos_solicitud on public.ldx_contactos(solicitud_id);
create index ldx_finanzas_cotizacion on public.ldx_finanzas(cotizacion_id);