import { describe, expect, it } from 'vitest'
import { ORIGENES } from '../data/config'
import { calcularLanded, compararModalidades, cubicar, repartir, type Embarque, type Producto, honorariosAgencia } from './landed'

const ningbo = ORIGENES.find((o) => o.id === 'cn-este')!
const miami = ORIGENES.find((o) => o.id === 'us-mia')!
const ca = ORIGENES.find((o) => o.id === 'ca')!

const cls = (codigo: string, dai: number | null, extra: Partial<Producto['clasificacion']> = {}) =>
  ({ codigo, descripcion: codigo, dai, sc: 0, iva: 0.13, otros: 0, estado: 'preliminar' as const, ...extra })

const base: Embarque = {
  incoterm: 'EXW', origen: ningbo, modo: 'FCL40', zona: 'GAM', tipoCambio: 505, diasProduccion: 0,
  seguro: true, requiereDescarga: true, clienteTieneMontacargas: false, requiereDevolucionContenedor: true,
}

// Caso obligatorio: NOVA HOME CR
const nova: Producto[] = [{
  id: 'p1', sku: 'NOVA-001', nombre: 'Mobiliario para el hogar', paisFabricacion: 'CN', cantidad: 1000,
  valorUnitario: 55, pesoBrutoKg: 9000, volumenM3: 55, clasificacion: cls('9403.60.00.00', 0.14), certificadoOrigen: false,
}]

// Multiproducto: 5 SKU con clasificaciones distintas
const multi: Producto[] = [
  { id: 'a', sku: 'SOFA-01', nombre: 'Sofá', paisFabricacion: 'CN', cantidad: 50, valorUnitario: 300, pesoBrutoKg: 2500, bultos: { cantidad: 50, largoCm: 200, anchoCm: 90, altoCm: 80, apilable: true }, clasificacion: cls('9401.61.00.00', 0.14), certificadoOrigen: false },
  { id: 'b', sku: 'LAMP-02', nombre: 'Lámpara LED', paisFabricacion: 'CN', cantidad: 400, valorUnitario: 12, pesoBrutoKg: 800, bultos: { cantidad: 40, largoCm: 60, anchoCm: 40, altoCm: 40, apilable: true }, clasificacion: cls('9405.11.00.00', 0.14), certificadoOrigen: false },
  { id: 'c', sku: 'LAPT-03', nombre: 'Laptop', paisFabricacion: 'CN', cantidad: 30, valorUnitario: 450, pesoBrutoKg: 120, bultos: { cantidad: 3, largoCm: 60, anchoCm: 40, altoCm: 50, apilable: true }, clasificacion: cls('8471.30.00.00', 0), certificadoOrigen: false },
  { id: 'd', sku: 'PERF-04', nombre: 'Perfume', paisFabricacion: 'CN', cantidad: 600, valorUnitario: 8, pesoBrutoKg: 400, bultos: { cantidad: 20, largoCm: 50, anchoCm: 40, altoCm: 30, apilable: true }, clasificacion: cls('3303.00.00.00', 0.14, { sc: 0.1 }), certificadoOrigen: false, requierePermiso: true },
  { id: 'e', sku: 'TORN-05', nombre: 'Tornillos', paisFabricacion: 'CN', cantidad: 10000, valorUnitario: 0.05, pesoBrutoKg: 300, bultos: { cantidad: 10, largoCm: 40, anchoCm: 30, altoCm: 20, apilable: true }, clasificacion: cls('7318.15.00.00', 0.05), certificadoOrigen: false },
]

const sumaSKU = (r: ReturnType<typeof calcularLanded>) => Math.round(r.productos.reduce((s, p) => s + p.landedTotal * 100, 0)) / 100

describe('reparto con resto mayor', () => {
  it('la suma coincide exactamente', () => {
    expect(repartir(1000, [1, 1, 1]).reduce((a, b) => a + b, 0)).toBe(1000)
    expect(repartir(1, [1, 1, 1]).reduce((a, b) => a + b, 0)).toBe(1)
    expect(repartir(500, [0, 0])).toEqual([250, 250])
  })
})

