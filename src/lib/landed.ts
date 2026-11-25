/**
 * MOTOR DE LANDED COST – Ramos & Co.
 * ---------------------------------------------------------------
 * Calcula el costo de importar uno o varios productos desde la bodega del
 * proveedor hasta que la mercancía queda descargada en la bodega del cliente.
 *
 * Principios:
 *  - Todo se calcula en centavos (enteros) para evitar errores de redondeo.
 *  - Cada concepto tiene un estado. Un concepto pendiente NUNCA cuenta como cero:
 *    queda fuera del total y la cotización se marca como incompleta.
 *  - Los costos compartidos se distribuyen por SKU con el método del resto mayor,
 *    así la suma de los SKU coincide exactamente con el total del embarque.
 *  - Los impuestos se calculan por producto sobre su propio valor aduanero.
 *  - Ninguna tasa se inventa: si falta, el impuesto queda pendiente de validación.
 */
import { MODOS, type Modo, type Origen, type Zona } from '../data/config'
import { ALTO_MAX_AEREO_PASAJEROS_CM, DIAS, EQUIPOS, FACTOR_AEREO, FACTOR_ESTIBA, REF, type Equipo } from '../data/logistica'

// ---------------------------------------------------------------- Tipos

export type Incoterm = 'EXW' | 'FCA' | 'FAS' | 'FOB' | 'CFR' | 'CIF' | 'CPT' | 'CIP' | 'DAP' | 'DPU' | 'DDP'
export type EstadoConcepto = 'incluido' | 'no_aplica' | 'estimado' | 'confirmado' | 'pendiente' | 'incluido_en_otro'
export type Base = 'valor' | 'peso' | 'volumen' | 'unidades' | 'directo'
export type Etapa = 1 | 2 | 3 | 4 | 5 | 6 | 7

export const ETAPAS: Record<Etapa, string> = {
  1: 'Bodega del proveedor',
  2: 'Logística en origen',
  3: 'Transporte internacional',
  4: 'Logística en destino',
  5: 'Nacionalización',
  6: 'Transporte nacional',
  7: 'Descarga y cierre logístico',
}

export const ESTADOS: Record<EstadoConcepto, string> = {
  incluido: 'Incluido en el precio del proveedor',
  no_aplica: 'No aplica',
  estimado: 'Estimado',
  confirmado: 'Confirmado',
  pendiente: 'Pendiente de cotizar',
  incluido_en_otro: 'Incluido en otro servicio',
}

export const BASES: Record<Base, string> = {
  valor: 'Valor comercial', peso: 'Peso', volumen: 'Volumen', unidades: 'Unidades', directo: 'Asignación directa',
}

export interface InfoIncoterm {
  nombre: string
  sencillo: string
  soloMaritimo: boolean
  riesgo: string
}

export const INCOTERMS: Record<Incoterm, InfoIncoterm> = {
  EXW: { nombre: 'En fábrica', sencillo: 'El proveedor solo tiene la mercancía lista en su bodega. Yo pago todo lo demás.', soloMaritimo: false, riesgo: 'En la bodega del proveedor, al ponerla a disposición.' },
  FCA: { nombre: 'Franco transportista', sencillo: 'El proveedor la carga en el camión que yo envío y hace el trámite de exportación.', soloMaritimo: false, riesgo: 'Al entregarla al transportista que designo.' },
  FAS: { nombre: 'Franco al costado del buque', sencillo: 'El proveedor la lleva al puerto, junto al barco.', soloMaritimo: true, riesgo: 'Al costado del buque en el puerto de origen.' },
  FOB: { nombre: 'Franco a bordo', sencillo: 'El proveedor la deja cargada en el barco en su país.', soloMaritimo: true, riesgo: 'Cuando la mercancía está a bordo del buque.' },
  CFR: { nombre: 'Costo y flete', sencillo: 'El proveedor paga el barco hasta Costa Rica, pero no el seguro.', soloMaritimo: true, riesgo: 'A bordo en origen (aunque el proveedor pague el flete).' },
  CIF: { nombre: 'Costo, seguro y flete', sencillo: 'El proveedor paga el barco y el seguro hasta Costa Rica.', soloMaritimo: true, riesgo: 'A bordo en origen (aunque el proveedor pague flete y seguro).' },
  CPT: { nombre: 'Transporte pagado hasta', sencillo: 'El proveedor paga el transporte internacional hasta Costa Rica, sin seguro.', soloMaritimo: false, riesgo: 'Al entregarla al primer transportista.' },
  CIP: { nombre: 'Transporte y seguro pagados hasta', sencillo: 'El proveedor paga transporte y seguro hasta Costa Rica.', soloMaritimo: false, riesgo: 'Al entregarla al primer transportista.' },
  DAP: { nombre: 'Entregada en lugar', sencillo: 'El proveedor la trae hasta el lugar acordado en Costa Rica; yo pago impuestos y descarga.', soloMaritimo: false, riesgo: 'En el lugar de destino, lista para descargar.' },
  DPU: { nombre: 'Entregada en lugar descargada', sencillo: 'Como DAP, pero el proveedor también la descarga.', soloMaritimo: false, riesgo: 'En destino, ya descargada.' },
  DDP: { nombre: 'Entregada con derechos pagados', sencillo: 'El proveedor paga todo, incluso los impuestos de importación. Yo solo descargo.', soloMaritimo: false, riesgo: 'En destino, con impuestos pagados, lista para descargar.' },
}

