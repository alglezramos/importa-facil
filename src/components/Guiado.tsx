import { useEffect, useMemo, useState } from 'react'
import { MODOS, ORIGENES, ZONAS, type Modo, type Zona } from '../data/config'
import { nuevoProducto, type EmbarqueForm, type Perfil } from '../lib/almacen'
import { aClasificacion, buscar, cargarArancel, etiqueta, type Indice } from '../lib/arancel'
import { usd } from '../lib/formato'
import { compararModalidades, volumenProducto, type Incoterm, type Producto } from '../lib/landed'
import { PAISES } from './ProductoEditor'

interface Props {
  ef: EmbarqueForm
  setEf: (f: (x: EmbarqueForm) => EmbarqueForm) => void
  productos: Producto[]
  setProductos: (ps: Producto[]) => void
  perfil: Perfil
  onTerminar: () => void
}

/** Lo que el cliente sabe del precio, en palabras sencillas. */
const PRECIO: { id: string; texto: string; ayuda: string; mar: Incoterm; otro: Incoterm }[] = [
  { id: 'fabrica', texto: 'Me lo entregan en su fábrica o bodega', ayuda: 'Tú pagas todo desde ahí (EXW).', mar: 'EXW', otro: 'EXW' },
  { id: 'camion', texto: 'Lo cargan en el camión que yo envíe', ayuda: 'El proveedor carga y hace la exportación (FCA).', mar: 'FCA', otro: 'FCA' },
  { id: 'abordo', texto: 'Lo dejan en el barco o avión en su país', ayuda: 'Tú pagas desde el puerto de origen (FOB / FCA).', mar: 'FOB', otro: 'FCA' },
  { id: 'flete', texto: 'Pagan el transporte hasta Costa Rica', ayuda: 'Sin seguro incluido (CFR / CPT).', mar: 'CFR', otro: 'CPT' },
  { id: 'fleteseguro', texto: 'Pagan el transporte y el seguro hasta Costa Rica', ayuda: '(CIF / CIP).', mar: 'CIF', otro: 'CIP' },
  { id: 'bodega', texto: 'Me lo traen hasta mi bodega, sin pagar impuestos', ayuda: 'Tú pagas impuestos y descarga (DAP).', mar: 'DAP', otro: 'DAP' },
  { id: 'nose', texto: 'No sé', ayuda: 'Calculamos todos los costos desde la fábrica (lo más completo) y lo marcamos para confirmar.', mar: 'EXW', otro: 'EXW' },
]

/** Tamaños aproximados para quien no conoce medidas ni peso exactos. */
const TAMANOS: { id: string; texto: string; m3: number; kg: number }[] = [
  { id: 'cajas', texto: 'Unas pocas cajas (caben en un carro)', m3: 0.5, kg: 80 },
  { id: 'tarimas', texto: '1 o 2 tarimas (pallets)', m3: 2.5, kg: 700 },
  { id: 'varias', texto: 'Varias tarimas, como un camión pequeño', m3: 10, kg: 2500 },
  { id: 'c20', texto: 'Más o menos un contenedor pequeño (20 pies)', m3: 25, kg: 8000 },
  { id: 'c40', texto: 'Más o menos un contenedor grande (40 pies)', m3: 55, kg: 10000 },
]

const PASOS = ['Tu producto', 'Tu proveedor', 'El precio', 'Tamaño de la carga', 'Entrega', 'Transporte']

