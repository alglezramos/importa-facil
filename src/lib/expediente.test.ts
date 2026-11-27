import { describe, expect, it } from 'vitest'
import { ORIGENES } from '../data/config'
import { confiabilidad } from './confianza'
import { documentosRequeridos } from './expediente'
import { calcularLanded, type Embarque, type Producto } from './landed'

const base: Embarque = {
  incoterm: 'EXW', origen: ORIGENES.find((o) => o.id === 'cn-este')!, modo: 'FCL40', zona: 'GAM', tipoCambio: 505, diasProduccion: 0,
  seguro: true, requiereDescarga: true, clienteTieneMontacargas: false, requiereDevolucionContenedor: true,
}
const p = (c: Partial<Producto> = {}): Producto => ({
  id: 'p1', sku: 'A', nombre: 'Sillas', paisFabricacion: 'CN', cantidad: 100, valorUnitario: 50, pesoBrutoKg: 2000, volumenM3: 20,
  certificadoOrigen: false, clasificacion: { codigo: '9401.39.00.00', descripcion: 'x', dai: 0.14, sc: 0, iva: 0.13, otros: 0, estado: 'preliminar' }, ...c,
})
const ids = (e: Partial<Embarque>, ps: Producto[] = [p()]) => documentosRequeridos({ ...base, ...e }, ps).map((d) => d.id)

describe('expediente de documentos', () => {
  it('siempre pide factura, lista de empaque, transporte, ficha e identificación', () => {
    expect(ids({})).toEqual(expect.arrayContaining(['factura', 'packing', 'transporte', 'ficha', 'importador', 'dua']))
  })
  it('el documento de transporte depende de la modalidad', () => {
    const nombre = (modo: Embarque['modo']) => documentosRequeridos({ ...base, modo }, [p()]).find((d) => d.id === 'transporte')!.nombre
    expect(nombre('FCL40')).toMatch(/BL/)
    expect(nombre('AEREO')).toMatch(/AWB/)
    expect(nombre('TERRESTRE')).toMatch(/Carta de porte/)
  })
  it('quién gestiona el transporte y el seguro depende del Incoterm', () => {
    const d = (incoterm: Embarque['incoterm'], id: string) => documentosRequeridos({ ...base, incoterm }, [p()]).find((x) => x.id === id)!.responsable
    expect(d('FOB', 'transporte')).toBe('landex')
    expect(d('CIF', 'transporte')).toBe('proveedor')
    expect(d('FOB', 'seguro')).toBe('landex')
    expect(d('CIF', 'seguro')).toBe('proveedor')
  })
  it('origen, seguro y permisos solo cuando aplican', () => {
    expect(ids({ seguro: false })).not.toContain('seguro')
    expect(ids({})).not.toContain('origen')
    expect(ids({}, [p({ certificadoOrigen: true })])).toContain('origen')
    expect(ids({}, [p({ requierePermiso: true })])).toContain('permisos')
  })
})

describe('indicador de confiabilidad', () => {
  it('sin tarifas ni validación, todo es estimado', () => {
    const r = calcularLanded(base, [p()])
    const c = confiabilidad(base, [p()], r)
    expect(c.pct).toBe(0)
    expect(c.confirmado).toBe(0)
    expect(c.puntos.find((x) => x.texto.startsWith('Clasificación'))!.ok).toBe(false)
  })
  it('sube al confirmar el flete y validar la clasificación', () => {
    const e = { ...base, ajustes: { flete: { estado: 'confirmado' as const, monto: 3000 } } }
    const ps = [p({ clasificacion: { ...p().clasificacion!, estado: 'validada' } })]
    const r = calcularLanded(e, ps)
    const c = confiabilidad(e, ps, r)
    expect(c.confirmado).toBeCloseTo(3000 * 1.1 + r.totales.impuestos, 2) // flete confirmado + 10 % de margen
    expect(c.pct).toBeGreaterThan(50)
    expect(c.pct).toBeLessThan(100)
  })
  it('los datos aproximados se marcan por confirmar', () => {
    const ps = [p({ datosPorConfirmar: ['volumen aproximado'] })]
    const c = confiabilidad(base, ps, calcularLanded(base, ps))
    expect(c.puntos.find((x) => x.texto.startsWith('Volumen'))!.ok).toBe(false)
  })
})
