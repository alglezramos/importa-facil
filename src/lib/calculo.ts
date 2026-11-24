import type { Partida } from '../data/arancel'
import {
  DIAS_LOCALES,
  FACTOR_VOLUMETRICO_AEREO,
  GASTOS_DESTINO,
  HONORARIOS,
  SEGURO,
  TRANSPORTE_LOCAL,
  type Modo,
  type Origen,
  type Zona,
} from '../data/config'

export type Incoterm = 'EXW' | 'FOB' | 'CFR' | 'CIF'

export const INCOTERMS: Record<Incoterm, string> = {
  EXW: 'EXW – en fábrica (tú pagas todo desde la fábrica)',
  FOB: 'FOB – puesto en puerto de origen',
  CFR: 'CFR – incluye flete hasta Costa Rica',
  CIF: 'CIF – incluye flete y seguro hasta Costa Rica',
}

export interface Parametros {
  seguro: { porcentaje: number; minimo: number }
  honorarios: { porcentajeCIF: number; minimo: number; coordinacionLogistica: number }
}

export interface EntradaCotizacion {
  /** Precio pagado al proveedor en USD, según el Incoterm. */
  valorMercaderia: number
  incoterm: Incoterm
  origen: Origen
  modo: Modo
  pesoKg: number
  volumenM3: number
  unidades: number
  partida: Partida
  aplicaTLC: boolean
  zona: Zona
  tipoCambio: number
  diasProduccion: number
  parametros?: Parametros
}

export interface LineaCosto {
  concepto: string
  grupo: 'Mercadería' | 'Logística internacional' | 'Impuestos' | 'Costos en Costa Rica'
  usd: number
  nota?: string
}

export interface Etapa {
  nombre: string
  dias: number
  diaInicio: number
}

export interface ResultadoCotizacion {
  lineas: LineaCosto[]
  valorAduanero: number
  impuestos: { dai: number; sc: number; ley6946: number; iva: number; tasaDAI: number; total: number }
  totalUSD: number
  totalCRC: number
  totalSinIVAUSD: number
  costoUnitarioUSD: number
  costoUnitarioSinIVAUSD: number
  pesoCobrable: number
  etapas: Etapa[]
  diasTotales: number
  documentos: string[]
  advertencias: string[]
}

const r2 = (n: number) => Math.round(n * 100) / 100

/** Flete internacional estimado en USD según origen y modo. */
export function calcularFlete(origen: Origen, modo: Modo, pesoKg: number, volumenM3: number) {
  const t = origen.flete
  switch (modo) {
    case 'LCL': {
      const wm = Math.max(1, volumenM3, pesoKg / 1000)
      return { flete: wm * t.lclPorWM, cobrable: wm }
    }
    case 'FCL20':
      return { flete: t.fcl20, cobrable: 1 }
    case 'FCL40':
      return { flete: t.fcl40, cobrable: 1 }
    case 'AEREO': {
      const kg = Math.max(pesoKg, volumenM3 * FACTOR_VOLUMETRICO_AEREO)
      return { flete: Math.max(t.aereoMinimo, kg * t.aereoPorKg), cobrable: kg }
    }
  }
}

export function tasaDAI(partida: Partida, pais: string, aplicaTLC: boolean): number {
  if (aplicaTLC) {
    const pref = partida.tlc[pais]
    if (pref !== undefined) return pref
  }
  return partida.dai
}

