import { formatoRegional } from '../lib/idioma'
import { tr } from '../lib/idioma'
import { guardarTasaValidada } from '../lib/tasas'
import { modoAgencia } from '../lib/formal'
import { useEffect, useMemo, useState } from 'react'
import { aClasificacion, buscar, cargarArancel, etiqueta, type Indice } from '../lib/arancel'
import { volumenProducto, type Producto } from '../lib/landed'

export const PAISES: [string, string][] = [
  ['CN', 'China'], ['US', 'Estados Unidos'], ['MX', 'México'], ['DE', 'Alemania'], ['ES', 'España'], ['IT', 'Italia'],
  ['FR', 'Francia'], ['NL', 'Países Bajos'], ['GT', 'Guatemala'], ['SV', 'El Salvador'], ['HN', 'Honduras'],
  ['NI', 'Nicaragua'], ['PA', 'Panamá'], ['CO', 'Colombia'], ['CL', 'Chile'], ['PE', 'Perú'], ['BR', 'Brasil'],
  ['KR', 'Corea del Sur'], ['JP', 'Japón'], ['TW', 'Taiwán'], ['VN', 'Vietnam'], ['IN', 'India'], ['TR', 'Turquía'],
  ['XX', 'Otro'],
]

interface Props {
  inicial: Producto
  onGuardar: (p: Producto) => void
  onCancelar: () => void
}

const pctIn = (v: number | null) => (v === null ? '' : String(+(v * 100).toFixed(2)))
const pctOut = (s: string) => (s.trim() === '' ? null : Number(s) / 100)
const n = (s: string) => (s === '' ? 0 : Number(s))

