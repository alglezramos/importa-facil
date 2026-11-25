-- =====================================================================
-- LANDEX · Esquema de base de datos (Fase 4)
-- Ejecutar completo en Supabase → SQL Editor → New query → Run.
-- Es idempotente: se puede volver a ejecutar sin perder datos.
--
-- Roles:
--   cliente   → ve y edita solo sus cotizaciones y documentos.
--   agente    → agente aduanero: valida clasificaciones, revisa documentos,
--               emite cotizaciones formales.
--   operador  → todo lo anterior + tarifas y administración de usuarios.
-- La seguridad la aplica la base de datos (Row Level Security), no la página.
-- =====================================================================

-- ---------------------------------------------------------------- Perfiles
do $$ begin
  create type public.rol_landex as enum ('cliente', 'agente', 'operador');
exception when duplicate_object then null; end $$;

create table if not exists public.perfiles (
  id                uuid primary key references auth.users (id) on delete cascade,
  rol               public.rol_landex not null default 'cliente',
  email             text,
  nombre            text not null default '',
  empresa           text not null default '',
  tipo              text not null default 'juridica' check (tipo in ('fisica', 'juridica')),
  identificacion    text not null default '',
  telefono          text not null default '',
  direccion_entrega text not null default '',
  datos             jsonb not null default '{}'::jsonb,  -- experiencia, descarga, presupuesto, etc.
  creado            timestamptz not null default now(),
  actualizado       timestamptz not null default now()
);

-- Funciones de rol (security definer para poder usarlas dentro de las políticas)
create or replace function public.rol_actual() returns public.rol_landex
language sql stable security definer set search_path = public as $$
  select rol from public.perfiles where id = auth.uid()
$$;

create or replace function public.es_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(public.rol_actual() in ('agente', 'operador'), false)
$$;

create or replace function public.es_operador() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(public.rol_actual() = 'operador', false)
$$;

-- Administrador: SQL Editor del panel de Supabase o clave service_role (nunca un visitante)
create or replace function public.es_admin() returns boolean
language sql stable set search_path = public as $$
  select (auth.uid() is null and session_user <> 'authenticator')
      or coalesce(auth.jwt() ->> 'role', '') = 'service_role'
$$;

-- Al registrarse un usuario se crea su perfil como cliente
create or replace function public.crear_perfil() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.perfiles (id, email) values (new.id, new.email) on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists al_crear_usuario on auth.users;
create trigger al_crear_usuario after insert on auth.users
  for each row execute function public.crear_perfil();

-- Nadie cambia su propio rol; solo un operador cambia roles
create or replace function public.proteger_rol() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.rol is distinct from old.rol and not public.es_operador() and not public.es_admin() then
    raise exception 'Solo un operador puede cambiar el rol de un usuario';
  end if;
  new.actualizado := now();
  return new;
end $$;

drop trigger if exists proteger_rol on public.perfiles;
create trigger proteger_rol before update on public.perfiles
  for each row execute function public.proteger_rol();

alter table public.perfiles enable row level security;
drop policy if exists perfiles_ver on public.perfiles;
create policy perfiles_ver on public.perfiles for select using (id = auth.uid() or public.es_staff());
drop policy if exists perfiles_editar on public.perfiles;
create policy perfiles_editar on public.perfiles for update using (id = auth.uid() or public.es_operador());

-- ---------------------------------------------------------------- Cotizaciones
create table if not exists public.consecutivos (anio int primary key, ultimo int not null default 0);
alter table public.consecutivos enable row level security;  -- sin políticas: solo vía función

create or replace function public.siguiente_numero() returns text
language plpgsql security definer set search_path = public as $$
declare a int := extract(year from now() at time zone 'America/Costa_Rica'); n int;
begin
  insert into public.consecutivos (anio, ultimo) values (a, 1)
    on conflict (anio) do update set ultimo = public.consecutivos.ultimo + 1
    returning ultimo into n;
  return format('LDX-%s-%s', a, lpad(n::text, 4, '0'));
end $$;

create table if not exists public.cotizaciones (
  id          uuid primary key default gen_random_uuid(),
  numero      text unique not null,          -- lo asigna el trigger: LDX-AAAA-0001
  cliente_id  uuid not null default auth.uid() references public.perfiles (id) on delete cascade,
  nombre      text not null default '',
  datos       jsonb not null,              -- { embarque, productos }
  total       numeric(14, 2),
  estado      text not null default 'estimada' check (estado in ('estimada', 'incompleta', 'formal', 'aceptada', 'en_proceso', 'cerrada', 'cancelada')),
  emision     jsonb,                       -- { emitida, por, huella, vence } — solo staff
  creada      timestamptz not null default now(),
  actualizada timestamptz not null default now()
);
create index if not exists cotizaciones_cliente on public.cotizaciones (cliente_id, actualizada desc);

