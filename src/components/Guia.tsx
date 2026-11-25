import { useEffect, useState } from 'react'

type Modo = 'maritimo' | 'aereo' | 'terrestre'
type Quien = 'Tú' | 'LANDEX' | 'Tu proveedor'

interface Etapa {
  id: string
  titulo: string
  corto: string
  icono: string
  quien: Quien[]
  texto: (m: Modo) => string
  documentos: (m: Modo) => string[]
  consejo: string
  accion?: 'cotizar' | 'agencia'
}

const DOC_TRANSPORTE: Record<Modo, string> = { maritimo: 'Conocimiento de embarque (BL)', aereo: 'Guía aérea (AWB)', terrestre: 'Carta de porte' }
const VIAJE: Record<Modo, string> = {
  maritimo: 'en contenedor completo o consolidado con otras cargas, por barco',
  aereo: 'por avión, ideal para carga liviana o urgente',
  terrestre: 'por carretera desde Centroamérica, México o Estados Unidos',
}
const MODOS: { id: Modo; nombre: string }[] = [
  { id: 'maritimo', nombre: 'Marítimo' }, { id: 'aereo', nombre: 'Aéreo' }, { id: 'terrestre', nombre: 'Terrestre' },
]

const ICONOS: Record<string, string> = {
  calculadora: 'M6 3h12v18H6V3Z M9 7h6 M9 11h1 M12 11h1 M9 14h1 M12 14h1 M9 17h1 M12 17h1 M15 11v6',
  apreton: 'M3 12l4-4 4 2 3-2 7 5-3 3-3-2-2 2-3-1-3 2-3-5Z',
  escudo: 'M12 3l7 3v5c0 5-3 8-7 10-4-2-7-5-7-10V6l7-3Z M9 12l2 2 4-4',
  barco: 'M3 15h18l-2.5 5h-13L3 15Z M6 15V9h12v6 M12 4v5 M9 6h6',
  documento: 'M7 3h7l4 4v14H7V3Z M14 3v4h4 M10 12h5 M10 15h5 M10 18h3',
  aduana: 'M12 3l8 4H4l8-4Z M5 9v8 M9.5 9v8 M14.5 9v8 M19 9v8 M3 20h18',
  bodega: 'M3 21V9l9-5 9 5v12 M7 21v-7h10v7 M7 17h10',
}

const ETAPAS: Etapa[] = [
  {
    id: 'cotiza', titulo: 'Calcula el costo total antes de comprar', corto: 'Cotiza', icono: 'calculadora', quien: ['Tú'], accion: 'cotizar',
    texto: () => 'Con el cotizador clasificas tu producto y calculas cuánto te cuesta puesto en tu bodega: mercancía, flete, seguro, impuestos, honorarios, transporte y descarga. Así decides con números reales antes de pagarle al proveedor.',
    documentos: () => ['Ficha técnica o descripción del producto', 'Factura proforma, si ya la tienes'],
    consejo: 'Si no conoces algún dato, marca "No lo sé": la estimación te dice qué queda pendiente en lugar de inventarlo.',
  },
  {
    id: 'negocia', titulo: 'Negocia con tu proveedor', corto: 'Negocia', icono: 'apreton', quien: ['Tú', 'Tu proveedor'],
    texto: () => 'Puedes importar desde cualquier país y cualquier proveedor. Pide el precio con su Incoterm (qué incluye y dónde entrega), el peso y el volumen por caja, y la lista de empaque. Si tu producto es de un país con tratado comercial, pide también el certificado de origen.',
    documentos: () => ['Factura proforma con Incoterm', 'Peso y volumen por caja', 'Certificado de origen, si aplica'],
    consejo: 'Con precios EXW, FCA o FOB, LANDEX coordina el flete por ti y evitas cargos sorpresa en destino.',
  },
  {
    id: 'confirma', titulo: 'Confirma con LANDEX y paga de forma segura', corto: 'Confirma', icono: 'escudo', quien: ['Tú', 'LANDEX'], accion: 'cotizar',
    texto: () => 'Envías tu estimación a LANDEX con un clic. El agente aduanero valida la clasificación arancelaria y confirmamos las tarifas con nuestros socios. Recibes una cotización formal con vigencia y, al aceptarla, arrancamos la operación.',
    documentos: () => ['Cotización formal de LANDEX', 'Comprobante de pago al proveedor'],
    consejo: 'No pagues el 100 % por adelantado sin fotos de producción o una inspección de calidad.',
  },
  {
    id: 'transporte', titulo: 'Recolección y transporte internacional', corto: 'Transporte', icono: 'barco', quien: ['LANDEX'],
    texto: (m) => `Coordinamos con nuestros socios la recolección en la fábrica y el viaje ${VIAJE[m]}, junto con la póliza de seguro de la carga.`,
    documentos: (m) => [DOC_TRANSPORTE[m], 'Póliza de seguro'],
    consejo: 'Si ya tienes tu propio transportista, márcalo en "Alcance del servicio": LANDEX se encarga de la aduana igual.',
  },
  {
    id: 'seguimiento', titulo: 'Seguimiento y documentos', corto: 'Seguimiento', icono: 'documento', quien: ['LANDEX', 'Tú'],
    texto: () => 'Te avisamos la salida y la llegada estimada en Mi LANDEX. Mientras la carga viaja, subes tus documentos al expediente y preparamos la declaración aduanera.',
    documentos: (m) => ['Factura comercial', 'Lista de empaque (packing list)', DOC_TRANSPORTE[m], 'Permisos o notas técnicas, si aplican'],
    consejo: 'Revisa que la factura y la lista de empaque coincidan en cantidades y pesos: es la causa más común de atrasos.',
  },
  {
    id: 'aduana', titulo: 'Despacho aduanero', corto: 'Aduana', icono: 'aduana', quien: ['LANDEX'], accion: 'agencia',
    texto: () => 'El agente aduanero revisa la documentación, transmite la declaración aduanera (DUA), se pagan los impuestos y se obtiene el levante de la mercancía.',
    documentos: () => ['Declaración aduanera (DUA)', 'Comprobante de pago de impuestos'],
    consejo: '¿Tu carga ya viene en camino sin agencia aduanal? Escríbenos desde "Necesito desalmacenar".',
  },
  {
    id: 'entrega', titulo: 'Entrega en tu bodega y costo final', corto: 'Entrega', icono: 'bodega', quien: ['LANDEX'],
    texto: (m) => `Retiramos la carga del ${m === 'aereo' ? 'almacén del aeropuerto' : 'almacén fiscal'}, la transportamos y la descargamos en tu bodega${m === 'maritimo' ? ', y devolvemos el contenedor vacío' : ''}. Al cerrar, te enviamos el costo final real para tu costeo de inventario.`,
    documentos: () => ['Comprobante de entrega', 'Liquidación final de costos'],
    consejo: 'Indica si tienes montacargas o personal de descarga: cambia el costo y el tiempo de entrega.',
  },
]

