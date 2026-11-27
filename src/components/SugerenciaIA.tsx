import { tr } from '../lib/idioma'
import { useState } from 'react'
import { aClasificacion, etiqueta, type Indice } from '../lib/arancel'
import type { Clasificacion } from '../lib/landed'
import {
  candidatosValidos, incisosDePartidas, partidasValidas, pedirIncisos, pedirPartidas,
  type CandidatoIA, type PartidaIA,
} from '../lib/ia'

interface Props {
  ind: Indice
  descripcion: string
  conectado: boolean
  onIngresar: () => void
  onElegir: (c: Clasificacion) => void
  /** Para cuentas gratis: filtra el buscador por la partida sugerida. */
  onBuscarPartida: (codigo: string) => void
}

const dai = (v: string | null | undefined) => (v && /^\d/.test(v) ? `${v}%` : '—')

/** LANDEX AI dentro de la cotización: sugiere la partida a partir de lo que el cliente ya escribió. */
export function SugerenciaIA({ ind, descripcion, conectado, onIngresar, onElegir, onBuscarPartida }: Props) {
  const [estado, setEstado] = useState<'' | 'partidas' | 'incisos'>('')
  const [error, setError] = useState('')
  const [partidas, setPartidas] = useState<PartidaIA[]>([])
  const [candidatos, setCandidatos] = useState<CandidatoIA[]>([])
  const [gratis, setGratis] = useState(false)

  if (!conectado) {
    return (
      <div className="sug-ia">
        <p><b>{tr("LANDEX AI")}</b>{tr(" puede sugerirte la partida a partir de tu descripción. Ingresa gratis con tu correo para usarlo.")}</p>
        <button type="button" className="btn" onClick={onIngresar}>{tr("Ingresar y usar LANDEX AI")}</button>
      </div>
    )
  }

  const pedir = async () => {
    setError(''); setPartidas([]); setCandidatos([]); setEstado('partidas')
    const a = await pedirPartidas(descripcion)
    if (a.error || !a.r) { setError(a.error ?? 'Sin respuesta.'); setEstado(''); return }
    const ps = partidasValidas(ind, a.r.partidas ?? [])
    setPartidas(ps)
    if (!ps.length) { setError('No encontré una partida clara. Agrega material y uso a la descripción.'); setEstado(''); return }
    if (a.meta.nivel === 'gratis') { setGratis(true); setEstado(''); return }
    setEstado('incisos')
    const b = await pedirIncisos(descripcion, incisosDePartidas(ind, ps.map((p) => p.codigo)))
    setEstado('')
    if (b.error || !b.r) { setError(b.error ?? 'Sin respuesta.'); return }
    setCandidatos(candidatosValidos(ind, b.r.candidatos ?? []))
  }

  return (
    <div className="sug-ia">
      {!partidas.length && !candidatos.length && (
        <>
          <p><b>{tr("LANDEX AI")}</b>{tr(" te sugiere la partida con lo que ya escribiste: ")}<i>"{descripcion}"</i>.</p>
          <button type="button" className="btn primario" disabled={estado !== '' || descripcion.trim().length < 4} onClick={pedir}>
            {estado === 'partidas' ? tr("Identificando partidas… (unos segundos)") : estado === 'incisos' ? tr("Comparando incisos… (unos segundos)") : tr("Sugerir con LANDEX AI")}
          </button>
          {descripcion.trim().length < 4 && <small className="nota">{tr("Escribe primero el nombre y la descripción del producto.")}</small>}
        </>
      )}
      {estado === 'incisos' && <p className="nota">{tr("Comparando incisos… (unos segundos)")}</p>}
      {error && <p className="ai-error" role="alert">{tr(error)}</p>}
      {candidatos.length > 0 && (
        <ul className="partidas">
          {candidatos.map((c) => (
            <li key={c.codigo}><button type="button" onClick={() => onElegir(aClasificacion(ind, c.codigo))}>
              <span className="codigo">{c.codigo}</span>
              <span className="desc">{etiqueta(ind, c.codigo)}<small>{tr(" · Confianza ")}{c.confianza}. {c.razon}</small></span>
              <span className="tasa">{tr("DAI ")}{dai(ind.porCodigo.get(c.codigo)?.[2])}</span>
            </button></li>
          ))}
        </ul>
      )}
      {gratis && partidas.length > 0 && (
        <>
          <p className="nota">{tr("Partidas más probables. Toca una para ver sus incisos y elegir el tuyo:")}</p>
          <ul className="partidas">
            {partidas.map((p) => (
              <li key={p.codigo}><button type="button" onClick={() => onBuscarPartida(p.codigo)}>
                <span className="codigo">{p.codigo}</span><span className="desc">{p.razon}</span>
              </button></li>
            ))}
          </ul>
          <small className="nota">{tr("Los clientes LANDEX reciben el inciso exacto directamente.")}</small>
        </>
      )}
    </div>
  )
}
