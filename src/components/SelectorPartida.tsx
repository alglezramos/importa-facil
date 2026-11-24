import { useMemo, useState } from 'react'
import { buscarPartidas, type Partida } from '../data/arancel'
import { pct } from '../lib/formato'

interface Props {
  seleccionada: Partida | null
  onSeleccionar: (p: Partida) => void
}

const MANUAL: Partida = {
  codigo: 'Por clasificar',
  descripcion: 'Producto no listado (tasas ingresadas manualmente)',
  palabrasClave: [],
  dai: 0.14, sc: 0, iva: 0.13, tlc: {}, permisos: [], verificado: false,
}

export function SelectorPartida({ seleccionada, onSeleccionar }: Props) {
  const [consulta, setConsulta] = useState('')
  const [manual, setManual] = useState<Partida>(MANUAL)
  const resultados = useMemo(() => buscarPartidas(consulta).slice(0, 6), [consulta])
  const esManual = seleccionada?.codigo === manual.codigo

  const actualizarManual = (cambios: Partial<Partida>) => {
    const nueva = { ...manual, ...cambios }
    setManual(nueva)
    onSeleccionar(nueva)
  }

  return (
    <div className="selector">
      <input
        type="search"
        placeholder="Busca tu producto: laptop, camisetas, muebles, 9403…"
        value={consulta}
        onChange={(e) => setConsulta(e.target.value)}
      />
      <ul className="partidas">
        {resultados.map((p) => (
          <li key={p.codigo}>
            <button
              type="button"
              className={seleccionada?.codigo === p.codigo ? 'activa' : ''}
              onClick={() => onSeleccionar(p)}
            >
              <span className="codigo">{p.codigo}</span>
              <span className="desc">{p.descripcion}</span>
              <span className="tasa">DAI {pct(p.dai)}</span>
            </button>
          </li>
        ))}
        <li>
          <button type="button" className={esManual ? 'activa' : ''} onClick={() => onSeleccionar(manual)}>
            <span className="codigo">¿No aparece?</span>
            <span className="desc">Ingresar tasas manualmente y pedir clasificación al agente</span>
          </button>
        </li>
      </ul>
      {esManual && (
        <div className="fila3">
          <label>
            DAI %
            <input type="number" min={0} step={1} value={manual.dai * 100}
              onChange={(e) => actualizarManual({ dai: Number(e.target.value) / 100 })} />
          </label>
          <label>
            Selectivo %
            <input type="number" min={0} step={1} value={manual.sc * 100}
              onChange={(e) => actualizarManual({ sc: Number(e.target.value) / 100 })} />
          </label>
          <label>
            IVA %
            <input type="number" min={0} step={1} value={manual.iva * 100}
              onChange={(e) => actualizarManual({ iva: Number(e.target.value) / 100 })} />
          </label>
        </div>
      )}
    </div>
  )
}