export interface Bultos {
  cantidad: number
  largoCm: number
  anchoCm: number
  altoCm: number
  apilable: boolean
}

export interface Clasificacion {
  codigo: string
  descripcion: string
  /** Tasas como fracción (0.14 = 14%). null = pendiente de validación. */
  dai: number | null
  sc: number | null
  iva: number | null
  otros: number | null
  estado: 'preliminar' | 'validada'
  fuente?: string
}

export interface Producto {
  id: string
  sku: string
  nombre: string
  descripcion?: string
  material?: string
  paisFabricacion: string
  cantidad: number
  valorUnitario: number
  pesoBrutoKg: number
  pesoNetoKg?: number
  bultos?: Bultos
  /** Volumen manual en m³, si no se dan medidas de bultos. */
  volumenM3?: number
  clasificacion: Clasificacion | null
  certificadoOrigen: boolean
  /** Tasa DAI preferencial validada por el agente (fracción). */
  daiPreferencial?: number | null
  requierePermiso?: boolean
}

export interface Ajuste {
  estado?: EstadoConcepto
  monto?: number | null
  base?: Base
  /** Para asignación directa: id del producto que absorbe el costo. */
  productoDirecto?: string
}

export interface Embarque {
  incoterm: Incoterm
  lugarConvenido?: string
  /** Para términos D: dónde entrega el proveedor. */
  entregaDestino?: 'bodega' | 'puerto'
  origen: Origen
  modo: Modo
  zona: Zona
  tipoCambio: number
  diasProduccion: number
  seguro: boolean
  requiereDescarga: boolean
  clienteTieneMontacargas: boolean
  requiereDevolucionContenedor: boolean
  inspeccionOrigen?: boolean
  embalajeAdicional?: boolean
  custodia?: boolean
  ajustes?: Record<string, Ajuste>
}

export interface Concepto {
  id: string
  etapa: Etapa
  nombre: string
  estado: EstadoConcepto
  /** USD; null si está pendiente. */
  monto: number | null
  base: Base
  productoDirecto?: string
  nota?: string
  /** Forma parte del valor aduanero (gastos hasta el puerto de importación). */
  enValorAduanero: boolean
}

export interface ImpuestosProducto {
  dai: number | null
  sc: number | null
  ley6946: number | null
  iva: number | null
  otros: number | null
  tasaDAIAplicada: number | null
  ahorroTLC: number | null
  pendientes: string[]
}

export interface ResultadoProducto {
  id: string
  sku: string
  nombre: string
  cantidad: number
  valorMercancia: number
  volumenM3: number
  pesoKg: number
  logistica: number
  porEtapa: Record<Etapa, number>
  valorAduanero: number
  impuestos: ImpuestosProducto
  impuestosTotal: number
  landedTotal: number
  landedUnitario: number
  ivaRecuperable: number
  landedTotalSinIVA: number
  landedUnitarioSinIVA: number
  completo: boolean
}

export interface Carga {
  volumenM3: number
  pesoKg: number
  bultos: number
  pesoCobrableAereo: number
  wm: number
  equipo: Equipo | null
  contenedores: number
  ocupacionVolumen: number | null
  ocupacionPeso: number | null
  alertas: string[]
  compatible: boolean
}

export interface EtapaTiempo { nombre: string; inicio: number; dias: number; paralelo?: boolean }

export interface ResultadoLanded {
  conceptos: Concepto[]
  productos: ResultadoProducto[]
  carga: Carga
  porEtapa: Record<Etapa, { total: number; pendientes: number }>
  totales: {
    mercancia: number
    logistica: number
    impuestos: number
    ivaRecuperable: number
    total: number
    totalSinIVA: number
    desembolso: number
    rango: { min: number; max: number }
  }
  pendientes: string[]
  supuestos: string[]
  estado: 'estimada' | 'incompleta'
  tiempo: { etapas: EtapaTiempo[]; dias: number }
  incotermCompatible: boolean
}

// ---------------------------------------------------------------- Utilidades

const c = (usd: number) => Math.round(usd * 100)
const u = (cents: number) => cents / 100

/** Reparte un monto (centavos) según pesos, con el método del resto mayor. */
export function repartir(cents: number, pesos: number[]): number[] {
  const n = pesos.length
  if (!n) return []
  let w = pesos.map((p) => (p > 0 && Number.isFinite(p) ? p : 0))
  let suma = w.reduce((a, b) => a + b, 0)
  if (suma === 0) { w = pesos.map(() => 1); suma = n }
  const crudo = w.map((p) => (cents * p) / suma)
  const base = crudo.map((x) => Math.floor(x))
  let resto = cents - base.reduce((a, b) => a + b, 0)
  const orden = crudo.map((x, i) => [x - Math.floor(x), i] as const).sort((a, b) => b[0] - a[0])
  for (let k = 0; resto > 0; k = (k + 1) % n, resto--) base[orden[k][1]]++
  return base
}

