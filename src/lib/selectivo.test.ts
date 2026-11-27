import { describe, expect, it } from 'vitest'
import { SC_ART1, SC_ART2, SC_ART3 } from '../data/selectivo'
import { selectivoDecreto } from './selectivo'

describe('Selectivo de Consumo · Decreto 44921-MH', () => {
  it('trae los 60 incisos del decreto (17 + 27 + 16) sin repetir', () => {
    expect([SC_ART1.length, SC_ART2.length, SC_ART3.length]).toEqual([17, 27, 16])
    const todos = [...SC_ART1, ...SC_ART2, ...SC_ART3]
    expect(new Set(todos).size).toBe(60)
    for (const c of todos) expect(c).toMatch(/^\d{4}\.\d{2}\.\d{2}\.\d{2}\.\d{2}$/)
  })
  it('artículo 2: 0 % desde el 30-06-2025, no antes', () => {
    expect(selectivoDecreto('3402.50.00.00', '2026-11-26')!.sc).toBe(0)
    expect(selectivoDecreto('3208.10.90.00', '2026-11-26')!.sc).toBe(0)
    expect(selectivoDecreto('3208.10.90.00', '2025-06-01')!.sc).toBeNull()
  })
  it('artículos 1 y 3: no inventa la tarifa de hoy, indica el mínimo', () => {
    const champu = selectivoDecreto('3305.10.00.00', '2026-11-26')!
    expect(champu.sc).toBeNull()
    expect(champu.texto).toContain('10 %')
    expect(selectivoDecreto('8507.60.00.00', '2026-11-26')!.texto).toContain('15 %')
  })
  it('si el decreto solo cubre un subinciso nacional, lo dice y no asume la tarifa', () => {
    const r = selectivoDecreto('8516.10.00.00', '2026-11-26')!
    expect(r.subincisos).toEqual(['00.19'])
    expect(r.texto).toContain('00.19')
  })
  it('un inciso fuera del decreto no tiene referencia', () => {
    expect(selectivoDecreto('9401.39.00.00')).toBeNull()
  })
})