export function ProductoEditor({ inicial, onGuardar, onCancelar }: Props) {
  const [p, setP] = useState<Producto>(inicial)
  const [ind, setInd] = useState<Indice | null>(null)
  const [q, setQ] = useState('')
  const [usarMedidas, setUsarMedidas] = useState(!!inicial.bultos || !inicial.volumenM3)
  useEffect(() => { cargarArancel().then(setInd).catch(() => setInd(null)) }, [])
  const resultados = useMemo(() => (ind && q.trim().length >= 2 ? buscar(ind, q, 8) : []), [ind, q])

  const set = (c: Partial<Producto>) => setP((x) => ({ ...x, ...c }))
  const b = p.bultos ?? { cantidad: 1, largoCm: 0, anchoCm: 0, altoCm: 0, apilable: true }
  const setB = (c: Partial<typeof b>) => set({ bultos: { ...b, ...c } })
  const cl = p.clasificacion
  const setCl = (c: Partial<NonNullable<typeof cl>>) => cl && set({ clasificacion: { ...cl, ...c } })

  const errores = [
    !p.nombre.trim() && 'Escribe el nombre del producto',
    !(p.cantidad > 0) && 'La cantidad debe ser mayor que cero',
    !(p.valorUnitario > 0) && 'Indica el valor unitario',
    !(volumenProducto({ ...p, bultos: usarMedidas ? b : undefined }) > 0) && 'Indica las medidas de los bultos o el volumen',
  ].filter(Boolean) as string[]

  const guardar = () => {
    if (errores.length) return
    onGuardar({ ...p, bultos: usarMedidas ? b : undefined, volumenM3: usarMedidas ? undefined : p.volumenM3 })
  }

  return (
    <div className="editor">
      <div className="fila3">
        <label>{tr("SKU o referencia")}<input value={p.sku} onChange={(e) => set({ sku: e.target.value })} /></label>
        <label className="span2">{tr("Nombre del producto *")}<input value={p.nombre} placeholder={tr("Ej.: Sofá de 3 plazas")} onChange={(e) => set({ nombre: e.target.value })} /></label>
      </div>
      <label>{tr("Descripción, material y características")}<input value={p.descripcion ?? ''} placeholder={tr("Ej.: sofá tapizado en tela, estructura de madera")} onChange={(e) => set({ descripcion: e.target.value })} />
      </label>
      <div className="fila3">
        <label>{tr("País de fabricación")}<select value={p.paisFabricacion} onChange={(e) => set({ paisFabricacion: e.target.value })}>
            {PAISES.map(([c, nom]) => <option key={c} value={c}>{tr(nom)}</option>)}
          </select>
        </label>
        <label>{tr("Cantidad (unidades) *")}<input type="number" min={0} value={p.cantidad || ''} onChange={(e) => set({ cantidad: n(e.target.value) })} /></label>
        <label>{tr("Valor unitario (USD) *")}<input type="number" min={0} step="0.01" value={p.valorUnitario || ''} onChange={(e) => set({ valorUnitario: n(e.target.value) })} /></label>
      </div>
      <div className="fila3">
        <label>{tr("Peso bruto total (kg)")}<input type="number" min={0} value={p.pesoBrutoKg || ''} onChange={(e) => set({ pesoBrutoKg: n(e.target.value) })} /></label>
        <label>{tr("Peso neto total (kg)")}<input type="number" min={0} value={p.pesoNetoKg ?? ''} onChange={(e) => set({ pesoNetoKg: e.target.value === '' ? undefined : n(e.target.value) })} /></label>
        <label>{tr("Valor total")}<input disabled value={(p.cantidad * p.valorUnitario).toLocaleString(formatoRegional(), { style: 'currency', currency: 'USD' })} /></label>
      </div>

      <div className="sub-sec">
        <span className="sub">{tr("Embalaje")}</span>
        <div className="seg">
          <button type="button" className={usarMedidas ? 'activa' : ''} onClick={() => setUsarMedidas(true)}>{tr("Medidas de las cajas")}</button>
          <button type="button" className={!usarMedidas ? 'activa' : ''} onClick={() => setUsarMedidas(false)}>{tr("Solo sé el volumen")}</button>
        </div>
        {usarMedidas ? (
          <div className="fila5">
            <label>{tr("Cajas o pallets")}<input type="number" min={0} value={b.cantidad || ''} onChange={(e) => setB({ cantidad: n(e.target.value) })} /></label>
            <label>{tr("Largo (cm)")}<input type="number" min={0} value={b.largoCm || ''} onChange={(e) => setB({ largoCm: n(e.target.value) })} /></label>
            <label>{tr("Ancho (cm)")}<input type="number" min={0} value={b.anchoCm || ''} onChange={(e) => setB({ anchoCm: n(e.target.value) })} /></label>
            <label>{tr("Alto (cm)")}<input type="number" min={0} value={b.altoCm || ''} onChange={(e) => setB({ altoCm: n(e.target.value) })} /></label>
            <label className="check"><input type="checkbox" checked={b.apilable} onChange={(e) => setB({ apilable: e.target.checked })} />{tr("Apilable")}</label>
          </div>
        ) : (
          <label>{tr("Volumen total (m³)")}<input type="number" min={0} step="0.01" value={p.volumenM3 ?? ''} onChange={(e) => set({ volumenM3: e.target.value === '' ? undefined : n(e.target.value) })} /></label>
        )}
        <small className="nota">{tr("Volumen: ")}{volumenProducto({ ...p, bultos: usarMedidas ? b : undefined }).toFixed(3)}{tr(" m³")}</small>
      </div>

      <div className="sub-sec">
        <span className="sub">{tr("Clasificación arancelaria")}</span>
        {cl ? (
          <div className="elegida">
            <div><span className="codigo">{cl.codigo}</span> {cl.descripcion}
              <span className={`sello ${cl.estado}`}>{cl.estado === 'validada' ? tr("Validada por agente") : tr("Preliminar")}</span>
              <button type="button" className="link" onClick={() => set({ clasificacion: null })}>{tr("Cambiar")}</button>
            </div>
            <div className="fila4">
              <label>{tr("DAI %")}<input placeholder={tr("pendiente")} value={pctIn(cl.dai)} onChange={(e) => setCl({ dai: pctOut(e.target.value) })} /></label>
              <label>{tr("Selectivo %")}<input placeholder={tr("pendiente")} value={pctIn(cl.sc)} onChange={(e) => setCl({ sc: pctOut(e.target.value) })} /></label>
              <label>{tr("IVA %")}<input placeholder={tr("pendiente")} value={pctIn(cl.iva)} onChange={(e) => setCl({ iva: pctOut(e.target.value) })} /></label>
              <label>{tr("Otros %")}<input placeholder={tr("pendiente")} value={pctIn(cl.otros)} onChange={(e) => setCl({ otros: pctOut(e.target.value) })} /></label>
            </div>
            <small className="nota">{tr("Un campo vacío queda como ")}<b>{tr("pendiente de validación")}</b>{tr(" y no se calcula como cero. ")}{cl.fuente ? tr("Fuente: {0}.", cl.fuente) : ''}</small>
            {modoAgencia()
              ? <label className="check"><input type="checkbox" checked={cl.estado === 'validada'} onChange={(e) => {
                setCl({ estado: e.target.checked ? 'validada' : 'preliminar', fuente: e.target.checked ? cl.fuente : undefined })
                // Guarda el Selectivo confirmado para reutilizarlo en próximas cotizaciones de este inciso
                if (e.target.checked && cl.sc != null) guardarTasaValidada(cl.codigo, cl.sc, cl.otros ?? 0)
              }} />{tr("Clasificación y tasas validadas por el agente aduanero")}</label>
              : cl.estado !== 'validada' && <small className="nota">{tr("El agente aduanero de LANDEX valida la clasificación y las tasas antes de la cotización formal.")}</small>}
          </div>
        ) : (
          <>
            <input type="search" placeholder={ind ? tr("Busca en el arancel: sofá de tela, lámpara LED, 9401…") : tr("Cargando arancel…")} value={q} onChange={(e) => setQ(e.target.value)} />
            {resultados.length > 0 && ind && (
              <ul className="partidas">
                {resultados.map(({ item }) => (
                  <li key={item[0]}>
                    <button type="button" onClick={() => { set({ clasificacion: aClasificacion(ind, item[0]) }); setQ('') }}>
                      <span className="codigo">{item[0]}</span>
                      <span className="desc">{etiqueta(ind, item[0])}</span>
                      <span className="tasa">{tr("DAI ")}{item[2] && /^\d/.test(item[2]) ? `${item[2]}%` : '—'}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <small className="nota">{tr("Sin clasificación, los impuestos de este producto quedan pendientes.")}</small>
          </>
        )}
      </div>

      <div className="sub-sec">
        <label className="check"><input type="checkbox" checked={p.certificadoOrigen} onChange={(e) => set({ certificadoOrigen: e.target.checked })} />{tr("El proveedor entrega certificado o declaración de origen")}</label>
        {p.certificadoOrigen && (
          <label>{tr("DAI preferencial por TLC % (lo confirma el agente)")}<input placeholder={tr("pendiente")} value={p.daiPreferencial == null ? '' : String(+(p.daiPreferencial * 100).toFixed(2))}
              onChange={(e) => set({ daiPreferencial: pctOut(e.target.value) })} />
          </label>
        )}
        {p.certificadoOrigen && <small className="nota">{tr("La preferencia solo se aplica cuando la clasificación está validada por el agente. Mientras tanto se muestra como ahorro potencial.")}</small>}
        <label className="check"><input type="checkbox" checked={!!p.requierePermiso} onChange={(e) => set({ requierePermiso: e.target.checked })} />{tr("Requiere permisos o notas técnicas (Salud, MAG, SFE…)")}</label>
      </div>

      {errores.length > 0 && <ul className="avisos">{errores.map((x) => <li key={x}>{x}</li>)}</ul>}
      <div className="acciones">
        <button type="button" className="btn primario" disabled={errores.length > 0} onClick={guardar}>{tr("Guardar producto")}</button>
        <button type="button" className="btn" onClick={onCancelar}>{tr("Cancelar")}</button>
      </div>
    </div>
  )
}
