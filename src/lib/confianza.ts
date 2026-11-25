/**
 * INDICADOR DE CONFIABILIDAD
 * ---------------------------------------------------------------
 * Qué parte de los costos de importación (logística + impuestos, sin la
 * mercancía) está confirmada y qué parte es estimada. Los pendientes no
 * tienen monto y se cuentan aparte. No es una garantía de exactitud.
 */
import type { Embarque, Producto, ResultadoLanded } from './landed'

export interface Punto { texto: string; ok: boolean }
export interface Confianza {
  pct: number
  confirmado: number
  estimado: number
  pendientes: number
  puntos: Punto[]
}

const r2 = (x: number) => Math.round(x * 100) / 100

export function confiabilidad(e: Embarque, productos: Producto[], r: ResultadoLanded): Confianza {
  let confirmado = 0
  let estimado = 0
  for (const k of r.conceptos) {
    if (k.monto == null) continue
    if (k.estado === 'confirmado') confirmado += k.monto
    else if (k.estado === 'estimado') estimado += k.monto
  }
  const clasifOk = productos.length > 0 && productos.every((p) => p.clasificacion?.estado === 'validada')
  const impPend = r.productos.some((x) => x.impuestos.pendientes.length > 0)
  if (clasifOk && !impPend) confirmado += r.totales.impuestos
  else estimado += r.totales.impuestos
  const base = confirmado + estimado
  const estadoDe = (id: string) => r.conceptos.find((k) => k.id === id)?.estado
  const okSi = (id: string) => { const s = estadoDe(id); return s === 'confirmado' || s === 'incluido' || s === 'no_aplica' || s === 'incluido_en_otro' }
  const medidasOk = productos.every((p) => !(p.datosPorConfirmar?.length))
  return {
    pct: base > 0 ? Math.round((confirmado / base) * 100) : 0,
    confirmado: r2(confirmado),
    estimado: r2(estimado),
    pendientes: r.pendientes.length,
    puntos: [
      { texto: 'Qué incluye el precio del proveedor (Incoterm)', ok: !e.incotermPorConfirmar },
      { texto: 'Volumen y peso de la carga', ok: medidasOk },
      { texto: 'Clasificación arancelaria validada por el agente', ok: clasifOk },
      { texto: 'Flete internacional', ok: okSi('flete') },
      { texto: 'Servicios en destino (puerto y almacén fiscal)', ok: ['thc_destino', 'almacen_fiscal'].every(okSi) },
      { texto: 'Transporte hasta tu bodega', ok: okSi('transporte_nacional') },
      { texto: 'Descarga en tu bodega', ok: ['descarga_personal', 'montacargas'].every(okSi) },
    ],
  }
}
