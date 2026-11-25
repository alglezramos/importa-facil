import { useEffect, useMemo, useRef, useState } from 'react'
import { MODOS, ORIGENES, TIPO_CAMBIO_DEFAULT, ZONAS, type Modo, type Zona } from '../data/config'
import { aClasificacion, cargarArancel } from '../lib/arancel'
import { descargar, importarCSV, plantillaCSV } from '../lib/csv'
import { usd } from '../lib/formato'
import {
  calcularLanded, INCOTERMS, incotermCompatible, volumenProducto, type Ajuste, type Clasificacion, type Embarque,
  type Incoterm, type Producto,
} from '../lib/landed'
import { ProductoEditor } from './ProductoEditor'
import { Resultado } from './Resultado'

type EmbarqueForm = Omit<Embarque, 'origen'> & { origenId: string }

const EMBARQUE_INICIAL: EmbarqueForm = {
  proveedor: { empresa: '', direccion: '', contacto: '', telefono: '', email: '' },
  incoterm: 'EXW', lugarConvenido: '', entregaDestino: 'bodega', origenId: ORIGENES[1].id, modo: 'FCL40', zona: 'GAM',
  tipoCambio: TIPO_CAMBIO_DEFAULT, diasProduccion: 0, seguro: true, requiereDescarga: true, clienteTieneMontacargas: false,
  requiereDevolucionContenedor: true, inspeccionOrigen: false, embalajeAdicional: false, custodia: false, ajustes: {},
}

