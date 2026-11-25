import { useEffect, useMemo, useRef, useState } from 'react'
import { MODOS, ORIGENES, ZONAS, type Modo, type Zona } from '../data/config'
import {
  EJEMPLO_NOVA, EMBARQUE_INICIAL, guardarBorrador, guardarCotizacion, leerBorrador, nuevoProducto, siguienteNumero, VIGENCIA_DIAS,
  type CotizacionGuardada, type EmbarqueForm, type Perfil,
} from '../lib/almacen'
import { aClasificacion, cargarArancel } from '../lib/arancel'
import { descargar, importarCSV, plantillaCSV } from '../lib/csv'
import { usd } from '../lib/formato'
import {
  calcularLanded, INCOTERMS, incotermCompatible, volumenProducto, type Ajuste, type Clasificacion, type Embarque,
  type Incoterm, type Producto,
} from '../lib/landed'
import { huella, modoAgencia, requisitosFormal, venceFormal, type Emision } from '../lib/formal'
import { BLOQUEADA, cambiarEstadoNube, esStaff, ESTADOS_NUBE, guardarCotizacionNube, listarTarifasNube, type CotNube, type EstadoNube, type Usuario } from '../lib/nube'
import { ajustesEfectivos, aplicaA, conceptosProtegidos, cargarTarifasPublicadas, liberarConceptos, tramoTarifa, usable, type Tarifa } from '../lib/tarifas'
import { perfilCompleto } from '../lib/almacen'
import { Documento } from './Documento'
import { Ofertas } from './Ofertas'
import { PanelAgencia } from './PanelAgencia'
import { Expediente } from './Expediente'
import { Guiado } from './Guiado'
import { ProductoEditor } from './ProductoEditor'
import { AGENCIA } from '../data/config'
import { Alcance } from './Alcance'
import { Contratar, resumenTexto, type Intencion } from './Contratar'
import { Resultado } from './Resultado'

export interface Apertura {
  cotizacion: CotizacionGuardada | null
  copia?: boolean
  vez: number
  /** Cotización de la nube (con su id y estado). */
  nube?: CotNube
  /** Perfil del cliente dueño, cuando la abre la agencia. */
  cliente?: Perfil
  /** Modo con el que se abre el cotizador (desde la página de inicio). */
  modo?: 'guiado' | 'experto'
}

interface Props {
  clasificacionNueva?: Clasificacion | null
  perfil: Perfil
  apertura?: Apertura | null
  /** Cambia cuando se editan tarifas en este navegador. */
  versionTarifas?: number
  usuario: Usuario | null
  onIniciarSesion: () => void
  onPerfil?: (p: Perfil) => void
}

