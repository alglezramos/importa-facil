/**
 * PARÁMETROS LOGÍSTICOS DE REFERENCIA
 * ---------------------------------------------------------------
 * Todos los montos son REFERENCIALES (USD) para cotizaciones estimadas.
 * No son ofertas de ningún proveedor. Reemplázalos por tarifas reales
 * con su fuente y vigencia antes de emitir cotizaciones formales.
 */

export const VIGENCIA_TARIFAS = { fuente: 'valores de referencia internos de ejemplo, no ofertas vigentes de proveedores', actualizado: '2026-11-24' }

export type Equipo = 'FCL20' | 'FCL40' | 'FCL40HC' | 'TRAILER'

/** Medidas internas y carga útil aproximadas de cada equipo. */
export const EQUIPOS: Record<Equipo, { nombre: string; largo: number; ancho: number; alto: number; puertaAlto: number; volumen: number; cargaUtilKg: number }> = {
  FCL20: { nombre: 'Contenedor 20 pies', largo: 5.9, ancho: 2.35, alto: 2.39, puertaAlto: 2.28, volumen: 33.2, cargaUtilKg: 28000 },
  FCL40: { nombre: 'Contenedor 40 pies', largo: 12.03, ancho: 2.35, alto: 2.39, puertaAlto: 2.28, volumen: 67.7, cargaUtilKg: 26500 },
  FCL40HC: { nombre: 'Contenedor 40 pies High Cube', largo: 12.03, ancho: 2.35, alto: 2.69, puertaAlto: 2.58, volumen: 76.3, cargaUtilKg: 26400 },
  TRAILER: { nombre: 'Tráiler terrestre 48 pies', largo: 14.6, ancho: 2.45, alto: 2.6, puertaAlto: 2.5, volumen: 85, cargaUtilKg: 22000 },
}

/** Aprovechamiento realista del volumen al estibar cajas. */
export const FACTOR_ESTIBA = 0.85

/** Peso volumétrico aéreo (kg por m³). */
export const FACTOR_AEREO = 167

/** Medida máxima de un bulto en avión de pasajeros (cm de alto), por encima suele requerir carguero. */
export const ALTO_MAX_AEREO_PASAJEROS_CM = 160

/** Costos de referencia por concepto (USD). */
export const REF = {
  origen: {
    recoleccionPorContenedor: 350,
    recoleccionCargaSueltaBase: 120,
    recoleccionCargaSueltaPorM3: 15,
    cargaEnBodegaPorContenedor: 120,
    despachoExportacion: 120,
    documentacion: 60,
    thcPorContenedor: 180,
    thcPorM3: 12,
    sellos: 25,
  },
  internacional: {
    recargoCombustiblePct: 0.08,
  },
  destino: {
    thcPorContenedor: 260,
    thcPorM3: 15,
    documentacionLlegada: 90,
    desconsolidacionBase: 90,
    desconsolidacionPorM3: 18,
    almacenFiscalBase: 60,
    almacenFiscalPorM3: 6,
    movilizacionContenedor: 140,
    manejoAereoPorKg: 0.12,
  },
  /** Tarifario LANDEX aprobado por Ale el 26-11-2026. */
  nacionalizacion: {
    /** Agenciamiento: 0,6 % del valor aduanero hasta USD 25 000 y 0,45 % sobre el excedente, mínimo USD 150. */
    honorariosPctTramo1: 0.006,
    honorariosTopeTramo1: 25000,
    honorariosPctTramo2: 0.0045,
    honorariosMinimo: 150,
    /** Coordinación logística por embarque, cuando LANDEX gestiona flete y transporte. */
    coordinacion: 75,
    /** Gestión de permisos y notas técnicas, por producto que lo requiere (las tasas oficiales se cotizan aparte). */
    permisoPorTramite: 40,
  },
  /** Margen de LANDEX sobre servicios de terceros que coordina (flete, transporte, seguro, descarga…). */
  margenServiciosTerceros: 0.10,
  nacional: {
    contenedorGAM: 650,
    contenedorFueraGAM: 900,
    cargaSueltaBaseGAM: 60,
    cargaSueltaBaseFueraGAM: 110,
    cargaSueltaPorM3GAM: 12,
    cargaSueltaPorM3FueraGAM: 18,
  },
  descarga: {
    personalPorContenedor: 150,
    personalCargaSueltaPorM3: 6,
    montacargasServicio: 180,
    devolucionContenedor: 220,
  },
  seguro: { pct: 0.006, minimo: 35 },
}

export const DIAS = {
  recoleccion: 2,
  exportacion: 2,
  arriboADescarga: 1,
  nacionalizacion: 3,
  transporteNacional: 1,
  descarga: 1,
}

/** Conceptos de servicios de terceros coordinados por LANDEX: llevan el margen de servicio.
 *  No incluye honorarios propios, impuestos ni gastos de puerto y almacén fiscal (se trasladan al costo). */
export const CONCEPTOS_CON_MARGEN = new Set([
  'carga', 'embalaje', 'transporte_origen', 'consolidacion', 'despacho_export', 'documentacion', 'thc_origen', 'sellos',
  'flete', 'recargos', 'inspeccion', 'seguro', 'transporte_nacional', 'peajes', 'custodia', 'descarga_personal', 'montacargas', 'espera', 'devolucion',
])
