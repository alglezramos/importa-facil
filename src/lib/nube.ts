/**
 * CONEXIÓN CON SUPABASE (Fase 4)
 * ---------------------------------------------------------------
 * La URL y la clave publicable son públicas por diseño: la seguridad la
 * aplican las reglas de la base de datos (Row Level Security), probadas en
 * supabase/pruebas. Nunca poner aquí la clave service_role.
 */
import { createClient, type Session, type SupabaseClient } from '@supabase/supabase-js'
import { PERFIL_VACIO, type EmbarqueForm, type Perfil } from './almacen'
const leerPerfilVacio = (): Perfil => ({ ...PERFIL_VACIO })
import type { Emision } from './formal'
import type { Producto, ResultadoLanded } from './landed'
import type { Tarifa } from './tarifas'

export const NUBE = {
  url: 'https://gltccicodzuveuxtarat.supabase.co',
  clave: 'sb_publishable_ZZWt6lRPJdzVzzbVvT-Blg_WkqvLn8E',
}

let cliente: SupabaseClient | null = null
export function nube(): SupabaseClient {
  if (!cliente) {
    cliente = createClient(NUBE.url, NUBE.clave, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'pkce' },
    })
  }
  return cliente
}

// ---------------------------------------------------------------- Sesión y perfil

export type Rol = 'cliente' | 'agente' | 'operador'
export interface Usuario { id: string; email: string; rol: Rol }
export const esStaff = (u: Usuario | null) => !!u && (u.rol === 'agente' || u.rol === 'operador')
export const ROLES: Record<Rol, string> = { cliente: 'Cliente', agente: 'Agente aduanero', operador: 'Operador LANDEX' }

const errorTexto = (e: { message?: string } | null | undefined) => {
  const m = e?.message ?? 'Error desconocido'
  if (/email_address_not_authorized|not authorized/i.test(m)) return 'Por ahora el acceso está habilitado solo para el equipo de LANDEX. Escríbenos para crear tu cuenta.'
  if (/rate limit/i.test(m)) return 'Se enviaron demasiados correos. Espera unos minutos e inténtalo de nuevo.'
  return m
}

export async function enviarEnlace(email: string): Promise<string | null> {
  const redirect = `${location.origin}${location.pathname}`
  const { error } = await nube().auth.signInWithOtp({ email, options: { emailRedirectTo: redirect, shouldCreateUser: true } })
  return error ? errorTexto(error) : null
}

export async function salir() { await nube().auth.signOut() }

export function alCambiarSesion(cb: (s: Session | null) => void) {
  nube().auth.getSession().then(({ data }) => cb(data.session))
  const { data } = nube().auth.onAuthStateChange((_e, s) => cb(s))
  return () => data.subscription.unsubscribe()
}

interface FilaPerfil {
  id: string; rol: Rol; email: string | null; nombre: string; empresa: string; tipo: 'fisica' | 'juridica'
  identificacion: string; telefono: string; direccion_entrega: string; datos: Partial<Perfil>
}

const aPerfil = (f: FilaPerfil, base: Perfil): Perfil => ({
  ...base, ...(f.datos ?? {}),
  nombre: f.nombre || base.nombre, empresa: f.empresa || base.empresa, tipo: f.tipo ?? base.tipo,
  identificacion: f.identificacion || base.identificacion, email: f.email || base.email,
  telefono: f.telefono || base.telefono, direccionEntrega: f.direccion_entrega || base.direccionEntrega,
})

export async function cargarUsuario(s: Session, base: Perfil): Promise<{ usuario: Usuario; perfil: Perfil } | null> {
  const { data, error } = await nube().from('perfiles').select('*').eq('id', s.user.id).maybeSingle<FilaPerfil>()
  if (error || !data) return null
  return { usuario: { id: data.id, email: data.email ?? s.user.email ?? '', rol: data.rol }, perfil: aPerfil(data, base) }
}

export async function guardarPerfilNube(id: string, p: Perfil): Promise<string | null> {
  const { experiencia, capacidadDescarga, tieneMontacargas, restriccionesAcceso, presupuestoUSD } = p
  const { error } = await nube().from('perfiles').update({
    nombre: p.nombre, empresa: p.empresa, tipo: p.tipo, identificacion: p.identificacion, telefono: p.telefono,
    direccion_entrega: p.direccionEntrega,
    datos: { experiencia, capacidadDescarga, tieneMontacargas, restriccionesAcceso, presupuestoUSD },
  }).eq('id', id)
  return error ? errorTexto(error) : null
}

// ---------------------------------------------------------------- Cotizaciones

