-- LANDEX · Fase 1 comercial (2026-11-25)
-- 1) Las cotizaciones pueden quedar "solicitada": el cliente pidió una cotización formal
--    o quiere importar con LANDEX. No toca datos existentes.
-- 2) Tabla de solicitudes (prospectos) para desalmacenaje, soluciones empresariales e
--    importaciones pedidas sin cuenta. Cualquiera puede crear una con consentimiento;
--    solo el personal de LANDEX puede verlas.
-- Reversión: ver el bloque comentado al final.

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

-- Reversión (no borra solicitudes recibidas salvo que se elimine la tabla a propósito):
--   update public.cotizaciones set estado = 'estimada' where estado = 'solicitada';
--   alter table public.cotizaciones drop constraint cotizaciones_estado_check;
--   alter table public.cotizaciones add constraint cotizaciones_estado_check
--     check (estado in ('estimada','incompleta','formal','aceptada','en_proceso','cerrada','cancelada'));
--   (y restaurar proteger_cotizacion desde supabase/schema.sql de la versión anterior)
