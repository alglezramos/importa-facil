// Diez escenarios de aceptación del cotizador (punto 10 de la lista de lanzamiento).
// Revisan la coherencia del motor; los montos de flete y servicios siguen siendo las tarifas de ejemplo.
import { describe, expect, it } from 'vitest'
import { ORIGENES } from '../data/config'
import { calcularLanded, type Clasificacion, type Embarque, type Producto } from './landed'

const cl = (codigo: string, dai: number): Clasificacion => ({ codigo, descripcion: codigo, dai, sc: 0, iva: 0.13, otros: 0, estado: 'validada', fuente: 'prueba (Selectivo 0 % supuesto)' })
const prod = (sku: string, cant: number, precio: number, kg: number, m3: number, c: Clasificacion | null, pais = 'CN', extra: Partial<Producto> = {}): Producto =>
  ({ id: sku, sku, nombre: sku, paisFabricacion: pais, cantidad: cant, valorUnitario: precio, pesoBrutoKg: kg, volumenM3: m3, clasificacion: c, certificadoOrigen: false, ...extra })
const emb = (origenId: string, e: Partial<Embarque>): Embarque => ({
  incoterm: 'EXW', origen: ORIGENES.find((o) => o.id === origenId)!, modo: 'LCL', zona: 'GAM', tipoCambio: 446, diasProduccion: 0,
  seguro: true, requiereDescarga: true, clienteTieneMontacargas: false, requiereDevolucionContenedor: false, ...e,
})

const sillas = cl('9401.39.00.00', 0.15)
const ESC: [string, Embarque, Producto[]][] = [
  ['01 Primera importación China LCL', emb('cn-sur', { modo: 'LCL' }), [prod('SILLA', 200, 45, 2400, 9, sillas)]],
  ['02 Contenedor completo China FOB', emb('cn-este', { modo: 'FCL40', incoterm: 'FOB', requiereDevolucionContenedor: true }), [prod('MUEBLE', 1000, 55, 9000, 55, cl('9403.60.00.00', 0.15))]],
  ['03 Aéreo desde Miami', emb('us-mia', { modo: 'AEREO', incoterm: 'FCA' }), [prod('AUDIF', 500, 8, 150, 0.8, cl('8518.30.00.00', 0))]],
  ['04 Terrestre desde Guatemala', emb('ca', { modo: 'TERRESTRE', incoterm: 'FCA' }), [prod('CAFE', 300, 12, 3000, 6, cl('2101.11.00.00', 0.15), 'GT')]],
  ['05 EXW con recolección en fábrica', emb('cn-sur', { modo: 'FCL20', incoterm: 'EXW' }), [prod('LAMP', 2000, 6, 4000, 25, cl('9405.11.00.00', 0.15))]],
  ['06 CIF con flete incluido', emb('cn-este', { modo: 'FCL20', incoterm: 'CIF' }), [prod('LAMP', 2000, 6, 4000, 25, cl('9405.11.00.00', 0.15))]],
  ['07 Varios SKU', emb('cn-sur', { modo: 'FCL40' }), [prod('SILLA', 300, 45, 3600, 20, sillas), prod('MESA', 100, 80, 3000, 18, cl('9403.60.00.00', 0.15)), prod('LAMP', 500, 6, 1000, 6, cl('9405.11.00.00', 0.15))]],
  ['08 Producto con permiso', emb('us-mia', { modo: 'LCL', incoterm: 'FOB' }), [prod('CREMA', 1000, 3, 600, 2, cl('3304.99.00.00', 0.14), 'US', { requierePermiso: true })]],
  ['09 Sin clasificación (impuestos pendientes)', emb('cn-sur', { modo: 'LCL' }), [prod('X', 100, 10, 200, 1, null)]],
  ['10 DDP (proveedor paga impuestos)', emb('eu', { modo: 'LCL', incoterm: 'DDP' }), [prod('VINO', 600, 9, 900, 2, cl('2204.21.00.00', 0.15), 'ES')]],
]

describe('10 escenarios de aceptación', () => {
  const filas: string[] = []
  for (const [nombre, e, ps] of ESC) {
    it(nombre, () => {
      const r = calcularLanded(e, ps)
      const t = r.totales
      // 1. El total suma sus partes
      expect(Math.abs(t.total - (t.mercancia + t.logistica + t.impuestos))).toBeLessThan(1)
      // 2. Nada negativo
      expect(t.logistica).toBeGreaterThanOrEqual(0); expect(t.impuestos).toBeGreaterThanOrEqual(0)
      // 3. Impuestos por producto según la fórmula (DAI, 1 %, IVA sobre la base acumulada)
      for (const p of r.productos) {
        const i = p.impuestos
        const prodIn = ps.find((x) => x.id === p.id)!
        if (e.incoterm === 'DDP') { expect(i.dai).toBe(0); expect(i.iva).toBe(0); continue }
        if (!prodIn.clasificacion) { expect(i.pendientes).toContain('Clasificación arancelaria'); continue }
        const va = p.valorAduanero
        expect(i.dai).toBeCloseTo(va * prodIn.clasificacion.dai!, 0)
        const ley = ['GT', 'SV', 'HN', 'NI', 'PA', 'CR'].includes(prodIn.paisFabricacion) ? 0 : va * 0.01
        expect(i.ley6946!).toBeCloseTo(ley, 0)
        expect(i.iva!).toBeCloseTo((va + i.dai! + i.sc! + i.ley6946! + i.otros!) * 0.13, 0)
      }
      // 4. Incoterm: con CIF el flete internacional no se cobra al cliente
      if (e.incoterm === 'CIF') expect(r.conceptos.filter((c) => c.etapa <= 3).reduce((a, c) => a + (c.monto ?? 0), 0)).toBe(0)
      if (e.incoterm === 'EXW') expect(r.conceptos.filter((c) => c.etapa === 1 || c.etapa === 2).reduce((a, c) => a + (c.monto ?? 0), 0)).toBeGreaterThan(0)
      filas.push(`${nombre.padEnd(46)} mercancía ${t.mercancia.toFixed(0).padStart(7)} · logística ${t.logistica.toFixed(0).padStart(6)} · impuestos ${t.impuestos.toFixed(0).padStart(6)} · total ${t.total.toFixed(0).padStart(7)} · ${r.estado}${r.pendientes.length ? ` (${r.pendientes.length} pend.)` : ''} · ${r.tiempo.dias} d`)
    })
  }
  it('resumen', () => { console.log('\n' + filas.join('\n')) })
})
