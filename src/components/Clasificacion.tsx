import { useEffect, useMemo, useState } from 'react'
import type { Partida } from '../data/arancel'
import {
  ancestros, aPartida, buscar, capituloDe, cargarArancel, digitos, esInciso, etiqueta, nivel, type Indice,
} from '../lib/arancel'

const ROMANOS = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI', 'XVII', 'XVIII', 'XIX', 'XX', 'XXI']
const dai = (v: string | null) => (v && /^\d/.test(v) ? `${v}%` : v === 'II' ? 'No armonizado' : '—')

interface Props { onUsar: (p: Partida) => void }

export function Clasificacion({ onUsar }: Props) {
  const [ind, setInd] = useState<Indice | null>(null)
  const [error, setError] = useState('')
  const [q, setQ] = useState('')
  const [sel, setSel] = useState<string | null>(null)
  const [capAbierto, setCapAbierto] = useState<number | null>(null)

  useEffect(() => { cargarArancel().then(setInd).catch((e) => setError(String(e.message || e))) }, [])

  const resultados = useMemo(() => (ind && q.trim().length >= 2 ? buscar(ind, q) : []), [ind, q])

  if (error) return <section className="panel"><p>{error}. Recarga la página para intentar de nuevo.</p></section>
  if (!ind) return <section className="panel"><p className="nota">Cargando el arancel completo…</p></section>

  const detalle = sel ? ind.porCodigo.get(sel) : null
  const camino = sel ? ancestros(ind, sel) : []
  const { cap, sec } = sel ? capituloDe(ind, sel) : { cap: undefined, sec: undefined }
  const totalIncisos = ind.incisos.length

  return (
    <section className="panel clasif">
      <h2>Clasificación arancelaria</h2>
      <p className="intro">
        Busca en el arancel completo: {totalIncisos.toLocaleString('es-CR')} incisos del Sistema Arancelario Centroamericano, con
        sus notas legales. La clasificación aquí es <b>preliminar</b>: el agente aduanero la confirma con la ficha técnica.
      </p>

      <input type="search" placeholder="Describe el producto (material, uso, tipo) o escribe un código…" value={q}
        onChange={(e) => { setQ(e.target.value); setSel(null) }} />

      <div className="clasif-grid">
        <div className="col-lista">
          {q.trim().length >= 2 ? (
            <>
              <p className="nota">{resultados.length ? `${resultados.length}${resultados.length === 40 ? '+' : ''} incisos encontrados` : 'Sin resultados: prueba con otras palabras (material, uso) o navega por capítulos.'}</p>
              <ul className="resultados">
                {resultados.map(({ item }) => (
                  <li key={item[0]}>
                    <button type="button" className={sel === item[0] ? 'activa' : ''} onClick={() => setSel(item[0])}>
                      <span className="codigo">{item[0]}</span>
                      <span className="desc">{etiqueta(ind, item[0])}</span>
                      <span className="tasa">DAI {dai(item[2])}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <div className="arbol">
              <p className="nota">O navega por secciones y capítulos:</p>
              {ind.data.secciones.map((s) => (
                <details key={s.n}>
                  <summary><b>Sección {ROMANOS[s.n]}</b> · {s.title}</summary>
                  {ind.data.capitulos.filter((c) => c.s === s.n).map((c) => (
                    <div key={c.n} className="cap">
                      <button type="button" className="cap-btn" onClick={() => setCapAbierto(capAbierto === c.n ? null : c.n)}>
                        <span className="codigo">Cap. {String(c.n).padStart(2, '0')}</span> {c.title}
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
            </div>
          )}
        </div>

        <div className="col-detalle">
          {detalle ? (
            <div className="detalle">
              <span className="codigo grande">{detalle[0]}</span>
              <h3>{etiqueta(ind, detalle[0])}</h3>
              <ol className="ruta">
                {sec && <li><b>Sección {ROMANOS[sec.n]}</b> · {sec.title}</li>}
                {cap && <li><b>Capítulo {cap.n}</b> · {cap.title}</li>}
                {camino.map((a) => <li key={a[0]}><span className="codigo">{a[0]}</span> {a[1]}</li>)}
                <li className="final"><span className="codigo">{detalle[0]}</span> {detalle[1]}</li>
              </ol>
              <div className="kpis dos">
                <div><span>DAI (arancel regional de referencia)</span><b>{dai(detalle[2])}</b></div>
                <div><span>Nivel</span><b>{digitos(detalle[0]).length} dígitos</b></div>
              </div>
              <p className="nota">
                El DAI mostrado viene del Arancel Centroamericano. Costa Rica puede tener tasas propias en incisos no armonizados,
                además de Selectivo de Consumo, IVA reducido o preferencias por TLC: el agente las confirma.
              </p>
              <div className="acciones">
                <button className="btn primario" type="button" onClick={() => onUsar(aPartida(ind, detalle[0]))}>Usar en el cotizador</button>
                <a className="btn" href="https://www.hacienda.go.cr/tica/web/hdbaranc.aspx" target="_blank" rel="noreferrer">Verificar en TICA</a>
              </div>
              {cap?.notes && (
                <details className="notas" open>
                  <summary>Notas del capítulo {cap.n}</summary>
                  <pre>{cap.notes}</pre>
                </details>
              )}
              {sec?.notes && (
                <details className="notas">
                  <summary>Notas de la sección {ROMANOS[sec.n]}</summary>
                  <pre>{sec.notes}</pre>
                </details>
              )}
              <details className="notas">
                <summary>Reglas generales de interpretación</summary>
                <pre>{ind.data.reglas}</pre>
              </details>
            </div>
          ) : (
            <div className="detalle vacio">
              <h3>Cómo clasificar mejor</h3>
              <ol>
                <li>Describe <b>qué es</b>, <b>de qué material</b> está hecho y <b>para qué se usa</b>.</li>
                <li>Abre el inciso y lee las <b>notas del capítulo</b>: dicen qué queda excluido.</li>
                <li>Si dudas entre dos incisos, aplica las <b>reglas generales</b> (la descripción más específica gana).</li>
                <li>Usa el inciso en el cotizador y pide la validación del agente.</li>
              </ol>
              <details className="notas">
                <summary>Reglas generales de interpretación</summary>
                <pre>{ind.data.reglas}</pre>
              </details>
            </div>
          )}
        </div>
      </div>
      <p className="nota">Fuente: {ind.data.fuente}. Versión preliminar: algunas descripciones largas pueden tener errores de extracción.</p>
    </section>
  )
}
