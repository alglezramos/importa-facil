import { describe, expect, it } from 'vitest'
import { ORIGENES } from '../data/config'
import { calcularLanded, type Embarque, type Producto } from './landed'
import { desglosar, GASTOS_TERCEROS, HONORARIOS_LANDEX, SERVICIOS } from './servicios'

const ningbo = ORIGENES.find((o) => o.id === 'cn-este')!
const cls = { codigo: '9403.60.00.00', descripcion: 'Muebles', dai: 0.14, sc: 0, iva: 0.13, otros: 0, estado: 'preliminar' as const }
const nova: Producto[] = [{ id: 'p1', sku: 'NOVA-001', nombre: 'Mobiliario', paisFabricacion: 'CN', cantidad: 1000, valorUnitario: 55, pesoBrutoKg: 9000, volumenM3: 55, clasificacion: cls, certificadoOrigen: false }]
const base: Embarque = {
  incoterm: 'EXW', origen: ningbo, modo: 'FCL40', zona: 'GAM', tipoCambio: 505, diasProduccion: 0,
  seguro: true, requiereDescarga: true, clienteTieneMontacargas: false, requiereDevolucionContenedor: true,
}
const redondo = (x: number) => Math.round(x * 100) / 100

describe('Alcance del servicio (capa de presentación)', () => {
  it('cada concepto del motor pertenece a un único grupo', () => {
    const r = calcularLanded(base, nova)
    const grupos = [...SERVICIOS.flatMap((s) => s.conceptos), ...HONORARIOS_LANDEX, ...GASTOS_TERCEROS]
    expect(new Set(grupos).size).toBe(grupos.length)
    for (const k of r.conceptos) expect(grupos).toContain(k.id)
  })

  it('las partes suman exactamente el total del motor (no cambia ninguna cifra)', () => {
    for (const e of [base, { ...base, incoterm: 'CIF' as const }, { ...base, incoterm: 'DAP' as const, modo: 'LCL' as const }]) {
      const r = calcularLanded(e, nova)
      const d = desglosar(r)
      const suma = d.mercancia + d.honorariosLandex + d.serviciosLandex + d.serviciosCliente + d.impuestos + d.gastosTerceros
      expect(redondo(suma)).toBe(redondo(r.totales.total))
      expect(d.total).toBe(r.totales.total)
    }
  })

  it('marcar un servicio como contratado por el cliente solo lo cambia de columna', () => {
    const r = calcularLanded(base, nova)
    const a = desglosar(r)
    const b = desglosar(r, ['transporte_internacional'])
    const flete = a.lineas.find((l) => l.servicio.id === 'transporte_internacional')!.monto
    expect(flete).toBeGreaterThan(0)
    expect(redondo(b.serviciosCliente)).toBe(redondo(flete))
    expect(redondo(b.serviciosLandex)).toBe(redondo(a.serviciosLandex - flete))
    expect(b.total).toBe(a.total)
  })

  it('con CIF el flete aparece como incluido por el proveedor, no como servicio', () => {
    const d = desglosar(calcularLanded({ ...base, incoterm: 'CIF' }, nova))
    const ti = d.lineas.find((l) => l.servicio.id === 'transporte_internacional')!
    expect(ti.aplica).toBe(false)
    expect(ti.incluido).toBe(true)
    expect(ti.monto).toBe(0)
  })

  it('los honorarios de LANDEX no incluyen la mercancía ni los impuestos', () => {
    const r = calcularLanded(base, nova)
    const d = desglosar(r)
    expect(d.honorariosLandex).toBeGreaterThan(0)
    expect(d.honorariosLandex).toBeLessThan(r.totales.mercancia)
    expect(d.honorariosLandex + d.serviciosLandex).toBeLessThan(r.totales.total - r.totales.mercancia - r.totales.impuestos + 0.01)
  })
})
