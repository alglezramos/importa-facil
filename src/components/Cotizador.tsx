import { useMemo, useState } from 'react'
import { ARANCEL, type Partida } from '../data/arancel'
import { MODOS, ORIGENES, TIPO_CAMBIO_DEFAULT, ZONAS, type Modo, type Zona } from '../data/config'
import { cotizar, INCOTERMS, type Incoterm } from '../lib/calculo'
import { Resultado } from './Resultado'
import { SelectorPartida } from './SelectorPartida'

const num = (v: string) => (Number.isFinite(Number(v)) ? Number(v) : 0)

export function Cotizador() {
  const [producto, setProducto] = useState('')
  const [partida, setPartida] = useState<Partida | null>(ARANCEL[4])
  const [valor, setValor] = useState(8000)
  const [unidades, setUnidades] = useState(200)
  const [incoterm, setIncoterm] = useState<Incoterm>('FOB')
  const [origenId, setOrigenId] = useState(ORIGENES[0].id)
  const [modo, setModo] = useState<Modo>('LCL')
  const [peso, setPeso] = useState(900)
  const [volumen, setVolumen] = useState(5)
  const [tlc, setTlc] = useState(false)
  const [zona, setZona] = useState<Zona>('GAM')
  const [tipoCambio, setTipoCambio] = useState(TIPO_CAMBIO_DEFAULT)
  const [diasProduccion, setDiasProduccion] = useState(20)

  const origen = ORIGENES.find((o) => o.id === origenId)!
  const entrada = partida && {
    valorMercaderia: valor, incoterm, origen, modo, pesoKg: peso, volumenM3: volumen,
    unidades, partida, aplicaTLC: tlc, zona, tipoCambio, diasProduccion,
  }
  const resultado = useMemo(() => (entrada ? cotizar(entrada) : null), [JSON.stringify(entrada)]) // eslint-disable-line

  return (
    <div className="cotizador">
      <form className="formulario" onSubmit={(e) => e.preventDefault()}>
        <fieldset>
          <legend><span>1</span> ¿Qué vas a importar?</legend>
          <label>
            Nombre del producto (como lo compras)
            <input value={producto} placeholder="Ej.: escritorios de oficina en MDF" onChange={(e) => setProducto(e.target.value)} />
          </label>
          <span className="sub">Clasificación arancelaria preliminar</span>
          <SelectorPartida seleccionada={partida} onSeleccionar={setPartida} />
        </fieldset>

        <fieldset>
          <legend><span>2</span> Tu compra</legend>
          <div className="fila2">
            <label>Valor pagado al proveedor (USD)
              <input type="number" min={0} value={valor} onChange={(e) => setValor(num(e.target.value))} />
            </label>
            <label>Unidades
              <input type="number" min={1} value={unidades} onChange={(e) => setUnidades(num(e.target.value))} />
            </label>
          </div>
          <label>Incoterm (cómo te cotizó el proveedor)
            <select value={incoterm} onChange={(e) => setIncoterm(e.target.value as Incoterm)}>
              {Object.entries(INCOTERMS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </label>
          <label>Días de producción del proveedor
            <input type="number" min={0} value={diasProduccion} onChange={(e) => setDiasProduccion(num(e.target.value))} />
          </label>
        </fieldset>

        <fieldset>
          <legend><span>3</span> El envío</legend>
          <label>Origen
            <select value={origenId} onChange={(e) => setOrigenId(e.target.value)}>
              {ORIGENES.map((o) => <option key={o.id} value={o.id}>{o.nombre}</option>)}
            </select>
          </label>
          <label>Modalidad
            <select value={modo} onChange={(e) => setModo(e.target.value as Modo)}>
              {Object.entries(MODOS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </label>
          <div className="fila2">
            <label>Peso bruto (kg)
              <input type="number" min={0} value={peso} onChange={(e) => setPeso(num(e.target.value))} />
            </label>
            <label>Volumen (m³)
              <input type="number" min={0} step={0.1} value={volumen} onChange={(e) => setVolumen(num(e.target.value))} />
            </label>
          </div>
          <label className="check">
            <input type="checkbox" checked={tlc} onChange={(e) => setTlc(e.target.checked)} />
            El proveedor me da certificado de origen (aplicar TLC)
          </label>
        </fieldset>

        <fieldset>
          <legend><span>4</span> Entrega</legend>
          <div className="fila2">
            <label>Zona de tu bodega
              <select value={zona} onChange={(e) => setZona(e.target.value as Zona)}>
                {Object.entries(ZONAS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </label>
            <label>Tipo de cambio (₡/USD)
              <input type="number" min={1} value={tipoCambio} onChange={(e) => setTipoCambio(num(e.target.value))} />
            </label>
          </div>
        </fieldset>
      </form>

      {entrada && resultado ? (
        <Resultado entrada={entrada} r={resultado} producto={producto} />
      ) : (
        <section className="resultado vacio">Elige la clasificación de tu producto para ver la cotización.</section>
      )}
    </div>
  )
}
