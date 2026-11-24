import { useMemo, useState } from 'react'
import { buscarPartidas } from '../data/arancel'
import { pct } from '../lib/formato'

export function Clasificacion() {
  const [q, setQ] = useState('')
  const partidas = useMemo(() => buscarPartidas(q), [q])

  return (
    <section className="panel">
      <h2>Consulta de clasificación arancelaria</h2>
      <p className="intro">
        Busca por nombre del producto o por código. La clasificación aquí es <b>preliminar</b>: el agente aduanero
        la confirma con la ficha técnica antes de que compres.
      </p>
      <input type="search" placeholder="Producto o código arancelario" value={q} onChange={(e) => setQ(e.target.value)} />
      <table className="arancel">
        <thead>
          <tr><th>Código</th><th>Descripción</th><th>DAI</th><th>DAI con TLC</th><th>Selectivo</th><th>IVA</th><th>Permisos</th></tr>
        </thead>
        <tbody>
          {partidas.map((p) => (
            <tr key={p.codigo}>
              <td className="codigo">{p.codigo}</td>
              <td>{p.descripcion}</td>
              <td className="num">{pct(p.dai)}</td>
              <td>{Object.keys(p.tlc).length ? Object.entries(p.tlc).map(([k, v]) => `${k} ${pct(v ?? 0)}`).join(' · ') : '—'}</td>
              <td className="num">{pct(p.sc)}</td>
              <td className="num">{pct(p.iva)}</td>
              <td>{p.permisos.join('; ') || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {partidas.length === 0 && <p className="nota">Sin resultados. Envíanos la ficha técnica y te clasificamos el producto.</p>}
      <p className="nota">Datos de ejemplo, no oficiales. Fuente oficial: Arancel de Aduanas de Costa Rica (Ministerio de Hacienda).</p>
    </section>
  )
}
