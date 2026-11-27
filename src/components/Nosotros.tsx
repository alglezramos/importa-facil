import { EMPRESA } from '../data/config'

interface Props { onCotizar: () => void; onContacto: () => void }

/** Quiénes somos · texto aprobado por Ale el 26-11-2026. */
export function Nosotros({ onCotizar, onContacto }: Props) {
  const datos = [
    EMPRESA.razonSocial && ['Razón social', EMPRESA.razonSocial],
    EMPRESA.cedulaJuridica && ['Cédula jurídica', EMPRESA.cedulaJuridica],
    EMPRESA.direccion && ['Dirección', EMPRESA.direccion],
    EMPRESA.telefono && ['Teléfono', EMPRESA.telefono],
    EMPRESA.agente.nombre && ['Agente aduanero', `${EMPRESA.agente.nombre}${EMPRESA.agente.codigo ? ` · ${EMPRESA.agente.codigo}` : ''}`],
  ].filter(Boolean) as [string, string][]

  return (
    <div className="nosotros">
      <section className="portada nosotros-portada">
        <div className="portada-texto">
          <span className="sobretitulo">Quiénes somos</span>
          <h2>Tres generaciones, <span>un legado que evoluciona</span></h2>
          <p className="bajada">Experiencia que trasciende generaciones. Innovación que transforma el comercio exterior.</p>
        </div>
      </section>

      <section className="bloque nosotros-historia">
        <div className="nosotros-relato">
          <p>La historia de LANDEX tiene sus raíces en la trayectoria de don Oscar Ramos Valverde, agente aduanero y fundador de la agencia Oscar Ramos Valverde S.A., en San José, Costa Rica. Su visión, compromiso y liderazgo contribuyeron al desarrollo y la profesionalización del sector aduanero costarricense.</p>
          <p>Como presidente de la Asociación de Agentes de Aduana de Costa Rica, impulsó la formación académica del gremio, promoviendo en 1983 la creación de la Escuela Básica Braulio Carrillo, origen de la actual Universidad Braulio Carrillo, especializada en materia aduanera.</p>
          <p>Su liderazgo trascendió las fronteras nacionales. Presidió la Asociación Internacional de Agentes Profesionales de Aduana (ASAPRA) y la Confederación de Agentes de Aduana del Caribe, y se desempeñó como Secretario General de la Organización Mundial de Agentes de Aduana (OMAA). Asimismo, fue coautor del libro <i>Pasión por la aduana</i>, publicado en 2003.</p>
          <p>Hoy, sus sucesores dan un nuevo impulso a este legado a través de Ramos &amp; Co., integrando la experiencia aduanera de tres generaciones con nuevas capacidades en logística internacional, gestión de la cadena de suministro, tecnología e inteligencia de costos.</p>
          <p>De esta evolución nace LANDEX, una nueva generación de servicios aduaneros y logísticos, concebida para transformar la manera en que las empresas importan a Costa Rica.</p>
          <p>Combinamos conocimiento especializado, atención personalizada y tecnología para ofrecer mayor visibilidad sobre los costos de importación, simplificar la gestión aduanera y coordinar cada etapa de la operación, desde la fábrica del proveedor hasta la bodega del cliente.</p>
          <p>Nuestra esencia permanece intacta: la confianza construida a través de generaciones, el compromiso con cada cliente y la convicción de que el comercio exterior debe ser cada vez más transparente, accesible e inteligente.</p>
          <p className="nosotros-cierre"><b>Tres generaciones de experiencia. Una nueva visión del comercio exterior.</b></p>
          <p className="nosotros-firma">LANDEX — Landed Cost Intelligence.</p>
        </div>
        <figure className="nosotros-retrato">
          <img src="retrato-legado.webp" width={900} height={985} alt="Retrato ilustrado de don Oscar Ramos Valverde y Juan Rafael Mora Porras" />
          <figcaption>Don Oscar Ramos Valverde y Juan Rafael Mora Porras</figcaption>
        </figure>
      </section>

      {datos.length > 0 && (
        <section className="bloque">
          <span className="etiqueta">Datos de la empresa</span>
          <dl className="datos-empresa">{datos.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
        </section>
      )}

      <section className="bloque nosotros-cta">
        <h2>Hablemos de tu importación</h2>
        <div className="acciones">
          <button type="button" className="btn primario" onClick={onCotizar}>Cotizar mi importación gratis</button>
          <button type="button" className="btn" onClick={onContacto}>Solicitar una reunión</button>
        </div>
      </section>
    </div>
  )
}