export function volumenProducto(p: Producto): number {
  if (p.bultos && p.bultos.cantidad > 0 && p.bultos.largoCm > 0) {
    return (p.bultos.cantidad * p.bultos.largoCm * p.bultos.anchoCm * p.bultos.altoCm) / 1e6
  }
  return p.volumenM3 ?? 0
}

const EQUIPO_DE: Partial<Record<Modo, Equipo>> = { FCL20: 'FCL20', FCL40: 'FCL40', FCL40HC: 'FCL40HC', TERRESTRE: 'TRAILER' }
const esFCL = (m: Modo) => m === 'FCL20' || m === 'FCL40' || m === 'FCL40HC'
const esMaritimo = (m: Modo) => m === 'LCL' || esFCL(m)
const PAISES_CA = ['GT', 'SV', 'HN', 'NI', 'CA']

// ---------------------------------------------------------------- Cubicaje

export function cubicar(productos: Producto[], modo: Modo): Carga {
  const volumenM3 = productos.reduce((s, p) => s + volumenProducto(p), 0)
  const pesoKg = productos.reduce((s, p) => s + (p.pesoBrutoKg || 0), 0)
  const bultos = productos.reduce((s, p) => s + (p.bultos?.cantidad ?? 0), 0)
  const pesoCobrableAereo = Math.max(pesoKg, volumenM3 * FACTOR_AEREO)
  const wm = Math.max(1, volumenM3, pesoKg / 1000)
  const alertas: string[] = []
  let compatible = true
  const equipo = EQUIPO_DE[modo] ?? null
  let contenedores = 0
  let ocupacionVolumen: number | null = null
  let ocupacionPeso: number | null = null

  if (equipo) {
    const e = EQUIPOS[equipo]
    // Bultos que no caben por medidas
    for (const p of productos) {
      const b = p.bultos
      if (!b || !b.largoCm) continue
      const dims = [b.largoCm, b.anchoCm, b.altoCm].map((x) => x / 100)
      if (b.altoCm / 100 > e.puertaAlto) { compatible = false; alertas.push(`${p.sku}: el bulto mide ${b.altoCm} cm de alto y no pasa por la puerta del ${e.nombre} (${Math.round(e.puertaAlto * 100)} cm).`) }
      if (Math.max(...dims) > e.largo) { compatible = false; alertas.push(`${p.sku}: el bulto es más largo que el ${e.nombre}.`) }
      if (Math.min(dims[0], dims[1]) > e.ancho) { compatible = false; alertas.push(`${p.sku}: el bulto es más ancho que el ${e.nombre}.`) }
    }
    const porVolumen = Math.ceil(volumenM3 / (e.volumen * FACTOR_ESTIBA) - 1e-9)
    const porPeso = Math.ceil(pesoKg / e.cargaUtilKg - 1e-9)
    // Bultos no apilables ocupan piso
    const areaNoApilable = productos.reduce((s, p) => (p.bultos && !p.bultos.apilable ? s + (p.bultos.cantidad * p.bultos.largoCm * p.bultos.anchoCm) / 1e4 : s), 0)
    const porPiso = Math.ceil(areaNoApilable / (e.largo * e.ancho * 0.9) - 1e-9)
    contenedores = Math.max(1, porVolumen, porPeso, porPiso)
    ocupacionVolumen = volumenM3 / (e.volumen * contenedores)
    ocupacionPeso = pesoKg / (e.cargaUtilKg * contenedores)
    if (porPeso > porVolumen) alertas.push(`La carga se limita por peso: ${pesoKg.toLocaleString('es-CR')} kg requieren ${porPeso} ${e.nombre.toLowerCase()}(s).`)
    if (porPiso > Math.max(porVolumen, porPeso)) alertas.push('Hay bultos no apilables: se necesitan más unidades por espacio de piso.')
    if (contenedores > 1) alertas.push(`Se necesitan ${contenedores} unidades de ${e.nombre.toLowerCase()}.`)
    if (equipo !== 'TRAILER' && pesoKg / contenedores > 20000) alertas.push('Más de 20 t por contenedor puede exceder el peso permitido en carretera en Costa Rica: confirmar con el transportista.')
  }
  if (modo === 'LCL' && volumenM3 > 15) alertas.push('Con más de 15 m³, un contenedor completo suele ser más conveniente que carga consolidada.')
  if (modo === 'AEREO') {
    const alto = Math.max(0, ...productos.map((p) => p.bultos?.altoCm ?? 0))
    if (alto > ALTO_MAX_AEREO_PASAJEROS_CM) alertas.push(`Hay bultos de ${alto} cm de alto: requieren avión carguero.`)
    if (volumenM3 * FACTOR_AEREO > pesoKg) alertas.push('La carga es voluminosa: el aéreo cobra por peso volumétrico.')
  }
  return { volumenM3, pesoKg, bultos, pesoCobrableAereo, wm, equipo, contenedores, ocupacionVolumen, ocupacionPeso, alertas, compatible }
}

