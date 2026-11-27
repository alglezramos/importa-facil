import { formatoRegional } from '../lib/idioma'
import { tr } from '../lib/idioma'
import { useEffect, useState } from 'react'
import { ORIGENES } from '../data/config'
import { eliminarCotizacion, listarCotizaciones, venceEl, VIGENCIA_DIAS, type CotizacionGuardada, type Perfil } from '../lib/almacen'
import { usd } from '../lib/formato'
import { calcularLanded } from '../lib/landed'
import {
  BLOQUEADA, eliminarCotizacionNube, esStaff, ESTADOS_NUBE, guardarCotizacionNube, listarCotizacionesNube, perfilDeCot,
  type CotNube, type Usuario,
} from '../lib/nube'
import type { Apertura } from './Cotizador'

interface Props {
  usuario: Usuario | null
  perfilBase: Perfil
  onAbrir: (a: Omit<Apertura, 'vez'>) => void
  onNueva: () => void
  onIniciarSesion: () => void
}

/** Convierte una cotización de la nube al formato que abre el cotizador. */
export const desdeNube = (c: CotNube): CotizacionGuardada => ({
  numero: c.numero, fecha: c.creada, vigenciaDias: VIGENCIA_DIAS, nombre: c.nombre, embarque: c.datos.embarque,
  productos: c.datos.productos, total: c.total ?? 0, estado: c.estado === 'incompleta' ? 'incompleta' : 'estimada',
  actualizada: c.actualizada, emision: c.emision ?? undefined,
})

