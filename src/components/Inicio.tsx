import { calcularLanded, type Producto } from '../lib/landed'
import { EMBARQUE_INICIAL } from '../lib/almacen'
import { usd } from '../lib/formato'
import { useState } from 'react'
import { AGENCIA, EMPRESA, ORIGENES } from '../data/config'
import { ALIADOS } from '../data/aliados'
import type { Seccion } from './AgenciaAduanal'

interface Props {
  onCotizar: (modo?: 'guiado' | 'experto') => void
  onAgencia: (s: Seccion) => void
  onHistoria: () => void
  onSocios: () => void
  onGuia: () => void
  onLandexAI: () => void
}

/** Íconos de línea, en el estilo del libro de marca. */
const ICONOS: Record<string, string> = {
  fabrica: 'M3 21V10l6 3V10l6 3V6h6v15H3Z M7 17h2 M12 17h2 M17 17h2',
  barco: 'M3 15h18l-2.5 5h-13L3 15Z M6 15V9h12v6 M12 4v5 M9 6h6',
  aduana: 'M12 3l8 4H4l8-4Z M5 9v8 M9.5 9v8 M14.5 9v8 M19 9v8 M3 20h18',
  camion: 'M2 7h11v9H2V7Z M13 10h4l3 3v3h-7v-6Z M6 19a2 2 0 1 0 0-.01 M17 19a2 2 0 1 0 0-.01',
  bodega: 'M3 21V9l9-5 9 5v12 M7 21v-7h10v7 M7 17h10',
  calculadora: 'M6 3h12v18H6V3Z M9 7h6 M9 11h1 M12 11h1 M15 11h0 M9 14h1 M12 14h1 M9 17h1 M12 17h1 M15 14v3',
  escudo: 'M12 3l7 3v5c0 5-3 8-7 10-4-2-7-5-7-10V6l7-3Z M9 12l2 2 4-4',
  documento: 'M7 3h7l4 4v14H7V3Z M14 3v4h4 M10 12h5 M10 15h5 M10 18h3',
  persona: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z M4 21c1-4 4-6 8-6s7 2 8 6',
  edificio: 'M4 21V5l8-2v18 M12 8h8v13 M7 8h2 M7 12h2 M7 16h2 M15 12h2 M15 16h2',
  ruta: 'M5 19a2 2 0 1 0 0-.01 M19 5a2 2 0 1 0 0-.01 M7 19h6a4 4 0 0 0 0-8h-2a4 4 0 0 1 0-8h6',
}
const Icono = ({ n }: { n: string }) => (
  <svg className="icono" viewBox="0 0 24 24" aria-hidden width="28" height="28"><path d={ICONOS[n]} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
)

const PREGUNTAS: [string, string][] = [
  ['¿El cotizador tiene costo?', 'No. Puedes estimar cuánto te cuesta tu importación puesta en tu bodega sin registrarte. La estimación es referencial: los montos definitivos los confirma LANDEX en la cotización formal.'],
  ['¿La estimación es el precio final?', 'No. Usa tarifas de referencia y la clasificación que indiques. Antes de la cotización formal, el agente aduanero valida la clasificación arancelaria y LANDEX confirma las tarifas con sus socios.'],
  ['Mi mercancía ya viene en camino o está en el puerto. ¿Me pueden ayudar?', 'Sí. Usa la opción "Necesito desalmacenar": nos cuentas qué es, dónde está y qué documentos tienes, sin completar el cotizador.'],
  ['¿Qué documentos necesito para importar?', 'Normalmente la factura comercial, la lista de empaque y el documento de transporte (BL, guía aérea o carta de porte). Según el producto, también permisos, notas técnicas o certificado de origen. LANDEX revisará cuáles aplican a tu caso.'],
  ['¿Puedo usar mi propio transportista o forwarder?', 'Sí. Al ver tu estimación, marca "Ya lo tengo" en los servicios que contrataste por tu cuenta. LANDEX se encarga del agenciamiento aduanero y coordina el resto que necesites.'],
  ['¿Quién puede ver mis documentos?', 'Los documentos se vinculan a tu cuenta y a cada cotización. El acceso debe limitarse a tu cuenta y al personal autorizado de LANDEX.'],
]

