import { tr } from '../lib/idioma'
import { useEffect, useMemo, useState } from 'react'
import type { Clasificacion as Cls } from '../lib/landed'
import { LandexAI } from './LandexAI'
import {
  ancestros, aClasificacion, buscar, capituloDe, cargarArancel, digitos, esInciso, etiqueta, nivel, type Indice,
} from '../lib/arancel'

const ROMANOS = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI', 'XVII', 'XVIII', 'XIX', 'XX', 'XXI']
const dai = (v: string | null) => (v && /^\d/.test(v) ? `${v}%` : v === 'II' ? 'No armonizado' : '—')

interface Props { onUsar: (c: Cls, desc?: string) => void; conectado?: boolean; onIngresar?: () => void; onCotizar?: () => void; equipo?: boolean }

export function Clasificacion({ onUsar, conectado = false, onIngresar = () => {}, onCotizar = () => {}, equipo = false }: Props) {
  const [ind, setInd] = useState<Indice | null>(null)
  const [error, setError] = useState('')
  const [todas, setTodas] = useState(false)
  const [q, setQ] = useState('')
  const [sel, setSel] = useState<string | null>(null)
  const [capAbierto, setCapAbierto] = useState<number | null>(null)
  const [comparar, setComparar] = useState<string[]>([])
  const alternar = (c: string) => setComparar((xs) => (xs.includes(c) ? xs.filter((x) => x !== c) : xs.length >= 3 ? xs : [...xs, c]))

  useEffect(() => { cargarArancel().then(setInd).catch((e) => setError(String(e.message || e))) }, [])

  const resultados = useMemo(() => (ind && q.trim().length >= 2 ? buscar(ind, q) : []), [ind, q])

  if (error) return <section className="panel"><p>{tr(error)}{tr(". Recarga la página para intentar de nuevo.")}</p></section>
  if (!ind) return <section className="panel"><p className="nota">{tr("Cargando el arancel completo…")}</p></section>

  const detalle = sel ? ind.porCodigo.get(sel) : null
  const camino = sel ? ancestros(ind, sel) : []
  const { cap, sec } = sel ? capituloDe(ind, sel) : { cap: undefined, sec: undefined }


  return (
    <section className="panel clasif">
      <LandexAI ind={ind} conectado={conectado} onIngresar={onIngresar} onCotizar={onCotizar} equipo={equipo} onUsar={onUsar} onVer={(c) => { setQ(''); setSel(c); document.querySelector('.clasif-grid')?.scrollIntoView({ behavior: 'smooth' }) }} />

      <h2 className="tarifa-titulo">{tr("Buscá tu producto en el arancel")}</h2>
      <p>{tr("Ingresá una descripción o un código arancelario.")}</p>
      <form className="tarifa-buscar" onSubmit={(e) => { e.preventDefault(); document.getElementById('tarifa-lista')?.focus() }}>
        <input type="search" aria-label={tr("Descripción del producto o código arancelario")} placeholder={tr("Ej. camiseta de algodón para adulto")} value={q}
          onChange={(e) => { setQ(e.target.value); setSel(null) }} />
        <button className="btn primario" disabled={q.trim().length < 2}>{tr("Buscar")}</button>
      </form>
      <div className="tarifa-ejemplos">{tr("Ejemplos de búsqueda")}{['Botella de acero', 'Bicicleta eléctrica'].map((texto) => <button type="button" key={texto} onClick={() => { setQ(texto); setSel(null) }}>{tr(texto)}</button>)}
      </div>
      <details className="tarifa-ayuda-movil"><summary>{tr("¿Cómo describo mi producto?")}</summary><p>{tr("Indicá el producto, el material y el uso. Por ejemplo, una camiseta de algodón para adulto.")}</p></details>

      {comparar.length > 0 && (
        <div className="comparacion">
          <div className="comp-cab"><b>{tr("Comparación de partidas")}</b> <small>{tr("Elige hasta 3. Lee las notas: definen qué entra en cada una.")}</small>
            <button type="button" className="link" onClick={() => setComparar([])}>{tr("Limpiar")}</button></div>
          <div className="comp-grid" style={{ gridTemplateColumns: `repeat(${comparar.length}, minmax(0, 1fr))` }}>
            {comparar.map((c) => {
              const it = ind.porCodigo.get(c)
              if (!it) return null
              const { cap: cp } = capituloDe(ind, c)
              return (
                <div key={c} className="comp-col">
                  <span className="codigo">{c}</span>
                  <p>{etiqueta(ind, c)}</p>
                  <dl>
                    <dt>{tr("Capítulo")}</dt><dd>{cp ? `${cp.n} · ${cp.title}` : '—'}</dd>
                    <dt>{tr("Partida")}</dt><dd>{ancestros(ind, c)[0]?.[1] ?? '—'}</dd>
                    <dt>{tr("DAI de referencia")}</dt><dd><b>{dai(it[2])}</b></dd>
                  </dl>
                  <div className="acciones">
                    <button type="button" className="btn primario" onClick={() => onUsar(aClasificacion(ind, c))}>{tr("Usar esta")}</button>
                    <button type="button" className="link" onClick={() => setSel(c)}>{tr("Ver notas")}</button>
                    <button type="button" className="link peligro" onClick={() => alternar(c)}>{tr("Quitar")}</button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div className="clasif-grid">
        <div className="col-lista" id="tarifa-lista" tabIndex={-1} aria-label={tr("Explorador del arancel")} role="region">
          {q.trim().length >= 2 ? (
            <>
              <p className="nota">{resultados.length ? tr("{0}{1} incisos encontrados", resultados.length, resultados.length === 40 ? '+' : '') : tr("Sin resultados: prueba con otras palabras (material, uso) o navega por capítulos.")}</p>
              <ul className="resultados">
                {resultados.map(({ item }) => (
                  <li key={item[0]}>
                    <button type="button" className={sel === item[0] ? 'activa' : ''} onClick={() => setSel(item[0])}>
                      <span className="codigo">{item[0]}</span>
                      <span className="desc">{etiqueta(ind, item[0])}</span>
                      <span className="tasa">{tr("DAI ")}{dai(item[2])}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <div className="arbol">
              <h3>{tr("Explorá por sección")}</h3>
              {ind.data.secciones.slice(0, todas ? undefined : 4).map((s) => (
                <details key={s.n}>
                  <summary><b>{ROMANOS[s.n]}</b> · {['Animales y productos de origen animal', 'Productos vegetales', 'Grasas y aceites', 'Alimentos, bebidas y tabaco'][s.n - 1] ?? s.title}</summary>
                  <p>{s.title}</p>
                  {ind.data.capitulos.filter((c) => c.s === s.n).map((c) => (
                    <div key={c.n} className="cap">
                      <button type="button" className="cap-btn" onClick={() => setCapAbierto(capAbierto === c.n ? null : c.n)}>
                        <span className="codigo">{tr("Cap. ")}{String(c.n).padStart(2, '0')}</span> {c.title}
                      </button>
                      {capAbierto === c.n && (
                        <ul className="items-cap">
                          {ind.data.items.filter((i) => Number(i[0].slice(0, 2)) === c.n).map((i) => (
                            <li key={i[0]} className={`niv-${nivel(i[0])}`}>
                              {esInciso(i[0]) ? (
                                <button type="button" onClick={() => setSel(i[0])} className={sel === i[0] ? 'activa' : ''}>
                                  <span className="codigo">{i[0]}</span> {i[1]} <span className="tasa">{dai(i[2])}</span>
                                </button>
                              ) : (
                                <span><span className="codigo">{i[0]}</span> {i[1]}</span>
                              )}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </details>
              ))}
              <button type="button" className="link" aria-expanded={todas} onClick={() => setTodas(!todas)}>{todas ? tr("Ver menos secciones") : tr("Ver todas las secciones")}</button>
            </div>
          )}
        </div>

        <div className="col-detalle">
          {detalle ? (
            <div className="detalle">
              <span className="codigo grande">{detalle[0]}</span>
              <h3>{etiqueta(ind, detalle[0])}</h3>
              <ol className="ruta">
                {sec && <li><b>{tr("Sección ")}{ROMANOS[sec.n]}</b> · {sec.title}</li>}
                {cap && <li><b>{tr("Capítulo ")}{cap.n}</b> · {cap.title}</li>}
                {camino.map((a) => <li key={a[0]}><span className="codigo">{a[0]}</span> {a[1]}</li>)}
                <li className="final"><span className="codigo">{detalle[0]}</span> {detalle[1]}</li>
              </ol>
              <div className="kpis dos">
                <div><span>{tr("DAI (arancel regional de referencia)")}</span><b>{dai(detalle[2])}</b></div>
                <div><span>{tr("Nivel")}</span><b>{digitos(detalle[0]).length}{tr(" dígitos")}</b></div>
              </div>
              <p className="nota">{tr("El DAI mostrado viene del Arancel Centroamericano. Costa Rica puede tener tasas propias en incisos no armonizados, además de Selectivo de Consumo, IVA reducido o preferencias por TLC: el agente las confirma.")}</p>
              <div className="acciones">
                <button className="btn primario" type="button" onClick={() => onUsar(aClasificacion(ind, detalle[0]))}>{tr("Agregar al cotizador")}</button>
                <button className="btn" type="button" onClick={() => alternar(detalle[0])} disabled={!comparar.includes(detalle[0]) && comparar.length >= 3}>
                  {comparar.includes(detalle[0]) ? tr("Quitar de la comparación") : tr("Comparar ({0}/3)", comparar.length)}
                </button>
                <a className="btn" href="https://www.hacienda.go.cr/tica/web/hdbaranc.aspx" target="_blank" rel="noreferrer">{tr("Verificar en TICA")}</a>
              </div>
              {cap?.notes && (
                <details className="notas" open>
                  <summary>{tr("Notas del capítulo ")}{cap.n}</summary>
                  <pre>{cap.notes}</pre>
                </details>
              )}
              {sec?.notes && (
                <details className="notas">
                  <summary>{tr("Notas de la sección ")}{ROMANOS[sec.n]}</summary>
                  <pre>{sec.notes}</pre>
                </details>
              )}
              <details className="notas">
                <summary>{tr("Reglas generales de interpretación")}</summary>
                <pre>{ind.data.reglas}</pre>
              </details>
            </div>
          ) : (
            <div className="detalle vacio">
              <div className="tarifa-guia"><h3>{tr("¿Cómo describo mi producto?")}</h3>
                <dl><dt>{tr("Producto")}</dt><dd>{tr("Camiseta")}</dd><dt>{tr("Material")}</dt><dd>{tr("Algodón")}</dd><dt>{tr("Uso")}</dt><dd>{tr("Vestir a un adulto")}</dd></dl>
              </div>
              <details className="notas">
                <summary>{tr("Reglas generales de interpretación")}</summary>
                <pre>{ind.data.reglas}</pre>
              </details>
            </div>
          )}
        </div>
      </div>
      <p>{tr("La clasificación es preliminar. Tu agente aduanero la confirma con la ficha técnica.")}</p>
      <p className="nota">{tr("Fuente: ")}{ind.data.fuente}{tr(". Versión preliminar: algunas descripciones largas pueden tener errores de extracción.")}</p>
    </section>
  )
}