export type EstadoNube = 'estimada' | 'incompleta' | 'solicitada' | 'formal' | 'aceptada' | 'en_proceso' | 'cerrada' | 'cancelada'
export const ESTADOS_NUBE: Record<EstadoNube, string> = {
  estimada: 'Estimada', incompleta: 'Incompleta', solicitada: 'Solicitud enviada', formal: 'Formal', aceptada: 'Aceptada por el cliente',
  en_proceso: 'En proceso', cerrada: 'Cerrada', cancelada: 'Cancelada',
}
/** Estados en que el cliente ya no edita la cotización. */
export const BLOQUEADA: EstadoNube[] = ['aceptada', 'en_proceso', 'cerrada', 'cancelada']

export interface CotNube {
  id: string
  numero: string
  cliente_id: string
  nombre: string
  datos: { embarque: EmbarqueForm; productos: Producto[] }
  total: number | null
  estado: EstadoNube
  emision: Emision | null
  creada: string
  actualizada: string
  perfiles?: FilaPerfil | null
}

export async function listarCotizacionesNube(): Promise<{ datos: CotNube[]; error: string | null }> {
  const { data, error } = await nube().from('cotizaciones')
    .select('*, perfiles(id, rol, email, nombre, empresa, tipo, identificacion, telefono, direccion_entrega, datos)')
    .order('actualizada', { ascending: false })
  return { datos: (data ?? []) as CotNube[], error: error ? errorTexto(error) : null }
}

export const perfilDeCot = (c: CotNube, base: Perfil): Perfil | undefined => (c.perfiles ? aPerfil(c.perfiles, base) : undefined)

export async function guardarCotizacionNube(
  id: string | undefined, nombre: string, embarque: EmbarqueForm, productos: Producto[], r: ResultadoLanded, estado: EstadoNube,
  emision?: Emision | null,
): Promise<{ cot: CotNube | null; error: string | null }> {
  const fila: Record<string, unknown> = { nombre, datos: { embarque, productos }, total: r.totales.total, estado }
  if (emision !== undefined) fila.emision = emision
  const q = id
    ? nube().from('cotizaciones').update(fila).eq('id', id).select('*').single<CotNube>()
    : nube().from('cotizaciones').insert(fila).select('*').single<CotNube>()
  const { data, error } = await q
  return { cot: data ?? null, error: error ? errorTexto(error) : null }
}

export async function cambiarEstadoNube(id: string, estado: EstadoNube, emision?: Emision | null): Promise<string | null> {
  const cambio: Record<string, unknown> = { estado }
  if (emision !== undefined) cambio.emision = emision
  const { error } = await nube().from('cotizaciones').update(cambio).eq('id', id)
  return error ? errorTexto(error) : null
}

/** La agencia asigna una cotización a la cuenta de un cliente por su correo (el cliente debe haber ingresado al menos una vez). */
export async function asignarCliente(id: string, correo: string): Promise<{ perfil: Perfil | null; error: string | null }> {
  const email = correo.trim().toLowerCase()
  const { data, error } = await nube().from('perfiles').select('*').ilike('email', email).maybeSingle()
  if (error) return { perfil: null, error: errorTexto(error) }
  if (!data) return { perfil: null, error: `No hay ninguna cuenta con ${email}. Pide al cliente que ingrese una vez a landex.cr con ese correo.` }
  const { error: e2 } = await nube().from('cotizaciones').update({ cliente_id: (data as { id: string }).id }).eq('id', id)
  if (e2) return { perfil: null, error: errorTexto(e2) }
  return { perfil: aPerfil(data as FilaPerfil, leerPerfilVacio()), error: null }
}

export async function eliminarCotizacionNube(id: string): Promise<string | null> {
  const { error } = await nube().from('cotizaciones').delete().eq('id', id)
  return error ? errorTexto(error) : null
}

// ---------------------------------------------------------------- Tarifas

export async function listarTarifasNube(): Promise<Tarifa[]> {
  const { data } = await nube().from('tarifas').select('datos, publicada')
  return (data ?? []).map((x: { datos: Tarifa; publicada: boolean }) => ({ ...x.datos, publicada: x.publicada }))
}

export async function guardarTarifaNube(t: Tarifa & { publicada?: boolean }): Promise<string | null> {
  const { local: _l, publicada, ...datos } = t
  const { error } = await nube().from('tarifas').upsert({
    id: t.id, datos, publicada: !!publicada, ejemplo: !!t.ejemplo, vigente_hasta: t.vigenteHasta || null, actualizada: new Date().toISOString(),
  })
  return error ? errorTexto(error) : null
}

export async function eliminarTarifaNube(id: string): Promise<string | null> {
  const { error } = await nube().from('tarifas').delete().eq('id', id)
  return error ? errorTexto(error) : null
}

