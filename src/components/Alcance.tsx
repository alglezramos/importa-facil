import { usd } from '../lib/formato'
import type { Ajuste, ResultadoLanded } from '../lib/landed'
import { desglosar, montoNegociado } from '../lib/servicios'

interface Props {
  r: ResultadoLanded
  externos: string[]
  onCambio: (externos: string[]) => void
  /** Monto que el cliente ya negoció para un servicio propio (null = usar la estimación). */
  onMonto?: (servicioId: string, monto: number | null) => void
  ajustes?: Record<string, Ajuste>
  soloLectura?: boolean
}

/** Alcance del servicio: qué coordina LANDEX y qué contrató el cliente por su cuenta. No cambia el total. */
export function Alcance({ r, externos, onCambio, onMonto, ajustes, soloLectura }: Props) {
  const d = desglosar(r, externos)
  const visibles = d.lineas.filter((l) => l.aplica || l.incluido)
  const alternar = (id: string, cliente: boolean) =>
    onCambio(cliente ? [...externos.filter((x) => x !== id), id] : externos.filter((x) => x !== id))
  const filas: { k: string; v: number; nota?: string; fuerte?: boolean }[] = [
    { k: 'Valor de la mercancía (lo pagas a tu proveedor)', v: d.mercancia },
    { k: 'Honorarios de LANDEX: agencia de aduanas y coordinación', v: d.honorariosLandex, nota: d.honorariosPendiente ? 'por confirmar' : undefined, fuerte: true },
    { k: 'Servicios coordinados por LANDEX con sus socios', v: d.serviciosLandex },
    { k: 'Servicios que contrataste por tu cuenta', v: d.serviciosCliente },
    { k: 'Impuestos de importación', v: d.impuestos, nota: r.productos.some((x) => x.impuestos.pendientes.length > 0) ? 'pendiente' : undefined },
    { k: 'Gastos de terceros en destino (puerto, almacén fiscal)', v: d.gastosTerceros },
  ]
  return (
    <section className="alcance">
      <h3>Alcance del servicio</h3>
      <p className="nota">El agenciamiento aduanero de LANDEX siempre va incluido. Marca los servicios que ya tienes contratados y, si lo sabes, escribe el monto que negociaste: así ves cuánto contratarías con LANDEX.</p>
      <ul className="servicios">
        <li className="servicio fijo">
          <div><b>Agenciamiento aduanero</b><small>Clasificación, declaración y trámite ante Aduanas</small></div>
          <span className="prestador landex">LANDEX</span>
        </li>
        {visibles.map((l) => (
          <li key={l.servicio.id} className="servicio">
            <div>
              <b>{l.servicio.nombre}</b>
              <small>{l.incluido ? 'Incluido en el precio de tu proveedor' : `${l.servicio.ayuda} · ${l.pendiente ? 'monto por confirmar' : usd(l.monto)}${l.proveedor === 'cliente' && montoNegociado(ajustes, l.servicio.id) == null ? ' (estimado de referencia)' : ''}`}</small>
              {l.proveedor === 'cliente' && onMonto && (
                <label className="monto-negociado">Monto que ya negociaste (USD)
                  <input type="number" min={0} step="0.01" disabled={soloLectura} placeholder="Opcional"
                    value={montoNegociado(ajustes, l.servicio.id) ?? ''}
                    onChange={(e) => onMonto(l.servicio.id, e.target.value === '' ? null : Math.max(0, Number(e.target.value)))} />
                </label>
              )}
            </div>
            {l.incluido ? <span className="prestador">Proveedor</span> : (
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
          <tr className="fuerte"><th scope="row">Lo que contratarías con LANDEX</th><td>{usd(d.honorariosLandex + d.serviciosLandex)}{d.honorariosPendiente || d.lineas.some((l) => l.proveedor === 'landex' && l.pendiente) ? ' + pendientes' : ''}</td></tr>
        </tbody>
      </table>
      <p className="nota">El valor de la mercancía, los impuestos y los gastos de terceros no son ingresos de LANDEX: se pagan al proveedor, al Estado y a los operadores del puerto o almacén.</p>
    </section>
  )
}
