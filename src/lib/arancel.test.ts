import { readFileSync } from 'node:fs'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { buscar, cargarArancel, etiqueta, type Indice } from './arancel'

let ind: Indice
beforeAll(async () => {
  const json = JSON.parse(readFileSync('public/arancel.json', 'utf-8'))
  vi.stubGlobal('fetch', async () => ({ ok: true, json: async () => json }))
  ind = await cargarArancel()
})

describe('arancel completo', () => {
  it('carga secciones, capítulos e incisos', () => {
    expect(ind.data.secciones.length).toBe(21)
    expect(ind.incisos.length).toBeGreaterThan(7000)
  })
  it('busca por código', () => {
    expect(buscar(ind, '8471.30')[0].item[0]).toBe('8471.30.00.00')
  })
  it.each([
    ['laptop', '8471.30.00.00'],
    ['telefonos inteligentes', '8517.13.00.00'],
    ['muebles de madera', '9403.60.00.00'],
  ])('encuentra "%s"', (q, codigo) => {
    const top = buscar(ind, q, 10).map((r) => r.item[0])
    expect(top).toContain(codigo)
  })
  it('arma una etiqueta legible', () => {
    expect(etiqueta(ind, '9403.60.00.00')).toMatch(/muebles de madera/i)
  })
})
