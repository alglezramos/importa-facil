/**
 * TARIFAS DE PROVEEDORES LOGÍSTICOS (Fase 3)
 * ---------------------------------------------------------------
 * Una tarifa es lo que un proveedor real cotizó para una ruta y modalidad.
 * Al aplicarla, sus cargos reemplazan el monto de referencia de cada concepto
 * mediante los ajustes que el motor ya admite (no se cambia ninguna fórmula).
 *
 * Fuentes:
 *  - public/tarifas.json: tarifas publicadas (las ve cualquier visitante).
 *  - Este navegador (modo agencia): tarifas registradas por el operador.
 * Las tarifas marcadas `ejemplo` solo sirven para probar la pantalla: nunca
 * se confirman ni permiten emitir una cotización formal.
 */
import type { Modo, Zona } from '../data/config'
import type { Ajuste, Carga, Embarque } from './landed'

export type CategoriaProveedor =
  | 'forwarder' | 'naviera' | 'aerolinea' | 'consolidador' | 'transporte_int' | 'transporte_nac'
  | 'almacen_fiscal' | 'agencia' | 'aseguradora' | 'descarga' | 'montacargas'

export const CATEGORIAS_PROVEEDOR: Record<CategoriaProveedor, string> = {
  forwarder: 'Freight forwarder',
  naviera: 'Naviera',
  aerolinea: 'Aerolínea o agente de carga aérea',
  consolidador: 'Consolidador',
  transporte_int: 'Transportista internacional',
  transporte_nac: 'Transportista nacional',
  almacen_fiscal: 'Almacén fiscal',
  agencia: 'Agencia de aduanas',
  aseguradora: 'Aseguradora',
  descarga: 'Empresa de descarga',
  montacargas: 'Proveedor de montacargas',
}

/** Cómo se cobra un cargo. `incluido` = el proveedor lo incluye en otro cargo. */
export type Unidad = 'fijo' | 'contenedor' | 'm3' | 'kg' | 'kg_cobrable' | 'pct_valor' | 'incluido'

export const UNIDADES: Record<Unidad, string> = {
  fijo: 'Monto fijo por embarque',
  contenedor: 'Por contenedor o unidad',
  m3: 'Por m³',
  kg: 'Por kg bruto',
  kg_cobrable: 'Por kg cobrable (aéreo)',
  pct_valor: '% del valor de la mercancía',
  incluido: 'Incluido en otro cargo',
}

export const UNIDAD_CORTA: Record<Unidad, string> = {
  fijo: 'por embarque', contenedor: 'por contenedor', m3: 'por m³', kg: 'por kg', kg_cobrable: 'por kg cobrable', pct_valor: '% del valor', incluido: 'incluido',
}

export interface Cargo {
  /** Id del concepto del motor (flete, thc_origen, transporte_nacional, …). */
  concepto: string
  monto: number
  unidad: Unidad
  /** Cobro mínimo, en USD. */
  minimo?: number
}

export interface Tarifa {
  id: string
  proveedor: string
  categoria: CategoriaProveedor
  /** Id de origen (config.ts). Vacío = cualquier origen. */
  origenId: string
  /** Modalidades a las que aplica. Vacío = todas. */
  modos: Modo[]
  /** Zona de entrega en Costa Rica. Vacío = todas. */
  zona?: Zona | ''
  cargos: Cargo[]
  diasTransito?: number | null
  vigenteDesde: string // AAAA-MM-DD
  vigenteHasta: string // AAAA-MM-DD
  incluye: string[]
  excluye: string[]
  condiciones: string
  /** Referencia de la oferta: número de cotización del proveedor, correo, fecha. */
  fuente: string
  ejemplo?: boolean
  /** Registrada en este navegador (anterior a la nube). */
  local?: boolean
  /** Visible para los clientes (tarifas en la nube). */
  publicada?: boolean
}

