import type { EntradaCotizacion, LineaCosto, ResultadoCotizacion } from '../lib/calculo'
import { crc, usd } from '../lib/formato'
import { Solicitud } from './Solicitud'

interface Props {
  entrada: EntradaCotizacion
  r: ResultadoCotizacion
  producto: string
}

const GRUPOS: LineaCosto['grupo'][] = ['Mercadería', 'Logística internacional', 'Impuestos', 'Costos en Costa Rica']
const COLORES: Record<LineaCosto['grupo'], string> = {
  'Mercadería': 'var(--c1)',
  'Logística internacional': 'var(--c2)',
  'Impuestos': 'var(--c3)',
  'Costos en Costa Rica': 'var(--c4)',
}

export function Resultado({ entrada, r, producto }: Props) {
  const porGrupo = GRUPOS.map((g) => ({
    grupo: g,
    total: r.lineas.filter((l) => l.grupo === g).reduce((s, l) => s + l.usd, 0),
  }))

  return (
    <section className="resultado">
      <div className="total">
        <span className="etiqueta">Costo total puesto en tu bodega</span>
        <strong>{usd(r.totalUSD)}</strong>
        <span className="crc">{crc(r.totalCRC)} · tipo de cambio {entrada.tipoCambio}</span>
        <div className="kpis">
          <div><span>Por unidad</span><b>{usd(r.costoUnitarioUSD)}</b></div>
          <div><span>Por unidad sin IVA*</span><b>{usd(r.costoUnitarioSinIVAUSD)}</b></div>
          <div><span>Impuestos</span><b>{usd(r.impuestos.total)}</b></div>
          <div><span>Tiempo total</span><b>{r.diasTotales} días</b></div>
        </div>
      </div>

      <div className="barra" aria-label="Distribución del costo">
        {porGrupo.map(({ grupo, total }) => (
          <div key={grupo} style={{ flexGrow: total, background: COLORES[grupo] }} title={`${grupo}: ${usd(total)}`} />
        ))}
      </div>
      <div className="leyenda">
        {porGrupo.map(({ grupo, total }) => (
          <span key={grupo}><i style={{ background: COLORES[grupo] }} />{grupo} {((total / r.totalUSD) * 100).toFixed(0)}%</span>
        ))}
      </div>

      {r.advertencias.length > 0 && (
        <ul className="avisos">
          {r.advertencias.map((a) => <li key={a}>{a}</li>)}
        </ul>
      )}

      <h3>Desglose</h3>
      <table className="desglose">
        <tbody>
          {GRUPOS.map((g) => {
            const lineas = r.lineas.filter((l) => l.grupo === g)
            if (!lineas.length) return null
            return [
              <tr key={g} className="grupo"><th colSpan={2}>{g}</th></tr>,
              ...lineas.map((l) => (
                <tr key={l.concepto}>
                  <td>{l.concepto}{l.nota && <small>{l.nota}</small>}</td>
                  <td className="num">{usd(l.usd)}</td>
                </tr>
              )),
            ]
          })}
          <tr className="suma"><td>Total</td><td className="num">{usd(r.totalUSD)}</td></tr>
        </tbody>
      </table>
      <p className="nota">Valor aduanero (CIF): {usd(r.valorAduanero)}. *El IVA de importación es crédito fiscal si tu empresa está inscrita en IVA.</p>

      <h3>De la compra a tu bodega</h3>
      <ol className="linea-tiempo">
        {r.etapas.map((et) => (
          <li key={et.nombre}>
            <span className="dia">Día {et.diaInicio}</span>
            <span className="nombre">{et.nombre}</span>
            <span className="dur">{et.dias} {et.dias === 1 ? 'día' : 'días'}</span>
          </li>
        ))}
        <li className="fin"><span className="dia">Día {r.diasTotales}</span><span className="nombre">Mercadería en tu bodega</span></li>
      </ol>

      <h3>Documentos que vas a necesitar</h3>
      <ul className="docs">
        {r.documentos.map((d) => <li key={d}>{d}</li>)}
      </ul>

      <Solicitud entrada={entrada} r={r} producto={producto} />
    </section>
  )
}