export function Guiado({ ef, setEf, productos, setProductos, perfil, onTerminar }: Props) {
  const [paso, setPaso] = useState(0)
  const p = productos[0] ?? nuevoProducto()
  const setP = (c: Partial<Producto>) => setProductos([{ ...p, ...c }, ...productos.slice(1)])
  const [precioId, setPrecioId] = useState<string>(ef.incotermPorConfirmar ? 'nose' : PRECIO.find((x) => x.mar === ef.incoterm || x.otro === ef.incoterm)?.id ?? '')
  const [medida, setMedida] = useState<'exacta' | 'aprox'>(p.datosPorConfirmar?.length ? 'aprox' : 'exacta')
  const [tamano, setTamano] = useState<string>(() => TAMANOS.find((t) => t.m3 === p.volumenM3 && t.kg === p.pesoBrutoKg && p.datosPorConfirmar?.length)?.id ?? '')
  const [prioridad, setPrioridad] = useState<'costo' | 'rapidez' | ''>('')
  const [valorModo, setValorModo] = useState<'unitario' | 'total'>('unitario')
  const [ind, setInd] = useState<Indice | null>(null)
  const [q, setQ] = useState('')
  const [noSePartida, setNoSePartida] = useState(false)
  useEffect(() => { cargarArancel().then(setInd).catch(() => setInd(null)) }, [])
  const resultados = useMemo(() => (ind && q.trim().length >= 2 ? buscar(ind, q, 5) : []), [ind, q])

  // El perfil precarga la entrega
  useEffect(() => {
    if (perfil.tieneMontacargas) setEf((x) => x.clienteTieneMontacargas ? x : { ...x, clienteTieneMontacargas: true })
  }, [perfil.tieneMontacargas, setEf])

  const origen = ORIGENES.find((o) => o.id === ef.origenId) ?? ORIGENES[0]
  const set = (c: Partial<EmbarqueForm>) => setEf((x) => ({ ...x, ...c }))
  const prov = ef.proveedor ?? {}

  const aplicarIncoterm = (id: string, modo: Modo) => {
    const op = PRECIO.find((x) => x.id === id)
    if (!op) return
    const maritimo = ['LCL', 'FCL20', 'FCL40', 'FCL40HC'].includes(modo)
    set({ incoterm: maritimo ? op.mar : op.otro, incotermPorConfirmar: id === 'nose', entregaDestino: 'bodega' })
  }

  const comp = useMemo(() => {
    if (!(p.cantidad > 0 && volumenProducto(p) > 0)) return []
    return compararModalidades({ ...ef, origen }, productos).filter((m) => m.compatible && !m.fletePendiente)
  }, [JSON.stringify(ef), JSON.stringify(productos)]) // eslint-disable-line
  const completas = comp.filter((m) => !m.incompleta)
  const alternativas = completas.length ? completas : comp
  const recomendada = alternativas.length
    ? prioridad === 'rapidez'
      ? alternativas.reduce((a, b) => (b.dias < a.dias || (b.dias === a.dias && b.total < a.total) ? b : a))
      : alternativas.reduce((a, b) => (b.total < a.total ? b : a))
    : null

  const validos = [
    !!(p.nombre.trim() && p.cantidad > 0 && p.valorUnitario > 0),
    true,
    !!precioId,
    medida === 'exacta' ? volumenProducto(p) > 0 && p.pesoBrutoKg > 0 : !!tamano,
    true,
    !!prioridad && !!recomendada,
  ]

  const siguiente = () => {
    if (!validos[paso]) return
    if (paso === 2) aplicarIncoterm(precioId, ef.modo)
    if (paso === 3 && medida === 'exacta') setP({ datosPorConfirmar: (p.datosPorConfirmar ?? []).filter((d) => !d.includes('volumen y peso aproximados')) })
    if (paso === 5 && recomendada) {
      set({ modo: recomendada.modo })
      aplicarIncoterm(precioId, recomendada.modo)
      onTerminar()
      return
    }
    setPaso((x) => Math.min(PASOS.length - 1, x + 1))
  }

  const elegirTamano = (id: string) => {
    const t = TAMANOS.find((x) => x.id === id)!
    setTamano(id)
    setP({ volumenM3: t.m3, pesoBrutoKg: t.kg, bultos: undefined, datosPorConfirmar: ['volumen y peso aproximados (pedir la lista de empaque al proveedor)'] })
  }

  return (
    <div className="guiado">
      <p className="nota" aria-live="polite">Paso {paso + 1} de {PASOS.length} · {PASOS[paso]}</p>
      <ol className="progreso" aria-label="Pasos">
        {PASOS.map((t, i) => (
          <li key={t} className={i === paso ? 'actual' : i < paso ? 'hecho' : ''}>
            <button type="button" aria-current={i === paso ? "step" : undefined} disabled={i > paso} onClick={() => setPaso(i)}><span>{i + 1}</span>{t}</button>
          </li>
        ))}
      </ol>

      <div className="paso">
        {paso === 0 && (
          <>
            <h3>¿Qué quieres importar?</h3>
            <p className="nota">Ten a mano el precio del proveedor. Si todavía no conoces la partida arancelaria, puedes continuar y LANDEX la revisará.</p>
            <label>Nombre del producto<input value={p.nombre} placeholder="Ej.: sillas de oficina" onChange={(e) => setP({ nombre: e.target.value, sku: p.sku || 'PROD-1' })} /></label>
            <label>Descríbelo: de qué material es y para qué sirve<input value={p.descripcion ?? ''} placeholder="Ej.: sillas giratorias de malla con base metálica" onChange={(e) => setP({ descripcion: e.target.value })} /></label>
            <div className="fila2">
              <label>¿Cuántas unidades?<input type="number" min={0} value={p.cantidad || ''} onChange={(e) => setP({ cantidad: Number(e.target.value) })} /></label>
              <label>País donde se fabrica
                <select value={p.paisFabricacion} onChange={(e) => setP({ paisFabricacion: e.target.value })}>
                  {PAISES.map(([c, n]) => <option key={c} value={c}>{n}</option>)}
                </select>
              </label>
            </div>
            <div className="seg">
              <button type="button" className={valorModo === 'unitario' ? 'activa' : ''} onClick={() => setValorModo('unitario')}>Sé el precio por unidad</button>
              <button type="button" className={valorModo === 'total' ? 'activa' : ''} onClick={() => setValorModo('total')}>Sé el total de la compra</button>
            </div>
            {valorModo === 'unitario' ? (
              <label>Precio por unidad (USD)<input type="number" min={0} step="0.01" value={p.valorUnitario || ''} onChange={(e) => setP({ valorUnitario: Number(e.target.value) })} /></label>
            ) : (
              <label>Total que le pagas al proveedor (USD)<input type="number" min={0} step="0.01" value={p.cantidad && p.valorUnitario ? +(p.cantidad * p.valorUnitario).toFixed(2) : ''} onChange={(e) => setP({ valorUnitario: p.cantidad ? Number(e.target.value) / p.cantidad : 0 })} disabled={!p.cantidad} /></label>
            )}
            <div className="sub-sec">
              <span className="sub">Partida arancelaria <small>(define los impuestos)</small></span>
              {p.clasificacion ? (
                <p><span className="codigo">{p.clasificacion.codigo}</span> {p.clasificacion.descripcion} <button type="button" className="link" onClick={() => setP({ clasificacion: null })}>Cambiar</button></p>
              ) : noSePartida ? (
                <p className="nota">Sin problema: el agente aduanero la define. Los impuestos quedarán pendientes. <button type="button" className="link" onClick={() => setNoSePartida(false)}>Buscarla ahora</button></p>
              ) : (
                <>
                  <input type="search" placeholder="Busca tu producto en el arancel…" value={q} onChange={(e) => setQ(e.target.value)} />
                  {ind && resultados.length > 0 && (
                    <ul className="partidas">
                      {resultados.map(({ item }) => (
                        <li key={item[0]}><button type="button" onClick={() => { setP({ clasificacion: aClasificacion(ind, item[0]) }); setQ('') }}>
                          <span className="codigo">{item[0]}</span><span className="desc">{etiqueta(ind, item[0])}</span>
                        </button></li>
                      ))}
                    </ul>
                  )}
                  <button type="button" className="link" onClick={() => setNoSePartida(true)}>No sé cuál es</button>
                </>
              )}
            </div>
          </>
        )}

        {paso === 1 && (
          <>
            <h3>¿Dónde está tu proveedor?</h3>
            <label>Ciudad o región
              <select value={ef.origenId} onChange={(e) => set({ origenId: e.target.value })}>
                {ORIGENES.map((o) => <option key={o.id} value={o.id}>{o.nombre}</option>)}
              </select>
            </label>
            <p className="nota">Opcional: los datos del proveedor nos ayudan a coordinar la recolección.</p>
            <div className="fila2">
              <label>Empresa<input value={prov.empresa ?? ''} onChange={(e) => set({ proveedor: { ...prov, empresa: e.target.value } })} /></label>
              <label>Contacto<input value={prov.contacto ?? ''} onChange={(e) => set({ proveedor: { ...prov, contacto: e.target.value } })} /></label>
              <label>Teléfono<input type="tel" value={prov.telefono ?? ''} onChange={(e) => set({ proveedor: { ...prov, telefono: e.target.value } })} /></label>
              <label>Email<input type="email" value={prov.email ?? ''} onChange={(e) => set({ proveedor: { ...prov, email: e.target.value.trim() } })} /></label>
            </div>
            <label>Dirección<input value={prov.direccion ?? ''} onChange={(e) => set({ proveedor: { ...prov, direccion: e.target.value } })} /></label>
          </>
        )}

        {paso === 2 && (
          <>
            <h3>¿Qué incluye el precio que te dio el proveedor?</h3>
            <p className="nota">Así sabemos qué costos ya pagó el proveedor y cuáles te tocan a ti.</p>
            <div className="opciones">
              {PRECIO.map((o) => (
                <label key={o.id} className={`opcion ${precioId === o.id ? 'on' : ''}`}>
                  <input type="radio" name="precio" checked={precioId === o.id} onChange={() => setPrecioId(o.id)} />
                  <span><b>{o.texto}</b><small>{o.ayuda}</small></span>
                </label>
              ))}
            </div>
          </>
        )}

        {paso === 3 && (
          <>
            <h3>¿Qué tan grande es tu carga?</h3>
            <div className="seg">
              <button type="button" className={medida === 'exacta' ? 'activa' : ''} onClick={() => { setMedida('exacta'); setTamano(''); setP({ volumenM3: p.datosPorConfirmar?.length ? 0 : volumenProducto(p), pesoBrutoKg: p.datosPorConfirmar?.length ? 0 : p.pesoBrutoKg, bultos: undefined, datosPorConfirmar: p.datosPorConfirmar }) }}>Sé el volumen y el peso</button>
              <button type="button" className={medida === 'aprox' ? 'activa' : ''} onClick={() => setMedida('aprox')}>No lo sé con exactitud</button>
            </div>
            {medida === 'exacta' ? (
              <div className="fila2">
                <label>Volumen total (m³)<input type="number" min={0} step="0.01" value={volumenProducto(p) || ''} onChange={(e) => setP({ volumenM3: Number(e.target.value), bultos: undefined })} /></label>
                <label>Peso total (kg)<input type="number" min={0} value={p.pesoBrutoKg || ''} onChange={(e) => setP({ pesoBrutoKg: Number(e.target.value) })} /></label>
              </div>
            ) : (
              <>
                <p className="nota">Elige lo más parecido. Lo marcamos como <b>por confirmar</b>: pídele al proveedor la lista de empaque (packing list) con medidas y peso.</p>
                <div className="opciones">
                  {TAMANOS.map((t) => (
                    <label key={t.id} className={`opcion ${tamano === t.id ? 'on' : ''}`}>
                      <input type="radio" name="tamano" checked={tamano === t.id} onChange={() => elegirTamano(t.id)} />
                      <span><b>{t.texto}</b><small>Aprox. {t.m3} m³ y {t.kg.toLocaleString('es-CR')} kg</small></span>
                    </label>
                  ))}
                </div>
              </>
            )}
          </>
        )}

        {paso === 4 && (
          <>
            <h3>¿Dónde lo recibes?</h3>
            {perfil.direccionEntrega && <p className="nota">Dirección de tu perfil: {perfil.direccionEntrega}</p>}
            <label>Zona
              <select value={ef.zona} onChange={(e) => set({ zona: e.target.value as Zona })}>
                {Object.entries(ZONAS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </label>
            <label className="check"><input type="checkbox" checked={ef.requiereDescarga} onChange={(e) => set({ requiereDescarga: e.target.checked })} />Necesito que descarguen la mercancía</label>
            {ef.requiereDescarga && <label className="check sub"><input type="checkbox" checked={ef.clienteTieneMontacargas} onChange={(e) => set({ clienteTieneMontacargas: e.target.checked })} />Tengo montacargas</label>}
            <label className="check"><input type="checkbox" checked={ef.seguro} onChange={(e) => set({ seguro: e.target.checked })} />Asegurar la carga (recomendado)</label>
          </>
        )}

        {paso === 5 && (
          <>
            <h3>¿Qué es más importante para ti?</h3>
            <div className="opciones dos">
              <label className={`opcion ${prioridad === 'costo' ? 'on' : ''}`}><input type="radio" name="prio" checked={prioridad === 'costo'} onChange={() => setPrioridad('costo')} /><span><b>Pagar lo menos posible</b><small>Aunque tarde más</small></span></label>
              <label className={`opcion ${prioridad === 'rapidez' ? 'on' : ''}`}><input type="radio" name="prio" checked={prioridad === 'rapidez'} onChange={() => setPrioridad('rapidez')} /><span><b>Recibirlo lo antes posible</b><small>Aunque cueste más</small></span></label>
            </div>
            {prioridad && recomendada && (
              <div className="recomendacion">
                <b>Te recomendamos: {MODOS[recomendada.modo]}</b>
                <span>{usd(recomendada.total)}{recomendada.incompleta ? ' + costos pendientes' : ' estimados'} · unos {recomendada.dias} días{recomendada.contenedores > 1 ? ` · ${recomendada.contenedores} unidades` : ''}</span>
                <small>{recomendada.incompleta ? 'Alternativa preliminar: faltan costos por confirmar y no se puede asegurar cuál es más económica.' : `Es la opción ${prioridad === 'costo' ? 'más económica' : 'más rápida'} entre las alternativas completas con tarifas de referencia.`} Puedes compararlas en el resultado.</small>
              </div>
            )}
            {prioridad && !recomendada && <p className="nota">No hay una modalidad con tarifa de referencia para esta ruta: te contactamos para cotizarla.</p>}
          </>
        )}
      </div>

      {!validos[paso] && <p className="nota" role="status">{["Completa el nombre, cantidad y precio del producto.", "", "Selecciona qué incluye el precio o indica que no lo sabes.", "Indica el peso y volumen o elige un tamaño aproximado.", "", "Selecciona una prioridad y revisa las alternativas disponibles."][paso]}</p>}
      <div className="acciones">
        {paso > 0 && <button type="button" className="btn" onClick={() => setPaso(paso - 1)}>Atrás</button>}
        <button type="button" className="btn primario" disabled={!validos[paso]} onClick={siguiente}>{paso === PASOS.length - 1 ? 'Ver mi cotización' : 'Continuar'}</button>
      </div>
    </div>
  )
}