const nuevoProducto = (cl: Clasificacion | null = null): Producto => ({
  id: `p-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, sku: '', nombre: '', paisFabricacion: 'CN',
  cantidad: 0, valorUnitario: 0, pesoBrutoKg: 0, clasificacion: cl, certificadoOrigen: false,
})

/** Escenario de prueba NOVA HOME CR (cliente ficticio). */
export const EJEMPLO_NOVA: { embarque: EmbarqueForm; productos: Producto[] } = {
  embarque: { ...EMBARQUE_INICIAL, incoterm: 'EXW', lugarConvenido: 'Bodega del proveedor, Ningbo', origenId: 'cn-este', modo: 'FCL40' },
  productos: [{
    id: 'nova-1', sku: 'NOVA-001', nombre: 'Mobiliario para el hogar (ejemplo)', paisFabricacion: 'CN', cantidad: 1000,
    valorUnitario: 55, pesoBrutoKg: 9000, volumenM3: 55, clasificacion: null, certificadoOrigen: false,
  }],
}

const CLAVE = 'importa-facil:cotizacion'
function leer(): { embarque: EmbarqueForm; productos: Producto[] } {
  try {
    const x = JSON.parse(localStorage.getItem(CLAVE) || 'null')
    if (x?.embarque && Array.isArray(x.productos)) return { embarque: { ...EMBARQUE_INICIAL, ...x.embarque }, productos: x.productos }
  } catch { /* sin almacenamiento */ }
  return { embarque: EMBARQUE_INICIAL, productos: [] }
}

interface Props { clasificacionNueva?: Clasificacion | null }

export function Cotizador({ clasificacionNueva }: Props) {
  const inicial = useRef(leer())
  const [ef, setEf] = useState<EmbarqueForm>(inicial.current.embarque)
  const [productos, setProductos] = useState<Producto[]>(inicial.current.productos)
  const [editando, setEditando] = useState<Producto | null>(null)
  const [mensaje, setMensaje] = useState('')
  const archivo = useRef<HTMLInputElement>(null)

  useEffect(() => {
    try { localStorage.setItem(CLAVE, JSON.stringify({ embarque: ef, productos })) } catch { /* sin almacenamiento */ }
  }, [ef, productos])

  useEffect(() => { if (clasificacionNueva) setEditando(nuevoProducto(clasificacionNueva)) }, [clasificacionNueva])

  const origen = ORIGENES.find((o) => o.id === ef.origenId) ?? ORIGENES[0]
  const embarque: Embarque = { ...ef, origen }
  const r = useMemo(() => (productos.length ? calcularLanded(embarque, productos) : null), [JSON.stringify(ef), JSON.stringify(productos)]) // eslint-disable-line
  const set = (c: Partial<EmbarqueForm>) => setEf((x) => ({ ...x, ...c }))
  const esD = ['DAP', 'DPU', 'DDP'].includes(ef.incoterm)
  const prov = ef.proveedor ?? {}
  const setProv = (c: Partial<NonNullable<EmbarqueForm['proveedor']>>) => set({ proveedor: { ...prov, ...c } })
  const emailInvalido = !!prov.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(prov.email)

  const guardar = (p: Producto) => {
    setProductos((ps) => (ps.some((x) => x.id === p.id) ? ps.map((x) => (x.id === p.id ? p : x)) : [...ps, p]))
    setEditando(null)
  }
  const duplicar = (p: Producto) => setProductos((ps) => [...ps, { ...p, id: `p-${Date.now()}`, sku: `${p.sku}-copia` }])
  const eliminar = (id: string) => setProductos((ps) => ps.filter((x) => x.id !== id))
  const ajustar = (id: string, a: Ajuste | null) => setEf((x) => {
    const ajustes = { ...(x.ajustes ?? {}) }
    if (a) ajustes[id] = a
    else delete ajustes[id]
    return { ...x, ajustes }
  })

  const importar = async (f: File) => {
    const filas = importarCSV(await f.text())
    if (!filas.length) { setMensaje('El archivo no tiene filas de productos.'); return }
    let ind = null
    try { ind = await cargarArancel() } catch { /* sin arancel */ }
    const nuevos = filas.filter((x) => !x.errores.length).map((x) => {
      const p = x.producto
      if (ind && x.partida && ind.porCodigo.has(x.partida) && p.clasificacion) {
        const base = aClasificacion(ind, x.partida)
        p.clasificacion = { ...base, dai: p.clasificacion.dai ?? base.dai, sc: p.clasificacion.sc, iva: p.clasificacion.iva, otros: p.clasificacion.otros }
      }
      return p
    })
    const malas = filas.filter((x) => x.errores.length)
    setProductos((ps) => [...ps, ...nuevos])
    setMensaje(`${nuevos.length} producto(s) importado(s).${malas.length ? ` ${malas.length} fila(s) con errores: ${malas.map((m, i) => `fila ${i + 2} (${m.errores.join(', ')})`).join('; ')}` : ''}`)
  }

  const cargarEjemplo = () => {
    setEf(EJEMPLO_NOVA.embarque)
    setProductos(EJEMPLO_NOVA.productos)
    setMensaje('Escenario de prueba NOVA HOME CR cargado (cliente ficticio). Clasifica el producto para calcular impuestos.')
  }

  return (
    <div className="cotizador">
      <form className="formulario" onSubmit={(e) => e.preventDefault()}>
        <fieldset>
          <legend><span>1</span> El embarque</legend>
          <label>Origen
            <select value={ef.origenId} onChange={(e) => set({ origenId: e.target.value })}>
              {ORIGENES.map((o) => <option key={o.id} value={o.id}>{o.nombre}</option>)}
            </select>
          </label>
          <details className="proveedor" open={Object.values(prov).some(Boolean)}>
            <summary>Datos del proveedor</summary>
            <label>Empresa del proveedor<input value={prov.empresa ?? ''} placeholder="Ej.: Ningbo Home Furniture Co., Ltd." autoComplete="organization" onChange={(e) => setProv({ empresa: e.target.value })} /></label>
            <label>Dirección del proveedor<input value={prov.direccion ?? ''} placeholder="Calle, ciudad, provincia, país" autoComplete="street-address" onChange={(e) => setProv({ direccion: e.target.value })} /></label>
            <label>Nombre del contacto<input value={prov.contacto ?? ''} placeholder="Persona que atiende tu pedido" onChange={(e) => setProv({ contacto: e.target.value })} /></label>
            <div className="fila2">
              <label>Teléfono<input type="tel" value={prov.telefono ?? ''} placeholder="+86 …" onChange={(e) => setProv({ telefono: e.target.value })} /></label>
              <label>Email<input type="email" value={prov.email ?? ''} placeholder="ventas@proveedor.com" aria-invalid={emailInvalido} onChange={(e) => setProv({ email: e.target.value.trim() })} /></label>
            </div>
            {emailInvalido && <small className="nota error">Revisa el formato del email.</small>}
          </details>
          <label>¿Qué incluye el precio de tu proveedor? (Incoterm 2020)
            <select value={ef.incoterm} onChange={(e) => set({ incoterm: e.target.value as Incoterm })}>
              {(Object.keys(INCOTERMS) as Incoterm[]).map((k) => <option key={k} value={k}>{k} – {INCOTERMS[k].sencillo}</option>)}
            </select>
          </label>
          <small className="nota">El riesgo pasa a ti: {INCOTERMS[ef.incoterm].riesgo}</small>
          {!incotermCompatible(ef.incoterm, ef.modo) && <ul className="avisos"><li>{ef.incoterm} solo se usa en transporte marítimo. Usa FCA, CPT o CIP para otras modalidades.</li></ul>}
          <div className="fila2">
            <label>Lugar convenido<input value={ef.lugarConvenido ?? ''} placeholder="Ej.: Bodega del proveedor, Ningbo" onChange={(e) => set({ lugarConvenido: e.target.value })} /></label>
            {esD && (
              <label>El proveedor entrega en
                <select value={ef.entregaDestino} onChange={(e) => set({ entregaDestino: e.target.value as 'bodega' | 'puerto' })}>
                  <option value="bodega">Mi bodega</option>
                  <option value="puerto">Puerto o aeropuerto en Costa Rica</option>
                </select>
              </label>
            )}
          </div>
          <label>Modalidad de transporte
            <select value={ef.modo} onChange={(e) => set({ modo: e.target.value as Modo })}>
              {(Object.keys(MODOS) as Modo[]).filter((m) => m !== 'TERRESTRE' || origen.flete.terrestre !== null).map((m) => <option key={m} value={m}>{MODOS[m]}</option>)}
            </select>
          </label>
          <div className="fila2">
            <label>Días hasta que la mercancía esté lista<input type="number" min={0} value={ef.diasProduccion} onChange={(e) => set({ diasProduccion: Number(e.target.value) })} /></label>
            <label>Tipo de cambio (₡/USD)<input type="number" min={1} value={ef.tipoCambio} onChange={(e) => set({ tipoCambio: Number(e.target.value) })} /></label>
          </div>
        </fieldset>

        <fieldset>
          <legend><span>2</span> Productos</legend>
          {productos.length === 0 && !editando && (
            <p className="nota">Agrega uno o varios productos. Cada uno lleva su propia clasificación e impuestos.</p>
          )}
          <ul className="lista-prod">
            {productos.map((p) => (
              <li key={p.id}>
                <div>
                  <b>{p.sku || 'Sin SKU'}</b> · {p.nombre}
                  <small>{p.cantidad.toLocaleString('es-CR')} u × {usd(p.valorUnitario)} · {volumenProducto(p).toFixed(2)} m³ · {p.pesoBrutoKg.toLocaleString('es-CR')} kg · {p.clasificacion ? <span className="codigo">{p.clasificacion.codigo}</span> : <span className="sello pend">Sin clasificar</span>}</small>
                </div>
                <div className="mini-acc">
                  <button type="button" className="link" onClick={() => setEditando(p)}>Editar</button>
                  <button type="button" className="link" onClick={() => duplicar(p)}>Duplicar</button>
                  <button type="button" className="link peligro" onClick={() => eliminar(p.id)}>Eliminar</button>
                </div>
              </li>
            ))}
          </ul>
          {editando ? (
            <ProductoEditor key={editando.id} inicial={editando} onGuardar={guardar} onCancelar={() => setEditando(null)} />
          ) : (
            <div className="acciones">
              <button type="button" className="btn primario" onClick={() => setEditando(nuevoProducto())}>+ Agregar producto</button>
              <button type="button" className="btn" onClick={() => archivo.current?.click()}>Importar Excel/CSV</button>
              <button type="button" className="link" onClick={() => descargar('plantilla-productos.csv', '﻿' + plantillaCSV())}>Descargar plantilla</button>
              <input ref={archivo} type="file" accept=".csv,text/csv" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) importar(f); e.target.value = '' }} />
            </div>
          )}
          {mensaje && <p className="nota">{mensaje}</p>}
        </fieldset>

        <fieldset>
          <legend><span>3</span> Entrega y servicios</legend>
          <label>Zona de tu bodega
            <select value={ef.zona} onChange={(e) => set({ zona: e.target.value as Zona })}>
              {Object.entries(ZONAS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </label>
          <label className="check"><input type="checkbox" checked={ef.requiereDescarga} onChange={(e) => set({ requiereDescarga: e.target.checked })} />Necesito que descarguen la mercancía en mi bodega</label>
          {ef.requiereDescarga && <label className="check sub"><input type="checkbox" checked={ef.clienteTieneMontacargas} onChange={(e) => set({ clienteTieneMontacargas: e.target.checked })} />Tengo montacargas propio</label>}
          {['FCL20', 'FCL40', 'FCL40HC'].includes(ef.modo) && <label className="check"><input type="checkbox" checked={ef.requiereDevolucionContenedor} onChange={(e) => set({ requiereDevolucionContenedor: e.target.checked })} />Incluir la devolución del contenedor vacío</label>}
          <label className="check"><input type="checkbox" checked={ef.seguro} onChange={(e) => set({ seguro: e.target.checked })} />Asegurar la carga</label>
          <label className="check"><input type="checkbox" checked={!!ef.inspeccionOrigen} onChange={(e) => set({ inspeccionOrigen: e.target.checked })} />Inspección de calidad en origen</label>
          <label className="check"><input type="checkbox" checked={!!ef.embalajeAdicional} onChange={(e) => set({ embalajeAdicional: e.target.checked })} />Embalaje adicional o paletización</label>
          <label className="check"><input type="checkbox" checked={!!ef.custodia} onChange={(e) => set({ custodia: e.target.checked })} />Custodia o transporte especializado</label>
        </fieldset>
        <div className="acciones">
          <button type="button" className="link" onClick={cargarEjemplo}>Cargar escenario de prueba NOVA HOME</button>
          {productos.length > 0 && <button type="button" className="link peligro" onClick={() => { setProductos([]); setEf(EMBARQUE_INICIAL); setMensaje('') }}>Empezar de cero</button>}
        </div>
      </form>

      {r ? (
        <Resultado e={embarque} productos={productos} r={r} onAjuste={ajustar} onModo={(m) => set({ modo: m })} />
      ) : (
        <section className="resultado vacio">
          <h3>Tu cotización aparecerá aquí</h3>
          <p>Agrega al menos un producto para ver el costo total puesto y descargado en tu bodega, el costo por unidad y el tiempo estimado.</p>
          <button type="button" className="btn" onClick={cargarEjemplo}>Ver un ejemplo</button>
        </section>
      )}
    </div>
  )
}
