import { describe, expect, it } from 'vitest'
import { candidatosValidos, incisosDePartidas, partidasValidas } from './ia'
import type { Indice, Item } from './arancel'

const items: Item[] = [['94.03', 'LOS DEMÁS MUEBLES', null], ['9403.20.00.00', '- Los demás muebles de metal', '15'], ['9403.60.00.00', '- Los demás muebles de madera', '15'], ['8471.30.00.00', '- Máquinas portátiles', '0']]
const ind = { data: { items, secciones: [], capitulos: [], fuente: '', reglas: '' }, porCodigo: new Map(items.map((i) => [i[0], i])), incisos: [] } as unknown as Indice

describe('LANDEX AI: validación contra el arancel oficial', () => {
  it('solo deja incisos que existen', () => {
    const r = candidatosValidos(ind, [{ codigo: '9403.20.00.00', confianza: 'alta', razon: '' }, { codigo: '9999.99.99.99', confianza: 'alta', razon: '' }, { codigo: '94.03', confianza: 'media', razon: '' }])
    expect(r.map((c) => c.codigo)).toEqual(['9403.20.00.00'])
  })
  it('descarta partidas inexistentes', () => {
    expect(partidasValidas(ind, [{ codigo: '9403', razon: '' }, { codigo: '0000', razon: '' }]).map((p) => p.codigo)).toEqual(['9403'])
  })
  it('lista los incisos de las partidas propuestas', () => {
    expect(incisosDePartidas(ind, ['94.03']).map((o) => o.codigo)).toEqual(['9403.20.00.00', '9403.60.00.00'])
  })
})
