import type { EstadoDoc } from './expediente'
import type { Emision } from './formal'
/**
 * Estado compartido del cotizador, perfil del cliente y cotizaciones guardadas.
 * Por ahora se guardan en el navegador (localStorage). En la Fase 4 pasan a la base de datos.
 */
import { ORIGENES, TIPO_CAMBIO_DEFAULT } from '../data/config'
import type { Clasificacion, Embarque, Producto, ResultadoLanded } from './landed'

export type EmbarqueForm = Omit<Embarque, 'origen'> & {
  origenId: string
  /** true si el cliente escribió el tipo de cambio a mano (no se actualiza con el BCCR). */
  tipoCambioManual?: boolean
  /** Estado de cada documento del expediente (no interviene en el cálculo). */
  documentos?: Record<string, EstadoDoc>
  /** Servicios complementarios que el cliente ya contrató por su cuenta (no interviene en el cálculo). */
  gestionCliente?: string[]
  /** Qué pidió el cliente al enviar la cotización a LANDEX. */
  intencion?: 'contratar' | 'cotizacion_formal' | 'revision_arancelaria'
}

export const EMBARQUE_INICIAL: EmbarqueForm = {
  proveedor: { empresa: '', direccion: '', contacto: '', telefono: '', email: '' },
  incoterm: 'EXW', lugarConvenido: '', entregaDestino: 'bodega', origenId: ORIGENES[1].id, modo: 'FCL40', zona: 'GAM',
  tipoCambio: TIPO_CAMBIO_DEFAULT, diasProduccion: 0, seguro: true, requiereDescarga: true, clienteTieneMontacargas: false,
  requiereDevolucionContenedor: true, inspeccionOrigen: false, embalajeAdicional: false, custodia: false, ajustes: {},
}

export const nuevoProducto = (cl: Clasificacion | null = null): Producto => ({
  id: `p-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, sku: '', nombre: '', paisFabricacion: 'CN',
  cantidad: 0, valorUnitario: 0, pesoBrutoKg: 0, clasificacion: cl, certificadoOrigen: false,
})

/** Escenario de prueba NOVA HOME CR (cliente ficticio). */
export const EJEMPLO_NOVA: { embarque: EmbarqueForm; productos: Producto[] } = {
  embarque: { ...EMBARQUE_INICIAL, incoterm: 'EXW', lugarConvenido: 'Bodega del proveedor, Ningbo', origenId: 'cn-este', modo: 'FCL40' },
  productos: [{
    id: 'nova-1', sku: 'NOVA-001', nombre: 'Mobiliario para el hogar (ejemplo)', paisFabricacion: 'CN', cantidad: 1000,
    valorUnitario: 55, pesoBrutoKg: 9000, volumenM3: 55, clasificacion: null, certificadoOrigen: false,
  }],
}

const leerJSON = <T,>(clave: string, defecto: T): T => {
  try {
    const v = localStorage.getItem(clave)
    return v ? (JSON.parse(v) as T) : defecto
  } catch {
    return defecto
  }
}
const guardarJSON = (clave: string, v: unknown) => {
  try { localStorage.setItem(clave, JSON.stringify(v)) } catch { /* sin almacenamiento */ }
}

// ---------------------------------------------------------------- Borrador actual

const CLAVE_BORRADOR = 'importa-facil:cotizacion'
export interface Borrador {
  embarque: EmbarqueForm; productos: Producto[]; numero?: string; emision?: Emision
  /** Cotización en la nube que se está editando (Fase 4). */
  nubeId?: string; nubeEstado?: string
  /** Perfil del cliente cuando la agencia abre la cotización de otro. */
  cliente?: Perfil
}

export function leerBorrador(): Borrador {
  const x = leerJSON<Borrador | null>(CLAVE_BORRADOR, null)
  if (x?.embarque && Array.isArray(x.productos)) return { ...x, embarque: { ...EMBARQUE_INICIAL, ...x.embarque } }
  return { embarque: EMBARQUE_INICIAL, productos: [] }
}
export const guardarBorrador = (b: Borrador) => guardarJSON(CLAVE_BORRADOR, b)

// ---------------------------------------------------------------- Perfil del cliente

export interface Perfil {
  nombre: string
  empresa: string
  tipo: 'fisica' | 'juridica'
  identificacion: string
  email: string
  telefono: string
  direccionEntrega: string
  experiencia: 'ninguna' | 'alguna' | 'frecuente'
  capacidadDescarga: string
  tieneMontacargas: boolean
  restriccionesAcceso: string
  /** Opcional: monto disponible para la importación (solo para comparar). */
  presupuestoUSD: number | null
}

export const PERFIL_VACIO: Perfil = {
  nombre: '', empresa: '', tipo: 'juridica', identificacion: '', email: '', telefono: '', direccionEntrega: '',
  experiencia: 'ninguna', capacidadDescarga: '', tieneMontacargas: false, restriccionesAcceso: '', presupuestoUSD: null,
}

const CLAVE_PERFIL = 'landex:perfil'
export const leerPerfil = (): Perfil => ({ ...PERFIL_VACIO, ...leerJSON<Partial<Perfil>>(CLAVE_PERFIL, {}) })
export const guardarPerfil = (p: Perfil) => guardarJSON(CLAVE_PERFIL, p)
export const perfilCompleto = (p: Perfil) => !!(p.nombre.trim() && (p.email.trim() || p.telefono.trim()))

// ---------------------------------------------------------------- Cotizaciones guardadas

export interface CotizacionGuardada {
  numero: string
  fecha: string
  vigenciaDias: number
  nombre: string
  embarque: EmbarqueForm
  productos: Producto[]
  total: number
  estado: ResultadoLanded['estado']
  actualizada: string
  /** Emisión formal (Fase 3). */
  emision?: Emision
}

const CLAVE_COTS = 'landex:cotizaciones'
const CLAVE_CONSEC = 'landex:consecutivo'
export const VIGENCIA_DIAS = 15

export const listarCotizaciones = (): CotizacionGuardada[] =>
  leerJSON<CotizacionGuardada[]>(CLAVE_COTS, []).sort((a, b) => b.actualizada.localeCompare(a.actualizada))

export function siguienteNumero(fecha = new Date()): string {
  const n = leerJSON<number>(CLAVE_CONSEC, 0) + 1
  guardarJSON(CLAVE_CONSEC, n)
  return `LDX-${fecha.getFullYear()}-${String(n).padStart(4, '0')}`
}

export function guardarCotizacion(c: Omit<CotizacionGuardada, 'actualizada'>): CotizacionGuardada {
  const todas = leerJSON<CotizacionGuardada[]>(CLAVE_COTS, [])
  const nueva = { ...c, actualizada: new Date().toISOString() }
  const i = todas.findIndex((x) => x.numero === c.numero)
  if (i >= 0) todas[i] = nueva
  else todas.push(nueva)
  guardarJSON(CLAVE_COTS, todas)
  return nueva
}

export function eliminarCotizacion(numero: string) {
  guardarJSON(CLAVE_COTS, leerJSON<CotizacionGuardada[]>(CLAVE_COTS, []).filter((x) => x.numero !== numero))
}

export function venceEl(c: Pick<CotizacionGuardada, 'fecha' | 'vigenciaDias'>): Date {
  const d = new Date(c.fecha)
  d.setDate(d.getDate() + c.vigenciaDias)
  return d
}