/** Conceptos del motor a los que se puede asignar un cargo. */
export const CONCEPTOS_TARIFA: { id: string; nombre: string; tramo: Tramo }[] = [
  { id: 'carga', nombre: 'Carga en bodega del proveedor', tramo: 'internacional' },
  { id: 'embalaje', nombre: 'Embalaje y paletización', tramo: 'internacional' },
  { id: 'inspeccion', nombre: 'Inspección en origen', tramo: 'internacional' },
  { id: 'transporte_origen', nombre: 'Recolección y transporte en origen', tramo: 'internacional' },
  { id: 'despacho_export', nombre: 'Despacho de exportación', tramo: 'internacional' },
  { id: 'documentacion', nombre: 'Documentación de exportación', tramo: 'internacional' },
  { id: 'thc_origen', nombre: 'THC / manejo en origen', tramo: 'internacional' },
  { id: 'sellos', nombre: 'Sellos y gastos del contenedor', tramo: 'internacional' },
  { id: 'flete', nombre: 'Flete internacional', tramo: 'internacional' },
  { id: 'recargos', nombre: 'Recargos (BAF, temporada, seguridad)', tramo: 'internacional' },
  { id: 'seguro', nombre: 'Seguro de carga', tramo: 'internacional' },
  { id: 'thc_destino', nombre: 'THC / manejo en destino', tramo: 'internacional' },
  { id: 'doc_llegada', nombre: 'Documentación de llegada', tramo: 'internacional' },
  { id: 'desconsolidacion', nombre: 'Desconsolidación', tramo: 'internacional' },
  { id: 'almacen_fiscal', nombre: 'Almacén fiscal y manipulación', tramo: 'destino' },
  { id: 'movilizacion', nombre: 'Movilización de contenedores', tramo: 'destino' },
  { id: 'honorarios', nombre: 'Honorarios de agencia de aduanas', tramo: 'destino' },
  { id: 'coordinacion', nombre: 'Coordinación logística', tramo: 'destino' },
  { id: 'permisos', nombre: 'Permisos y notas técnicas', tramo: 'destino' },
  { id: 'transporte_nacional', nombre: 'Transporte hasta la bodega', tramo: 'nacional' },
  { id: 'peajes', nombre: 'Peajes y combustible', tramo: 'nacional' },
  { id: 'custodia', nombre: 'Custodia', tramo: 'nacional' },
  { id: 'descarga_personal', nombre: 'Personal de descarga', tramo: 'nacional' },
  { id: 'montacargas', nombre: 'Montacargas', tramo: 'nacional' },
  { id: 'devolucion', nombre: 'Devolución del contenedor vacío', tramo: 'nacional' },
]

export type Tramo = 'internacional' | 'destino' | 'nacional'
export const TRAMOS: Record<Tramo, string> = {
  internacional: 'Flete internacional y servicios de origen y llegada',
  destino: 'Almacén fiscal y servicios de aduana',
  nacional: 'Transporte nacional y descarga',
}

const tramoDe = (concepto: string): Tramo => CONCEPTOS_TARIFA.find((c) => c.id === concepto)?.tramo ?? 'internacional'

/** Tramo de una tarifa: el de la mayoría de sus cargos. */
export function tramoTarifa(t: Tarifa): Tramo {
  const cuenta: Record<Tramo, number> = { internacional: 0, destino: 0, nacional: 0 }
  for (const c of t.cargos) cuenta[tramoDe(c.concepto)]++
  return (Object.keys(cuenta) as Tramo[]).reduce((a, b) => (cuenta[b] > cuenta[a] ? b : a))
}

// ---------------------------------------------------------------- Vigencia

export type Vigencia = 'vigente' | 'por_vencer' | 'vencida' | 'futura'
export const VIGENCIAS: Record<Vigencia, string> = {
  vigente: 'Vigente', por_vencer: 'Vence pronto', vencida: 'Vencida', futura: 'Aún no vigente',
}

const dia = (d: Date) => d.toISOString().slice(0, 10)

export function vigencia(t: Tarifa, hoy = new Date()): Vigencia {
  const h = dia(hoy)
  if (t.vigenteDesde && h < t.vigenteDesde) return 'futura'
  if (t.vigenteHasta && h > t.vigenteHasta) return 'vencida'
  const limite = new Date(hoy)
  limite.setDate(limite.getDate() + 7)
  if (t.vigenteHasta && dia(limite) >= t.vigenteHasta) return 'por_vencer'
  return 'vigente'
}

export const usable = (t: Tarifa, hoy = new Date()) => {
  const v = vigencia(t, hoy)
  return v === 'vigente' || v === 'por_vencer'
}

/** La tarifa sirve para este embarque (origen, modalidad y zona). */
export function aplicaA(t: Tarifa, e: Pick<Embarque, 'modo' | 'zona'> & { origenId: string }) {
  return (!t.origenId || t.origenId === e.origenId)
    && (t.modos.length === 0 || t.modos.includes(e.modo))
    && (!t.zona || t.zona === e.zona)
}

// ---------------------------------------------------------------- Montos

const redondear = (x: number) => Math.round(x * 100) / 100

export function montoCargo(c: Cargo, carga: Carga, valorMercancia: number): number {
  const base = (() => {
    switch (c.unidad) {
      case 'fijo': return c.monto
      case 'contenedor': return c.monto * Math.max(1, carga.contenedores)
      case 'm3': return c.monto * carga.volumenM3
      case 'kg': return c.monto * carga.pesoKg
      case 'kg_cobrable': return c.monto * carga.pesoCobrableAereo
      case 'pct_valor': return (c.monto / 100) * valorMercancia
      case 'incluido': return 0
    }
  })()
  return redondear(Math.max(base, c.minimo ?? 0))
}

/**
 * Ajustes que produce una tarifa. Una tarifa real queda "confirmada";
 * una de ejemplo, solo "estimada" (nunca cuenta para una cotización formal).
 */