describe('caso NOVA HOME CR (EXW Ningbo, 40 pies)', () => {
  const r = calcularLanded(base, nova)
  it('cabe en un contenedor de 40 pies', () => {
    expect(r.carga.compatible).toBe(true)
    expect(r.carga.contenedores).toBe(1)
  })
  it('incluye todas las etapas, con descarga y devolución del contenedor', () => {
    for (const et of [1, 2, 3, 4, 5, 6, 7] as const) expect(r.porEtapa[et].total).toBeGreaterThan(0)
    expect(r.conceptos.find((k) => k.id === 'devolucion')!.estado).toBe('estimado')
    expect(r.conceptos.find((k) => k.id === 'montacargas')!.estado).toBe('estimado')
  })
  it('valor aduanero incluye gastos hasta el puerto pero no los de destino', () => {
    const hasta3 = r.conceptos.filter((k) => k.etapa <= 3 && (k.estado === 'estimado' || k.estado === 'confirmado')).reduce((s, k) => s + (k.monto ?? 0), 0)
    expect(r.productos[0].valorAduanero).toBeCloseTo(55000 + hasta3, 1)
  })
  it('impuestos en cascada sobre el valor aduanero', () => {
    const va = r.productos[0].valorAduanero
    const imp = r.productos[0].impuestos
    expect(imp.dai).toBeCloseTo(va * 0.14, 1)
    expect(imp.ley6946).toBeCloseTo(va * 0.01, 1)
    expect(imp.iva).toBeCloseTo(va * 1.15 * 0.13, 0)
  })
  it('landed unitario = total / 1000 y la suma por SKU = total', () => {
    expect(r.productos[0].landedUnitario).toBeCloseTo(r.totales.total / 1000, 2)
    expect(sumaSKU(r)).toBe(r.totales.total)
    expect(r.totales.desembolso).toBe(r.totales.total)
    expect(r.totales.totalSinIVA).toBeCloseTo(r.totales.total - r.totales.ivaRecuperable, 2)
  })
})

describe('multiproducto (5 SKU)', () => {
  const r = calcularLanded(base, multi)
  it('impuestos individuales por clasificación', () => {
    const laptop = r.productos.find((p) => p.sku === 'LAPT-03')!
    expect(laptop.impuestos.dai).toBe(0)
    const perfume = r.productos.find((p) => p.sku === 'PERF-04')!
    expect(perfume.impuestos.sc).toBeGreaterThan(0)
  })
  it('la suma de los SKU coincide con el total del embarque', () => {
    expect(sumaSKU(r)).toBe(r.totales.total)
    const logSKU = Math.round(r.productos.reduce((s, p) => s + p.logistica * 100, 0)) / 100
    expect(logSKU).toBe(r.totales.logistica)
  })
  it('el seguro se reparte por valor y el flete por volumen', () => {
    const seguro = r.conceptos.find((k) => k.id === 'seguro')!
    const flete = r.conceptos.find((k) => k.id === 'flete')!
    expect(seguro.base).toBe('valor')
    expect(flete.base).toBe('volumen')
  })
  it('un permiso cobra la gestión (USD 40) y deja pendientes las tasas oficiales, sin contarlas como cero', () => {
    const gestion = r.conceptos.find((k) => k.id === 'permisos')!
    expect(gestion.estado).toBe('estimado')
    expect(gestion.monto).toBe(40)
    const tasas = r.conceptos.find((k) => k.id === 'tasas_permisos')!
    expect(tasas.estado).toBe('pendiente')
    expect(tasas.monto).toBeNull()
    expect(r.estado).toBe('incompleta')
  })
  it('honorarios por tramos: mínimo USD 150, 0,6 % hasta 25 000 y 0,45 % del excedente', () => {
    expect(honorariosAgencia(8000)).toBe(150)
    expect(honorariosAgencia(25000)).toBe(150)
    expect(honorariosAgencia(70000)).toBe(352.5)
  })
  it('los servicios de terceros llevan 10 % de margen; los gastos de puerto y los impuestos no', () => {
    const sin = calcularLanded({ ...base, ajustes: { flete: { estado: 'confirmado', monto: 1000 }, thc_destino: { estado: 'confirmado', monto: 200 } } }, multi)
    expect(sin.conceptos.find((k) => k.id === 'flete')!.monto).toBe(1100)
    expect(sin.conceptos.find((k) => k.id === 'thc_destino')!.monto).toBe(200)
  })
  it('una asignación directa va completa a un producto', () => {
    const r2 = calcularLanded({ ...base, ajustes: { permisos: { estado: 'confirmado', monto: 300, base: 'directo', productoDirecto: 'd' } } }, multi)
    const perf = r2.productos.find((p) => p.id === 'd')!
    const otros = r2.productos.filter((p) => p.id !== 'd')
    expect(perf.porEtapa[5]).toBeGreaterThanOrEqual(300)
    expect(otros.every((p) => p.porEtapa[5] < 300)).toBe(true)
    expect(sumaSKU(r2)).toBe(r2.totales.total)
  })
})

