import { tr } from '../lib/idioma'
import { useEffect, useState } from 'react'
import { INCOTERMS, type Incoterm, type Producto } from '../lib/landed'
import { nuevoProducto } from '../lib/almacen'
import { PAISES } from './ProductoEditor'
import { extraerCampos } from '../lib/extraerDocumento'

interface Props {
  onAplicar: (producto: Producto, proveedor: string, incoterm: Incoterm | '') => void
}

/** Lectura asistida local: el documento nunca se transmite ni se interpreta automáticamente. */
export function Proforma({ onAplicar }: Props) {
  const [archivo, setArchivo] = useState<File | null>(null)
  const [url, setUrl] = useState('')
  const [error, setError] = useState('')
  const [proveedor, setProveedor] = useState('')
  const [incoterm, setIncoterm] = useState<Incoterm | ''>('')
  const [pais, setPais] = useState('')
  const [nombre, setNombre] = useState('')
  const [sku, setSku] = useState('')
  const [cantidad, setCantidad] = useState('')
  const [precio, setPrecio] = useState('')
  const [peso, setPeso] = useState('')
  const [volumen, setVolumen] = useState('')
  const [confirmado, setConfirmado] = useState(false)
  const [texto, setTexto] = useState('')
  const [aviso, setAviso] = useState('')
  const sugerir = () => {
    const s = extraerCampos(texto)
    setConfirmado(false)
    if (s.proveedor && !proveedor) setProveedor(s.proveedor)
    if (s.incoterm && !incoterm && Object.prototype.hasOwnProperty.call(INCOTERMS, s.incoterm.toUpperCase())) setIncoterm(s.incoterm.toUpperCase() as Incoterm)
    if (s.pais && !pais && PAISES.some(([c]) => c === s.pais?.toUpperCase())) setPais(s.pais.toUpperCase())
    if (s.nombre && !nombre) setNombre(s.nombre)
    if (s.sku && !sku) setSku(s.sku)
    if (s.cantidad && !cantidad) setCantidad(s.cantidad)
    if (s.precio && !precio) setPrecio(s.precio)
    if (s.peso && !peso) setPeso(s.peso)
    if (s.volumen && !volumen) setVolumen(s.volumen)
    setAviso(Object.keys(s).length ? 'Se detectaron campos rotulados. Solo se rellenan los campos vacíos. Comprueba que todos pertenecen al mismo producto y que peso y volumen no corresponden a todo el embarque.' : 'No se encontraron campos inequívocos. Introduce los datos manualmente.')
  }
  useEffect(() => {
    if (!archivo) { setUrl(''); return }
    const u = URL.createObjectURL(archivo)
    setUrl(u)
    return () => URL.revokeObjectURL(u)
  }, [archivo])
  const positivo = (v: string) => Number.isFinite(Number(v)) && Number(v) > 0
  const valido = (!!archivo || !!texto.trim()) && !!nombre.trim() && !!pais && positivo(cantidad) && positivo(precio)
    && positivo(peso) && positivo(volumen) && confirmado
  return (
    <details className="panel">
      <summary><b>{tr("¿Tienes una factura proforma?")}</b>{tr(" · Consultar documento y cargar datos")}</summary>
      <p className="nota">{tr("Abre una factura PDF o imagen en tu dispositivo o pega el texto de una proforma o packing list. La extracción por etiquetas es local; todavía no hay lectura directa de PDF ni OCR. Los documentos no se adjuntan al expediente.")}</p>
      <label>{tr("Factura proforma")}<input type="file" accept=".pdf,.png,.jpg,.jpeg,.webp,application/pdf,image/png,image/jpeg,image/webp" onChange={(e) => {
        const f = e.target.files?.[0]
        setConfirmado(false); setError(''); setArchivo(null)
        if (!f) return
        if (f.size > 10 * 1024 * 1024 || !/\.(pdf|png|jpe?g|webp)$/i.test(f.name)) { setError('Selecciona un PDF o imagen de hasta 10 MB.'); return }
        setArchivo(f)
      }} /></label>
      {error && <p className="nota error" role="alert">{tr(error)}</p>}
      {archivo && url && <p><a href={url} target="_blank" rel="noopener noreferrer">{tr("Abrir ")}{archivo.name}{tr(" en otra pestaña")}</a></p>}
      <label>{tr("Texto de un solo producto (opcional)")}<textarea rows={6} maxLength={200000} value={texto} onChange={e=>{setTexto(e.target.value);setConfirmado(false);setAviso('')}} placeholder={tr("Proveedor: Ejemplo S.A.\nSKU: ABC-01\nCantidad: 20\nPrecio unitario (USD): 10")} /></label>
      <button type="button" className="btn" disabled={!texto.trim()} onClick={sugerir}>{tr("Detectar campos")}</button>
      {aviso && <p className="nota" role="status">{tr(aviso)}</p>}
      {(archivo || texto.trim()) && <>
        <p className="nota">{tr("Completa un producto por vez. Usa el valor unitario convertido a USD y las medidas totales de ese producto, no de todo el embarque.")}</p>
        <div onChange={() => setConfirmado(false)}>
          <label>{tr("Proveedor")}<input value={proveedor} onChange={(e) => setProveedor(e.target.value)} /></label>
          <label>{tr("Incoterm")}<select value={incoterm} onChange={(e) => setIncoterm(e.target.value as Incoterm | '')}><option value="">{tr("Por confirmar / conservar actual")}</option>{Object.keys(INCOTERMS).map((i) => <option key={i} value={i}>{i}</option>)}</select></label>
          <label>{tr("Producto")}<input value={nombre} onChange={(e) => setNombre(e.target.value)} /></label>
          <label>{tr("SKU (opcional)")}<input value={sku} onChange={(e) => setSku(e.target.value)} /></label>
          <label>{tr("País de fabricación")}<select value={pais} onChange={(e) => setPais(e.target.value)}><option value="">{tr("Selecciona…")}</option>{PAISES.map(([c,n]) => <option key={c} value={c}>{n}</option>)}</select></label>
          <div className="fila2">
            <label>{tr("Cantidad")}<input type="number" min="0" value={cantidad} onChange={(e) => setCantidad(e.target.value)} /></label>
            <label>{tr("Precio unitario (USD)")}<input type="number" min="0" step="any" value={precio} onChange={(e) => setPrecio(e.target.value)} /></label>
            <label>{tr("Peso bruto total (kg)")}<input type="number" min="0" step="any" value={peso} onChange={(e) => setPeso(e.target.value)} /></label>
            <label>{tr("Volumen total (m³)")}<input type="number" min="0" step="any" value={volumen} onChange={(e) => setVolumen(e.target.value)} /></label>
          </div>
        </div>
        <p className="nota">{tr("La clasificación y los impuestos se mantienen pendientes de revisión. Si faltan peso o volumen, solicita el packing list o utiliza el cotizador guiado.")}</p>
        <label className="check"><input type="checkbox" checked={confirmado} onChange={(e) => setConfirmado(e.target.checked)} />{tr("Confirmo que revisé los datos y que los precios están en USD.")}</label>
        <button type="button" className="btn primario" disabled={!valido} onClick={() => {
          if (!valido) return
          onAplicar({ ...nuevoProducto(), nombre: nombre.trim(), sku: sku.trim(), paisFabricacion: pais, cantidad: Number(cantidad), valorUnitario: Number(precio), pesoBrutoKg: Number(peso), volumenM3: Number(volumen) }, proveedor.trim(), incoterm)
          setNombre(''); setSku(''); setCantidad(''); setPrecio(''); setPeso(''); setVolumen(''); setTexto(''); setAviso(''); setConfirmado(false)
        }}>{tr("Agregar producto a la cotización")}</button>
      </>}
    </details>
  )
}