export function Cotizador({ clasificacionNueva, perfil, apertura, versionTarifas, usuario, onIniciarSesion, onPerfil }: Props) {
  const inicial = useRef(leerBorrador())
  const [ef, setEf] = useState<EmbarqueForm>(inicial.current.embarque)
  const [productos, setProductos] = useState<Producto[]>(inicial.current.productos)
  const [numero, setNumero] = useState<string | undefined>(inicial.current.numero)
  const [editando, setEditando] = useState<Producto | null>(null)
  const [mensaje, setMensaje] = useState('')
  const [modoVista, setModoVista] = useState<'guiado' | 'experto'>(
    inicial.current.productos.length ? 'experto' : perfil.experiencia === 'ninguna' ? 'guiado' : 'experto')
  const [doc, setDoc] = useState(false)
  const [contratar, setContratar] = useState<Intencion | null>(null)
  const archivo = useRef<HTMLInputElement>(null)
  const resultadoRef = useRef<HTMLDivElement>(null)

  const [emision, setEmision] = useState<Emision | undefined>(inicial.current.emision)
  const [nubeId, setNubeId] = useState<string | undefined>(inicial.current.nubeId)
  const [nubeEstado, setNubeEstado] = useState<EstadoNube | undefined>(inicial.current.nubeEstado as EstadoNube | undefined)
  const [cliente, setCliente] = useState<Perfil | undefined>(inicial.current.cliente)
  const [ocupado, setOcupado] = useState(false)
  const agencia = modoAgencia()
  const staff = esStaff(usuario)
  const clientePerfil = cliente ?? perfil
  const [publicadas, setPublicadas] = useState<Tarifa[]>([])
  const [nubeTarifas, setNubeTarifas] = useState<Tarifa[]>([])
  useEffect(() => { cargarTarifasPublicadas().then(setPublicadas) }, [])
  useEffect(() => { listarTarifasNube().then(setNubeTarifas).catch(() => setNubeTarifas([])) }, [versionTarifas, usuario?.id])
  const todas = useMemo(() => [...nubeTarifas, ...publicadas.filter((p) => !nubeTarifas.some((n) => n.id === p.id))], [nubeTarifas, publicadas])
  // Si se cierra la sesión, la cotización deja de estar ligada a la nube
  useEffect(() => { if (!usuario && nubeId) { setNubeId(undefined); setNubeEstado(undefined); setCliente(undefined); setNumero(undefined) } }, [usuario]) // eslint-disable-line

  useEffect(() => { guardarBorrador({ embarque: ef, productos, numero, emision, nubeId, nubeEstado, cliente }) }, [ef, productos, numero, emision, nubeId, nubeEstado, cliente])

  useEffect(() => {
    if (!apertura) return
    const c = apertura.cotizacion
    setEf(c ? { ...EMBARQUE_INICIAL, ...c.embarque } : EMBARQUE_INICIAL)
    setProductos(c ? c.productos.map((p) => ({ ...p })) : [])
    setNumero(c && !apertura.copia ? c.numero : undefined)
    setEmision(c && !apertura.copia ? c.emision : undefined)
    setNubeId(apertura.nube && !apertura.copia ? apertura.nube.id : undefined)
    setNubeEstado(apertura.nube && !apertura.copia ? apertura.nube.estado : undefined)
    setCliente(apertura.nube && !apertura.copia && apertura.cliente && apertura.nube.cliente_id !== usuario?.id ? apertura.cliente : undefined)
    setEditando(null)
    setMensaje(c ? (apertura.copia ? `Copia de ${c.numero}: al guardar recibirá un número nuevo.` : `Editando ${c.numero}.`) : '')
    if (apertura.modo) setModoVista(apertura.modo)
    else if (!c) setModoVista(perfil.experiencia === 'ninguna' ? 'guiado' : 'experto')
    setContratar(null)
  }, [apertura]) // eslint-disable-line

  useEffect(() => { if (clasificacionNueva) setEditando(nuevoProducto(clasificacionNueva)) }, [clasificacionNueva])

  const origen = ORIGENES.find((o) => o.id === ef.origenId) ?? ORIGENES[0]
  const embarqueManual: Embarque = { ...ef, origen }
  // Tarifas aplicadas que siguen sirviendo para esta ruta y modalidad
  const aplicadas = (ef.tarifasAplicadas ?? []).map((id) => todas.find((t) => t.id === id)).filter((t): t is Tarifa => !!t && aplicaA(t, ef))
  const { embarque, r, protegidos } = useMemo(() => {
    if (!productos.length) return { embarque: embarqueManual, r: null, protegidos: new Set<string>() }
    const base = calcularLanded({ ...embarqueManual, ajustes: {} }, productos)
    const aj = ajustesEfectivos(todas, aplicadas.map((t) => t.id), ef.ajustes, base.carga, base.totales.mercancia, conceptosProtegidos(base.conceptos))
    const e2: Embarque = { ...embarqueManual, ajustes: aj }
    return { embarque: e2, r: calcularLanded(e2, productos), protegidos: conceptosProtegidos(base.conceptos) }
  }, [JSON.stringify(ef), JSON.stringify(productos), todas]) // eslint-disable-line
  const candidatas = todas.filter((t) => aplicaA(t, ef) && usable(t) && (agencia || !t.ejemplo))
  const huellaActual = huella({ ef: { ...ef, documentos: undefined, intencion: undefined }, productos, cliente: [clientePerfil.nombre, clientePerfil.empresa, clientePerfil.identificacion] })
  const formalVigente = !!emision && emision.huella === huellaActual && emision.vence >= new Date().toISOString().slice(0, 10)
  const requisitos = r ? requisitosFormal(r, productos, aplicadas, perfilCompleto(clientePerfil) && !!clientePerfil.identificacion.trim()) : []
  const bloqueada = !!nubeEstado && BLOQUEADA.includes(nubeEstado)
  const puedeSolicitar = !nubeEstado || nubeEstado === 'estimada' || nubeEstado === 'incompleta'
  const aplicarT = (t: Tarifa) => setEf((x) => ({
    ...x, ajustes: liberarConceptos(x.ajustes, t),
    tarifasAplicadas: [...(x.tarifasAplicadas ?? []).filter((id) => { const y = todas.find((z) => z.id === id); return y && tramoTarifa(y) !== tramoTarifa(t) }), t.id],
  }))
  const quitarT = (t: Tarifa) => setEf((x) => ({ ...x, tarifasAplicadas: (x.tarifasAplicadas ?? []).filter((id) => id !== t.id) }))
  const validar = (ids: string[], agente: string) => setProductos((ps) => ps.map((p) => (ids.includes(p.id) && p.clasificacion
    ? { ...p, clasificacion: { ...p.clasificacion, estado: 'validada', fuente: `Validada por ${agente} el ${new Date().toISOString().slice(0, 10)}` } } : p)))
  const emitir = async (agente: string) => {
    if (!r) return
    const em: Emision = { emitida: new Date().toISOString(), por: agente, huella: huellaActual, vence: venceFormal(new Date(), VIGENCIA_DIAS, aplicadas) }
    if (!usuario) { setEmision(em); guardarCot(em); return }
    const cot = await guardarCot(null)
    if (!cot) return
    const err = await cambiarEstadoNube(cot.id, 'formal', em)
    if (err) { setMensaje(`No se pudo emitir: ${err}`); return }
    setEmision(em); setNubeEstado('formal')
    setMensaje(`Cotización formal ${cot.numero} emitida. El cliente la ve en su cuenta y puede aceptarla.`)
  }
  const anular = async () => {
    if (nubeId && r) {
      const err = await cambiarEstadoNube(nubeId, r.estado, null)
      if (err) { setMensaje(`No se pudo anular: ${err}`); return }
      setNubeEstado(r.estado)
    }
    setEmision(undefined)
  }
  const aceptar = async () => {
    if (!nubeId) return
    const err = await cambiarEstadoNube(nubeId, 'aceptada')
    if (err) { setMensaje(`No se pudo aceptar: ${err}`); return }
    setNubeEstado('aceptada')
    setMensaje('¡Cotización aceptada! LANDEX te contactará para coordinar tu importación. Sube tus documentos abajo.')
  }
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

  /**
   * Guarda la cotización. Con sesión, en la nube (número oficial LDX); sin sesión, en este navegador.
   * `em`: emisión a conservar (undefined = la vigente, null = sin emisión).
   */
  const guardarCot = async (em: Emision | null | undefined = formalVigente ? emision : undefined, op: { estado?: EstadoNube; intencion?: Intencion } = {}): Promise<CotNube | null> => {
    if (!r) return null
    const nombre = (productos.map((p) => p.nombre).filter(Boolean).slice(0, 2).join(', ') + (productos.length > 2 ? ` y ${productos.length - 2} más` : '')) || 'Cotización sin nombre'
    if (usuario) {
      if (bloqueada) { setMensaje(`Esta cotización está ${ESTADOS_NUBE[nubeEstado!].toLowerCase()}: no se modifica. Duplícala desde "Mis cotizaciones" para cambiarla.`); return null }
      setOcupado(true)
      const vigente = em === undefined ? formalVigente : !!em
      const estado: EstadoNube = vigente && nubeEstado === 'formal' ? 'formal' : op.estado ?? (nubeEstado === 'solicitada' ? 'solicitada' : r.estado)
      const efGuardar = op.intencion ? { ...ef, intencion: op.intencion } : ef
      const { cot, error } = await guardarCotizacionNube(nubeId, nombre, efGuardar, productos, r, estado, staff ? (vigente ? emision ?? null : null) : undefined)
      setOcupado(false)
      if (error || !cot) { setMensaje(`No se pudo guardar en tu cuenta: ${error}`); return null }
      if (op.intencion) setEf((x) => ({ ...x, intencion: op.intencion }))
      setNubeId(cot.id); setNumero(cot.numero); setNubeEstado(cot.estado)
      if (!cot.emision) setEmision(undefined)
      setMensaje(op.estado === 'solicitada' ? `Solicitud ${cot.numero} enviada a LANDEX.` : `Cotización ${cot.numero} guardada en ${staff && cliente ? 'la cuenta del cliente' : 'tu cuenta'}.`)
      return cot
    }
    const num = numero ?? siguienteNumero()
    guardarCotizacion({ numero: num, fecha: new Date().toISOString(), vigenciaDias: VIGENCIA_DIAS, nombre, embarque: ef, productos, total: r.totales.total, estado: r.estado, emision: em ?? undefined })
    setNumero(num)
    setMensaje(`Cotización ${num} guardada en este navegador. Inicia sesión para guardarla en tu cuenta y subir documentos.`)
    return null
  }

  const abrirDoc = () => {
    if (!numero) guardarCot()
    setDoc(true)
  }

  const cargarEjemplo = () => {
    setEf(EJEMPLO_NOVA.embarque)
    setProductos(EJEMPLO_NOVA.productos)
    setNumero(undefined); setNubeId(undefined); setNubeEstado(undefined); setCliente(undefined); setEmision(undefined)
    setModoVista('experto')
    setMensaje('Escenario de prueba NOVA HOME CR cargado (cliente ficticio). Clasifica el producto para calcular impuestos.')
  }

  const presupuesto = clientePerfil.presupuestoUSD

  return (
    <>
    <div className="modo-barra">
      <div className="seg grande" role="tablist" aria-label="Modo de cotización">
        <button type="button" role="tab" aria-selected={modoVista === 'guiado'} className={modoVista === 'guiado' ? 'activa' : ''} onClick={() => setModoVista('guiado')}>Mi primera importación</button>
        <button type="button" role="tab" aria-selected={modoVista === 'experto'} className={modoVista === 'experto' ? 'activa' : ''} onClick={() => setModoVista('experto')}>Tengo experiencia importando</button>
      </div>
      {numero && (
        <span className="nota">
          Cotización <b>{numero}</b>
          {nubeEstado && <span className={`sello ${nubeEstado === 'formal' || nubeEstado === 'aceptada' ? 'validada' : ''}`}>{ESTADOS_NUBE[nubeEstado]}</span>}
          {cliente && <> · cliente: <b>{cliente.empresa || cliente.nombre || cliente.email}</b></>}
        </span>
      )}
    </div>
    <div className="cotizador">
      {modoVista === 'guiado' ? (
        <div className="formulario">
          <fieldset>
            <legend><span>✓</span> Cotización guiada</legend>
            <Guiado ef={ef} setEf={setEf} productos={productos} setProductos={setProductos} perfil={perfil}
              onTerminar={() => resultadoRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })} />
          </fieldset>
          {productos.length > 0 && <p className="nota">¿Tienes más de un producto? <button type="button" className="link" onClick={() => setModoVista('experto')}>Agrégalos en el modo detallado</button>: tus datos se conservan.</p>}
        </div>
      ) : (
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
          {productos.length > 0 && <button type="button" className="link peligro" onClick={() => { setProductos([]); setEf(EMBARQUE_INICIAL); setMensaje(''); setNumero(undefined); setNubeId(undefined); setNubeEstado(undefined); setCliente(undefined); setEmision(undefined) }}>Empezar de cero</button>}
        </div>
      </form>
      )}

      <div ref={resultadoRef} className="col-resultado">
      {r ? (
        <>
          {!staff && puedeSolicitar && (
            <div className="cta-contratar">
              <button type="button" className="btn primario grande" onClick={() => setContratar('contratar')}>Quiero importar con LANDEX</button>
              <span>Tu agencia aduanal se encarga de todo, de la fábrica a tu bodega.</span>
            </div>
          )}
          {!staff && nubeEstado === 'solicitada' && <p className="aviso-formal">Enviaste esta cotización a LANDEX. Un especialista la está revisando y te avisará cuando la cotización formal esté lista.</p>}
          <div className="acciones arriba">
            {staff && !bloqueada && <button type="button" className="btn primario" disabled={ocupado} onClick={() => guardarCot()}>{ocupado ? 'Guardando…' : numero ? 'Guardar cambios' : 'Guardar cotización'}</button>}
            {!staff && puedeSolicitar && <button type="button" className="btn" onClick={() => setContratar('cotizacion_formal')}>Solicitar cotización formal</button>}
            {!staff && <a className="btn" href={`mailto:${AGENCIA.email}?subject=${encodeURIComponent('Quiero hablar con un especialista')}&body=${encodeURIComponent('Hola, quiero hablar con un especialista sobre esta importación:\n\n' + resumenTexto(r, ef, productos))}`}>Hablar con un especialista</a>}
            {!staff && !bloqueada && <button type="button" className="btn" disabled={ocupado} onClick={() => guardarCot()}>{ocupado ? 'Guardando…' : numero ? 'Guardar cambios' : 'Guardar estimación'}</button>}
            <button type="button" className="btn" onClick={abrirDoc}>Descargar PDF</button>
            {!staff && nubeEstado === 'formal' && formalVigente && (
              <button type="button" className="btn primario" onClick={aceptar}>Aceptar cotización formal</button>
            )}
          </div>
          {contratar && (
            <Contratar intencion={contratar} r={r} ef={ef} productos={productos} usuario={usuario} perfil={perfil}
              onEnviarCuenta={async (i) => (await guardarCot(undefined, { estado: 'solicitada', intencion: i })) ? null : 'No se pudo enviar la solicitud. Intenta de nuevo.'}
              onIniciarSesion={onIniciarSesion} onPerfil={(p) => onPerfil?.(p)} onCerrar={() => setContratar(null)} />
          )}
          {!usuario && <p className="nota">¿Quieres guardarla en tu cuenta, subir documentos y recibir una cotización formal? <button type="button" className="link" onClick={onIniciarSesion}>Inicia sesión</button></p>}
          {!staff && nubeEstado === 'formal' && formalVigente && <p className="aviso-formal">LANDEX te envió esta <b>cotización formal</b>, válida hasta el {emision!.vence}. Revísala en PDF y, si estás de acuerdo, acéptala para iniciar tu importación.</p>}
          {mensaje && <p className="nota" role="status">{mensaje}</p>}
          {presupuesto ? (
            <p className={`presupuesto ${r.totales.desembolso <= presupuesto ? 'ok' : 'excede'}`}>
              Tu monto disponible: {usd(presupuesto)} · {r.totales.desembolso <= presupuesto ? `el desembolso estimado cabe (quedan ${usd(presupuesto - r.totales.desembolso)})` : `el desembolso estimado lo supera en ${usd(r.totales.desembolso - presupuesto)}`}{r.pendientes.length ? ', sin contar los pendientes' : ''}.
            </p>
          ) : null}
          {agencia && (
            <PanelAgencia productos={productos} requisitos={requisitos} emision={emision} vigente={formalVigente}
              onValidar={validar} onEmitir={emitir} onAnular={anular} />
          )}
          <Resultado e={embarque} productos={productos} r={r} onAjuste={ajustar} onModo={(m) => set({ modo: m })}
            formal={formalVigente ? emision : undefined}
            alcance={<Alcance r={r} externos={ef.gestionCliente ?? []} soloLectura={bloqueada} onCambio={(x) => set({ gestionCliente: x })} />}
            ofertas={<Ofertas e={embarqueManual} productos={productos} r={r} candidatas={candidatas} todas={todas}
              aplicadas={aplicadas.map((t) => t.id)} protegidos={protegidos} onAplicar={aplicarT} onQuitar={quitarT} />}
            expediente={<Expediente e={embarque} productos={productos} estados={ef.documentos ?? {}} agencia={agencia}
              cotId={nubeId} usuario={usuario} onGuardarPrimero={() => guardarCot()} onIniciarSesion={onIniciarSesion}
              onEstado={(id, st) => setEf((x) => ({ ...x, documentos: { ...(x.documentos ?? {}), [id]: st } }))} />} />
        </>
      ) : (
        <section className="resultado vacio">
          <h3>Tu cotización aparecerá aquí</h3>
          <p>Agrega al menos un producto para ver el costo total puesto y descargado en tu bodega, el costo por unidad y el tiempo estimado.</p>
          <button type="button" className="btn" onClick={cargarEjemplo}>Ver un ejemplo</button>
        </section>
      )}
      </div>
    </div>
    {r && (
      <div className="resumen-movil" aria-hidden={doc}>
        <div><small>{formalVigente ? 'Cotización formal' : r.estado === 'incompleta' ? 'Estimada incompleta' : 'Estimada'}</small><b>{usd(r.totales.total)}</b></div>
        <button type="button" className="btn primario" onClick={() => resultadoRef.current?.scrollIntoView({ behavior: 'smooth' })}>Ver resumen</button>
      </div>
    )}
    {doc && r && (
      <Documento numero={numero ?? 'Borrador'} fecha={formalVigente && emision ? new Date(emision.emitida) : new Date()} formal={formalVigente ? emision : undefined} tarifas={aplicadas} vigenciaDias={VIGENCIA_DIAS} perfil={clientePerfil} e={embarque} productos={productos} r={r} onCerrar={() => setDoc(false)} />
    )}
    </>
  )
}
