import { tr as traducir } from '../lib/idioma'
import { usd } from '../lib/formato'
import { calcularLanded, type Embarque, type Producto, type ResultadoLanded } from '../lib/landed'
import {
  ajustesEfectivos, CATEGORIAS_PROVEEDOR, CONCEPTOS_TARIFA, liberarConceptos, totalTarifa, TRAMOS, tramoTarifa, vigencia,
  type Tarifa, type Tramo,
} from '../lib/tarifas'

interface Props {
  /** Embarque con los ajustes manuales (sin las tarifas). */
  e: Embarque
  productos: Producto[]
  r: ResultadoLanded
  /** Tarifas candidatas: ya filtradas por ruta, vigencia y visibilidad. */
  candidatas: Tarifa[]
  todas: Tarifa[]
  aplicadas: string[]
  /** Conceptos que las tarifas no tocan (no aplican o los cubre el Incoterm). */
  protegidos: Set<string>
  onAplicar: (t: Tarifa) => void
  onQuitar: (t: Tarifa) => void
}

export function Ofertas({ e, productos, r, candidatas, todas, aplicadas, protegidos, onAplicar, onQuitar }: Props) {
  if (!candidatas.length) return null
  const valor = r.totales.mercancia
  const tramos = (Object.keys(TRAMOS) as Tramo[]).filter((tr) => candidatas.some((t) => tramoTarifa(t) === tr))

  const simular = (t: Tarifa) => {
    const ids = [...aplicadas.filter((id) => { const x = todas.find((y) => y.id === id); return x && tramoTarifa(x) !== tramoTarifa(t) }), t.id]
    const aj = ajustesEfectivos(todas, ids, liberarConceptos(e.ajustes, t), r.carga, valor, protegidos)
    return calcularLanded({ ...e, ajustes: aj }, productos)
  }

  return (
    <div className="ofertas">
      <h3>{traducir("Ofertas de proveedores")}</h3>
      <p className="nota">{traducir("Tarifas de proveedores para esta ruta. Al aplicar una, sus montos reemplazan los valores de referencia de los conceptos que cubre.")}</p>
      {tramos.map((tr) => {
        const filas = candidatas.filter((t) => tramoTarifa(t) === tr).map((t) => ({ t, sim: simular(t), costo: totalTarifa(t, r.carga, valor, protegidos) }))
        const reales = filas.filter((f) => !f.t.ejemplo)
        const pool = reales.length ? reales : filas
        const mejor = pool.reduce((a, b) => (b.sim.totales.total < a.sim.totales.total || (b.sim.totales.total === a.sim.totales.total && (b.t.diasTransito ?? 999) < (a.t.diasTransito ?? 999)) ? b : a))
        return (
          <div key={tr} className="tramo">
            <h4>{traducir(TRAMOS[tr])}</h4>
            <div className="tabla-scroll">
              <table className="tabla">
                <thead><tr><th>{traducir("Proveedor")}</th><th className="num">{traducir("Cargos")}</th><th className="num">{traducir("Total en bodega")}</th><th className="num">{traducir("Tránsito")}</th><th>{traducir("Vigencia")}</th><th></th></tr></thead>
                <tbody>
                  {filas.map(({ t, sim, costo }) => {
                    const on = aplicadas.includes(t.id)
                    const v = vigencia(t)
                    return (
                      <tr key={t.id} className={on ? 'actual' : ''}>
                        <td>
                          <b>{t.proveedor}</b> <small>{traducir(CATEGORIAS_PROVEEDOR[t.categoria])}</small>
                          {t.ejemplo && <span className="sello pend">{traducir("Ejemplo, no es oferta")}</span>}
                          {mejor.t.id === t.id && <span className="sello validada">{traducir("Recomendada por LANDEX")}</span>}
                          <details className="detalle-oferta">
                            <summary>{traducir("Qué incluye")}</summary>
                            <ul>
                              {t.cargos.map((c, i) => <li key={i} className={protegidos.has(c.concepto) ? 'tachado' : ''}>{CONCEPTOS_TARIFA.find((k) => k.id === c.concepto)?.nombre ?? c.concepto}{c.unidad === 'incluido' ? traducir(" (incluido)") : ''}{protegidos.has(c.concepto) ? traducir(" · no se cobra en este embarque") : ''}</li>)}
                              {t.incluye.map((x) => <li key={x}>{x}</li>)}
                            </ul>
                            {t.excluye.length > 0 && <><b>{traducir("No incluye")}</b><ul>{t.excluye.map((x) => <li key={x}>{x}</li>)}</ul></>}
                            {t.condiciones && <p><b>{traducir("Condiciones:")}</b> {t.condiciones}</p>}
                          </details>
                        </td>
                        <td className="num">{usd(costo)}</td>
                        <td className="num"><b>{usd(sim.totales.total)}</b>{!on && <small>{sim.totales.total - r.totales.total >= 0 ? '+' : '−'}{usd(Math.abs(sim.totales.total - r.totales.total))}</small>}</td>
                        <td className="num">{t.diasTransito != null ? traducir("{0} d", t.diasTransito) : '—'}</td>
                        <td><span className={`sello ${v === 'por_vencer' ? 'pend' : 'validada'}`}>{traducir("hasta ")}{t.vigenteHasta}</span></td>
                        <td>{on
                          ? <button type="button" className="link" onClick={() => onQuitar(t)}>{traducir("Quitar")}</button>
                          : <button type="button" className="btn" onClick={() => onAplicar(t)}>{traducir("Aplicar")}</button>}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )
      })}
    </div>
  )
}
