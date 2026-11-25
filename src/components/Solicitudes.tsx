import { useEffect, useState } from 'react'
import { datosFaltantes } from '../data/config'
import type { Perfil } from '../lib/almacen'
import { usd } from '../lib/formato'
import {
  cambiarSolicitud, ESTADOS_SOLICITUD, listarCotizacionesNube, listarSolicitudes, perfilDeCot, TIPOS_SOLICITUD,
  type CotNube, type EstadoSolicitud, type Solicitud,
} from '../lib/nube'
import type { Apertura } from './Cotizador'
import { desdeNube } from './MisCotizaciones'

const fecha = (s: string) => new Date(s).toLocaleString('es-CR', { dateStyle: 'medium', timeStyle: 'short' })

/** Detalle legible de lo que envió el prospecto. */
function Detalle({ s }: { s: Solicitud }) {
  const d = s.datos as Record<string, unknown>
  const res = d.resumen as { total?: number; dias?: number; estado?: string } | undefined
  const pares = Object.entries(d).filter(([k, v]) => !['embarque', 'productos', 'resumen'].includes(k) && v !== '' && !(Array.isArray(v) && !v.length))
  return (
    <dl className="detalle-sol">
      {res && <><dt>Estimación</dt><dd>{usd(res.total ?? 0)} · {res.dias} días · {res.estado}</dd></>}
      {Array.isArray(d.productos) && <><dt>Productos</dt><dd>{(d.productos as { nombre?: string; cantidad?: number }[]).map((p) => `${p.nombre} (${p.cantidad})`).join(', ')}</dd></>}
      {pares.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{Array.isArray(v) ? v.join(', ') : String(v)}</dd></div>)}
    </dl>
  )
}

/** Bandeja del personal de LANDEX: solicitudes de la web y cotizaciones que los clientes enviaron. Semilla del CRM. */
export function Solicitudes({ perfilBase, onAbrir }: { perfilBase: Perfil; onAbrir: (a: Omit<Apertura, 'vez'>) => void }) {
  const [sols, setSols] = useState<Solicitud[]>([])
  const [cots, setCots] = useState<CotNube[]>([])
  const [error, setError] = useState('')
  const [filtro, setFiltro] = useState<EstadoSolicitud | 'abiertas' | 'todas'>('abiertas')
  const [notas, setNotas] = useState<Record<string, string>>({})
  const faltan = datosFaltantes()

  const cargar = async () => {
    try {
      setSols(await listarSolicitudes())
      const { datos } = await listarCotizacionesNube()
      setCots(datos.filter((c) => c.estado === 'solicitada'))
      setError('')
    } catch (e) { setError((e as Error).message) }
  }
  useEffect(() => { cargar() }, [])

  const cambiar = async (s: Solicitud, c: { estado?: EstadoSolicitud; notas?: string }) => {
    const err = await cambiarSolicitud(s.id, c)
    if (err) { setError(err); return }
    setSols((xs) => xs.map((x) => (x.id === s.id ? { ...x, ...c } : x)))
  }
  const visibles = sols.filter((s) => filtro === 'todas' || (filtro === 'abiertas' ? !['cerrado', 'descartado'].includes(s.estado) : s.estado === filtro))

  return (
    <section className="panel solicitudes">
      <h2>Solicitudes</h2>
      <p className="intro">Lo que llega desde la web: cotizaciones que los clientes enviaron, pedidos de desalmacenaje, empresas y personas sin cuenta que quieren importar.</p>
      {faltan.length > 0 && <p className="aviso">Datos corporativos sin configurar (no se muestran en la web): {faltan.join(', ')}.</p>}
      {error && <p className="error" role="alert">{error}</p>}

      <h3>Cotizaciones enviadas por clientes <small>{cots.length}</small></h3>
      {cots.length ? (
        <div className="tabla-scroll"><table className="tabla">
          <thead><tr><th>Número</th><th>Cliente</th><th>Pidió</th><th>Total estimado</th><th>Enviada</th><th></th></tr></thead>
          <tbody>{cots.map((c) => (
            <tr key={c.id}>
              <td>{c.numero}</td>
              <td>{c.perfiles?.nombre || c.perfiles?.email}<small>{c.perfiles?.empresa} {c.perfiles?.telefono}</small></td>
              <td>{c.datos.embarque.intencion === 'contratar' ? 'Quiere importar' : 'Cotización formal'}</td>
              <td>{c.total != null ? usd(c.total) : '—'}</td>
              <td>{fecha(c.actualizada)}</td>
              <td><button type="button" className="link" onClick={() => onAbrir({ cotizacion: desdeNube(c), nube: c, cliente: perfilDeCot(c, perfilBase) })}>Abrir y preparar formal</button></td>
            </tr>
          ))}</tbody>
        </table></div>
      ) : <p className="nota">No hay cotizaciones pendientes.</p>}

      <h3>Solicitudes desde la web <small>{visibles.length}</small></h3>
      <div className="filtros">
        {(['abiertas', 'todas', ...Object.keys(ESTADOS_SOLICITUD)] as const).map((f) => (
          <button key={f} type="button" className={filtro === f ? 'activa' : ''} onClick={() => setFiltro(f as typeof filtro)}>
            {f === 'abiertas' ? 'Abiertas' : f === 'todas' ? 'Todas' : ESTADOS_SOLICITUD[f as EstadoSolicitud]}
          </button>
        ))}
        <button type="button" className="link" onClick={cargar}>Actualizar</button>
      </div>
      {visibles.length ? (
        <ul className="lista-sol">{visibles.map((s) => (
          <li key={s.id} className={`sol ${s.estado}`}>
            <div className="sol-cab">
              <span className="tipo">{TIPOS_SOLICITUD[s.tipo]}</span>
              <b>{s.nombre}</b>{s.empresa && <span> · {s.empresa}</span>}
              <span className="fecha">{fecha(s.creada)}</span>
            </div>
            <div className="sol-contacto">
              <a href={`mailto:${s.correo}`}>{s.correo}</a>{s.telefono && <> · <a href={`tel:${s.telefono}`}>{s.telefono}</a></>}
              {s.usuario_id && <span className="sello">con cuenta</span>}
            </div>
            <Detalle s={s} />
            <div className="sol-acciones">
              <label>Estado
                <select value={s.estado} onChange={(e) => cambiar(s, { estado: e.target.value as EstadoSolicitud })}>
                  {Object.entries(ESTADOS_SOLICITUD).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </label>
              <label className="ancho">Notas internas
                <textarea rows={2} value={notas[s.id] ?? s.notas} onChange={(e) => setNotas({ ...notas, [s.id]: e.target.value })}
                  onBlur={() => notas[s.id] !== undefined && notas[s.id] !== s.notas && cambiar(s, { notas: notas[s.id] })} />
              </label>
              {s.tipo === 'importacion' && Array.isArray((s.datos as { productos?: unknown }).productos) && (
                <button type="button" className="btn" onClick={() => {
                  const d = s.datos as { embarque: CotNube['datos']['embarque']; productos: CotNube['datos']['productos']; resumen?: { total?: number } }
                  onAbrir({ copia: true, cotizacion: { numero: 'Solicitud web', fecha: s.creada, vigenciaDias: 15, nombre: s.nombre, embarque: d.embarque, productos: d.productos, total: d.resumen?.total ?? 0, estado: 'estimada', actualizada: s.creada } })
                }}>Abrir en el cotizador</button>
              )}
            </div>
          </li>
        ))}</ul>
      ) : <p className="nota">No hay solicitudes {filtro === 'abiertas' ? 'abiertas' : 'con ese estado'}.</p>}
    </section>
  )
}
