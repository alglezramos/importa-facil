import { usd } from '../lib/formato'
import type { Confianza } from '../lib/confianza'

export function Confiabilidad({ c }: { c: Confianza }) {
  const nivel = c.pct >= 90 ? 'alta' : c.pct >= 50 ? 'media' : 'baja'
  return (
    <div className={`confiabilidad ${nivel}`}>
      <div className="conf-cab">
        <span>Costos de importación confirmados</span>
        <b>{c.pct}%</b>
      </div>
      <div className="conf-barra" role="img" aria-label={`${c.pct}% confirmado`}>
        <span style={{ width: `${c.pct}%` }} />
      </div>
      <div className="conf-montos">
        <span>Confirmados: {usd(c.confirmado)}</span>
        <span>Estimados: {usd(c.estimado)}</span>
        {c.pendientes > 0 && <span>Pendientes sin monto: {c.pendientes}</span>}
      </div>
      <ul className="conf-puntos">
        {c.puntos.map((p) => <li key={p.texto} className={p.ok ? 'ok' : 'falta'}>{p.ok ? '✓' : '○'} {p.texto}{p.ok ? '' : ': por confirmar'}</li>)}
      </ul>
      <small>Logística e impuestos, sin contar la mercancía. Mide cuánto está respaldado por tarifas y validaciones; no es una garantía de exactitud.</small>
    </div>
  )
}
