/**
 * Arancel completo (SAC, VII Enmienda): carga, búsqueda y navegación.
 * Los datos viven en public/arancel.json y se cargan solo cuando se necesitan.
 */
import type { Clasificacion } from './landed'
import { selectivoDecreto } from './selectivo'

export type Item = [codigo: string, descripcion: string, dai: string | null]

export interface Seccion { n: number; title: string; notes: string }
export interface Capitulo { n: number; s: number; title: string; notes: string }
export interface Arancel {
  fuente: string
  reglas: string
  secciones: Seccion[]
  capitulos: Capitulo[]
  items: Item[]
}

export interface Indice {
  data: Arancel
  porCodigo: Map<string, Item>
  incisos: { item: Item; propio: string; contexto: string; capitulo: string }[]
}

let promesa: Promise<Indice> | null = null

export const digitos = (c: string) => c.replace(/\./g, '')
export const esInciso = (c: string) => c.length === 13
export const nivel = (c: string) => {
  const d = digitos(c).length
  return d <= 4 ? 'Partida' : d < 8 ? 'Subpartida' : d === 8 && !esInciso(c) ? 'Subpartida' : 'Inciso'
}

export const normalizar = (t: string) =>
  t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9.\s]/g, ' ').replace(/\s+/g, ' ').trim()

export function ancestros(ind: Indice, codigo: string): Item[] {
  const d = digitos(codigo)
  const res: Item[] = []
  for (let len = 4; len < d.length; len++) {
    for (const cand of ind.porCodigo.values()) {
      const cd = digitos(cand[0])
      if (cd.length === len && d.startsWith(cd) && cand[0] !== codigo) res.push(cand)
    }
  }
  return res
}

export function cargarArancel(): Promise<Indice> {
  if (!promesa) {
    promesa = fetch(`${import.meta.env.BASE_URL}arancel.json`)
      .then((r) => {
        if (!r.ok) throw new Error('No se pudo cargar el arancel')
        return r.json() as Promise<Arancel>
      })
      .then((data) => {
        const porCodigo = new Map(data.items.map((i) => [i[0], i]))
        // Para cada inciso: texto propio y contexto (partida y subpartidas que lo contienen)
        const prefijos = new Map<string, string>()
        for (const it of data.items) if (!esInciso(it[0])) prefijos.set(digitos(it[0]), it[1])
        const incisos = data.items.filter((i) => esInciso(i[0])).map((item) => {
          const d = digitos(item[0])
          const ctx: string[] = []
          for (let len = 4; len < 10; len++) {
            const p = prefijos.get(d.slice(0, len))
            if (p) ctx.push(p)
          }
          const cap = data.capitulos.find((c) => c.n === Number(item[0].slice(0, 2)))
          return { item, propio: normalizar(item[1]), contexto: normalizar(ctx.join(' ')), capitulo: normalizar(cap?.title ?? '') }
        })
        return { data, porCodigo, incisos }
      })
      .catch((e) => {
        promesa = null
        throw e
      })
  }
  return promesa
}

/** Palabras comunes de las pymes → términos que usa el arancel */
const SINONIMOS: Record<string, string[]> = {
  laptop: ['portatiles', 'computadoras', 'tratamiento o procesamiento de datos'],
  computadora: ['procesamiento de datos'],
  celular: ['telefonos'],
  celulares: ['telefonos'],
  smartphone: ['telefonos inteligentes'],
  camiseta: ['t shirts', 'camisetas'],
  camisetas: ['t shirts', 'camisetas'],
  zapato: ['calzado'],
  zapatos: ['calzado'],
  tenis: ['calzado'],
  carro: ['vehiculos', 'automoviles'],
  repuesto: ['partes'],
  repuestos: ['partes'],
  llanta: ['neumaticos'],
  llantas: ['neumaticos'],
  bombillo: ['lamparas'],
  bombillos: ['lamparas'],
  foco: ['lamparas'],
  tornillo: ['tornillos'],
  silla: ['asientos'],
  oficina: ['giratorios', 'oficina'],
  sillas: ['asientos'],
  sillon: ['asientos'],
  sofa: ['asientos'],
  mesa: ['muebles'],
  escritorio: ['muebles'],
  estante: ['muebles'],
  closet: ['muebles'],
  refrigeradora: ['refrigeradores'],
  refri: ['refrigeradores'],
  nevera: ['refrigeradores'],
  abanico: ['ventiladores'],
  tele: ['televisores', 'receptores de television'],
  televisor: ['receptores de television', 'monitores'],
  tv: ['receptores de television', 'monitores'],
  juguete: ['juguetes'],
  peluche: ['juguetes'],
  maquillaje: ['maquillaje', 'belleza'],
  crema: ['cremas', 'cuidado de la piel'],
  perfume: ['perfumes'],
  botella: ['botellas', 'bombonas'],
  bolsa: ['sacos', 'bolsas'],
  bolsas: ['sacos', 'bolsas'],
  cartera: ['bolsos'],
  mochila: ['mochilas', 'continentes similares'],
  vino: ['vino'],
  cerveza: ['cerveza'],
  cafe: ['cafe'],
  panel: ['paneles', 'celulas fotovoltaicas'],
  solar: ['fotovoltaicas'],
  cable: ['cables', 'conductores'],
  impresora: ['impresoras', 'maquinas para imprimir'],
  audifonos: ['auriculares'],
  audifono: ['auriculares'],
  parlante: ['altavoces'],
  parlantes: ['altavoces'],
}

