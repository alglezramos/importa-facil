import { useEffect, useState } from 'react'
import { MODOS, ORIGENES } from '../data/config'
import { usd } from '../lib/formato'
import { ESTADOS_NUBE, esStaff, listarCotizacionesNube, listarSolicitudes, perfilDeCot, type CotNube, type Solicitud, type Usuario } from '../lib/nube'
import type { Perfil } from '../lib/almacen'
import { desdeNube } from './MisCotizaciones'
import type { Apertura } from './Cotizador'
import { Track, Finanzas } from './Operaciones'
import { Proveedores } from './Gestion'
import { Connect } from './Connect'

interface Props {
  usuario: Usuario
  perfil: Perfil
  onAbrir: (a: Omit<Apertura, 'vez'>) => void
  onCotizaciones: () => void
  onSolicitudes: () => void
  onTarifas: () => void
  onNueva?: () => void
}

const activos = (c: CotNube) => c.estado === 'aceptada' || c.estado === 'en_proceso'

export function Portal({ usuario, perfil, onAbrir, onCotizaciones, onSolicitudes, onTarifas, onNueva = onCotizaciones }: Props) {
  const staff = esStaff(usuario)
  const [seleccion, setSeleccion] = useState<string | null>(null)
  const [verProveedores, setVerProveedores] = useState(false)
  const [cots, setCots] = useState<CotNube[]>([])
  const [sols, setSols] = useState<Solicitud[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [version, setVersion] = useState(0)
  useEffect(() => {
    let vigente = true
    setCargando(true); setError(''); setCots([]); setSols([])
    Promise.all([listarCotizacionesNube(), staff ? listarSolicitudes() : Promise.resolve([])])
      .then(([r, s]) => {
        if (!vigente) return
        if (r.error) throw new Error(r.error)
        setCots(staff ? r.datos : r.datos.filter((c) => c.cliente_id === usuario.id))
        setSols(s)
      }).catch(() => { if (vigente) setError('No se pudieron cargar los datos. Intenta actualizar.') })
      .finally(() => { if (vigente) setCargando(false) })
    return () => { vigente = false }
  }, [usuario.id, staff, version])
  const operaciones = cots.filter((c) => activos(c) || c.estado === 'cerrada')
  const abiertas = cots.filter(activos)
  const seleccionada = operaciones.find(c => c.id === seleccion)
  const formales = cots.filter((c) => c.estado === 'formal')
  const solicitudes = sols.filter((s) => s.estado !== 'cerrado' && s.estado !== 'descartado')
  const productos = new Map<string, { nombre: string; sku: string }>()
  if (!staff) for (const c of cots) for (const p of c.datos.productos) {
    const clave = JSON.stringify([p.sku, p.nombre, p.paisFabricacion])
    productos.set(clave, { nombre: p.nombre, sku: p.sku })
  }
  const abrir = (c: CotNube) => onAbrir({ cotizacion: desdeNube(c), nube: c, cliente: perfilDeCot(c, perfil) })
  const ruta = (c: CotNube) => `${ORIGENES.find((o) => o.id === c.datos.embarque.origenId)?.nombre ?? 'Origen por confirmar'} → Costa Rica · ${MODOS[c.datos.embarque.modo]}`
  if (!staff) {
    const enRevision = cots.filter((c) => c.estado === 'solicitada')
    const porAceptar = formales.filter((c) => !c.emision?.vence || c.emision.vence >= new Date().toISOString().slice(0, 10))
    const enCurso = abiertas
    const listas = cots.filter((c) => c.estado === 'cerrada')
    const borradores = cots.filter((c) => c.estado === 'estimada' || c.estado === 'incompleta')
    const tarjeta = (c: CotNube, accion: string, nota: string) => (
      <li key={c.id} className="op-card">
        <div><b>{c.numero}</b> <span className={`chip-estado e-${c.estado}`}>{ESTADOS_NUBE[c.estado]}</span></div>
        <p>{c.nombre}</p>
        <small>{ruta(c)}{c.total == null ? '' : ` · ${usd(Number(c.total))}`}</small>
        <small className="op-nota">{nota}</small>
        <div className="acciones">
          <button type="button" className="btn primario" onClick={() => abrir(c)}>{accion}</button>
          {(activos(c) || c.estado === 'cerrada') && <button type="button" className="link" onClick={() => setSeleccion(c.id)}>Ver avance</button>}
        </div>
      </li>
    )
    return (
      <section className="panel portal-shell portal-cliente">
        <div className="fila-estado"><h2>Hola{perfil.nombre ? `, ${perfil.nombre.split(' ')[0]}` : ''}</h2>
          <button type="button" className="btn" onClick={() => setVersion((v) => v + 1)}>Actualizar</button></div>
        <p className="intro">Aquí ves en qué va cada importación y qué necesitamos de ti.</p>
        {cargando ? <p role="status">Cargando…</p> : error ? <p className="error" role="alert">{error}</p> : !cots.length ? (
          <div className="vacio">
            <h3>Todavía no tienes cotizaciones</h3>
            <p>Calcula gratis cuánto te cuesta tu importación puesta en tu bodega. Si te sirve, se la envías a LANDEX con un clic.</p>
            <button type="button" className="btn primario" onClick={onNueva}>Hacer mi primera cotización</button>
          </div>
        ) : <>
          <div className="columnas portal-kpis">
            <div><b>{enRevision.length}</b><p>En revisión por LANDEX</p></div>
            <div><b>{porAceptar.length}</b><p>Listas para que las aceptes</p></div>
            <div><b>{enCurso.length}</b><p>Importaciones en curso</p></div>
            <div><b>{listas.length}</b><p>Completadas</p></div>
          </div>
          {(porAceptar.length > 0 || enCurso.length > 0) && <h3>Lo que necesita tu atención</h3>}
          <ul className="op-cards">
            {porAceptar.map((c) => tarjeta(c, 'Revisar y aceptar', `Tu cotización formal está lista${c.emision?.vence ? `; vence el ${c.emision.vence}` : ''}.`))}
            {enCurso.map((c) => tarjeta(c, 'Ver y subir documentos', 'Sube la factura, la lista de empaque y el documento de transporte para avanzar.'))}
          </ul>
          {enRevision.length > 0 && <><h3>En revisión</h3><ul className="op-cards">{enRevision.map((c) => tarjeta(c, 'Ver cotización', 'Un especialista la está revisando y te avisará cuando la cotización formal esté lista.'))}</ul></>}
          {seleccionada && <Track key={seleccionada.id} cot={seleccionada} usuario={usuario} onEstado={() => setVersion((v) => v + 1)}/>}
          {listas.length > 0 && <><h3>Completadas</h3><ul className="op-cards">{listas.map((c) => tarjeta(c, 'Ver expediente', 'Operación cerrada.'))}</ul></>}
          {borradores.length > 0 && <p className="nota">Tienes {borradores.length} estimación(es) guardada(s). <button type="button" className="link" onClick={onCotizaciones}>Ver mis cotizaciones</button></p>}
          <div className="acciones"><button type="button" className="btn" onClick={onNueva}>Nueva cotización</button></div>
          {productos.size > 0 && <details className="notas"><summary>Productos que has cotizado ({productos.size})</summary><ul>{Array.from(productos.entries()).map(([k,p]) => <li key={k}>{p.sku ? p.sku + ' · ' : ''}{p.nombre}</li>)}</ul></details>}
        </>}
      </section>
    )
  }
  return (
    <section className="panel portal-shell">
      <div className="fila-estado"><h2>{staff ? 'LANDEX Business' : 'Mi LANDEX'}</h2>
        <button type="button" className="btn" onClick={() => setVersion((v) => v + 1)}>Actualizar</button></div>
      <p className="intro">{staff ? 'Resumen comercial y operativo según los registros accesibles.' : 'Consulta tus cotizaciones y operaciones contratadas desde un solo lugar.'}</p>
      {cargando ? <p role="status">Cargando…</p> : error ? <p className="error" role="alert">{error}</p> : <>
        <div className="columnas portal-kpis">
          <div><b>{cots.length}</b><p>Cotizaciones registradas</p></div>
          <div><b>{formales.length}</b><p>Cotizaciones en estado formal (incluye vencidas)</p></div>
          <div><b>{abiertas.length}</b><p>Operaciones activas</p></div>
          <div><b>{staff ? solicitudes.length : operaciones.filter((c) => c.estado === 'cerrada').length}</b><p>{staff ? 'Solicitudes abiertas (hasta 300 registros recientes)' : 'Operaciones cerradas'}</p></div>
        </div>
        <div className="acciones">
          <button type="button" className="btn primario" onClick={onCotizaciones}>Ver cotizaciones</button>
          {staff && <button type="button" className="btn" onClick={onSolicitudes}>Gestionar solicitudes</button>}
          {usuario.rol === 'operador' && <button type="button" className="btn" onClick={() => setVerProveedores(v => !v)}>Proveedores</button>}
        </div>
        <Connect key={usuario.id + '-' + version} usuario={usuario} cotizaciones={cots} solicitudes={sols}
          onCot={(c) => onAbrir({ cotizacion: desdeNube(c), nube: c, cliente: perfilDeCot(c, perfil) })}
          onTrack={(id) => setSeleccion(id)} onCRM={onSolicitudes} onTarifas={onTarifas}/>
        <h3>Seguimiento de operaciones</h3>
        <p className="nota">Estado comercial registrado por LANDEX. No representa rastreo del transporte ni confirma la ubicación de la carga.</p>
        {!operaciones.length ? <p className="nota">Aún no hay operaciones aceptadas, en proceso o cerradas.</p> :
          <div className="scroll"><table className="tabla">
            <thead><tr><th>Referencia</th><th>Ruta / modalidad</th><th>Estado registrado</th><th>Última actualización</th><th>Total cotizado</th><th></th></tr></thead>
            <tbody>{operaciones.map((c) => <tr key={c.id}>
              <td>{c.numero}<small>{c.nombre}</small></td>
              <td>{ORIGENES.find((o) => o.id === c.datos.embarque.origenId)?.nombre ?? 'Origen por confirmar'} → Costa Rica<small>{MODOS[c.datos.embarque.modo]}</small></td>
              <td>{ESTADOS_NUBE[c.estado]}</td><td>{new Date(c.actualizada).toLocaleDateString('es-CR')}</td>
              <td>{c.total == null ? '—' : usd(Number(c.total))}</td>
              <td><button type="button" className="link" onClick={() => onAbrir({ cotizacion: desdeNube(c), nube: c, cliente: perfilDeCot(c, perfil) })}>Ver expediente</button> <button type="button" className="link" onClick={() => setSeleccion(c.id)}>Seguimiento{usuario.rol === 'operador' ? ' y finanzas' : ''}</button></td>
            </tr>)}</tbody>
          </table></div>}
        {seleccionada && <><Track key={seleccionada.id} cot={seleccionada} usuario={usuario} onEstado={() => setVersion((v) => v + 1)}/>{usuario.rol === 'operador' && <Finanzas key={seleccionada.id} cot={seleccionada}/>}</>}
        {usuario.rol === 'operador' && verProveedores && <Proveedores onTarifas={onTarifas}/>}
        {staff ? <><h3>Resumen comercial</h3><p className="nota">El total cotizado incluye mercancía e impuestos: no equivale a ingresos, facturación ni margen de LANDEX.</p><p>Solicitudes de cotización: {cots.filter((c) => c.estado === 'solicitada').length} · Clientes con operaciones activas: {new Set(abiertas.map((c) => c.cliente_id)).size}</p></> :
          <><h3>Productos de tus cotizaciones</h3><p className="nota">Historial de productos registrados, no inventario disponible.</p>{productos.size ? <ul>{Array.from(productos.entries()).map(([k,p]) => <li key={k}>{p.sku ? p.sku + ' · ' : ''}{p.nombre}</li>)}</ul> : <p className="nota">Todavía no tienes productos registrados.</p>}</>}
      </>}
    </section>
  )
}