export function cotizar(e: EntradaCotizacion): ResultadoCotizacion {
  const p = e.parametros ?? { seguro: SEGURO, honorarios: HONORARIOS }
  const lineas: LineaCosto[] = []
  const advertencias: string[] = []
  const esContenedor = e.modo === 'FCL20' || e.modo === 'FCL40'

  // 1. Mercadería y costos en origen
  lineas.push({ concepto: `Mercadería (${e.incoterm})`, grupo: 'Mercadería', usd: e.valorMercaderia })

  let costosOrigen = 0
  if (e.incoterm === 'EXW') {
    costosOrigen = e.origen.costosOrigenEXW
    lineas.push({
      concepto: 'Recolección y despacho de exportación en origen',
      grupo: 'Logística internacional',
      usd: costosOrigen,
    })
  }
  const valorFOB = e.valorMercaderia + costosOrigen

  // 2. Flete internacional
  const { flete, cobrable } = calcularFlete(e.origen, e.modo, e.pesoKg, e.volumenM3)
  const proveedorPagaFlete = e.incoterm === 'CFR' || e.incoterm === 'CIF'
  if (!proveedorPagaFlete) {
    lineas.push({ concepto: 'Flete internacional estimado', grupo: 'Logística internacional', usd: flete })
  } else {
    advertencias.push(
      'Con CFR/CIF el proveedor elige la naviera. Pide por escrito los cargos en destino: a veces son más altos que el ahorro en flete.',
    )
  }

  // 3. Seguro
  let seguro = 0
  if (e.incoterm !== 'CIF') {
    const base = proveedorPagaFlete ? e.valorMercaderia : valorFOB + flete
    seguro = Math.max(p.seguro.minimo, base * p.seguro.porcentaje)
    lineas.push({ concepto: 'Seguro de carga', grupo: 'Logística internacional', usd: seguro })
  }

  // 4. Valor aduanero (CIF)
  const valorAduanero = proveedorPagaFlete ? e.valorMercaderia + seguro : valorFOB + flete + seguro

  // 5. Impuestos de importación
  const tDAI = tasaDAI(e.partida, e.origen.pais, e.aplicaTLC)
  const dai = valorAduanero * tDAI
  const sc = (valorAduanero + dai) * e.partida.sc
  const ley6946 = e.origen.exentoLey6946 ? 0 : valorAduanero * 0.01
  const iva = (valorAduanero + dai + sc + ley6946) * e.partida.iva
  const totalImpuestos = dai + sc + ley6946 + iva

  lineas.push({
    concepto: `DAI (${(tDAI * 100).toFixed(0)}%)`,
    grupo: 'Impuestos',
    usd: dai,
    nota: e.aplicaTLC && tDAI !== e.partida.dai ? 'Tasa preferencial por TLC' : undefined,
  })
  if (sc > 0) lineas.push({ concepto: `Selectivo de consumo (${(e.partida.sc * 100).toFixed(0)}%)`, grupo: 'Impuestos', usd: sc })
  lineas.push({ concepto: 'Ley 6946 (1%)', grupo: 'Impuestos', usd: ley6946, nota: e.origen.exentoLey6946 ? 'Exento' : undefined })
  lineas.push({ concepto: `IVA (${(e.partida.iva * 100).toFixed(0)}%)`, grupo: 'Impuestos', usd: iva, nota: 'Acreditable si tu empresa declara IVA' })

  // 6. Costos en Costa Rica
  const g = GASTOS_DESTINO[e.modo]
  const variable = e.modo === 'LCL' ? Math.max(1, e.volumenM3) * g.variable : e.modo === 'AEREO' ? cobrable * g.variable : 0
  const gastosDestino = g.fijo + variable
  lineas.push({ concepto: 'Gastos en destino (manejo, desconsolidación, almacén)', grupo: 'Costos en Costa Rica', usd: gastosDestino })

  const honorarios = Math.max(p.honorarios.minimo, valorAduanero * p.honorarios.porcentajeCIF)
  lineas.push({ concepto: 'Honorarios agencia aduanal', grupo: 'Costos en Costa Rica', usd: honorarios })
  lineas.push({ concepto: 'Coordinación logística', grupo: 'Costos en Costa Rica', usd: p.honorarios.coordinacionLogistica })

  const tl = TRANSPORTE_LOCAL[e.zona]
  const transporte = esContenedor ? tl.contenedor : tl.cargaSuelta.base + Math.max(1, e.volumenM3) * tl.cargaSuelta.porM3
  lineas.push({ concepto: 'Transporte a tu bodega', grupo: 'Costos en Costa Rica', usd: transporte })

  // 7. Totales
  const totalUSD = lineas.reduce((s, l) => s + l.usd, 0)
  const totalSinIVAUSD = totalUSD - iva
  const unidades = Math.max(1, e.unidades)

  // 8. Línea de tiempo
  const transito = e.modo === 'AEREO' ? e.origen.dias.aereo : e.origen.dias.maritimo
  const pasos: Array<[string, number]> = [
    ['Producción del proveedor', e.diasProduccion],
    ...(e.incoterm === 'EXW' ? ([['Recolección y exportación en origen', DIAS_LOCALES.origenEXW]] as Array<[string, number]>) : []),
    [e.modo === 'AEREO' ? 'Vuelo a Costa Rica' : 'Tránsito marítimo', transito],
    ['Desalmacenaje y despacho aduanero', DIAS_LOCALES.despachoAduana],
    ['Entrega en tu bodega', DIAS_LOCALES.entrega],
  ]
  const etapas: Etapa[] = []
  let dia = 0
  for (const [nombre, dias] of pasos) {
    etapas.push({ nombre, dias, diaInicio: dia })
    dia += dias
  }

  // 9. Documentos
  const documentos = [
    'Factura comercial del proveedor',
    'Lista de empaque (packing list)',
    e.modo === 'AEREO' ? 'Guía aérea (AWB)' : 'Conocimiento de embarque (BL)',
    ...(e.aplicaTLC ? ['Certificado o declaración de origen (para el TLC)'] : []),
    ...(e.incoterm !== 'CIF' ? ['Póliza o certificado de seguro'] : []),
    ...e.partida.permisos,
  ]

  if (!e.partida.verificado) {
    advertencias.push('La clasificación y las tasas son preliminares. El agente aduanero debe confirmarlas antes de comprar.')
  }
  if (e.modo === 'LCL' && e.volumenM3 > 15) {
    advertencias.push('Con más de 15 m³, compara contra un contenedor de 20 pies: suele salir más barato.')
  }
  if (e.modo === 'AEREO' && e.volumenM3 * FACTOR_VOLUMETRICO_AEREO > e.pesoKg) {
    advertencias.push('Tu carga es voluminosa: el aéreo cobra por peso volumétrico, no por peso real.')
  }

  return {
    lineas: lineas.map((l) => ({ ...l, usd: r2(l.usd) })),
    valorAduanero: r2(valorAduanero),
    impuestos: { dai: r2(dai), sc: r2(sc), ley6946: r2(ley6946), iva: r2(iva), tasaDAI: tDAI, total: r2(totalImpuestos) },
    totalUSD: r2(totalUSD),
    totalCRC: Math.round(totalUSD * e.tipoCambio),
    totalSinIVAUSD: r2(totalSinIVAUSD),
    costoUnitarioUSD: r2(totalUSD / unidades),
    costoUnitarioSinIVAUSD: r2(totalSinIVAUSD / unidades),
    pesoCobrable: r2(cobrable),
    etapas,
    diasTotales: dia,
    documentos,
    advertencias,
  }
}