-- Un cliente no puede emitir una formal ni pasar estados reservados a la agencia
create or replace function public.proteger_cotizacion() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' and new.numero is null then
    new.numero := public.siguiente_numero();
  end if;
  if not public.es_staff() and not public.es_admin() then
    if tg_op = 'INSERT' then
      new.cliente_id := auth.uid();
      new.emision := null;
      if new.estado not in ('estimada', 'incompleta') then new.estado := 'estimada'; end if;
    else
      if new.cliente_id is distinct from old.cliente_id then raise exception 'No se puede cambiar el dueño de la cotización'; end if;
      if new.numero is distinct from old.numero then raise exception 'No se puede cambiar el número'; end if;
      -- El cliente solo puede aceptar una formal vigente; cualquier otro cambio de datos anula la emisión
      if new.estado = 'aceptada' and old.estado = 'formal' and new.datos = old.datos then
        if coalesce((old.emision ->> 'vence')::date, current_date - 1) < current_date then
          raise exception 'La cotización formal venció: solicita una nueva';
        end if;
        new.emision := old.emision;
      else
        if new.emision is distinct from old.emision and new.emision is not null then raise exception 'Solo la agencia emite cotizaciones formales'; end if;
        if new.datos is distinct from old.datos then new.emision := null; end if;
        if new.estado not in ('estimada', 'incompleta') then
          if new.estado = old.estado and new.datos = old.datos then null;  -- sin cambios de estado
          else raise exception 'Estado reservado para la agencia: %', new.estado; end if;
        end if;
      end if;
    end if;
  end if;
  new.actualizada := now();
  return new;
end $$;

drop trigger if exists proteger_cotizacion on public.cotizaciones;
create trigger proteger_cotizacion before insert or update on public.cotizaciones
  for each row execute function public.proteger_cotizacion();

alter table public.cotizaciones enable row level security;
drop policy if exists cot_ver on public.cotizaciones;
create policy cot_ver on public.cotizaciones for select using (cliente_id = auth.uid() or public.es_staff());
drop policy if exists cot_crear on public.cotizaciones;
create policy cot_crear on public.cotizaciones for insert with check (auth.uid() is not null);
drop policy if exists cot_editar on public.cotizaciones;
create policy cot_editar on public.cotizaciones for update using (cliente_id = auth.uid() or public.es_staff());
drop policy if exists cot_borrar on public.cotizaciones;
create policy cot_borrar on public.cotizaciones for delete
  using ((cliente_id = auth.uid() and estado in ('estimada', 'incompleta')) or public.es_operador());

-- ---------------------------------------------------------------- Tarifas
create table if not exists public.tarifas (
  id              text primary key,
  datos           jsonb not null,           -- objeto Tarifa de src/lib/tarifas.ts
  publicada       boolean not null default false,
  ejemplo         boolean not null default false,
  vigente_hasta   date,
  actualizada     timestamptz not null default now(),
  actualizada_por uuid default auth.uid() references public.perfiles (id) on delete set null
);
alter table public.tarifas enable row level security;
drop policy if exists tarifas_ver on public.tarifas;
create policy tarifas_ver on public.tarifas for select
  using ((publicada and not ejemplo and (vigente_hasta is null or vigente_hasta >= current_date)) or public.es_staff());
drop policy if exists tarifas_escribir on public.tarifas;
create policy tarifas_escribir on public.tarifas for all using (public.es_operador()) with check (public.es_operador());

-- ---------------------------------------------------------------- Documentos
create table if not exists public.documentos (
  id             uuid primary key default gen_random_uuid(),
  cotizacion_id  uuid not null references public.cotizaciones (id) on delete cascade,
  tipo           text not null,             -- factura, packing, transporte, origen, seguro, permisos, ficha, importador, pago, otro
  estado         text not null default 'recibido' check (estado in ('recibido', 'revisado', 'observado')),
  archivo        text not null,             -- ruta en el bucket "documentos": {cotizacion_id}/{tipo}/{archivo}
  nombre_archivo text not null default '',
  observacion    text not null default '',
  subido_por     uuid not null default auth.uid() references public.perfiles (id) on delete set null,
  subido         timestamptz not null default now(),
  revisado_por   uuid references public.perfiles (id) on delete set null,
  revisado       timestamptz
);
create index if not exists documentos_cot on public.documentos (cotizacion_id);