const VACIAS = new Set(['de', 'la', 'el', 'los', 'las', 'del', 'para', 'con', 'y', 'en', 'a', 'o', 'un', 'una', 'por', 'al', 'sin'])

const variantes = (t: string): string[] => {
  const base = [t]
  if (t.length > 4 && t.endsWith('es')) base.push(t.slice(0, -2))
  if (t.length > 3 && t.endsWith('s')) base.push(t.slice(0, -1))
  return [...base, ...(SINONIMOS[t] ?? []).map(normalizar)]
}

export interface Resultado { item: Item; puntaje: number }

export function buscar(ind: Indice, consulta: string, limite = 40): Resultado[] {
  const q = normalizar(consulta)
  if (!q) return []
  // Búsqueda por código
  if (/^[\d.\s]+$/.test(q)) {
    const d = q.replace(/[.\s]/g, '')
    return ind.incisos
      .filter((x) => digitos(x.item[0]).startsWith(d))
      .slice(0, limite)
      .map((x) => ({ item: x.item, puntaje: 100 }))
  }
  const tokens = q.split(' ').filter((t) => t && !VACIAS.has(t))
  if (!tokens.length) return []
  const res: Resultado[] = []
  const minimo = Math.max(1, Math.ceil(tokens.length * 0.6))
  for (const x of ind.incisos) {
    let total = 0
    let aciertos = 0
    for (const t of tokens) {
      let mejor = 0
      // La palabra exacta que escribió el cliente vale más que una variante o un pedazo de otra palabra
      // (así "auriculares" no se confunde con "Auricularia", un hongo).
      const exacta = new RegExp(`(^|[^a-z0-9])${t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^a-z0-9]|$)`)
      if (exacta.test(x.propio)) mejor = 4
      else if (exacta.test(x.contexto)) mejor = 2
      for (const v of variantes(t)) {
        if (x.propio.includes(v)) mejor = Math.max(mejor, 3)
        else if (x.contexto.includes(v)) mejor = Math.max(mejor, 1.5)
        if (x.capitulo.includes(v)) mejor += 1
      }
      if (mejor) { aciertos++; total += mejor } else total -= 2
    }
    if (aciertos >= minimo) {
      // preferir descripciones específicas sobre "los demás"
      if (/^(- )*(los demas|las demas|otros|otras)\b/.test(x.propio)) total -= 0.5
      res.push({ item: x.item, puntaje: total })
    }
  }
  return res.sort((a, b) => b.puntaje - a.puntaje || a.item[0].localeCompare(b.item[0])).slice(0, limite)
}

export const limpiar = (d: string) => d.replace(/^(-\s*)+/, '').replace(/:$/, '').trim()

/** Nombre legible: partida + la descripción más específica que no sea "los demás". */
export function etiqueta(ind: Indice, codigo: string): string {
  const it = ind.porCodigo.get(codigo)
  if (!it) return codigo
  const camino = [...ancestros(ind, codigo), it].map((i) => limpiar(i[1]))
  const partida = camino[0] ? camino[0].charAt(0) + camino[0].slice(1).toLowerCase() : ''
  const especificas = camino.slice(1).filter((t) => !/^(los demás|las demás|otros|otras)$/i.test(t))
  const ultima = especificas[especificas.length - 1]
  return ultima ? `${partida} › ${ultima}` : partida
}

/** Selectivo y otros impuestos que el equipo de LANDEX ya validó en TICA, por inciso. */
export interface TasaValidada { sc: number; otros: number; fecha: string }
let tasasValidadas = new Map<string, TasaValidada>()
export const fijarTasasValidadas = (m: Map<string, TasaValidada>) => { tasasValidadas = m }
/** Una validación de más de un año se vuelve a pedir (los decretos cambian las tasas). */
const VIGENCIA_TASA_DIAS = 365

export function aClasificacion(ind: Indice, codigo: string): Clasificacion {
  const it = ind.porCodigo.get(codigo)
  const dai = it?.[2] && /^\d+(\.\d+)?$/.test(it[2]) ? Number(it[2]) / 100 : null
  const v = tasasValidadas.get(codigo)
  const vigente = v && (Date.now() - new Date(v.fecha).getTime()) / 86400000 <= VIGENCIA_TASA_DIAS
  // Sin validación del agente, se usa la referencia oficial del Decreto 44921-MH cuando aplica.
  const ref = vigente ? null : selectivoDecreto(codigo)
  return {
    codigo,
    descripcion: etiqueta(ind, codigo),
    dai,
    sc: vigente ? v.sc : ref ? ref.sc : null,
    iva: 0.13,
    otros: vigente ? v.otros : 0,
    estado: 'preliminar',
    fuente: vigente
      ? `DAI del Arancel Centroamericano; Selectivo validado por LANDEX en TICA el ${v.fecha.slice(0, 10)}`
      : ref ? `DAI del Arancel Centroamericano (referencia regional); ${ref.texto}`
        : 'DAI del Arancel Centroamericano (referencia regional); Selectivo por confirmar',
  }
}

export function capituloDe(ind: Indice, codigo: string) {
  const n = Number(codigo.slice(0, 2))
  const cap = ind.data.capitulos.find((c) => c.n === n)
  const sec = cap ? ind.data.secciones.find((s) => s.n === cap.s) : undefined
  return { cap, sec }
}
