import { useState } from 'react'
import { eliminarCotizacion, listarCotizaciones, venceEl, type CotizacionGuardada } from '../lib/almacen'
import { usd } from '../lib/formato'

interface Props {
  onAbrir: (c: CotizacionGuardada, copia?: boolean) => void
  onNueva: () => void
}

export function MisCotizaciones({ onAbrir, onNueva }: Props) {
  const [lista, setLista] = useState(listarCotizaciones)
  const [confirmar, setConfirmar] = useState<string | null>(null)
  const hoy = new Date()

  return (
    <section className="panel">
      <div className="fila-estado">
        <h2>Mis cotizaciones</h2>
        <button type="button" className="btn primario" onClick={onNueva}>+ Nueva cotización</button>
      </div>
      <p className="intro">Cotizaciones guardadas en este navegador. Abre una para editarla sin perder la original, o duplícala para comparar escenarios.</p>
      {lista.length === 0 ? (
        <p className="nota">Todavía no has guardado cotizaciones. En el cotizador usa "Guardar cotización".</p>
      ) : (
        <div className="scroll">
          <table className="tabla">
            <thead><tr><th>Número</th><th>Nombre</th><th>Fecha</th><th>Vigencia</th><th>Estado</th><th className="num">Total</th><th></th></tr></thead>
            <tbody>
              {lista.map((c) => {
                const vence = venceEl(c)
                const vencida = vence < hoy
                return (
                  <tr key={c.numero}>
                    <td className="codigo">{c.numero}</td>
                    <td>{c.nombre}<small>{c.productos.length} producto(s)</small></td>
                    <td>{new Date(c.fecha).toLocaleDateString('es-CR')}</td>
                    <td>{vencida ? <span className="sello no">Vencida</span> : `hasta ${vence.toLocaleDateString('es-CR')}`}</td>
                    <td><span className={`sello ${c.estado === 'incompleta' ? 'pend' : 'validada'}`}>{c.estado === 'incompleta' ? 'Incompleta' : 'Estimada'}</span></td>
                    <td className="num">{usd(c.total)}</td>
                    <td className="mini-acc">
                      <button type="button" className="link" onClick={() => onAbrir(c)}>Abrir</button>
                      <button type="button" className="link" onClick={() => onAbrir(c, true)}>Duplicar</button>
                      {confirmar === c.numero ? (
                        <>
                          <button type="button" className="link peligro" onClick={() => { eliminarCotizacion(c.numero); setLista(listarCotizaciones()); setConfirmar(null) }}>Confirmar</button>
                          <button type="button" className="link" onClick={() => setConfirmar(null)}>Cancelar</button>
                        </>
                      ) : (
                        <button type="button" className="link peligro" onClick={() => setConfirmar(c.numero)}>Eliminar</button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
