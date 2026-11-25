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
      <summary><b>¿Tienes una factura proforma?</b> · Consultar documento y cargar datos</summary>
      <p className="nota">Abre una factura PDF o imagen en tu dispositivo o pega el texto de una proforma o packing list. La extracción por etiquetas es local; todavía no hay lectura directa de PDF ni OCR. Los documentos no se adjuntan al expediente.</p>
      <label>Factura proforma<input type="file" accept=".pdf,.png,.jpg,.jpeg,.webp,application/pdf,image/png,image/jpeg,image/webp" onChange={(e) => {
        const f = e.target.files?.[0]
        setConfirmado(false); setError(''); setArchivo(null)
        if (!f) return
        if (f.size > 10 * 1024 * 1024 || !/\.(pdf|png|jpe?g|webp)$/i.test(f.name)) { setError('Selecciona un PDF o imagen de hasta 10 MB.'); return }
        setArchivo(f)
      }} /></label>
      {error && <p className="nota error" role="alert">{error}</p>}
      {archivo && url && <p><a href={url} target="_blank" rel="noopener noreferrer">Abrir {archivo.name} en otra pestaña</a></p>}
      <label>Texto de un solo producto (opcional)<textarea rows={6} maxLength={200000} value={texto} onChange={e=>{setTexto(e.target.value);setConfirmado(false);setAviso('')}} placeholder={'Supplier: Example\nSKU: ABC-01\nQuantity: 20\nUnit price (USD): 10'} /></label>
      <button type="button" className="btn" disabled={!texto.trim()} onClick={sugerir}>Detectar campos</button>
      {aviso && <p className="nota" role="status">{aviso}</p>}
      {(archivo || texto.trim()) && <>
        <p className="nota">Completa un producto por vez. Usa el valor unitario convertido a USD y las medidas totales de ese producto, no de todo el embarque.</p>
        <div onChange={() => setConfirmado(false)}>
          <label>Proveedor<input value={proveedor} onChange={(e) => setProveedor(e.target.value)} /></label>
          <label>Incoterm<select value={incoterm} onChange={(e) => setIncoterm(e.target.value as Incoterm | '')}><option value="">Por confirmar / conservar actual</option>{Object.keys(INCOTERMS).map((i) => <option key={i}>{i}</option>)}</select></label>
          <label>Producto<input value={nombre} onChange={(e) => setNombre(e.target.value)} /></label>
          <label>SKU (opcional)<input value={sku} onChange={(e) => setSku(e.target.value)} /></label>
          <label>País de fabricación<select value={pais} onChange={(e) => setPais(e.target.value)}><option value="">Selecciona…</option>{PAISES.map(([c,n]) => <option key={c} value={c}>{n}</option>)}</select></label>
          <div className="fila2">
            <label>Cantidad<input type="number" min="0" value={cantidad} onChange={(e) => setCantidad(e.target.value)} /></label>
            <label>Precio unitario (USD)<input type="number" min="0" step="any" value={precio} onChange={(e) => setPrecio(e.target.value)} /></label>
            <label>Peso bruto total (kg)<input type="number" min="0" step="any" value={peso} onChange={(e) => setPeso(e.target.value)} /></label>
            <label>Volumen total (m³)<input type="number" min="0" step="any" value={volumen} onChange={(e) => setVolumen(e.target.value)} /></label>
          </div>
        </div>
        <p className="nota">La clasificación y los impuestos se mantienen pendientes de revisión. Si faltan peso o volumen, solicita el packing list o utiliza el cotizador guiado.</p>
        <label className="check"><input type="checkbox" checked={confirmado} onChange={(e) => setConfirmado(e.target.checked)} />Confirmo que revisé los datos y que los precios están en USD.</label>
        <button type="button" className="btn primario" disabled={!valido} onClick={() => {
          if (!valido) return
          onAplicar({ ...nuevoProducto(), nombre: nombre.trim(), sku: sku.trim(), paisFabricacion: pais, cantidad: Number(cantidad), valorUnitario: Number(precio), pesoBrutoKg: Number(peso), volumenM3: Number(volumen) }, proveedor.trim(), incoterm)
          setNombre(''); setSku(''); setCantidad(''); setPrecio(''); setPeso(''); setVolumen(''); setTexto(''); setAviso(''); setConfirmado(false)
        }}>Agregar producto a la cotización</button>
      </>}
    </details>
  )
}