// ---------------------------------------------------------------- Incoterms

/** Conceptos que el proveedor incluye en su precio, según el Incoterm. */
function cubiertoPorProveedor(e: Embarque): Set<string> {
  const s = new Set<string>()
  const add = (...ids: string[]) => ids.forEach((i) => s.add(i))
  const t = e.incoterm
  if (t === 'EXW') return s
  add('carga') // desde FCA el proveedor carga en su bodega
  add('despacho_export')
  if (t === 'FCA') return s
  add('transporte_origen', 'documentacion', 'consolidacion')
  if (t === 'FAS') return s
  add('thc_origen', 'sellos')
  if (t === 'FOB') return s
  add('flete', 'recargos')
  if (t === 'CFR' || t === 'CPT') return s
  if (t !== 'DAP' && t !== 'DPU' && t !== 'DDP') { add('seguro'); return s }
  add('seguro')
  const enBodega = (e.entregaDestino ?? 'bodega') === 'bodega'
  if (enBodega) add('thc_destino', 'doc_llegada', 'desconsolidacion', 'almacen_fiscal', 'movilizacion', 'transporte_nacional', 'peajes')
  if (t === 'DPU') add('descarga_personal', 'montacargas', ...(enBodega ? [] : ['thc_destino']))
  if (t === 'DDP') add('impuestos', 'honorarios', 'coordinacion', 'permisos', ...(enBodega ? [] : []))
  return s
}

export function incotermCompatible(t: Incoterm, m: Modo) {
  return !INCOTERMS[t].soloMaritimo || esMaritimo(m)
}

// ---------------------------------------------------------------- Conceptos

