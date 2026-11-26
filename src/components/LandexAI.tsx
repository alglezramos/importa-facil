import { useState } from 'react'
import type { Clasificacion as Cls } from '../lib/landed'
import { aClasificacion, etiqueta, type Indice } from '../lib/arancel'
import {
  candidatosValidos, incisosDePartidas, leerImagen, otorgarAcceso, partidasValidas, pedirIncisos, pedirPartidas,
  type CandidatoIA, type Imagen, type NivelIA, type PartidaIA,
} from '../lib/ia'

interface Props {
  ind: Indice
  conectado: boolean
  onIngresar: () => void
  onUsar: (c: Cls, desc?: string) => void
  onVer: (codigo: string) => void
  onCotizar: () => void
  equipo?: boolean
}

const dai = (v: string | null | undefined) => (v && /^\d/.test(v) ? `${v}%` : v === 'II' ? 'No armonizado' : '—')
const EJEMPLOS = ['Sillas de oficina con base de metal, asiento acolchado y ruedas', 'Audífonos inalámbricos bluetooth con estuche de carga', 'Camisetas de algodón 100 % para hombre, tejido de punto']

// Ejemplo real resuelto por LANDEX AI (prueba del 25-11-2026), para visitantes sin cuenta.
const EJEMPLO = {
  desc: 'Sillas de oficina con base de metal, asiento acolchado y ruedas',
  codigo: '9401.39.00.00',
  razon: 'Las sillas de oficina con ruedas suelen ser giratorias con altura regulable; ese inciso es más específico que los de armazón de metal. Se confirma solo si el asiento gira y sube o baja.',
}

function PanelAccesos() {
  const [correo, setCorreo] = useState('')
  const [msg, setMsg] = useState('')
  const valido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo.trim())
  const accion = async (dar: boolean) => { const e = await otorgarAcceso(correo, dar); setMsg(e ?? (dar ? `${correo.trim()} ya tiene LANDEX AI completo.` : `Se quitó el acceso completo a ${correo.trim()}.`)) }
  return (
    <details className="ai-admin">
      <summary>Equipo: dar acceso completo a un cliente</summary>
      <p>Los clientes con una cotización aceptada, en proceso o cerrada ya lo tienen. Aquí puedes dárselo a mano a otro cliente.</p>
      <div className="ai-acciones">
        <input type="email" value={correo} placeholder="correo@cliente.com" onChange={(e) => setCorreo(e.target.value)} />
        <button type="button" className="btn primario" disabled={!valido} onClick={() => accion(true)}>Dar acceso</button>
        <button type="button" className="btn" disabled={!valido} onClick={() => accion(false)}>Quitar</button>
      </div>
      {msg && <small role="status">{msg}</small>}
    </details>
  )
}

