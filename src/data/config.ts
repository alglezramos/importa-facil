/**
 * CONFIGURACIÓN DE LA AGENCIA
 * ---------------------------------------------------------------
 * Todos los valores de este archivo son PARÁMETROS EDITABLES.
 * Las tarifas de flete, gastos locales y honorarios son de EJEMPLO:
 * reemplázalos por las tarifas reales de tus forwarders, transportistas
 * y tu lista de precios antes de usar la plataforma con clientes.
 */

export type Modo = 'LCL' | 'FCL20' | 'FCL40' | 'AEREO'

export const MODOS: Record<Modo, string> = {
  LCL: 'Marítimo consolidado (LCL)',
  FCL20: 'Marítimo contenedor 20 pies',
  FCL40: 'Marítimo contenedor 40 pies',
  AEREO: 'Aéreo',
}

export interface TarifaFlete {
  /** USD por W/M (máximo entre m³ y toneladas). Mínimo 1 W/M. */
  lclPorWM: number
  fcl20: number
  fcl40: number
  /** USD por kg cobrable (máximo entre peso real y volumétrico). */
  aereoPorKg: number
  aereoMinimo: number
}

export interface DiasTransito {
  maritimo: number
  aereo: number
}

export interface Origen {
  id: string
  nombre: string
  /** Código de país ISO-2, usado para aplicar tratados (TLC). */
  pais: string
  flete: TarifaFlete
  dias: DiasTransito
  /** Recolección en fábrica + despacho de exportación (solo si compras EXW). */
  costosOrigenEXW: number
  /** Ley 6946 (1% sobre CIF). Se marca exento para orígenes centroamericanos. */
  exentoLey6946: boolean
}

export const ORIGENES: Origen[] = [
  {
    id: 'cn-sur',
    nombre: 'China – Shenzhen / Guangzhou',
    pais: 'CN',
    flete: { lclPorWM: 95, fcl20: 2600, fcl40: 3600, aereoPorKg: 6.5, aereoMinimo: 180 },
    dias: { maritimo: 35, aereo: 7 },
    costosOrigenEXW: 280,
    exentoLey6946: false,
  },
  {
    id: 'cn-este',
    nombre: 'China – Shanghái / Ningbo',
    pais: 'CN',
    flete: { lclPorWM: 100, fcl20: 2700, fcl40: 3700, aereoPorKg: 6.8, aereoMinimo: 180 },
    dias: { maritimo: 38, aereo: 7 },
    costosOrigenEXW: 280,
    exentoLey6946: false,
  },
  {
    id: 'us-mia',
    nombre: 'EE. UU. – Miami',
    pais: 'US',
    flete: { lclPorWM: 85, fcl20: 1900, fcl40: 2500, aereoPorKg: 2.2, aereoMinimo: 90 },
    dias: { maritimo: 8, aereo: 2 },
    costosOrigenEXW: 150,
    exentoLey6946: false,
  },
  {
    id: 'mx',
    nombre: 'México – Manzanillo / CDMX',
    pais: 'MX',
    flete: { lclPorWM: 110, fcl20: 2400, fcl40: 3200, aereoPorKg: 3.5, aereoMinimo: 120 },
    dias: { maritimo: 14, aereo: 3 },
    costosOrigenEXW: 180,
    exentoLey6946: false,
  },
  {
    id: 'eu',
    nombre: 'Europa – Valencia / Rotterdam',
    pais: 'EU',
    flete: { lclPorWM: 120, fcl20: 2800, fcl40: 3800, aereoPorKg: 4.5, aereoMinimo: 150 },
    dias: { maritimo: 25, aereo: 4 },
    costosOrigenEXW: 250,
    exentoLey6946: false,
  },
  {
    id: 'ca',
    nombre: 'Centroamérica (por tierra)',
    pais: 'CA',
    flete: { lclPorWM: 70, fcl20: 1400, fcl40: 1900, aereoPorKg: 2.5, aereoMinimo: 80 },
    dias: { maritimo: 5, aereo: 2 },
    costosOrigenEXW: 120,
    exentoLey6946: true,
  },
]

export interface GastoDestino {
  fijo: number
  /** USD por m³ (marítimo LCL) o por kg (aéreo). */
  variable: number
}

/** Gastos en destino: THC, desconsolidación, manejo, almacén fiscal estimado. */
export const GASTOS_DESTINO: Record<Modo, GastoDestino> = {
  LCL: { fijo: 180, variable: 25 },
  FCL20: { fijo: 450, variable: 0 },
  FCL40: { fijo: 550, variable: 0 },
  AEREO: { fijo: 90, variable: 0.15 },
}

export type Zona = 'GAM' | 'FUERA_GAM'

export const ZONAS: Record<Zona, string> = {
  GAM: 'Gran Área Metropolitana',
  FUERA_GAM: 'Fuera de la GAM',
}

/** Transporte local desde puerto/aeropuerto hasta la bodega del cliente (USD). */
export const TRANSPORTE_LOCAL: Record<Zona, { cargaSuelta: { base: number; porM3: number }; contenedor: number }> = {
  GAM: { cargaSuelta: { base: 60, porM3: 12 }, contenedor: 650 },
  FUERA_GAM: { cargaSuelta: { base: 110, porM3: 18 }, contenedor: 900 },
}

/** Honorarios de la agencia aduanal (USD). */
export const HONORARIOS = {
  porcentajeCIF: 0.006,
  minimo: 120,
  /** Coordinación logística integral (flete + transporte), cuando la agencia la gestiona. */
  coordinacionLogistica: 60,
}

/** Seguro de carga: porcentaje sobre (valor FOB + flete). */
export const SEGURO = { porcentaje: 0.01, minimo: 35 }

/** Días típicos de las etapas en Costa Rica. */
export const DIAS_LOCALES = { despachoAduana: 3, entrega: 1, origenEXW: 3 }

/** Tipo de cambio de referencia (colones por USD). Actualizar con el BCCR. */
export const TIPO_CAMBIO_DEFAULT = 505

/** Factor volumétrico aéreo (kg por m³). */
export const FACTOR_VOLUMETRICO_AEREO = 167

export const AGENCIA = {
  nombre: 'Ramos & Co.',
  eslogan: 'De tu proveedor a tu bodega, con el costo claro desde el inicio',
  whatsapp: '50600000000',
  email: 'cotizaciones@tuagencia.cr',
}