function construirConceptos(e: Embarque, productos: Producto[], carga: Carga): Concepto[] {
  const m = e.modo
  const fcl = esFCL(m)
  const lcl = m === 'LCL'
  const aereo = m === 'AEREO'
  const terrestre = m === 'TERRESTRE'
  const multimodal = m === 'MULTIMODAL'
  const n = Math.max(1, carga.contenedores)
  const v = Math.max(1, carga.volumenM3)
  const R = REF
  const t = e.origen.flete
  const unidad = fcl || terrestre

  const L: Concepto[] = []
  const add = (x: Omit<Concepto, 'enValorAduanero'> & { enValorAduanero?: boolean }) =>
    L.push({ enValorAduanero: x.etapa <= 3, ...x })
  const est = (monto: number | null): { estado: EstadoConcepto; monto: number | null } =>
    monto === null ? { estado: 'pendiente', monto: null } : { estado: 'estimado', monto }

  // Etapa 1 – Bodega del proveedor
  add({ id: 'carga', etapa: 1, nombre: 'Carga en bodega del proveedor (personal y equipos)', ...est(unidad ? R.origen.cargaEnBodegaPorContenedor * n : 0), base: 'volumen', nota: unidad ? undefined : 'Normalmente incluida en la recolección de carga suelta' })
  if (!unidad) L[L.length - 1].estado = 'incluido_en_otro'
  add({ id: 'embalaje', etapa: 1, nombre: 'Embalaje adicional y paletización', ...(e.embalajeAdicional ? est(null) : { estado: 'no_aplica', monto: 0 }), base: 'volumen' })
  add({ id: 'inspeccion', etapa: 1, nombre: 'Inspección de mercancía en origen', ...(e.inspeccionOrigen ? est(null) : { estado: 'no_aplica', monto: 0 }), base: 'valor' })

  // Etapa 2 – Logística en origen
  add({ id: 'transporte_origen', etapa: 2, nombre: aereo ? 'Recolección y transporte al aeropuerto' : terrestre ? 'Recolección en bodega del proveedor' : 'Recolección y transporte al puerto', ...est(unidad ? R.origen.recoleccionPorContenedor * n : R.origen.recoleccionCargaSueltaBase + R.origen.recoleccionCargaSueltaPorM3 * v), base: 'volumen' })
  add({ id: 'consolidacion', etapa: 2, nombre: 'Consolidación de mercancía', estado: lcl ? 'incluido_en_otro' : 'no_aplica', monto: 0, base: 'volumen', nota: lcl ? 'Incluida en la tarifa LCL' : undefined })
  add({ id: 'despacho_export', etapa: 2, nombre: 'Despacho aduanero de exportación', ...est(R.origen.despachoExportacion), base: 'valor' })
  add({ id: 'documentacion', etapa: 2, nombre: 'Documentación de exportación (BL/AWB/CMR)', ...est(R.origen.documentacion), base: 'valor' })
  add({ id: 'thc_origen', etapa: 2, nombre: aereo ? 'Manejo aeroportuario en origen' : 'Manejo portuario y THC de origen', ...(terrestre ? { estado: 'no_aplica' as const, monto: 0 } : est(fcl ? R.origen.thcPorContenedor * n : R.origen.thcPorM3 * v)), base: 'volumen' })
  add({ id: 'sellos', etapa: 2, nombre: 'Sellos y gastos del contenedor', ...(fcl ? est(R.origen.sellos * n) : { estado: 'no_aplica' as const, monto: 0 }), base: 'volumen' })

  // Etapa 3 – Transporte internacional
  let flete: number | null
  let baseFlete: Base = 'volumen'
  if (multimodal) flete = null
  else if (lcl) flete = carga.wm * t.lclPorWM
  else if (m === 'FCL20') flete = t.fcl20 * n
  else if (m === 'FCL40') flete = t.fcl40 * n
  else if (m === 'FCL40HC') flete = t.fcl40hc * n
  else if (aereo) { flete = Math.max(t.aereoMinimo, carga.pesoCobrableAereo * t.aereoPorKg); baseFlete = 'peso' }
  else flete = t.terrestre === null ? null : t.terrestre * n
  add({ id: 'flete', etapa: 3, nombre: `Flete internacional (${MODOS[m]})`, ...est(flete), base: baseFlete, nota: flete === null ? 'Sin tarifa de referencia para esta ruta: pedir cotización' : undefined })
  add({ id: 'recargos', etapa: 3, nombre: 'Recargos (combustible, temporada, seguridad)', ...est(flete === null ? null : flete * R.internacional.recargoCombustiblePct), base: baseFlete })
  const valorTotal = productos.reduce((s, p) => s + p.cantidad * p.valorUnitario, 0)
  add({ id: 'seguro', etapa: 3, nombre: 'Seguro internacional de carga', ...(e.seguro ? est(Math.max(R.seguro.minimo, (valorTotal + (flete ?? 0)) * R.seguro.pct)) : { estado: 'no_aplica' as const, monto: 0 }), base: 'valor' })

  // Etapa 4 – Logística en destino
  add({ id: 'thc_destino', etapa: 4, nombre: aereo ? 'Manejo aeroportuario en destino' : 'Manejo portuario y THC de destino', ...(terrestre ? { estado: 'no_aplica' as const, monto: 0 } : est(aereo ? R.destino.manejoAereoPorKg * carga.pesoCobrableAereo : fcl ? R.destino.thcPorContenedor * n : R.destino.thcPorM3 * v)), base: aereo ? 'peso' : 'volumen' })
  add({ id: 'doc_llegada', etapa: 4, nombre: 'Documentación de llegada (liberación de BL/guía)', ...est(R.destino.documentacionLlegada), base: 'valor' })
  add({ id: 'desconsolidacion', etapa: 4, nombre: 'Desconsolidación', ...(lcl ? est(R.destino.desconsolidacionBase + R.destino.desconsolidacionPorM3 * v) : { estado: 'no_aplica' as const, monto: 0 }), base: 'volumen' })
  add({ id: 'almacen_fiscal', etapa: 4, nombre: 'Almacén fiscal y manipulación', ...est(R.destino.almacenFiscalBase + R.destino.almacenFiscalPorM3 * v), base: 'volumen' })
  add({ id: 'movilizacion', etapa: 4, nombre: 'Movilización de contenedores', ...(fcl ? est(R.destino.movilizacionContenedor * n) : { estado: 'no_aplica' as const, monto: 0 }), base: 'volumen' })
  add({ id: 'inspecciones', etapa: 4, nombre: 'Inspecciones (aforo físico, MAG, Salud)', estado: 'no_aplica', monto: 0, base: 'valor', nota: 'Si Aduanas asigna revisión física se cotiza aparte' })

  // Etapa 5 – Nacionalización (los impuestos se calculan por producto aparte)
  add({ id: 'honorarios', etapa: 5, nombre: 'Honorarios de agencia aduanal', ...est(null), base: 'valor', enValorAduanero: false })
  add({ id: 'coordinacion', etapa: 5, nombre: 'Servicios de coordinación logística', ...est(R.nacionalizacion.coordinacion), base: 'valor', enValorAduanero: false })
  const conPermiso = productos.some((p) => p.requierePermiso)
  add({ id: 'permisos', etapa: 5, nombre: 'Permisos y notas técnicas', ...(conPermiso ? est(null) : { estado: 'no_aplica' as const, monto: 0 }), base: 'directo', enValorAduanero: false })

  // Etapa 6 – Transporte nacional
  const gam = e.zona === 'GAM'
  const nac = terrestre ? null : unidad
    ? (gam ? R.nacional.contenedorGAM : R.nacional.contenedorFueraGAM) * n
    : (gam ? R.nacional.cargaSueltaBaseGAM : R.nacional.cargaSueltaBaseFueraGAM) + (gam ? R.nacional.cargaSueltaPorM3GAM : R.nacional.cargaSueltaPorM3FueraGAM) * v
  add({ id: 'transporte_nacional', etapa: 6, nombre: 'Transporte hasta la bodega del cliente', ...(terrestre ? { estado: 'incluido_en_otro' as const, monto: 0 } : est(nac)), base: 'volumen', enValorAduanero: false, nota: terrestre ? 'El tráiler internacional entrega en la bodega' : undefined })
  add({ id: 'peajes', etapa: 6, nombre: 'Peajes y recargo de combustible', estado: 'incluido_en_otro', monto: 0, base: 'volumen', enValorAduanero: false, nota: 'Incluidos en la tarifa de transporte nacional' })
  add({ id: 'custodia', etapa: 6, nombre: 'Custodia o transporte especializado', ...(e.custodia ? est(null) : { estado: 'no_aplica' as const, monto: 0 }), base: 'valor', enValorAduanero: false })

  // Etapa 7 – Descarga y cierre
  const desc = e.requiereDescarga
  add({ id: 'descarga_personal', etapa: 7, nombre: 'Personal de descarga', ...(desc ? est(unidad ? R.descarga.personalPorContenedor * n : R.descarga.personalCargaSueltaPorM3 * v) : { estado: 'no_aplica' as const, monto: 0 }), base: 'volumen', enValorAduanero: false })
  add({ id: 'montacargas', etapa: 7, nombre: 'Montacargas o equipo de descarga', ...(desc && !e.clienteTieneMontacargas ? est(R.descarga.montacargasServicio * (unidad ? n : 1)) : { estado: 'no_aplica' as const, monto: 0 }), base: 'peso', enValorAduanero: false, nota: desc && e.clienteTieneMontacargas ? 'El cliente tiene montacargas' : undefined })
  add({ id: 'espera', etapa: 7, nombre: 'Tiempo de espera del transportista', estado: 'no_aplica', monto: 0, base: 'volumen', enValorAduanero: false, nota: 'Se cobra si la descarga supera el tiempo libre' })
  add({ id: 'devolucion', etapa: 7, nombre: 'Retiro y devolución del contenedor vacío', ...(fcl && e.requiereDevolucionContenedor ? est(R.descarga.devolucionContenedor * n) : { estado: 'no_aplica' as const, monto: 0 }), base: 'volumen', enValorAduanero: false })

  // Incoterm: lo que paga el proveedor queda incluido en su precio
  const cubierto = cubiertoPorProveedor(e)
  for (const k of L) if (cubierto.has(k.id) && k.estado !== 'no_aplica') { k.estado = 'incluido'; k.monto = 0 }

  // Ajustes manuales (tarifas confirmadas, cambios de estado o de base)
  for (const k of L) {
    const a = e.ajustes?.[k.id]
    if (!a) continue
    if (a.base) k.base = a.base
    if (a.productoDirecto) k.productoDirecto = a.productoDirecto
    if (a.estado) k.estado = a.estado
    if (a.monto !== undefined) k.monto = a.monto
    if (k.estado === 'pendiente') k.monto = null
    if (k.estado === 'no_aplica' || k.estado === 'incluido' || k.estado === 'incluido_en_otro') k.monto = 0
  }
  return L
}

