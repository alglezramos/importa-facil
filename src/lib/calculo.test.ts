import { describe, expect, it } from 'vitest'
import { ARANCEL, buscarPartidas, type Partida } from '../data/arancel'
import { ORIGENES } from '../data/config'
import { calcularFlete, cotizar, type EntradaCotizacion } from './calculo'

const partida: Partida = {
  codigo: '0000.00.00', descripcion: 'Prueba', palabrasClave: [],
  dai: 0.14, sc: 0, iva: 0.13, tlc: { CN: 0 }, permisos: [], verificado: false,
}
const china = ORIGENES.find((o) => o.id === 'cn-sur')!

const base: EntradaCotizacion = {
  valorMercaderia: 10000, incoterm: 'FOB', origen: china, modo: 'LCL',
  pesoKg: 800, volumenM3: 4, unidades: 500, partida, aplicaTLC: false,
  zona: 'GAM', tipoCambio: 500, diasProduccion: 20,
  parametros: { seguro: { porcentaje: 0.01, minimo: 0 }, honorarios: { porcentajeCIF: 0.006, minimo: 120, coordinacionLogistica: 60 } },
}

describe('flete', () => {
  it('LCL cobra el mayor entre m³ y toneladas', () => {
    expect(calcularFlete(china, 'LCL', 800, 4).cobrable).toBe(4)
    expect(calcularFlete(china, 'LCL', 6000, 4).cobrable).toBe(6)
    expect(calcularFlete(china, 'LCL', 100, 0.2).cobrable).toBe(1)
  })
  it('aéreo usa peso volumétrico', () => {
    expect(calcularFlete(china, 'AEREO', 50, 1).cobrable).toBe(167)
  })
})

describe('impuestos', () => {
  it('calcula CIF, DAI, Ley 6946 e IVA en cascada', () => {
    const r = cotizar(base)
    const flete = 4 * china.flete.lclPorWM // 380
    const seguro = (10000 + flete) * 0.01 // 103.8
    const cif = 10000 + flete + seguro
    expect(r.valorAduanero).toBeCloseTo(cif, 2)
    expect(r.impuestos.dai).toBeCloseTo(cif * 0.14, 2)
    expect(r.impuestos.ley6946).toBeCloseTo(cif * 0.01, 2)
    expect(r.impuestos.iva).toBeCloseTo((cif * 1.15) * 0.13, 2)
  })
  it('aplica tasa preferencial con TLC', () => {
    const r = cotizar({ ...base, aplicaTLC: true })
    expect(r.impuestos.tasaDAI).toBe(0)
    expect(r.impuestos.dai).toBe(0)
  })
  it('CIF no suma flete ni seguro al valor aduanero', () => {
    const r = cotizar({ ...base, incoterm: 'CIF' })
    expect(r.valorAduanero).toBe(10000)
  })
  it('EXW agrega costos de origen', () => {
    const r = cotizar({ ...base, incoterm: 'EXW' })
    expect(r.valorAduanero).toBeGreaterThan(cotizar(base).valorAduanero)
  })
  it('total = suma de líneas y unitario coherente', () => {
    const r = cotizar(base)
    const suma = r.lineas.reduce((s, l) => s + l.usd, 0)
    expect(r.totalUSD).toBeCloseTo(suma, 1)
    expect(r.costoUnitarioUSD).toBeCloseTo(r.totalUSD / 500, 2)
    expect(r.totalSinIVAUSD).toBeCloseTo(r.totalUSD - r.impuestos.iva, 2)
  })
})

describe('línea de tiempo y búsqueda', () => {
  it('suma los días de todas las etapas', () => {
    const r = cotizar(base)
    expect(r.diasTotales).toBe(r.etapas.reduce((s, e) => s + e.dias, 0))
  })
  it('encuentra partidas sin importar tildes', () => {
    expect(buscarPartidas('lampara').length).toBeGreaterThan(0)
    expect(buscarPartidas('8471')[0].codigo).toBe('8471.30.00')
    expect(buscarPartidas('').length).toBe(ARANCEL.length)
  })
})

import { proveedoresInternacionales } from '../data/proveedores'
describe('proveedores', () => {
  it('filtra por origen y modalidad', () => {
    const fclChina = proveedoresInternacionales('cn-sur', 'FCL40').map((p) => p.id)
    expect(fclChina).toContain('cosco')
    expect(fclChina).not.toContain('crowley')
    const aereo = proveedoresInternacionales('eu', 'AEREO')
    expect(aereo.every((p) => p.tipo === 'aereo')).toBe(true)
  })
})