describe('Incoterms', () => {
  it('FOB no cobra al cliente la carga ni el THC de origen', () => {
    const r = calcularLanded({ ...base, incoterm: 'FOB' }, nova)
    expect(r.conceptos.find((k) => k.id === 'thc_origen')!.estado).toBe('incluido')
    expect(r.porEtapa[1].total).toBe(0)
    expect(r.porEtapa[2].total).toBe(0)
  })
  it('CIF incluye flete y seguro en el precio, y no los duplica', () => {
    const r = calcularLanded({ ...base, incoterm: 'CIF' }, nova)
    expect(r.porEtapa[3].total).toBe(0)
    expect(r.productos[0].valorAduanero).toBe(55000)
  })
  it('DDP deja al cliente solo la descarga', () => {
    const r = calcularLanded({ ...base, incoterm: 'DDP', modo: 'FCL40' }, nova)
    expect(r.totales.impuestos).toBe(0)
    expect(r.porEtapa[7].total).toBeGreaterThan(0)
    expect(r.porEtapa[6].total).toBe(0)
  })
  it('FOB con aéreo es incompatible', () => {
    const r = calcularLanded({ ...base, incoterm: 'FOB', modo: 'AEREO' }, nova)
    expect(r.incotermCompatible).toBe(false)
    expect(r.estado).toBe('incompleta')
  })
})

describe('modalidades', () => {
  it('LCL cobra por W/M y desconsolida', () => {
    const p = [{ ...nova[0], volumenM3: 4, pesoBrutoKg: 800 }]
    const r = calcularLanded({ ...base, modo: 'LCL', origen: miami }, p)
    expect(r.carga.wm).toBe(4)
    expect(r.conceptos.find((k) => k.id === 'desconsolidacion')!.estado).toBe('estimado')
    expect(r.conceptos.find((k) => k.id === 'devolucion')!.estado).toBe('no_aplica')
  })
  it('aéreo usa peso cobrable y se reparte por peso', () => {
    const p = [{ ...nova[0], volumenM3: 1, pesoBrutoKg: 50, cantidad: 10 }]
    const r = calcularLanded({ ...base, modo: 'AEREO', origen: miami, incoterm: 'FCA' }, p)
    expect(r.carga.pesoCobrableAereo).toBe(167)
    expect(r.conceptos.find((k) => k.id === 'flete')!.base).toBe('peso')
  })
  it('terrestre desde Centroamérica usa tráiler y exime la Ley 6946', () => {
    const p = [{ ...nova[0], paisFabricacion: 'GT', volumenM3: 30, pesoBrutoKg: 6000 }]
    const r = calcularLanded({ ...base, modo: 'TERRESTRE', origen: ca }, p)
    expect(r.carga.equipo).toBe('TRAILER')
    expect(r.productos[0].impuestos.ley6946).toBe(0)
  })
  it('un bulto más alto que la puerta no cabe en un contenedor estándar pero sí en High Cube', () => {
    const p: Producto[] = [{ ...multi[0], bultos: { cantidad: 2, largoCm: 200, anchoCm: 100, altoCm: 240, apilable: false } }]
    expect(cubicar(p, 'FCL40').compatible).toBe(false)
    expect(cubicar(p, 'FCL40HC').compatible).toBe(true)
  })
  it('55 m³ no caben en un contenedor de 20 pies: pide dos', () => {
    expect(cubicar(nova, 'FCL20').contenedores).toBe(2)
  })
  it('la comparación no recomienda modalidades incompatibles', () => {
    const cmp = compararModalidades(base, nova)
    expect(cmp.find((m) => m.modo === 'FCL40')!.compatible).toBe(true)
    expect(cmp.some((m) => m.modo === 'TERRESTRE')).toBe(false)
  })
})

describe('tasas sin validar', () => {
  it('una tasa desconocida queda pendiente y no se calcula como cero', () => {
    const p = [{ ...nova[0], clasificacion: cls('9403.60.00.00', null) }]
    const r = calcularLanded(base, p)
    expect(r.productos[0].impuestos.dai).toBeNull()
    expect(r.productos[0].impuestos.iva).toBeNull()
    expect(r.estado).toBe('incompleta')
  })
  it('el certificado de origen no aplica preferencia si no está validada', () => {
    const p = [{ ...nova[0], certificadoOrigen: true, daiPreferencial: 0 }]
    const r = calcularLanded(base, p)
    expect(r.productos[0].impuestos.tasaDAIAplicada).toBe(0.14)
    expect(r.productos[0].impuestos.ahorroTLC).toBeGreaterThan(0)
    const v = [{ ...p[0], clasificacion: cls('9403.60.00.00', 0.14, { estado: 'validada' }) }]
    expect(calcularLanded(base, v).productos[0].impuestos.tasaDAIAplicada).toBe(0)
  })
})

describe('datos por confirmar', () => {
  it('un volumen aproximado se calcula pero deja la cotización incompleta', () => {
    const p = [{ ...nova[0], clasificacion: cls('9403.60.00.00', 0.14), datosPorConfirmar: ['volumen y peso aproximados'] }]
    const r = calcularLanded({ ...base, incotermPorConfirmar: true }, p)
    expect(r.totales.total).toBeGreaterThan(0)
    expect(r.estado).toBe('incompleta')
    expect(r.pendientes.some((x) => x.includes('aproximados'))).toBe(true)
    expect(r.pendientes.some((x) => x.includes('Incoterm'))).toBe(true)
  })
})