const cuenta = (k: Concepto) => (k.estado === 'estimado' || k.estado === 'confirmado') && k.monto !== null

function pesosPara(base: Base, productos: Producto[], aereo: boolean, directo?: string): number[] {
  return productos.map((p) => {
    switch (base) {
      case 'valor': return p.cantidad * p.valorUnitario
      case 'peso': return aereo ? Math.max(p.pesoBrutoKg, volumenProducto(p) * FACTOR_AEREO) : p.pesoBrutoKg
      case 'volumen': return volumenProducto(p)
      case 'unidades': return p.cantidad
      case 'directo': return directo ? (p.id === directo ? 1 : 0) : (p.requierePermiso ? 1 : 0)
    }
  })
}

// ---------------------------------------------------------------- Motor

export function calcularLanded(e: Embarque, productos: Producto[]): ResultadoLanded {
  const carga = cubicar(productos, e.modo)
  const conceptos = construirConceptos(e, productos, carga)
  const aereo = e.modo === 'AEREO'
  const supuestos: string[] = []
  const pendientes: string[] = []
  const N = productos.length
  const vacio = (): Record<Etapa, number> => ({ 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0 })

  // Asignación de conceptos por producto (centavos)
  const asign = productos.map(() => ({ etapa: vacio(), aduanero: 0 }))
  const repartirConcepto = (k: Concepto) => {
    const partes = repartir(c(k.monto ?? 0), pesosPara(k.base, productos, aereo, k.productoDirecto))
    partes.forEach((x, i) => { asign[i].etapa[k.etapa] += x; if (k.enValorAduanero) asign[i].aduanero += x })
  }
  for (const k of conceptos) if (k.id !== 'honorarios' && cuenta(k)) repartirConcepto(k)

  // Valor aduanero (CIF) e impuestos por producto
  const ddp = e.incoterm === 'DDP'
  const productosRes: ResultadoProducto[] = productos.map((p, i) => {
    const valor = c(p.cantidad * p.valorUnitario)
    const va = valor + asign[i].aduanero
    const cl = p.clasificacion
    const pend: string[] = []
    const imp: ImpuestosProducto = { dai: null, sc: null, ley6946: null, iva: null, otros: null, tasaDAIAplicada: null, ahorroTLC: null, pendientes: pend }
    if (ddp) {
      imp.dai = imp.sc = imp.ley6946 = imp.iva = imp.otros = 0
    } else if (!cl) {
      pend.push('Clasificación arancelaria')
    } else {
      let tDai = cl.dai
      const prefValida = p.certificadoOrigen && cl.estado === 'validada' && p.daiPreferencial != null
      if (prefValida) tDai = p.daiPreferencial!
      if (cl.dai != null && p.daiPreferencial != null && p.daiPreferencial < cl.dai) imp.ahorroTLC = u(Math.round(va * (cl.dai - p.daiPreferencial)))
      imp.tasaDAIAplicada = tDai
      const dai = tDai == null ? null : Math.round(va * tDai)
      const sc = cl.sc == null || dai == null ? null : Math.round((va + dai) * cl.sc)
      const l6946 = PAISES_CA.includes(p.paisFabricacion) ? 0 : Math.round(va * 0.01)
      const otros = cl.otros == null ? null : Math.round(va * cl.otros)
      const iva = cl.iva == null || dai == null || sc == null || otros == null ? null : Math.round((va + dai + sc + l6946 + otros) * cl.iva)
      if (dai == null) pend.push('DAI')
      if (sc == null) pend.push('Selectivo de consumo')
      if (otros == null) pend.push('Otros impuestos')
      if (iva == null) pend.push('IVA')
      imp.dai = dai == null ? null : u(dai)
      imp.sc = sc == null ? null : u(sc)
      imp.ley6946 = u(l6946)
      imp.otros = otros == null ? null : u(otros)
      imp.iva = iva == null ? null : u(iva)
    }
    if (pend.length) pendientes.push(`Impuestos de ${p.sku}: ${pend.join(', ')} por validar`)
    return {
      id: p.id, sku: p.sku, nombre: p.nombre, cantidad: p.cantidad, valorMercancia: u(valor),
      volumenM3: volumenProducto(p), pesoKg: p.pesoBrutoKg, logistica: 0, porEtapa: vacio(),
      valorAduanero: u(va), impuestos: imp, impuestosTotal: 0, landedTotal: 0, landedUnitario: 0,
      ivaRecuperable: 0, landedTotalSinIVA: 0, landedUnitarioSinIVA: 0, completo: pend.length === 0,
    }
  })

  // Honorarios: % del valor aduanero total con mínimo, repartido por valor aduanero
  const hon = conceptos.find((k) => k.id === 'honorarios')!
  if (hon.estado === 'pendiente' && !e.ajustes?.honorarios) {
    const vaTotal = productosRes.reduce((s, p) => s + p.valorAduanero, 0)
    hon.estado = 'estimado'
    hon.monto = Math.max(REF.nacionalizacion.honorariosMinimo, vaTotal * REF.nacionalizacion.honorariosPctValorAduanero)
  }
  if (cuenta(hon)) {
    const partes = hon.base === 'valor' ? repartir(c(hon.monto!), productosRes.map((p) => p.valorAduanero)) : repartir(c(hon.monto!), pesosPara(hon.base, productos, aereo, hon.productoDirecto))
    partes.forEach((x, i) => { asign[i].etapa[5] += x })
  }

  for (const k of conceptos) if (k.estado === 'pendiente') pendientes.unshift(`${ETAPAS[k.etapa]}: ${k.nombre}`)

  // Totales por producto
  for (let i = 0; i < N; i++) {
    const r = productosRes[i]
    const imp = r.impuestos
    const impC = [imp.dai, imp.sc, imp.ley6946, imp.iva, imp.otros].reduce<number>((s, x) => s + c(x ?? 0), 0)
    const log = Object.values(asign[i].etapa).reduce((a, b) => a + b, 0)
    r.porEtapa = Object.fromEntries(Object.entries(asign[i].etapa).map(([k, x]) => [k, u(x)])) as Record<Etapa, number>
    r.logistica = u(log)
    r.impuestosTotal = u(impC)
    const total = c(r.valorMercancia) + log + impC
    r.landedTotal = u(total)
    r.ivaRecuperable = imp.iva ?? 0
    r.landedTotalSinIVA = u(total - c(r.ivaRecuperable))
    r.landedUnitario = r.cantidad ? Math.round(total / r.cantidad) / 100 : 0
    r.landedUnitarioSinIVA = r.cantidad ? Math.round((total - c(r.ivaRecuperable)) / r.cantidad) / 100 : 0
  }

  // Totales del embarque (suma exacta de los SKU)
  const sum = (f: (p: ResultadoProducto) => number) => u(productosRes.reduce((s, p) => s + c(f(p)), 0))
  const mercancia = sum((p) => p.valorMercancia)
  const logistica = sum((p) => p.logistica)
  const impuestos = sum((p) => p.impuestosTotal)
  const ivaRecuperable = sum((p) => p.ivaRecuperable)
  const total = sum((p) => p.landedTotal)
  const porEtapa = Object.fromEntries(([1, 2, 3, 4, 5, 6, 7] as Etapa[]).map((et) => [et, {
    total: sum((p) => p.porEtapa[et]),
    pendientes: conceptos.filter((k) => k.etapa === et && k.estado === 'pendiente').length,
  }])) as ResultadoLanded['porEtapa']
  const estimados = conceptos.filter((k) => k.estado === 'estimado').reduce((s, k) => s + (k.monto ?? 0), 0)

  // Supuestos
  if (['DAP', 'DPU', 'DDP'].includes(e.incoterm)) supuestos.push('Con términos D, el valor aduanero puede excluir los gastos posteriores a la llegada si la factura los separa; aquí se usa el valor facturado.')
  if (!e.seguro) supuestos.push('Sin seguro contratado: el valor aduanero no incluye prima de seguro.')
  if (productos.some((p) => p.clasificacion?.estado !== 'validada')) supuestos.push('Hay clasificaciones preliminares: el agente aduanero debe validarlas.')
  if (productos.some((p) => p.certificadoOrigen && p.daiPreferencial == null)) supuestos.push('Hay productos con certificado de origen sin tasa preferencial validada: se aplica el DAI general.')
  supuestos.push('Tarifas logísticas referenciales: no son ofertas de proveedores.')

  const incotermOk = incotermCompatible(e.incoterm, e.modo)
  if (!incotermOk) pendientes.push(`El Incoterm ${e.incoterm} es solo para transporte marítimo`)
  if (!carga.compatible) pendientes.push('La carga no cabe en el equipo elegido')

  return {
    conceptos, productos: productosRes, carga, porEtapa,
    totales: {
      mercancia, logistica, impuestos, ivaRecuperable, total,
      totalSinIVA: u(c(total) - c(ivaRecuperable)), desembolso: total,
      rango: { min: u(c(total) - c(estimados * 0.1)), max: u(c(total) + c(estimados * 0.2)) },
    },
    pendientes, supuestos,
    estado: pendientes.length ? 'incompleta' : 'estimada',
    tiempo: tiempos(e),
    incotermCompatible: incotermOk,
  }
}

