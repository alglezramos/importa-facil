/**
 * Alcance del servicio (Fase 1 comercial).
 *
 * Capa de PRESENTACIÓN sobre el resultado del motor: no cambia ninguna fórmula
 * ni monto. Agrupa los conceptos del cálculo en servicios contratables y separa:
 *   - honorarios propios de LANDEX (agencia aduanal y coordinación),
 *   - servicios coordinados por LANDEX con sus socios,
 *   - servicios que el cliente contrató por su cuenta,
 *   - impuestos y gastos de terceros (aduana, puerto, almacén fiscal),
 *   - costos incluidos en el precio del proveedor según el Incoterm.
 * El costo total de la importación es el mismo del motor.
 */
import type { Concepto, ResultadoLanded } from './landed'

export type GrupoServicio =
  | 'recoleccion' | 'transporte_internacional' | 'inspeccion' | 'seguro' | 'gestion_documental'
  | 'transporte_nacional' | 'custodia' | 'descarga' | 'devolucion'

export interface Servicio {
  id: GrupoServicio
  nombre: string
  conceptos: string[]
  ayuda: string
}

/** Servicios complementarios que el cliente puede contratar con LANDEX o por su cuenta. */
export const SERVICIOS: Servicio[] = [
  { id: 'recoleccion', nombre: 'Recolección en fábrica', conceptos: ['carga', 'embalaje', 'transporte_origen', 'consolidacion'], ayuda: 'Retiro de la mercancía en la bodega del proveedor.' },
  { id: 'transporte_internacional', nombre: 'Transporte internacional', conceptos: ['despacho_export', 'documentacion', 'thc_origen', 'sellos', 'flete', 'recargos'], ayuda: 'Exportación en origen y flete hasta Costa Rica.' },
  { id: 'inspeccion', nombre: 'Inspección de mercancía', conceptos: ['inspeccion'], ayuda: 'Revisión de calidad antes del embarque.' },
  { id: 'seguro', nombre: 'Seguro de carga', conceptos: ['seguro'], ayuda: 'Póliza para el trayecto internacional.' },
  { id: 'gestion_documental', nombre: 'Gestión de permisos', conceptos: ['permisos'], ayuda: 'Permisos y notas técnicas ante las instituciones.' },
  { id: 'transporte_nacional', nombre: 'Transporte nacional', conceptos: ['transporte_nacional', 'peajes'], ayuda: 'Del puerto o almacén fiscal hasta tu bodega.' },
  { id: 'custodia', nombre: 'Custodia', conceptos: ['custodia'], ayuda: 'Custodia o transporte especializado.' },
  { id: 'descarga', nombre: 'Descarga', conceptos: ['descarga_personal', 'montacargas', 'espera'], ayuda: 'Personal y equipo para descargar en tu bodega.' },
  { id: 'devolucion', nombre: 'Devolución de contenedores', conceptos: ['devolucion'], ayuda: 'Retiro y devolución del contenedor vacío.' },
]

/** Conceptos que forman los honorarios propios de LANDEX. */
export const HONORARIOS_LANDEX = ['honorarios', 'coordinacion']
/** Cargos de terceros en destino que se pagan por cuenta del cliente (aduana, puerto, almacén). */
export const GASTOS_TERCEROS = ['thc_destino', 'doc_llegada', 'desconsolidacion', 'almacen_fiscal', 'movilizacion', 'inspecciones']

export type Proveedor = 'landex' | 'cliente'

export interface LineaServicio {
  servicio: Servicio
  /** El servicio tiene al menos un concepto que aplica y no viene incluido. */
  aplica: boolean
  /** Todos sus conceptos vienen incluidos en el precio del proveedor (Incoterm) o en otro cargo. */
  incluido: boolean
  proveedor: Proveedor
  monto: number
  pendiente: boolean
}

export interface Desglose {
  total: number
  mercancia: number
  honorariosLandex: number
  honorariosPendiente: boolean
  serviciosLandex: number
  serviciosCliente: number
  impuestos: number
  gastosTerceros: number
  pendientes: number
  lineas: LineaServicio[]
}

const cuenta = (k: Concepto) => k.estado !== 'no_aplica' && k.estado !== 'incluido' && k.estado !== 'incluido_en_otro'
const monto = (k: Concepto) => (cuenta(k) ? k.monto ?? 0 : 0)
const sumar = (cs: Concepto[]) => cs.reduce((a, k) => a + monto(k), 0)

/** Agrupa el resultado del motor según quién presta cada servicio. `externos`: grupos que el cliente ya contrató. */
export function desglosar(r: ResultadoLanded, externos: string[] = []): Desglose {
  const por = new Map(r.conceptos.map((k) => [k.id, k]))
  const de = (ids: string[]) => ids.map((id) => por.get(id)).filter((k): k is Concepto => !!k)

  const lineas: LineaServicio[] = SERVICIOS.map((s) => {
    const cs = de(s.conceptos)
    const activos = cs.filter(cuenta)
    const incluido = cs.length > 0 && cs.every((k) => k.estado === 'incluido' || k.estado === 'incluido_en_otro' || k.estado === 'no_aplica') &&
      cs.some((k) => k.estado === 'incluido' || k.estado === 'incluido_en_otro')
    return {
      servicio: s,
      aplica: activos.length > 0,
      incluido,
      proveedor: externos.includes(s.id) ? 'cliente' : 'landex',
      monto: sumar(cs),
      pendiente: activos.some((k) => k.estado === 'pendiente'),
    }
  })

  const hon = de(HONORARIOS_LANDEX)
  const aplicadas = lineas.filter((l) => l.aplica)
  return {
    total: r.totales.total,
    mercancia: r.totales.mercancia,
    honorariosLandex: sumar(hon),
    honorariosPendiente: hon.some((k) => k.estado === 'pendiente'),
    serviciosLandex: aplicadas.filter((l) => l.proveedor === 'landex').reduce((a, l) => a + l.monto, 0),
    serviciosCliente: aplicadas.filter((l) => l.proveedor === 'cliente').reduce((a, l) => a + l.monto, 0),
    impuestos: r.totales.impuestos,
    gastosTerceros: sumar(de(GASTOS_TERCEROS)),
    pendientes: r.pendientes.length,
    lineas,
  }
}