// Escenario público de solo lectura, independiente del borrador del visitante.
const camiseta: Producto = {
  id: 'demo-camiseta', sku: 'CAM-01', nombre: 'Camisetas de algodón', cantidad: 100, valorUnitario: 8,
  paisFabricacion: 'CN', pesoBrutoKg: 25, volumenM3: 0.2, clasificacion: null, certificadoOrigen: false,
}
const origen = ORIGENES.find((o) => o.id === 'cn-este')!
const ejemplo = calcularLanded({ ...EMBARQUE_INICIAL, origen, modo: 'LCL' }, [camiseta])
const funciones = [
  ['navieras', 'Transporte', 'Coordinamos el traslado internacional.'],
  ['terminales', 'Terminal', 'Coordinamos la atención en puerto.'],
  ['seguros', 'Seguro', 'Gestionamos la cobertura de la carga.'],
  ['inspeccion', 'Inspección', 'Coordinamos la revisión en origen.'],
]

export function Inicio({ onCotizar, onAgencia, onHistoria, onSocios, onGuia, onLandexAI }: Props) {
  const [abierta, setAbierta] = useState<number | null>(null)
  const operadores = ALIADOS.filter((a) => a.publicado && a.categoria !== 'instituciones')
  const corporativos = [
    EMPRESA.razonSocial && ['Razón social', EMPRESA.razonSocial],
    EMPRESA.cedulaJuridica && ['Cédula jurídica', EMPRESA.cedulaJuridica],
    EMPRESA.direccion && ['Dirección', EMPRESA.direccion],
    EMPRESA.telefono && ['Teléfono', EMPRESA.telefono],
    EMPRESA.agente.nombre && ['Agente aduanero', `${EMPRESA.agente.nombre}${EMPRESA.agente.codigo ? ` · ${EMPRESA.agente.codigo}` : ''}`],
  ].filter(Boolean) as [string, string][]

  return (
    <div className="inicio">
      <section className="portada">
        <div className="portada-texto">
          <span className="sobretitulo">Tu agencia de aduanas digital</span>
          <h2>Conoce el costo de tu importación <span>antes de comprar.</span></h2>
          <p className="bajada">De la fábrica a tu bodega. Cotización, agencia de aduanas y logística en una sola plataforma, con un solo punto de contacto.</p>
          <ul className="sellos" aria-label="Condiciones del cotizador"><li>Sin registro</li><li>Sin compromiso</li><li>Gratis</li></ul>
          <div className="acciones">
            <button type="button" className="btn primario grande" onClick={() => onCotizar('guiado')}>Cotizar mi importación gratis</button>
            <button type="button" className="btn claro grande" onClick={() => onAgencia('desalmacenaje')}>Mi mercancía ya viene en camino</button>
          </div>
          <p className="nota portada-nota">La estimación es referencial: los costos definitivos se validan antes de contratar.</p>
        </div>
        <article className="demo-carga">
          <small>Cotización de ejemplo · China → Costa Rica</small>
          <h3>100 camisetas de algodón</h3>
          <p className="demo-precio">{usd(ejemplo.totales.total / camiseta.cantidad)} <small>por camiseta</small></p>
          <dl><div><dt>Compra al proveedor</dt><dd>{usd(ejemplo.totales.mercancia)}</dd></div>
          <div><dt>Subtotal en tu bodega</dt><dd>{usd(ejemplo.totales.total)}</dd></div>
          <div><dt>Plazo estimado</dt><dd>{ejemplo.tiempo.dias} días</dd></div></dl>
          <p>Estimación parcial con impuestos pendientes.</p>
          <details><summary>Ver cómo se calcula</summary><p>100 unidades a {usd(camiseta.valorUnitario)}. Retiro en fábrica, 25 kg y 0,2 m³ por marítimo consolidado, con seguro y descarga en la GAM.</p>
          <p>Mercancía {usd(ejemplo.totales.mercancia)} + logística {usd(ejemplo.totales.logistica)}. El subtotal se divide entre las 100 unidades. La clasificación del producto permitirá estimar los impuestos.</p></details>
        </article>
      </section>

      <section className="bloque">
        <span className="etiqueta">¿Cómo te ayudamos?</span>
        <h2>Tu importación empieza aquí.</h2>
        <div className="entradas">
          <button type="button" className="entrada" onClick={() => onCotizar('guiado')}>
            <Icono n="ruta" /><b>Cotizar por primera vez</b><span>Te guiamos paso a paso para saber cuánto cuesta importar, con explicaciones sencillas.</span><em>Cotizar paso a paso →</em>
          </button>
          <button type="button" className="entrada" onClick={() => onCotizar('experto')}>
            <Icono n="calculadora" /><b>Cotizar con mis datos</b><span>Cotizador completo: Incoterms, varios SKU, modalidades y Landed Cost por producto.</span><em>Ir al cotizador →</em>
          </button>
          <button type="button" className="entrada" onClick={() => onAgencia('desalmacenaje')}>
            <Icono n="aduana" /><b>Desalmacenar una carga</b><span>Tu mercancía ya viene en camino o está en el puerto, aeropuerto o almacén fiscal.</span><em>Solicitar agencia de aduanas →</em>
          </button>
          <button type="button" className="entrada" onClick={() => onAgencia('empresarial')}>
            <Icono n="edificio" /><b>Coordinar importaciones recurrentes</b><span>Importas con frecuencia y buscas una agencia de aduanas y un socio logístico permanente.</span><em>Solicitar una reunión →</em>
          </button>
        </div>
      </section>

      <section className="bloque">
        <h2>Cómo funciona</h2>
        <ol className="pasos-inicio">
          <li><b>Estimá el costo</b><span>Revisá el costo por unidad hasta tu bodega.</span></li>
          <li><b>Confirmá la cotización</b><span>LANDEX valida la clasificación, los documentos y las tarifas.</span></li>
          <li><b>Recibí en tu bodega</b><span>Coordinamos el transporte, la aduana y la entrega.</span></li>
        </ol><button className="link" onClick={onGuia}>Explorar la guía por modalidad →</button>
      </section>
      <section className="bloque ai-inicio"><div><h2>Identificá tu producto con LANDEX AI</h2>
        <p>Describí el material y el uso. Un agente revisa la sugerencia antes de confirmar los impuestos.</p>
        <button className="btn" onClick={onLandexAI}>Identificar mi producto</button><small> Requiere cuenta.</small></div>
        <div className="ai-inicio-demo"><p>Camiseta de algodón para adulto</p><b>Posible clasificación · requiere validación</b></div>
      </section>
      <section className="bloque historia-carga"><img src="retrato-legado.webp" alt="Retrato ilustrado de don Oscar Ramos Valverde y Juan Rafael Mora Porras" width={900} height={985} loading="lazy" /><div><h2>Quién responde por tu carga</h2>
        <p>La historia de LANDEX tiene sus raíces en la agencia que fundó don Oscar Ramos Valverde en San José. Hoy, Ramos &amp; Co. reúne esa experiencia familiar y la coordinación logística en un solo punto de contacto.</p>
        <button className="link" onClick={onHistoria}>Conocé nuestra historia →</button></div>
      </section>
      <section className="bloque socios-inicio"><h2>Quién participa en cada tramo</h2><ul className="tira-logos">
        {funciones.map(([categoria, nombre, texto]) => {
          const socio = operadores.find((a) => a.categoria === categoria)
          return <li key={categoria}><b>{nombre}</b>{socio && <img src={socio.logo} alt={socio.nombre} loading="lazy" width={600} height={320} />}<span>{texto}</span></li>
        })}
        </ul><button className="link" onClick={onSocios}>Ver todos los socios →</button>
      </section>

      <section className="bloque">
        <span className="etiqueta">Preguntas frecuentes</span>
        <h2>Lo que más nos preguntan</h2>
        <div className="faq">
          {PREGUNTAS.map(([p, r], i) => (
            <div key={p} className={`faq-item ${abierta === i ? 'abierta' : ''}`}>
              <button type="button" aria-expanded={abierta === i} onClick={() => setAbierta(abierta === i ? null : i)}>{p}</button>
              {abierta === i && <p>{r}</p>}
            </div>
          ))}
        </div>
      </section>

      <section className="bloque contacto-inicio">
        <span className="etiqueta">Contacto comercial</span>
        <h2>¿Qué necesitás resolver?</h2>
        <div className="acciones"><button className="btn primario" onClick={() => onCotizar('guiado')}>Cotizar</button>
        <button className="btn claro" onClick={() => onAgencia('desalmacenaje')}>Desalmacenar una carga</button>
        <button className="btn claro" onClick={() => onAgencia('empresarial')}>Hablar sobre operaciones recurrentes</button></div>
        <div className="columnas">
          <div><b>Cotizaciones</b><a href={`mailto:${AGENCIA.email}`}>{AGENCIA.email}</a></div>
          <div><b>Información general</b><a href={`mailto:${AGENCIA.emailInfo}`}>{AGENCIA.emailInfo}</a></div>
          {AGENCIA.whatsapp && <div><b>WhatsApp</b><a href={`https://wa.me/${AGENCIA.whatsapp}`} target="_blank" rel="noreferrer">Escríbenos</a></div>}
          {EMPRESA.telefono && <div><b>Teléfono</b><a href={`tel:${EMPRESA.telefono}`}>{EMPRESA.telefono}</a></div>}
        </div>
      </section>

      {corporativos.length > 0 && (
        <section className="bloque legal">
          <span className="etiqueta">Información corporativa</span>
          <dl>{corporativos.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
        </section>
      )}
    </div>
  )
}