create or replace function public.es_dueno(cot uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.cotizaciones c where c.id = cot and c.cliente_id = auth.uid())
$$;

-- Solo la agencia revisa u observa; el cliente siempre sube como "recibido"
create or replace function public.proteger_documento() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if public.es_staff() or public.es_admin() then
    if tg_op = 'UPDATE' and new.estado is distinct from old.estado then
      new.revisado_por := auth.uid(); new.revisado := now();
    end if;
  else
    if tg_op = 'INSERT' then
      new.estado := 'recibido'; new.subido_por := auth.uid(); new.revisado_por := null; new.revisado := null;
    else
      raise exception 'Solo la agencia puede modificar un documento recibido';
    end if;
  end if;
  return new;
end $$;

drop trigger if exists proteger_documento on public.documentos;
create trigger proteger_documento before insert or update on public.documentos
  for each row execute function public.proteger_documento();

alter table public.documentos enable row level security;
drop policy if exists doc_ver on public.documentos;
create policy doc_ver on public.documentos for select using (public.es_dueno(cotizacion_id) or public.es_staff());
drop policy if exists doc_subir on public.documentos;
create policy doc_subir on public.documentos for insert with check (public.es_dueno(cotizacion_id) or public.es_staff());
drop policy if exists doc_revisar on public.documentos;
create policy doc_revisar on public.documentos for update using (public.es_staff());
drop policy if exists doc_borrar on public.documentos;
create policy doc_borrar on public.documentos for delete
  using ((public.es_dueno(cotizacion_id) and estado = 'recibido') or public.es_operador());

