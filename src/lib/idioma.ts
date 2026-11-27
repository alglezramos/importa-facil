import english from '../data/en.json'

type Idioma = 'es' | 'en'
const catalogo: Record<string, string> = english
const clave = 'landex.idioma'

function inicial(): Idioma {
  if (typeof window === 'undefined') return 'es'
  const enlace = new URLSearchParams(location.search).get('lang')
  if (enlace === 'en' || enlace === 'es') return enlace
  try { return localStorage.getItem(clave) === 'en' ? 'en' : 'es' } catch { return 'es' }
}

let actual = inicial()
export const idiomaActual = () => actual
export const formatoRegional = () => actual === 'en' ? 'en-US' : 'es-CR'

export function elegirIdioma(idioma: Idioma) {
  actual = idioma
  try { localStorage.setItem(clave, idioma) } catch { /* La selección sigue activa en esta pestaña. */ }
  const url = new URL(location.href)
  url.searchParams.set('lang', idioma)
  history.replaceState(history.state, '', url)
}

export function tr(texto: string | undefined | null, ...valores: unknown[]): string {
  if (!texto) return ''
  const clave = texto.trim().replace(/\s+/g, ' ')
  const traduccion = actual === 'en' ? catalogo[clave] : undefined
  const plantilla = traduccion ? texto.replace(/\S[\s\S]*\S|\S/, () => traduccion) : texto
  return valores.length ? plantilla.replace(/\{(\d+)\}/g, (_, i) => String(valores[Number(i)])) : plantilla
}