const Icono = ({ n }: { n: string }) => (
  <svg viewBox="0 0 24 24" aria-hidden width="26" height="26"><path d={ICONOS[n]} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
)

interface Props {
  onCotizar?: () => void
  onAgencia?: () => void
}

/** Cómo funciona: recorrido interactivo por las etapas de una importación, desde cualquier origen. */
export function Guia({ onCotizar, onAgencia }: Props) {
  const [i, setI] = useState(0)
  const [modo, setModo] = useState<Modo>('maritimo')
  const e = ETAPAS[i]
  const ir = (n: number) => setI(Math.max(0, Math.min(ETAPAS.length - 1, n)))

  useEffect(() => {
    const tecla = (ev: KeyboardEvent) => {
      const t = ev.target as HTMLElement
      if (t && ['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName)) return
      if (ev.key === 'ArrowRight') ir(i + 1)
      if (ev.key === 'ArrowLeft') ir(i - 1)
    }
    window.addEventListener('keydown', tecla)
    return () => window.removeEventListener('keydown', tecla)
  })

  return (
    <section className="panel guia-interactiva">
      <h2>Cómo funciona tu importación</h2>
      <p className="intro">Desde cualquier país y cualquier proveedor hasta tu bodega. Toca cada etapa para ver qué pasa, quién lo hace y qué documentos necesitas.</p>

      <div className="guia-modo">
        <span>¿Cómo viaja tu carga?</span>
        <div className="seg" role="radiogroup" aria-label="Modalidad de transporte">
          {MODOS.map((m) => (
            <button key={m.id} type="button" role="radio" aria-checked={modo === m.id} className={modo === m.id ? 'activa' : ''} onClick={() => setModo(m.id)}>{m.nombre}</button>
          ))}
        </div>
      </div>

      <ol className="guia-ruta" role="tablist" aria-label="Etapas de la importación">
        {ETAPAS.map((x, n) => (
          <li key={x.id} className={n < i ? 'hecha' : n === i ? 'actual' : ''}>
            <button type="button" role="tab" aria-selected={n === i} aria-controls="guia-detalle" onClick={() => setI(n)}>
              <span className="guia-icono"><Icono n={x.icono} /></span>
              <span className="guia-num">{n + 1}</span>
              <span className="guia-corto">{x.corto}</span>
            </button>
          </li>
        ))}
      </ol>
      <div className="guia-progreso" aria-hidden><span style={{ width: `${(i / (ETAPAS.length - 1)) * 100}%` }} /></div>

      <div id="guia-detalle" className="guia-detalle" role="tabpanel" aria-live="polite">
        <div className="guia-cabeza">
          <span className="guia-paso">Etapa {i + 1} de {ETAPAS.length}</span>
          <div className="guia-quien">{e.quien.map((q) => <span key={q} className={q === 'LANDEX' ? 'landex' : ''}>{q}</span>)}</div>
        </div>
        <h3>{e.titulo}</h3>
        <p>{e.texto(modo)}</p>
        <div className="guia-columnas">
          <div>
            <b>Documentos</b>
            <ul>{e.documentos(modo).map((d) => <li key={d}>{d}</li>)}</ul>
          </div>
          <div className="guia-consejo">
            <b>Consejo</b>
            <p>{e.consejo}</p>
          </div>
        </div>
        <div className="acciones">
          <button type="button" className="btn" disabled={i === 0} onClick={() => ir(i - 1)}>← Anterior</button>
          {i < ETAPAS.length - 1
            ? <button type="button" className="btn" onClick={() => ir(i + 1)}>Siguiente →</button>
            : <button type="button" className="btn" onClick={() => ir(0)}>Volver al inicio</button>}
          {e.accion === 'cotizar' && onCotizar && <button type="button" className="btn primario" onClick={onCotizar}>Cotizar mi importación</button>}
          {e.accion === 'agencia' && onAgencia && <button type="button" className="btn primario" onClick={onAgencia}>Necesito desalmacenar</button>}
        </div>
      </div>
    </section>
  )
}