export function tiempos(e: Embarque): { etapas: EtapaTiempo[]; dias: number } {
  const transito = e.modo === 'AEREO' ? e.origen.dias.aereo : e.modo === 'TERRESTRE' ? (e.origen.dias.terrestre ?? e.origen.dias.maritimo) : e.origen.dias.maritimo
  const etapas: EtapaTiempo[] = []
  let d = 0
  const paso = (nombre: string, dias: number) => { etapas.push({ nombre, inicio: d, dias }); d += dias }
  paso('Producción y disponibilidad en origen', e.diasProduccion)
  paso('Recolección y carga en bodega del proveedor', DIAS.recoleccion)
  paso('Logística y despacho de exportación', DIAS.exportacion)
  const inicioTransito = d
  paso(e.modo === 'AEREO' ? 'Vuelo a Costa Rica' : e.modo === 'TERRESTRE' ? 'Tránsito terrestre' : 'Tránsito internacional', transito)
  etapas.push({ nombre: 'Preparación anticipada de la declaración (en paralelo)', inicio: inicioTransito, dias: Math.min(3, transito), paralelo: true })
  paso('Arribo y logística en destino', DIAS.arriboADescarga)
  paso('Nacionalización y pago de impuestos', DIAS.nacionalizacion)
  paso('Transporte nacional', DIAS.transporteNacional)
  paso('Descarga en bodega del cliente', DIAS.descarga)
  if (esFCL(e.modo) && e.requiereDevolucionContenedor) etapas.push({ nombre: 'Devolución del contenedor vacío (en paralelo)', inicio: d, dias: 1, paralelo: true })
  return { etapas, dias: d }
}

/** Compara las modalidades compatibles con la carga y la ruta. */
export function compararModalidades(e: Embarque, productos: Producto[]) {
  const modos: Modo[] = ['LCL', 'FCL20', 'FCL40', 'FCL40HC', 'AEREO', 'TERRESTRE']
  return modos
    .filter((m) => m !== 'TERRESTRE' || e.origen.flete.terrestre !== null)
    .map((m) => {
      const r = calcularLanded({ ...e, modo: m, ajustes: {} }, productos)
      const flete = r.conceptos.find((k) => k.id === 'flete')
      return {
        modo: m,
        compatible: r.carga.compatible && incotermCompatible(e.incoterm, m),
        total: r.totales.total,
        logistica: r.totales.logistica,
        dias: r.tiempo.dias,
        contenedores: r.carga.contenedores,
        fletePendiente: flete?.estado === 'pendiente',
        alertas: r.carga.alertas,
      }
    })
}
