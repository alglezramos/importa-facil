/**
 * CONFIGURACIÓN DE LA AGENCIA
 * ---------------------------------------------------------------
 * Todos los valores de este archivo son PARÁMETROS EDITABLES.
 * Las tarifas de flete, gastos locales y honorarios son de EJEMPLO:
 * reemplázalos por las tarifas reales de tus forwarders, transportistas
 * y tu lista de precios antes de usar la plataforma con clientes.
 */

export type Modo = 'LCL' | 'FCL20' | 'FCL40' | 'FCL40HC' | 'AEREO' | 'TERRESTRE' | 'MULTIMODAL'

export const MODOS: Record<Modo, string> = {
  LCL: 'Marítimo consolidado (LCL)',
  FCL20: 'Marítimo contenedor 20 pies',
  FCL40: 'Marítimo contenedor 40 pies',
  FCL40HC: 'Marítimo contenedor 40 pies High Cube',
  AEREO: 'Aéreo',
  TERRESTRE: 'Terrestre internacional (tráiler)',
  MULTIMODAL: 'Multimodal (requiere cotización)',
}

export interface TarifaFlete {
  /** USD por W/M (máximo entre m³ y toneladas). Mínimo 1 W/M. */
  lclPorWM: number
  fcl20: number
  fcl40: number
  fcl40hc: number
  /** USD por tráiler completo; null si no hay ruta terrestre. */
  terrestre: number | null
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
  dias: DiasTransito & { terrestre?: number }
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
    flete: { lclPorWM: 95, fcl20: 2600, fcl40: 3600, fcl40hc: 3700, terrestre: null, aereoPorKg: 6.5, aereoMinimo: 180 },
    dias: { maritimo: 35, aereo: 7 },
    costosOrigenEXW: 280,
    exentoLey6946: false,
  },
  {
    id: 'cn-este',
    nombre: 'China – Shanghái / Ningbo',
    pais: 'CN',
    flete: { lclPorWM: 100, fcl20: 2700, fcl40: 3700, fcl40hc: 3800, terrestre: null, aereoPorKg: 6.8, aereoMinimo: 180 },
    dias: { maritimo: 38, aereo: 7 },
    costosOrigenEXW: 280,
    exentoLey6946: false,
  },
  {
    id: 'us-mia',
    nombre: 'EE. UU. – Miami',
    pais: 'US',
    flete: { lclPorWM: 85, fcl20: 1900, fcl40: 2500, fcl40hc: 2600, terrestre: null, aereoPorKg: 2.2, aereoMinimo: 90 },
    dias: { maritimo: 8, aereo: 2 },
    costosOrigenEXW: 150,
    exentoLey6946: false,
  },
  {
    id: 'mx',
    nombre: 'México – Manzanillo / CDMX',
    pais: 'MX',
    flete: { lclPorWM: 110, fcl20: 2400, fcl40: 3200, fcl40hc: 3300, terrestre: 4200, aereoPorKg: 3.5, aereoMinimo: 120 },
    dias: { maritimo: 14, aereo: 3 , terrestre: 9 },
    costosOrigenEXW: 180,
    exentoLey6946: false,
  },
  {
    id: 'eu',
    nombre: 'Europa – Valencia / Rotterdam',
    pais: 'EU',
    flete: { lclPorWM: 120, fcl20: 2800, fcl40: 3800, fcl40hc: 3900, terrestre: null, aereoPorKg: 4.5, aereoMinimo: 150 },
    dias: { maritimo: 25, aereo: 4 },
    costosOrigenEXW: 250,
    exentoLey6946: false,
  },
  {
    id: 'ca',
    nombre: 'Centroamérica (por tierra)',
    pais: 'CA',
    flete: { lclPorWM: 70, fcl20: 1400, fcl40: 1900, fcl40hc: 2000, terrestre: 1800, aereoPorKg: 2.5, aereoMinimo: 80 },
    dias: { maritimo: 5, aereo: 2 , terrestre: 4 },
    costosOrigenEXW: 120,
    exentoLey6946: true,
  },
]

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

/** Honorarios de la agencia de aduanas (USD). El cálculo usa REF.nacionalizacion en data/logistica.ts (tarifario 26-11-2026). */
export const HONORARIOS = {
  porcentajeCIF: 0.006,
  minimo: 150,
  /** Coordinación logística integral (flete + transporte), cuando la agencia la gestiona. */
  coordinacionLogistica: 75,
}

/** Seguro de carga: porcentaje sobre (valor FOB + flete). */
export const SEGURO = { porcentaje: 0.01, minimo: 35 }

/** Días típicos de las etapas en Costa Rica. */
export const DIAS_LOCALES = { despachoAduana: 3, entrega: 1, origenEXW: 3 }

/** Respaldo si no se puede consultar el BCCR (venta de referencia del 26-11-2026). El sitio usa el del día automáticamente. */
export const TIPO_CAMBIO_DEFAULT = 446

/** Factor volumétrico aéreo (kg por m³). */
export const FACTOR_VOLUMETRICO_AEREO = 167

/** Identidad de marca. LANDEX es la primera unidad de negocio de Ramos & Co. */
export const MARCA = {
  nombre: 'LANDEX',
  descriptor: 'Landed Cost Intelligence',
  eslogan: 'Importa con inteligencia.',
  propuesta: 'De la fábrica a tu bodega.',
  firma: 'A Ramos & Co. Company',
  empresa: 'Ramos & Co.',
  dominio: 'landex.cr',
}

export const AGENCIA = {
  nombre: 'LANDEX',
  eslogan: 'Importa con inteligencia.',
  /** Número de WhatsApp con código de país (506...). Vacío = no se muestra ningún botón de WhatsApp. */
  whatsapp: '',
  email: 'cotizaciones@landex.cr',
  emailInfo: 'info@landex.cr',
}

/**
 * DATOS CORPORATIVOS Y LEGALES — PENDIENTES DE CONFIGURACIÓN.
 * Solo se publican los campos con valor. No completar con datos supuestos:
 * cada dato debe venir de documentos oficiales de la empresa.
 */
export const EMPRESA: {
  razonSocial: string
  cedulaJuridica: string
  direccion: string
  telefono: string
  agente: { nombre: string; codigo: string }
  experiencia: string
  terminosUrl: string
  privacidadUrl: string
} = {
  razonSocial: '',
  cedulaJuridica: '',
  direccion: 'Edificio Mercedes, San José, Costa Rica',
  telefono: '',
  agente: { nombre: '', codigo: '' },
  experiencia: '',
  terminosUrl: '',
  privacidadUrl: '',
}

/** Lista de datos corporativos aún sin configurar (se muestra solo al personal de LANDEX). */
export const datosFaltantes = (): string[] => [
  !EMPRESA.razonSocial && 'Razón social',
  !EMPRESA.cedulaJuridica && 'Cédula jurídica',
  !EMPRESA.direccion && 'Dirección comercial',
  !EMPRESA.telefono && 'Teléfono',
  !AGENCIA.whatsapp && 'WhatsApp',
  !EMPRESA.agente.nombre && 'Agente aduanero autorizado',
  !EMPRESA.experiencia && 'Experiencia profesional',
  !EMPRESA.terminosUrl && 'Términos y condiciones',
  !EMPRESA.privacidadUrl && 'Política de privacidad',
].filter((x): x is string => !!x)