// ---------------------------------------------------------------- Documentos

export type EstadoArchivo = 'recibido' | 'revisado' | 'observado'
export interface DocNube {
  id: string; cotizacion_id: string; tipo: string; estado: EstadoArchivo; archivo: string; nombre_archivo: string
  observacion: string; subido: string; revisado: string | null
}

export const TAMANO_MAX = 10 * 1024 * 1024
export const TIPOS_ARCHIVO = '.pdf,.jpg,.jpeg,.png,.webp,.xlsx,.xls,.docx'

export async function listarDocumentos(cotId: string): Promise<DocNube[]> {
  const { data } = await nube().from('documentos').select('*').eq('cotizacion_id', cotId).order('subido', { ascending: false })
  return (data ?? []) as DocNube[]
}

const limpiar = (n: string) => n.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w.-]+/g, '_').slice(-80)

export async function subirDocumento(cotId: string, tipo: string, f: File): Promise<string | null> {
  if (f.size > TAMANO_MAX) return 'El archivo supera 10 MB.'
  const ruta = `${cotId}/${tipo}/${Date.now()}-${limpiar(f.name)}`
  const { error: e1 } = await nube().storage.from('documentos').upload(ruta, f, { contentType: f.type || undefined, upsert: false })
  if (e1) return errorTexto(e1)
  const { error: e2 } = await nube().from('documentos').insert({ cotizacion_id: cotId, tipo, archivo: ruta, nombre_archivo: f.name })
  if (e2) { await nube().storage.from('documentos').remove([ruta]); return errorTexto(e2) }
  return null
}

export async function enlaceDocumento(ruta: string): Promise<string | null> {
  const { data } = await nube().storage.from('documentos').createSignedUrl(ruta, 300)
  return data?.signedUrl ?? null
}

export async function revisarDocumento(id: string, estado: EstadoArchivo, observacion: string): Promise<string | null> {
  const { error } = await nube().from('documentos').update({ estado, observacion }).eq('id', id)
  return error ? errorTexto(error) : null
}

export async function eliminarDocumento(d: DocNube): Promise<string | null> {
  const { error } = await nube().from('documentos').delete().eq('id', d.id)
  if (error) return errorTexto(error)
  await nube().storage.from('documentos').remove([d.archivo])
  return null
}

// ---------------------------------------------------------------- Solicitudes (prospectos)

export type TipoSolicitud = 'importacion' | 'desalmacenaje' | 'empresarial' | 'contacto'
export const TIPOS_SOLICITUD: Record<TipoSolicitud, string> = {
  importacion: 'Quiere importar', desalmacenaje: 'Desalmacenaje', empresarial: 'Soluciones empresariales', contacto: 'Contacto',
}
export type EstadoSolicitud = 'nuevo' | 'contactado' | 'en_proceso' | 'cerrado' | 'descartado'
export const ESTADOS_SOLICITUD: Record<EstadoSolicitud, string> = {
  nuevo: 'Nuevo', contactado: 'Contactado', en_proceso: 'En proceso', cerrado: 'Cerrado', descartado: 'Descartado',
}

export interface SolicitudNueva {
  tipo: TipoSolicitud
  nombre: string
  empresa: string
  correo: string
  telefono: string
  datos: Record<string, unknown>
  consentimiento: boolean
}
export interface Solicitud extends SolicitudNueva {
  id: string
  estado: EstadoSolicitud
  notas: string
  usuario_id: string | null
  creada: string
}

/** Cualquier visitante puede enviar una solicitud (con consentimiento). No devuelve filas: solo el personal las ve. */
export async function enviarSolicitud(s: SolicitudNueva): Promise<string | null> {
  const { error } = await nube().from('solicitudes').insert({ ...s, nombre: s.nombre.trim(), correo: s.correo.trim(), empresa: s.empresa.trim(), telefono: s.telefono.trim() })
  if (!error) return null
  if (/check constraint|violates/i.test(error.message)) return 'Revisa tu nombre y correo: alguno no es válido.'
  return 'No pudimos enviar tu solicitud. Intenta de nuevo o escríbenos por correo.'
}

export async function listarSolicitudes(): Promise<Solicitud[]> {
  const { data, error } = await nube().from('solicitudes').select('*').order('creada', { ascending: false }).limit(300)
  if (error) throw new Error(error.message)
  return (data ?? []) as Solicitud[]
}

export async function cambiarSolicitud(id: string, cambio: { estado?: EstadoSolicitud; notas?: string }): Promise<string | null> {
  const { error } = await nube().from('solicitudes').update(cambio).eq('id', id)
  return error ? error.message : null
}
