import { DECRETO_SC, SC_ART1, SC_ART2, SC_ART3 } from '../data/selectivo'

export interface SelectivoReferencia {
  articulo: 1 | 2 | 3
  /** Tarifa que se puede afirmar con el decreto (solo art. 2 completo); null = por validar. */
  sc: number | null
  /** Subincisos nacionales del decreto cuando no cubre todo el inciso de 10 dígitos. */
  subincisos: string[]
  texto: string
}

const ARTICULOS: [1 | 2 | 3, string[], string][] = [[1, SC_ART1, '2025-03-31'], [2, SC_ART2, '2025-06-30'], [3, SC_ART3, '2025-09-30']]

/** "3307.90.90.11.00" → "3307.90.90.00" (inciso de 10 dígitos del arancel que usa LANDEX). */
const aDiez = (c: string) => `${c.slice(0, 10)}.00`
/** El decreto cubre todo el inciso si incluye el código completo (…00.00) o un "los demás" (…90 / …99). */
const completo = (codigos: string[]) => codigos.some((c) => /(\.00\.00|\.90\.00|\.90|\.99)$/.test(c))

/**
 * Referencia del Selectivo de Consumo según el Decreto 44921-MH para un inciso de 10 dígitos.
 * `hoy` en formato AAAA-MM-DD (para pruebas).
 */
export function selectivoDecreto(codigo: string, hoy = new Date().toISOString().slice(0, 10)): SelectivoReferencia | null {
  for (const [articulo, lista, desde] of ARTICULOS) {
    const del = lista.filter((c) => aDiez(c) === codigo)
    if (!del.length) continue
    const todo = completo(del)
    const subincisos = todo ? [] : del.map((c) => c.slice(11))
    const parcial = todo ? '' : ` Solo aplica a los subincisos nacionales ${subincisos.join(', ')}.`
    const ref = `Decreto ${DECRETO_SC.numero}`
    if (hoy < desde) return { articulo, sc: null, subincisos, texto: `Selectivo: el ${ref} lo rebaja a partir del ${desde}; por validar.${parcial}` }
    if (articulo === 2) return { articulo, sc: todo ? 0 : null, subincisos, texto: `Selectivo 0 % desde el ${desde} según el ${ref}.${parcial}` }
    const piso = articulo === 1 ? 10 : 15
    return { articulo, sc: null, subincisos, texto: `Selectivo en rebaja por el ${ref}: baja 5 puntos por año desde el ${desde} hasta un mínimo de ${piso} %. La tarifa de hoy la confirma el agente aduanero.${parcial}` }
  }
  return null
}