-- ---------------------------------------------------------------- Archivos (Storage)
-- Bucket privado: los archivos solo se descargan con un enlace firmado temporal.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('documentos', 'documentos', false, 10485760,
        array['application/pdf', 'image/jpeg', 'image/png', 'image/webp',
              'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
              'application/vnd.ms-excel',
              'application/vnd.openxmlformats-officedocument.wordprocessingml.document'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create or replace function public.cot_de_ruta(ruta text) returns uuid
language plpgsql immutable set search_path = public as $$
begin
  return split_part(ruta, '/', 1)::uuid;
exception when others then return null;
end $$;

drop policy if exists arch_ver on storage.objects;
create policy arch_ver on storage.objects for select
  using (bucket_id = 'documentos' and (public.es_dueno(public.cot_de_ruta(name)) or public.es_staff()));
drop policy if exists arch_subir on storage.objects;
create policy arch_subir on storage.objects for insert
  with check (bucket_id = 'documentos' and (public.es_dueno(public.cot_de_ruta(name)) or public.es_staff()));
drop policy if exists arch_borrar on storage.objects;
create policy arch_borrar on storage.objects for delete
  using (bucket_id = 'documentos' and (public.es_dueno(public.cot_de_ruta(name)) or public.es_operador()));

-- ---------------------------------------------------------------- Endurecimiento
-- En instalaciones previas el número era un valor por defecto; ahora lo asigna el trigger
alter table public.cotizaciones alter column numero drop default;
-- Funciones internas: nadie las llama por la API (los triggers siguen funcionando)
revoke execute on function public.crear_perfil() from public, anon, authenticated;
revoke execute on function public.proteger_rol() from public, anon, authenticated;
revoke execute on function public.proteger_cotizacion() from public, anon, authenticated;
revoke execute on function public.proteger_documento() from public, anon, authenticated;
revoke execute on function public.siguiente_numero() from public, anon, authenticated;
revoke execute on function public.rol_actual() from anon;

-- ---------------------------------------------------------------- Primer operador
-- Después de iniciar sesión por primera vez con tu correo, ejecuta (cambiando el correo):
--   update public.perfiles set rol = 'operador' where email = 'tu-correo@landex.co.cr';
-- Y para tu tía, cuando inicie sesión:
--   update public.perfiles set rol = 'agente' where email = 'correo-de-la-agente@...';
-- (Desde el SQL Editor estos cambios se permiten porque se ejecutan como administrador.)

-- ================================================================
-- Fase 1 comercial (2026-11-25): ver supabase/migraciones/2026-11-25_fase1_comercial.sql
alter table public.cotizaciones drop constraint if exists cotizaciones_estado_check;
alter table public.cotizaciones add constraint cotizaciones_estado_check
  check (estado in ('estimada', 'incompleta', 'solicitada', 'formal', 'aceptada', 'en_proceso', 'cerrada', 'cancelada'));

create or replace function public.proteger_cotizacion() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' and new.numero is null then
    new.numero := public.siguiente_numero();
  end if;
  if not public.es_staff() and not public.es_admin() then
    if tg_op = 'INSERT' then
      new.cliente_id := auth.uid();
      new.emision := null;
      if new.estado not in ('estimada', 'incompleta', 'solicitada') then new.estado := 'estimada'; end if;
    else
      if new.cliente_id is distinct from old.cliente_id then raise exception 'No se puede cambiar el dueño de la cotización'; end if;
      if new.numero is distinct from old.numero then raise exception 'No se puede cambiar el número'; end if;
      -- El cliente solo puede aceptar una formal vigente; cualquier otro cambio de datos anula la emisión
      if new.estado = 'aceptada' and old.estado = 'formal' and new.datos = old.datos then
        if coalesce((old.emision ->> 'vence')::date, current_date - 1) < current_date then
          raise exception 'La cotización formal venció: solicita una nueva';
        end if;
        new.emision := old.emision;
      else
        if new.emision is distinct from old.emision and new.emision is not null then raise exception 'Solo la agencia emite cotizaciones formales'; end if;
        if new.datos is distinct from old.datos then new.emision := null; end if;
        if new.estado not in ('estimada', 'incompleta', 'solicitada') then
          if new.estado = old.estado and new.datos = old.datos then null;  -- sin cambios de estado
          else raise exception 'Estado reservado para la agencia: %', new.estado; end if;
        end if;
      end if;
    end if;
  end if;
  new.actualizada := now();
  return new;
end $$;
revoke execute on function public.proteger_cotizacion() from public, anon, authenticated;

create table if not exists public.solicitudes (
  id              uuid primary key default gen_random_uuid(),
  tipo            text not null check (tipo in ('importacion', 'desalmacenaje', 'empresarial', 'contacto')),
  nombre          text not null check (char_length(nombre) between 2 and 120),
  empresa         text not null default '' check (char_length(empresa) <= 160),
  correo          text not null check (char_length(correo) <= 160 and correo ~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
  telefono        text not null default '' check (char_length(telefono) <= 40),
  datos           jsonb not null default '{}'::jsonb check (pg_column_size(datos) <= 200000),
  consentimiento  boolean not null check (consentimiento),
  estado          text not null default 'nuevo' check (estado in ('nuevo', 'contactado', 'en_proceso', 'cerrado', 'descartado')),
  notas           text not null default '' check (char_length(notas) <= 4000),
  usuario_id      uuid default auth.uid() references public.perfiles (id) on delete set null,
  creada          timestamptz not null default now(),
  actualizada     timestamptz not null default now()
);
create index if not exists solicitudes_creada on public.solicitudes (creada desc);

-- Quien envía no puede fijar estado, notas ni hacerse pasar por otro usuario
create or replace function public.proteger_solicitud() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not public.es_staff() and not public.es_admin() then
    if tg_op = 'INSERT' then
      new.estado := 'nuevo'; new.notas := ''; new.usuario_id := auth.uid(); new.creada := now();
    end if;
  end if;
  new.actualizada := now();
  return new;
end $$;
revoke execute on function public.proteger_solicitud() from public, anon, authenticated;
drop trigger if exists proteger_solicitud on public.solicitudes;
create trigger proteger_solicitud before insert or update on public.solicitudes
  for each row execute function public.proteger_solicitud();

alter table public.solicitudes enable row level security;
drop policy if exists sol_crear on public.solicitudes;
create policy sol_crear on public.solicitudes for insert to anon, authenticated with check (consentimiento);
drop policy if exists sol_ver on public.solicitudes;
create policy sol_ver on public.solicitudes for select to authenticated using (public.es_staff());
drop policy if exists sol_editar on public.solicitudes;
create policy sol_editar on public.solicitudes for update to authenticated using (public.es_staff()) with check (public.es_staff());
drop policy if exists sol_borrar on public.solicitudes;
create policy sol_borrar on public.solicitudes for delete to authenticated using (public.es_operador());
grant insert on public.solicitudes to anon, authenticated;
grant select, update, delete on public.solicitudes to authenticated;
