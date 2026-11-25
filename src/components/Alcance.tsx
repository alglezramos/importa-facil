import { usd } from '../lib/formato'
import type { ResultadoLanded } from '../lib/landed'
import { desglosar } from '../lib/servicios'

interface Props {
  r: ResultadoLanded
  externos: string[]
  onCambio: (externos: string[]) => void
  soloLectura?: boolean
}

/** Alcance del servicio: qué coordina LANDEX y qué contrató el cliente por su cuenta. No cambia el total. */
export function Alcance({ r, externos, onCambio, soloLectura }: Props) {
  const d = desglosar(r, externos)
  const visibles = d.lineas.filter((l) => l.aplica || l.incluido)
  const alternar = (id: string, cliente: boolean) =>
    onCambio(cliente ? [...externos.filter((x) => x !== id), id] : externos.filter((x) => x !== id))
  const filas: { k: string; v: number; nota?: string; fuerte?: boolean }[] = [
    { k: 'Valor de la mercancía (lo pagas a tu proveedor)', v: d.mercancia },
    { k: 'Honorarios de LANDEX: agencia aduanal y coordinación', v: d.honorariosLandex, nota: d.honorariosPendiente ? 'por confirmar' : undefined, fuerte: true },
    { k: 'Servicios coordinados por LANDEX con sus socios', v: d.serviciosLandex },
    { k: 'Servicios que contrataste por tu cuenta (estimado)', v: d.serviciosCliente },
    { k: 'Impuestos de importación', v: d.impuestos, nota: r.productos.some((x) => x.impuestos.pendientes.length > 0) ? 'pendiente' : undefined },
    { k: 'Gastos de terceros en destino (puerto, almacén fiscal)', v: d.gastosTerceros },
  ]
  return (
    <section className="alcance">
      <h3>Alcance del servicio</h3>
      <p className="nota">El agenciamiento aduanero de LANDEX siempre va incluido. Indica qué servicios ya tienes contratados: el costo total no cambia, solo se ve quién lo presta.</p>
      <ul className="servicios">
        <li className="servicio fijo">
          <div><b>Agenciamiento aduanero</b><small>Clasificación, declaración y trámite ante Aduanas</small></div>
          <span className="quien landex">LANDEX</span>
        </li>
        {visibles.map((l) => (
          <li key={l.servicio.id} className="servicio">
            <div>
              <b>{l.servicio.nombre}</b>
              <small>{l.incluido ? 'Incluido en el precio de tu proveedor' : `${l.servicio.ayuda} · ${l.pendiente ? 'monto por confirmar' : usd(l.monto)}`}</small>
            </div>
            {l.incluido ? <span className="quien">Proveedor</span> : (
              <div className="seg mini" role="radiogroup" aria-label={`Quién presta ${l.servicio.nombre}`}>
                <button type="button" role="radio" aria-checked={l.proveedor === 'landex'} className={l.proveedor === 'landex' ? 'activa' : ''} disabled={soloLectura} onClick={() => alternar(l.servicio.id, false)}>LANDEX</button>
                <button type="button" role="radio" aria-checked={l.proveedor === 'cliente'} className={l.proveedor === 'cliente' ? 'activa' : ''} disabled={soloLectura} onClick={() => alternar(l.servicio.id, true)}>Ya lo tengo</button>
              </div>
            )}
          </li>
        ))}
      </ul>
      <table className="tabla-alcance">
        <tbody>
          {filas.filter((f) => f.v > 0 || f.nota || f.fuerte).map((f) => (
            <tr key={f.k} className={f.fuerte ? 'fuerte' : ''}><th scope="row">{f.k}</th><td>{f.nota && f.v === 0 ? f.nota : usd(f.v)}{f.nota && f.v > 0 ? ` (${f.nota})` : ''}</td></tr>
          ))}
          <tr className="total"><th scope="row">Costo total de la importación</th><td>{usd(d.total)}{d.pendientes ? ' + pendientes' : ''}</td></tr>
        </tbody>
      </table>
      <p className="nota">El valor de la mercancía, los impuestos y los gastos de terceros no son ingresos de LANDEX: se pagan al proveedor, al Estado y a los operadores del puerto o almacén.</p>
    </section>
  )
}
