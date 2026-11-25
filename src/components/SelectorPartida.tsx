import { useEffect, useMemo, useState } from 'react'
import type { Partida } from '../data/arancel'
import { aPartida, buscar, cargarArancel, etiqueta, type Indice } from '../lib/arancel'
import { pct } from '../lib/formato'

interface Props {
  seleccionada: Partida | null
  onSeleccionar: (p: Partida) => void
}

export function SelectorPartida({ seleccionada, onSeleccionar }: Props) {
  const [ind, setInd] = useState<Indice | null>(null)
  const [consulta, setConsulta] = useState('')
  useEffect(() => { cargarArancel().then(setInd).catch(() => setInd(null)) }, [])
  const resultados = useMemo(() => (ind && consulta.trim().length >= 2 ? buscar(ind, consulta, 6) : []), [ind, consulta])

  const ajustar = (cambios: Partial<Partida>) => seleccionada && onSeleccionar({ ...seleccionada, ...cambios })

  return (
    <div className="selector">
      <input
        type="search"
        placeholder={ind ? 'Busca en el arancel: escritorio de madera, laptop, 9403…' : 'Cargando arancel…'}
        value={consulta}
        onChange={(e) => setConsulta(e.target.value)}
      />
      {resultados.length > 0 && ind && (
        <ul className="partidas">
          {resultados.map(({ item }) => (
            <li key={item[0]}>
              <button type="button" className={seleccionada?.codigo === item[0] ? 'activa' : ''}
                onClick={() => { onSeleccionar(aPartida(ind, item[0])); setConsulta('') }}>
                <span className="codigo">{item[0]}</span>
                <span className="desc">{etiqueta(ind, item[0])}</span>
                <span className="tasa">DAI {item[2] && /^\d/.test(item[2]) ? `${item[2]}%` : '—'}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {seleccionada && (
        <div className="elegida">
          <div><span className="codigo">{seleccionada.codigo}</span> {seleccionada.descripcion}</div>
          <div className="fila3">
            <label>DAI %
              <input type="number" min={0} step={1} value={+(seleccionada.dai * 100).toFixed(2)}
                onChange={(e) => ajustar({ dai: Number(e.target.value) / 100 })} />
            </label>
            <label>Selectivo %
              <input type="number" min={0} step={1} value={+(seleccionada.sc * 100).toFixed(2)}
                onChange={(e) => ajustar({ sc: Number(e.target.value) / 100 })} />
            </label>
            <label>IVA %
              <input type="number" min={0} step={1} value={+(seleccionada.iva * 100).toFixed(2)}
                onChange={(e) => ajustar({ iva: Number(e.target.value) / 100 })} />
            </label>
          </div>
          <small className="nota">Tasas preliminares (DAI {pct(seleccionada.dai)}): ajústalas si el agente indica otras.</small>
        </div>
      )}
    </div>
  )
}
