import { NUBE } from './nube'

export interface TipoCambio { fecha: string; venta: number; compra: number; fuente: string; desactualizado?: boolean }

let promesa: Promise<TipoCambio | null> | null = null

/** Tipo de cambio de referencia del BCCR del día (venta y compra), servido por la función tipo-cambio. */
export function cargarTipoCambio(): Promise<TipoCambio | null> {
  if (!promesa) {
    promesa = fetch(`${NUBE.url}/functions/v1/tipo-cambio`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => (d && Number(d.venta) > 0 ? { ...d, venta: Number(d.venta), compra: Number(d.compra) } as TipoCambio : null))
      .catch(() => null)
  }
  return promesa
}
