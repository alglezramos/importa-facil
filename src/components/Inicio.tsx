import { useState } from 'react'
import { AGENCIA, EMPRESA, MARCA } from '../data/config'
import { ALIADOS } from '../data/aliados'
import type { Seccion } from './AgenciaAduanal'

interface Props {
  onCotizar: (modo?: 'guiado' | 'experto') => void
  onAgencia: (s: Seccion) => void
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

export function Inicio({ onCotizar, onAgencia, onSocios, onGuia, onLandexAI }: Props) {
  const [abierta, setAbierta] = useState<number | null>(null)
  const operadores = ALIADOS.filter((a) => a.publicado && a.categoria !== 'instituciones')
  const categorias = [...new Set(operadores.map((a) => a.categoria))]
  const destacados = categorias.map((categoria) => operadores.find((a) => a.categoria === categoria)!)
  const logos = [...destacados, ...operadores.filter((a) => !destacados.includes(a))].slice(0, 8)
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
            <button type="button" className="btn primario grande" onClick={() => onCotizar()}>Cotizar mi importación gratis</button>
            <button type="button" className="btn claro grande" onClick={() => onAgencia('desalmacenaje')}>Mi mercancía ya viene en camino</button>
          </div>
          <p className="nota portada-nota">La estimación es referencial: los costos definitivos se validan antes de contratar.</p>
        </div>
        <div className="portada-visual">
          <div className="visual-top"><span>GLOBAL TRADE</span><span>ORIGEN → COSTA RICA</span></div>
          <svg viewBox="0 0 400 210" role="img" aria-label="Ilustración de un buque de carga en ruta">
            <defs><linearGradient id="ldx-ocean" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#24405f"/><stop offset="1" stopColor="#101e30"/></linearGradient></defs>
            <rect width="400" height="210" rx="18" fill="url(#ldx-ocean)"/>
            {[35,75,115,155,195].map(y=><path key={y} d={`M0 ${y} H400`} stroke="#91a4bd" strokeOpacity=".12"/>)}
            {[40,100,160,220,280,340].map(x=><path key={x} d={`M${x} 0 V210`} stroke="#91a4bd" strokeOpacity=".12"/>)}
            <path d="M24 48 C130 8 220 95 372 40" fill="none" stroke="#48a9ff" strokeWidth="2" strokeDasharray="5 7"/>
            <circle cx="24" cy="48" r="5" fill="#48a9ff"/><circle cx="372" cy="40" r="5" fill="#48a9ff"/>
            <path d="M49 151 H358 L325 179 H84 Z" fill="#91a4bd"/>
            <path d="M49 151 H358 L344 164 H65 Z" fill="#48a9ff"/>
            <path d="M69 146 V100 H110 V146 M80 100 V85 H96 V100" fill="#f5f7fa"/>
            {Array.from({length:10},(_,i)=><g key={i}><rect x={120+(i%5)*42} y={i<5?116:92} width="38" height="21" rx="2" fill={i%3===0?'#48a9ff':'#b8c9de'} opacity={i<5?'.9':'.7'}/><path d={`M${126+(i%5)*42} ${i<5?120:96} v13`} stroke="#101e30" strokeOpacity=".5"/></g>)}
            <path d="M20 189 Q60 181 100 189 T180 189 T260 189 T340 189 T420 189" fill="none" stroke="#48a9ff" strokeOpacity=".7"/>
          </svg>
          <div className="visual-recibes">
            <span>Lo que recibes al cotizar</span>
            <ul>
              <li>Costo total puesto en tu bodega</li>
              <li>Costo por unidad de cada producto</li>
              <li>Impuestos, flete y honorarios por separado</li>
              <li>Tiempo estimado de la fábrica a tu bodega</li>
            </ul>
          </div>
        </div>
        <ol className="portada-ruta" aria-label="De la fábrica a tu bodega">
          {[['fabrica', 'Fábrica'], ['barco', 'Transporte'], ['aduana', 'Aduana'], ['camion', 'Entrega'], ['bodega', 'Tu bodega']].map(([i, t]) => (
            <li key={i}><Icono n={i} /><span>{t}</span></li>
          ))}
        </ol>
      </section>

      <section className="bloque">
        <span className="etiqueta">¿Cómo te ayudamos?</span>
        <h2>Tu importación empieza aquí.</h2>
        <div className="entradas">
          <button type="button" className="entrada" onClick={() => onCotizar('guiado')}>
            <Icono n="ruta" /><b>Mi primera importación</b><span>Te guiamos paso a paso para saber cuánto cuesta importar, con explicaciones sencillas.</span><em>Cotizar paso a paso →</em>
          </button>
          <button type="button" className="entrada" onClick={() => onCotizar('experto')}>
            <Icono n="calculadora" /><b>Soy importador</b><span>Cotizador completo: Incoterms, varios SKU, modalidades y Landed Cost por producto.</span><em>Ir al cotizador →</em>
          </button>
          <button type="button" className="entrada" onClick={() => onAgencia('desalmacenaje')}>
            <Icono n="aduana" /><b>Necesito desalmacenar</b><span>Tu mercancía ya viene en camino o está en el puerto, aeropuerto o almacén fiscal.</span><em>Solicitar agencia de aduanas →</em>
          </button>
          <button type="button" className="entrada" onClick={() => onAgencia('empresarial')}>
            <Icono n="edificio" /><b>Soluciones empresariales</b><span>Importas con frecuencia y buscas una agencia de aduanas y un socio logístico permanente.</span><em>Solicitar una reunión →</em>
          </button>
        </div>
      </section>

      <section className="bloque ai-inicio">
        <div>
          <span className="etiqueta">LANDEX AI</span>
          <h2>¿No sabes la partida arancelaria de tu producto?</h2>
          <p>Descríbelo con tus palabras o sube una foto. LANDEX AI aplica las reglas del Sistema Armonizado y te propone los incisos más probables del arancel de Costa Rica, con su DAI. Lo usas gratis con tu cuenta; el agente aduanero confirma la clasificación antes de la cotización formal.</p>
          <button type="button" className="btn primario" onClick={onLandexAI}>Clasificar mi producto con IA</button>
        </div>
        <div className="ai-inicio-demo" aria-hidden>
          <p className="ai-inicio-q">"Sillas de oficina con base de metal, asiento acolchado y ruedas"</p>
          <p className="ai-inicio-r"><span className="codigo">9401.39.00.00</span> Asientos giratorios de altura ajustable</p>
        </div>
      </section>

      <section className="bloque propuesta">
        <span className="etiqueta">Por qué LANDEX</span>
        <h2>Una agencia de aduanas con tecnología propia</h2>
        <div className="columnas">
          <div><Icono n="calculadora" /><b>Estima tu costo antes de comprar</b><p>Mercancía, flete, seguro, impuestos, honorarios, transporte y descarga, en un solo número y por producto.</p></div>
          <div><Icono n="persona" /><b>Un solo punto de contacto</b><p>LANDEX es tu agencia de aduanas y coordina a navieras, transportistas, aseguradoras e inspectores por ti.</p></div>
          <div><Icono n="escudo" /><b>Trámite aduanero profesional</b><p>La clasificación arancelaria y la declaración las valida un agente aduanero autorizado.</p></div>
          <div><Icono n="documento" /><b>Todo en línea</b><p>Consulta tus cotizaciones y documentos desde tu cuenta.</p></div>
        </div>
      </section>

      <section className="bloque">
        <span className="etiqueta">Servicios</span>
        <h2>Lo que hacemos por ti</h2>
        <ul className="servicios-inicio">
          <li className="principal"><b>Agenciamiento aduanero</b><span>Clasificación arancelaria, declaración y trámite ante Aduanas hasta el levante de tu mercancía.</span></li>
          <li><b>Transporte internacional</b><span>Marítimo, aéreo y terrestre, desde la fábrica de tu proveedor.</span></li>
          <li><b>Transporte nacional y descarga</b><span>Hasta tu bodega, con personal y equipo de descarga.</span></li>
          <li><b>Seguro e inspección</b><span>Póliza de carga e inspección de calidad en origen.</span></li>
          <li><b>Permisos y documentos</b><span>Notas técnicas, permisos y revisión de tu expediente.</span></li>
          <li><b>Almacenamiento y custodia</b><span>Coordinados con nuestros socios cuando los necesites.</span></li>
        </ul>
      </section>

      <section className="bloque">
        <span className="etiqueta">Cómo funciona</span>
        <h2>De la cotización a tu bodega</h2>
        <ol className="pasos-inicio">
          <li><b>Cotiza gratis</b><span>Conoce el costo estimado puesto en tu bodega.</span></li>
          <li><b>Envíala a LANDEX</b><span>Con un clic, sin volver a escribir tus datos.</span></li>
          <li><b>Recibe tu cotización formal</b><span>Validamos la clasificación y confirmamos las tarifas.</span></li>
          <li><b>Acepta y sube tus documentos</b><span>Factura, lista de empaque y documento de transporte.</span></li>
          <li><b>Coordinamos y entregamos</b><span>Nos encargamos de la aduana y la entrega en tu bodega.</span></li>
        </ol>
        <div className="acciones"><button type="button" className="btn primario" onClick={() => onCotizar()}>Calcular mi importación gratis</button><button type="button" className="btn" onClick={onGuia}>Ver la guía completa</button></div>
      </section>

      <section className="bloque socios-inicio">
        <span className="etiqueta">Red de socios comerciales</span>
        <h2>Navieras, forwarders, líneas aéreas y aseguradoras</h2>
        <ul className="tira-logos">{logos.map((a) => <li key={a.logo}><img src={a.logo} alt={a.nombre} loading="lazy" width={600} height={320} onError={(e) => { e.currentTarget.hidden = true }} /><span>{a.nombre}</span></li>)}</ul>
        <p className="centro"><button type="button" className="link" onClick={onSocios}>Ver todos los socios</button></p>
      </section>

      <section className="bloque respaldo">
        <span className="etiqueta">Respaldo profesional</span>
        <h2>{MARCA.nombre}, {MARCA.firma}</h2>
        <p>{EMPRESA.experiencia || `${MARCA.nombre} es una iniciativa de Ramos & Co. enfocada en simplificar las importaciones a Costa Rica.`}</p>
        <p>La prestación de servicios aduaneros está sujeta a la validación de las autorizaciones aplicables y de las condiciones de cada operación.</p>
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
        <h2>Hablemos de tu importación</h2>
        <div className="columnas">
          <div><b>Cotizaciones</b><a href={`mailto:${AGENCIA.email}`}>{AGENCIA.email}</a></div>
          <div><b>Información general</b><a href={`mailto:${AGENCIA.emailInfo}`}>{AGENCIA.emailInfo}</a></div>
          {AGENCIA.whatsapp && <div><b>WhatsApp</b><a href={`https://wa.me/${AGENCIA.whatsapp}`} target="_blank" rel="noreferrer">Escríbenos</a></div>}
          {EMPRESA.telefono && <div><b>Teléfono</b><a href={`tel:${EMPRESA.telefono}`}>{EMPRESA.telefono}</a></div>}
          <div><b>Empresas</b><button type="button" className="link" onClick={() => onAgencia('empresarial')}>Solicitar una reunión</button></div>
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