export function MisCotizaciones({ usuario, perfilBase, onAbrir, onNueva, onIniciarSesion }: Props) {
  const [locales, setLocales] = useState(listarCotizaciones)
  const [nubeLista, setNubeLista] = useState<CotNube[]>([])
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')
  const [msg, setMsg] = useState('')
  const [filtro, setFiltro] = useState('')
  const [confirmar, setConfirmar] = useState<string | null>(null)
  const staff = esStaff(usuario)
  const hoy = new Date()

  const cargar = async () => {
    if (!usuario) return
    setCargando(true)
    const { datos, error: e } = await listarCotizacionesNube()
    setNubeLista(datos); setError(e ?? ''); setCargando(false)
  }
  useEffect(() => { cargar() }, [usuario?.id]) // eslint-disable-line

  const subirLocales = async () => {
    setMsg('Subiendo…')
    let ok = 0
    for (const c of locales) {
      const origen = ORIGENES.find((o) => o.id === c.embarque.origenId) ?? ORIGENES[0]
      const r = calcularLanded({ ...c.embarque, origen }, c.productos)
      const { error: e } = await guardarCotizacionNube(undefined, c.nombre, c.embarque, c.productos, r, r.estado)
      if (!e) { eliminarCotizacion(c.numero); ok++ }
    }
    setLocales(listarCotizaciones())
    setMsg(`${ok} cotización(es) pasadas a tu cuenta, con número nuevo.`)
    cargar()
  }

  const q = filtro.trim().toLowerCase()
  const visibles = nubeLista.filter((c) => !q || [c.numero, c.nombre, c.perfiles?.empresa, c.perfiles?.nombre, c.perfiles?.email].some((x) => x?.toLowerCase().includes(q)))

  return (
    <section className="panel">
      <div className="fila-estado">
        <h2>{staff ? tr("Cotizaciones de clientes") : tr("Mis cotizaciones")}</h2>
        <button type="button" className="btn primario" onClick={onNueva}>{tr("+ Nueva cotización")}</button>
      </div>

      {usuario ? (
        <>
          <p className="intro">{staff ? tr("Todas las cotizaciones guardadas por los clientes y por la agencia.") : tr("Cotizaciones guardadas en tu cuenta LANDEX: las ves desde cualquier dispositivo.")}</p>
          {locales.length > 0 && (
            <div className="aviso-agencia">{tr("Tienes ")}{locales.length}{tr(" cotización(es) guardada(s) solo en este navegador.")}{' '}
              <button type="button" className="link" onClick={subirLocales}>{tr("Pasarlas a mi cuenta")}</button>
            </div>
          )}
          {msg && <p className="nota" role="status">{tr(msg)}</p>}
          {error && <p className="nota error" role="alert">{tr(error)}</p>}
          {staff && <input type="search" placeholder={tr("Buscar por número, cliente o empresa…")} value={filtro} onChange={(e) => setFiltro(e.target.value)} />}
          {cargando ? <p className="nota">{tr("Cargando…")}</p> : visibles.length === 0 ? (
            <p className="nota">{tr("Todavía no hay cotizaciones")}{q ? tr(" con esa búsqueda") : ''}{tr(". En el cotizador usa \"Guardar cotización\".")}</p>
          ) : (
            <div className="scroll">
              <table className="tabla">
                <thead><tr><th>{tr("Número")}</th>{staff && <th>{tr("Cliente")}</th>}<th>{tr("Nombre")}</th><th>{tr("Actualizada")}</th><th>{tr("Estado")}</th><th className="num">{tr("Total")}</th><th></th></tr></thead>
                <tbody>
                  {visibles.map((c) => {
                    const vencida = c.estado === 'formal' && c.emision && c.emision.vence < hoy.toISOString().slice(0, 10)
                    const borrable = staff ? usuario.rol === 'operador' : !BLOQUEADA.includes(c.estado) && c.estado !== 'formal'
                    return (
                      <tr key={c.id}>
                        <td className="codigo">{c.numero}</td>
                        {staff && <td>{c.perfiles?.empresa || c.perfiles?.nombre || '—'}<small>{c.perfiles?.email}</small></td>}
                        <td>{c.nombre}<small>{c.datos.productos.length}{tr(" producto(s)")}</small></td>
                        <td>{new Date(c.actualizada).toLocaleDateString(formatoRegional())}</td>
                        <td>
                          <span className={`sello ${c.estado === 'formal' || c.estado === 'aceptada' ? 'validada' : c.estado === 'incompleta' ? 'pend' : ''}`}>{tr(ESTADOS_NUBE[c.estado])}</span>
                          {vencida && <span className="sello no">{tr("Vencida")}</span>}
                          {c.estado === 'formal' && c.emision && !vencida && <small>{tr("vence el ")}{c.emision.vence}</small>}
                        </td>
                        <td className="num">{c.total != null ? usd(Number(c.total)) : '—'}</td>
                        <td className="mini-acc">
                          <button type="button" className="link" onClick={() => onAbrir({ cotizacion: desdeNube(c), nube: c, cliente: perfilDeCot(c, perfilBase) })}>{tr("Abrir")}</button>
                          {!staff && <button type="button" className="link" onClick={() => onAbrir({ cotizacion: desdeNube(c), copia: true })}>{tr("Duplicar")}</button>}
                          {borrable && (confirmar === c.id ? (
                            <>
                              <button type="button" className="link peligro" onClick={async () => { const e = await eliminarCotizacionNube(c.id); setConfirmar(null); if (e) setError(e); else cargar() }}>{tr("Confirmar")}</button>
                              <button type="button" className="link" onClick={() => setConfirmar(null)}>{tr("Cancelar")}</button>
                            </>
                          ) : (
                            <button type="button" className="link peligro" onClick={() => setConfirmar(c.id)}>{tr("Eliminar")}</button>
                          ))}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      ) : (
        <>
          <p className="intro">{tr("Cotizaciones guardadas en este navegador.")}{' '}
            <button type="button" className="link" onClick={onIniciarSesion}>{tr("Inicia sesión")}</button>{tr(" para guardarlas en tu cuenta, verlas desde cualquier dispositivo, subir documentos y recibir cotizaciones formales.")}</p>
          {locales.length === 0 ? (
            <p className="nota">{tr("Todavía no has guardado cotizaciones. En el cotizador usa \"Guardar cotización\".")}</p>
          ) : (
            <div className="scroll">
              <table className="tabla">
                <thead><tr><th>{tr("Número")}</th><th>{tr("Nombre")}</th><th>{tr("Fecha")}</th><th>{tr("Vigencia")}</th><th>{tr("Estado")}</th><th className="num">{tr("Total")}</th><th></th></tr></thead>
                <tbody>
                  {locales.map((c) => {
                    const vence = venceEl(c)
                    const vencida = vence < hoy
                    return (
                      <tr key={c.numero}>
                        <td className="codigo">{c.numero}</td>
                        <td>{c.nombre}<small>{c.productos.length}{tr(" producto(s)")}</small></td>
                        <td>{new Date(c.fecha).toLocaleDateString(formatoRegional())}</td>
                        <td>{vencida ? <span className="sello no">{tr("Vencida")}</span> : tr("hasta {0}", vence.toLocaleDateString(formatoRegional()))}</td>
                        <td><span className={`sello ${c.emision ? 'validada' : c.estado === 'incompleta' ? 'pend' : ''}`}>{c.emision ? tr("Formal") : c.estado === 'incompleta' ? tr("Incompleta") : tr("Estimada")}</span></td>
                        <td className="num">{usd(c.total)}</td>
                        <td className="mini-acc">
                          <button type="button" className="link" onClick={() => onAbrir({ cotizacion: c })}>{tr("Abrir")}</button>
                          <button type="button" className="link" onClick={() => onAbrir({ cotizacion: c, copia: true })}>{tr("Duplicar")}</button>
                          {confirmar === c.numero ? (
                            <>
                              <button type="button" className="link peligro" onClick={() => { eliminarCotizacion(c.numero); setLocales(listarCotizaciones()); setConfirmar(null) }}>{tr("Confirmar")}</button>
                              <button type="button" className="link" onClick={() => setConfirmar(null)}>{tr("Cancelar")}</button>
                            </>
                          ) : (
                            <button type="button" className="link peligro" onClick={() => setConfirmar(c.numero)}>{tr("Eliminar")}</button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </section>
  )
}