export function ajustesDeTarifa(t: Tarifa, carga: Carga, valorMercancia: number, omitir: Set<string> = new Set()): Record<string, Ajuste> {
  const out: Record<string, Ajuste> = {}
  const porConcepto = new Map<string, number>()
  const incluidos = new Set<string>()
  for (const c of t.cargos) {
    if (omitir.has(c.concepto)) continue
    if (c.unidad === 'incluido') { incluidos.add(c.concepto); continue }
    porConcepto.set(c.concepto, (porConcepto.get(c.concepto) ?? 0) + montoCargo(c, carga, valorMercancia))
  }
  const estado = t.ejemplo ? 'estimado' : 'confirmado'
  for (const [k, monto] of porConcepto) out[k] = { estado, monto: redondear(monto) }
  for (const k of incluidos) if (!porConcepto.has(k)) out[k] = { estado: 'incluido_en_otro', monto: 0 }
  return out
}

export const totalTarifa = (t: Tarifa, carga: Carga, valor: number, omitir: Set<string> = new Set()) =>
  redondear(t.cargos.filter((c) => !omitir.has(c.concepto)).reduce((s, c) => s + montoCargo(c, carga, valor), 0))

/**
 * Conceptos que una tarifa no debe tocar: los que no aplican al embarque
 * o que ya paga el proveedor de la mercancía según el Incoterm.
 */
export const conceptosProtegidos = (conceptos: { id: string; estado: string }[]) =>
  new Set(conceptos.filter((k) => k.estado === 'no_aplica' || k.estado === 'incluido').map((k) => k.id))

/**
 * Ajustes efectivos: los de las tarifas aplicadas (recalculados con la carga
 * actual) y encima los ajustes manuales, que siempre mandan.
 */
export function ajustesEfectivos(
  todas: Tarifa[], aplicadas: string[] | undefined, manual: Record<string, Ajuste> | undefined, carga: Carga, valor: number,
  omitir: Set<string> = new Set(),
): Record<string, Ajuste> {
  const out: Record<string, Ajuste> = {}
  for (const id of aplicadas ?? []) {
    const t = todas.find((x) => x.id === id)
    if (t) Object.assign(out, ajustesDeTarifa(t, carga, valor, omitir))
  }
  return { ...out, ...(manual ?? {}) }
}

/** Quita del ajuste manual los conceptos que cubre una tarifa (para que la tarifa mande). */
export function liberarConceptos(manual: Record<string, Ajuste> | undefined, t: Tarifa): Record<string, Ajuste> {
  const a = { ...(manual ?? {}) }
  for (const c of t.cargos) delete a[c.concepto]
  return a
}

// ---------------------------------------------------------------- Almacenamiento

const CLAVE_LOCAL = 'landex:tarifas'

export function leerTarifasLocales(): Tarifa[] {
  try {
    const x = JSON.parse(localStorage.getItem(CLAVE_LOCAL) || '[]')
    return Array.isArray(x) ? x.map((t: Tarifa) => ({ ...t, local: true })) : []
  } catch { return [] }
}

export function guardarTarifasLocales(ts: Tarifa[]) {
  try { localStorage.setItem(CLAVE_LOCAL, JSON.stringify(ts.map(({ local: _l, ...t }) => t))) } catch { /* sin almacenamiento */ }
}

let cache: Promise<Tarifa[]> | null = null
export function cargarTarifasPublicadas(): Promise<Tarifa[]> {
  if (!cache) {
    cache = fetch('./tarifas.json', { cache: 'no-cache' })
      .then((r) => (r.ok ? r.json() : { tarifas: [] }))
      .then((x) => (Array.isArray(x?.tarifas) ? (x.tarifas as Tarifa[]) : []))
      .catch(() => [])
  }
  return cache
}

/** Archivo listo para publicar en public/tarifas.json. */
export function exportarTarifas(ts: Tarifa[]): string {
  return JSON.stringify({
    nota: 'Tarifas publicadas de LANDEX. Este archivo es visible para cualquier visitante del sitio.',
    actualizado: dia(new Date()),
    tarifas: ts.map(({ local: _l, ...t }) => t),
  }, null, 2)
}

export function validarTarifa(t: Tarifa): string[] {
  const err: string[] = []
  if (!t.proveedor.trim()) err.push('Falta el nombre del proveedor')
  if (!t.vigenteHasta) err.push('Falta la fecha de vencimiento')
  if (t.vigenteDesde && t.vigenteHasta && t.vigenteHasta < t.vigenteDesde) err.push('La vigencia termina antes de empezar')
  if (!t.cargos.length) err.push('Agrega al menos un cargo')
  if (t.cargos.some((c) => c.unidad !== 'incluido' && !(c.monto > 0))) err.push('Hay cargos sin monto')
  if (!t.fuente.trim() && !t.ejemplo) err.push('Indica la fuente (número de oferta, correo o fecha)')
  return err
}
