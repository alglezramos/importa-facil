import { nube } from './nube'
import { digitos, esInciso, etiqueta, type Indice } from './arancel'

export interface PartidaIA { codigo: string; razon: string }
export interface RespPartidas { resumen?: string; partidas: PartidaIA[]; preguntas?: string[] }
export interface CandidatoIA { codigo: string; confianza: 'alta' | 'media' | 'baja'; razon: string }
export interface RespIncisos { candidatos: CandidatoIA[]; preguntas?: string[]; advertencia?: string }
export interface Imagen { tipo: string; datos: string }

export type NivelIA = 'gratis' | 'cliente' | 'equipo'
export interface Meta { nivel?: NivelIA; restantes?: number }

async function llamar<T>(cuerpo: Record<string, unknown>): Promise<{ r: T | null; error: string | null; meta: Meta }> {
  const { data, error } = await nube().functions.invoke('landex-ai', { body: cuerpo })
  if (error) {
    let msg = 'LANDEX AI no está disponible en este momento.'
    let meta: Meta = {}
    try { const b = await (error as { context?: Response }).context?.json(); if (b?.error) msg = b.error; meta = { nivel: b?.nivel, restantes: b?.restantes } } catch { /* sin cuerpo */ }
    return { r: null, error: msg, meta }
  }
  if (data?.error) return { r: null, error: data.error, meta: { nivel: data.nivel } }
  return { r: data.resultado as T, error: null, meta: { nivel: data.nivel, restantes: data.restantes } }
}

/** El equipo otorga o quita acceso de cliente a LANDEX AI por correo. */
export async function otorgarAcceso(correo: string, dar: boolean): Promise<string | null> {
  const { data: p, error } = await nube().from('perfiles').select('id').ilike('email', correo.trim().toLowerCase()).maybeSingle()
  if (error) return error.message
  if (!p) return `No hay ninguna cuenta con ${correo.trim()}. Pídele que ingrese una vez a landex.cr.`
  const id = (p as { id: string }).id
  const r = dar
    ? await nube().from('ai_accesos').upsert({ usuario: id, nivel: 'cliente' })
    : await nube().from('ai_accesos').delete().eq('usuario', id)
  return r.error ? r.error.message : null
}

/** Incisos oficiales bajo las partidas propuestas (máx. 150), con su descripción completa. */
export function incisosDePartidas(ind: Indice, partidas: string[]): { codigo: string; texto: string }[] {
  const pref = [...new Set(partidas.map((p) => digitos(p).slice(0, 4)).filter((p) => /^\d{4}$/.test(p)))]
  return ind.data.items
    .filter((i) => esInciso(i[0]) && pref.some((p) => digitos(i[0]).startsWith(p)))
    .slice(0, 150)
    .map((i) => ({ codigo: i[0], texto: etiqueta(ind, i[0]) }))
}

/** Solo partidas que existen en el arancel oficial. */
export const partidasValidas = (ind: Indice, ps: PartidaIA[]) =>
  ps.filter((p) => ind.data.items.some((i) => esInciso(i[0]) && digitos(i[0]).startsWith(digitos(p.codigo).slice(0, 4))))

/** Solo candidatos cuyo código está en la lista oficial enviada. */
export const candidatosValidos = (ind: Indice, cs: CandidatoIA[]) => cs.filter((c) => ind.porCodigo.has(c.codigo) && esInciso(c.codigo))

export const pedirPartidas = (descripcion: string, imagen?: Imagen) => llamar<RespPartidas>({ fase: 'partidas', descripcion, imagen })
export const pedirIncisos = (descripcion: string, opciones: { codigo: string; texto: string }[]) => llamar<RespIncisos>({ fase: 'incisos', descripcion, opciones })

export function leerImagen(f: File): Promise<Imagen> {
  return new Promise((ok, mal) => {
    if (!/^image\/(jpeg|png|webp|gif)$/.test(f.type)) return mal(new Error('Usa una foto JPG, PNG o WebP.'))
    if (f.size > 3_500_000) return mal(new Error('La foto pesa más de 3,5 MB.'))
    const r = new FileReader()
    r.onload = () => ok({ tipo: f.type, datos: String(r.result).split(',')[1] ?? '' })
    r.onerror = () => mal(new Error('No se pudo leer la foto.'))
    r.readAsDataURL(f)
  })
}