export function LandexAI({ ind, conectado, onIngresar, onUsar, onVer, onCotizar, equipo }: Props) {
  const [nivel, setNivel] = useState<NivelIA | undefined>()
  const [restantes, setRestantes] = useState<number | undefined>()
  const [desc, setDesc] = useState('')
  const [imagen, setImagen] = useState<Imagen | null>(null)
  const [nombreImg, setNombreImg] = useState('')
  const [paso, setPaso] = useState<'' | 'partidas' | 'incisos'>('')
  const [error, setError] = useState('')
  const [resumen, setResumen] = useState('')
  const [partidas, setPartidas] = useState<PartidaIA[]>([])
  const [candidatos, setCandidatos] = useState<CandidatoIA[]>([])
  const [preguntas, setPreguntas] = useState<string[]>([])
  const [advertencia, setAdvertencia] = useState('')
  const [listo, setListo] = useState(false)

  const analizar = async () => {
    setError(''); setListo(false); setCandidatos([]); setPartidas([]); setPreguntas([]); setAdvertencia(''); setResumen('')
    setPaso('partidas')
    const a = await pedirPartidas(desc, imagen ?? undefined)
    if (a.meta.nivel) setNivel(a.meta.nivel)
    if (a.meta.restantes !== undefined) setRestantes(a.meta.restantes)
    if (a.error || !a.r) { setError(a.error ?? 'Sin respuesta.'); setPaso(''); return }
    const ps = partidasValidas(ind, a.r.partidas ?? [])
    setResumen(a.r.resumen ?? ''); setPartidas(ps)
    if (!ps.length) { setPreguntas(a.r.preguntas ?? []); setError('No encontré partidas válidas con esa descripción. Agrega material, uso y forma del producto.'); setPaso(''); return }
    if (a.meta.nivel === 'gratis') { setPreguntas(a.r.preguntas ?? []); setPaso(''); setListo(true); return }
    setPaso('incisos')
    const b = await pedirIncisos(desc, incisosDePartidas(ind, ps.map((p) => p.codigo)))
    setPaso('')
    if (b.error || !b.r) { setError(b.error ?? 'Sin respuesta.'); return }
    setCandidatos(candidatosValidos(ind, b.r.candidatos ?? []))
    setPreguntas([...(a.r.preguntas ?? []), ...(b.r.preguntas ?? [])].filter((x, i, xs) => x && xs.indexOf(x) === i).slice(0, 4))
    setAdvertencia(b.r.advertencia ?? '')
    setListo(true)
  }

  const foto = async (f?: File) => {
    if (!f) return
    try { setImagen(await leerImagen(f)); setNombreImg(f.name); setError('') } catch (e) { setError((e as Error).message) }
  }

  const ocupado = paso !== ''
  return (
    <div className="ai">
      <div className="ai-cab">
        <span className="ai-marca">LANDEX <b>AI</b></span>
        <h2>Clasifica tu producto con inteligencia artificial</h2>
        <p>Descríbelo con tus palabras o sube una foto. LANDEX AI aplica las reglas del Sistema Armonizado y te propone los incisos más probables del arancel oficial de Costa Rica.</p>
      </div>

      {!conectado ? (
        <div className="ai-entrar">
          <div className="ai-cand top ai-ejemplo">
            <small>Ejemplo resuelto por LANDEX AI</small>
            <p className="ai-texto">"{EJEMPLO.desc}"</p>
            <div className="ai-cand-cab"><span className="codigo">{EJEMPLO.codigo}</span><span className="tasa">DAI {dai(ind.porCodigo.get(EJEMPLO.codigo)?.[2])}</span></div>
            <p className="ai-por">{EJEMPLO.razon}</p>
          </div>
          <p>Crea tu cuenta gratis con tu correo y prueba LANDEX AI con 3 clasificaciones al mes. Los clientes LANDEX lo usan completo.</p>
          <button type="button" className="btn primario" onClick={onIngresar}>Ingresar y probar LANDEX AI</button>
        </div>
      ) : (
        <>
          <textarea rows={3} maxLength={2000} value={desc} onChange={(e) => setDesc(e.target.value)}
            placeholder="Qué es, de qué material está hecho, para qué sirve y cómo viene presentado…" />
          <div className="ai-ejemplos">
            {EJEMPLOS.map((x) => <button type="button" key={x} className="chip" onClick={() => setDesc(x)}>{x}</button>)}
          </div>
          <div className="ai-acciones">
            <label className="btn ai-foto">
              {nombreImg ? `Foto: ${nombreImg}` : 'Agregar foto (opcional)'}
              <input type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(e) => foto(e.target.files?.[0])} />
            </label>
            {imagen && <button type="button" className="link" onClick={() => { setImagen(null); setNombreImg('') }}>Quitar foto</button>}
            <button type="button" className="btn primario" disabled={ocupado || desc.trim().length < 4} onClick={analizar}>
              {paso === 'partidas' ? 'Identificando partidas…' : paso === 'incisos' ? 'Comparando incisos…' : 'Clasificar con LANDEX AI'}
            </button>
          </div>
          {nivel === 'gratis' && restantes !== undefined && <p className="ai-cupo">Te quedan {restantes} de 3 clasificaciones gratis este mes.</p>}
          {nivel === 'cliente' && <p className="ai-cupo">Cliente LANDEX: acceso completo.</p>}
        </>
      )}

      {error && <><p className="ai-error" role="alert">{error}</p>{nivel === 'gratis' && <button type="button" className="btn primario" onClick={onCotizar}>Cotizar con LANDEX</button>}</>}

      {(resumen || partidas.length > 0) && (
        <div className="ai-razon">
          {resumen && <p><b>Entendí:</b> {resumen}</p>}
          {partidas.length > 0 && nivel !== 'gratis' && <p className="nota">Partidas analizadas: {partidas.map((p) => p.codigo).join(' · ')}</p>}
        </div>
      )}

      {listo && nivel === 'gratis' && (
        <div className="ai-resultados">
          {partidas.map((p, i) => (
            <div key={p.codigo} className={`ai-cand ${i === 0 ? 'top' : ''}`}>
              <div className="ai-cand-cab"><span className="codigo">Partida {p.codigo}</span>{i === 0 && <span className="conf alta">Más probable</span>}</div>
              <p className="ai-por">{p.razon}</p>
            </div>
          ))}
          <div className="ai-bloqueo">
            <b>🔒 Inciso exacto de 10 dígitos y su DAI</b>
            <p>Cotiza tu importación con LANDEX y nuestro equipo te da la clasificación completa, validada por el agente aduanero. Los clientes LANDEX usan LANDEX AI completo.</p>
            <button type="button" className="btn primario" onClick={onCotizar}>Cotizar con LANDEX</button>
          </div>
          {preguntas.length > 0 && <div className="ai-preguntas"><b>Para afinar la clasificación:</b><ul>{preguntas.map((q) => <li key={q}>{q}</li>)}</ul></div>}
        </div>
      )}

      {listo && nivel !== 'gratis' && (
        <div className="ai-resultados" aria-live="polite">
          {candidatos.length === 0 ? <p>No hubo un inciso claro. Responde las preguntas de abajo y vuelve a intentar, o búscalo manualmente.</p> : candidatos.map((c, i) => {
            const it = ind.porCodigo.get(c.codigo)
            return (
              <div key={c.codigo} className={`ai-cand ${i === 0 ? 'top' : ''}`}>
                <div className="ai-cand-cab">
                  <span className="codigo">{c.codigo}</span>
                  <span className={`conf ${c.confianza}`}>Confianza {c.confianza}</span>
                  <span className="tasa">DAI {dai(it?.[2])}</span>
                </div>
                <p className="ai-texto">{etiqueta(ind, c.codigo)}</p>
                <p className="ai-por">{c.razon}</p>
                <div className="acciones">
                  <button type="button" className="btn primario" onClick={() => onUsar(aClasificacion(ind, c.codigo), desc.trim())}>Usar en mi cotización</button>
                  <button type="button" className="link" onClick={() => onVer(c.codigo)}>Ver notas legales</button>
                </div>
              </div>
            )
          })}
          {preguntas.length > 0 && (
            <div className="ai-preguntas"><b>Para afinar la clasificación:</b><ul>{preguntas.map((p) => <li key={p}>{p}</li>)}</ul>
              <small>Agrega esos datos a la descripción y vuelve a clasificar.</small></div>
          )}
          {advertencia && <p className="nota">⚠ {advertencia}</p>}
        </div>
      )}

      {equipo && <PanelAccesos />}

      <p className="ai-legal">Clasificación preliminar generada por IA. Los códigos se verifican contra el arancel oficial y el DAI mostrado viene del arancel, no de la IA. El agente aduanero de LANDEX la confirma con la ficha técnica antes de la cotización formal.</p>
    </div>
  )
}
