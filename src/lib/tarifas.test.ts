import { describe, expect, it } from 'vitest'
import { ORIGENES } from '../data/config'
import { huella, puedeEmitir, requisitosFormal, venceFormal } from './formal'
import { calcularLanded, type Embarque, type Producto } from './landed'
import { ajustesDeTarifa, ajustesEfectivos, aplicaA, conceptosProtegidos, montoCargo, tramoTarifa, validarTarifa, vigencia, type Tarifa } from './tarifas'

const ningbo = ORIGENES.find((o) => o.id === 'cn-este')!
const base: Embarque = {
  incoterm: 'EXW', origen: ningbo, modo: 'FCL40', zona: 'GAM', tipoCambio: 505, diasProduccion: 0, seguro: true,
  requiereDescarga: true, clienteTieneMontacargas: false, requiereDevolucionContenedor: true,
}
const prod = (validada: boolean): Producto => ({
  id: 'p1', sku: 'A-1', nombre: 'Sillas', paisFabricacion: 'CN', cantidad: 1000, valorUnitario: 55, pesoBrutoKg: 9000, volumenM3: 55,
  certificadoOrigen: false,
  clasificacion: { codigo: '9401.39.00.00', descripcion: 'Asientos', dai: 0.14, sc: 0, iva: 0.13, otros: 0, estado: validada ? 'validada' : 'preliminar' },
})
const t = (c: Partial<Tarifa> = {}): Tarifa => ({
  id: 't1', proveedor: 'Forwarder real', categoria: 'forwarder', origenId: 'cn-este', modos: ['FCL40'], zona: '',
  cargos: [{ concepto: 'flete', monto: 3000, unidad: 'contenedor' }, { concepto: 'sellos', monto: 0, unidad: 'incluido' }],
  diasTransito: 35, vigenteDesde: '2026-01-01', vigenteHasta: '2099-12-31', incluye: [], excluye: [], condiciones: '', fuente: 'Oferta 123', ...c,
})

describe('tarifas', () => {
  const r0 = calcularLanded(base, [prod(true)])
  it('calcula montos por unidad y respeta el mínimo', () => {
    expect(montoCargo({ concepto: 'flete', monto: 3000, unidad: 'contenedor' }, r0.carga, 55000)).toBe(3000 * r0.carga.contenedores)
    expect(montoCargo({ concepto: 'flete', monto: 1, unidad: 'm3', minimo: 500 }, r0.carga, 55000)).toBe(500)
    expect(montoCargo({ concepto: 'seguro', monto: 0.5, unidad: 'pct_valor' }, r0.carga, 55000)).toBe(275)
  })
  it('una tarifa real confirma conceptos; una de ejemplo solo estima', () => {
    expect(ajustesDeTarifa(t(), r0.carga, 55000)).toEqual({ flete: { estado: 'confirmado', monto: 3000 }, sellos: { estado: 'incluido_en_otro', monto: 0 } })
    expect(ajustesDeTarifa(t({ ejemplo: true }), r0.carga, 55000).flete.estado).toBe('estimado')
  })
  it('aplicada, reemplaza el flete de referencia sin tocar el resto', () => {
    const aj = ajustesEfectivos([t()], ['t1'], {}, r0.carga, 55000, conceptosProtegidos(r0.conceptos))
    const r = calcularLanded({ ...base, ajustes: aj }, [prod(true)])
    expect(r.conceptos.find((k) => k.id === 'flete')).toMatchObject({ estado: 'confirmado', monto: 3000 })
    expect(r.conceptos.find((k) => k.id === 'thc_destino')?.monto).toBe(r0.conceptos.find((k) => k.id === 'thc_destino')?.monto)
  })
  it('no cobra lo que cubre el Incoterm ni lo que no aplica', () => {
    const cif = calcularLanded({ ...base, incoterm: 'CIF' }, [prod(true)])
    const prot = conceptosProtegidos(cif.conceptos)
    expect(prot.has('flete')).toBe(true)
    const r = calcularLanded({ ...base, incoterm: 'CIF', ajustes: ajustesEfectivos([t()], ['t1'], {}, cif.carga, 55000, prot) }, [prod(true)])
    expect(r.totales.total).toBe(cif.totales.total)
  })
  it('el ajuste manual manda sobre la tarifa', () => {
    const aj = ajustesEfectivos([t()], ['t1'], { flete: { estado: 'confirmado', monto: 2500 } }, r0.carga, 55000)
    expect(aj.flete.monto).toBe(2500)
  })
  it('vigencia, ruta y validación', () => {
    const hoy = new Date('2026-11-24T12:00:00Z')
    expect(vigencia(t({ vigenteHasta: '2026-11-20' }), hoy)).toBe('vencida')
    expect(vigencia(t({ vigenteHasta: '2026-11-28' }), hoy)).toBe('por_vencer')
    expect(vigencia(t({ vigenteDesde: '2026-12-01' }), hoy)).toBe('futura')
    expect(aplicaA(t(), { origenId: 'cn-este', modo: 'FCL40', zona: 'GAM' })).toBe(true)
    expect(aplicaA(t(), { origenId: 'cn-este', modo: 'LCL', zona: 'GAM' })).toBe(false)
    expect(tramoTarifa(t({ cargos: [{ concepto: 'transporte_nacional', monto: 1, unidad: 'fijo' }] }))).toBe('nacional')
    expect(validarTarifa(t({ fuente: '', cargos: [] })).length).toBe(2)
  })
})

describe('cotización formal', () => {
  it('no se puede emitir con costos referenciales, clasificación preliminar o cliente sin identificar', () => {
    const r = calcularLanded(base, [prod(false)])
    const req = requisitosFormal(r, [prod(false)], [], false)
    expect(puedeEmitir(req)).toBe(false)
    expect(req.filter((x) => !x.ok).map((x) => x.texto).join(' ')).toMatch(/Cliente.*Clasificación.*costos/s)
  })
  it('se puede emitir cuando todo está confirmado y validado', () => {
    const r0 = calcularLanded(base, [prod(true)])
    const confirmar = Object.fromEntries(r0.conceptos.filter((k) => k.estado === 'estimado' || k.estado === 'pendiente')
      .map((k) => [k.id, { estado: 'confirmado' as const, monto: k.monto ?? 100 }]))
    const r = calcularLanded({ ...base, ajustes: confirmar }, [prod(true)])
    expect(puedeEmitir(requisitosFormal(r, [prod(true)], [t()], true))).toBe(true)
    expect(puedeEmitir(requisitosFormal(r, [prod(true)], [t({ ejemplo: true })], true))).toBe(false)
    expect(puedeEmitir(requisitosFormal(r, [prod(true)], [t({ vigenteHasta: '2020-01-01' })], true))).toBe(false)
  })
  it('la vigencia formal no supera la de las tarifas y la huella detecta cambios', () => {
    expect(venceFormal(new Date('2026-11-24T12:00:00Z'), 15, [t({ vigenteHasta: '2026-12-01' })])).toBe('2026-12-01')
    expect(venceFormal(new Date('2026-11-24T12:00:00Z'), 15, [])).toBe('2026-12-09')
    expect(huella({ a: 1 })).toBe(huella({ a: 1 }))
    expect(huella({ a: 1 })).not.toBe(huella({ a: 2 }))
  })
})
