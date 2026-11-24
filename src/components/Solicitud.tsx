import { useEffect, useMemo, useState } from 'react'
import { AGENCIA, MODOS, ZONAS } from '../data/config'
import { proveedoresInternacionales, TIPO_ETIQUETA, TRANSPORTISTAS, type Proveedor } from '../data/proveedores'
import type { EntradaCotizacion, ResultadoCotizacion } from '../lib/calculo'
import { crc, usd } from '../lib/formato'

interface Props {
  entrada: EntradaCotizacion
  r: ResultadoCotizacion
  producto: string
}

interface Contacto {
  nombre: string
  empresa: string
  correo: string
  telefono: string
  notas: string
}

const VACIO: Contacto = { nombre: '', empresa: '', correo: '', telefono: '', notas: '' }

function leerContacto(): Contacto {
  try {
    return { ...VACIO, ...JSON.parse(localStorage.getItem('contacto') || '{}') }
  } catch {
    return VACIO
  }
}

export function armarSolicitud(e: EntradaCotizacion, r: ResultadoCotizacion, producto: string, c: Contacto, internacionales: Proveedor[], terrestres: Proveedor[]) {
  const lista = (ps: Proveedor[]) => (ps.length ? ps.map((p) => p.nombre).join(', ') : 'Que Ramos & Co recomiende')
  return [
    `SOLICITUD DE COTIZACIÓN – ${AGENCIA.nombre}`,
    '',
    `Cliente: ${c.nombre || '-'} | ${c.empresa || '-'}`,
    `Contacto: ${c.correo || '-'} | ${c.telefono || '-'}`,
    '',
    `Producto: ${producto || e.partida.descripcion}`,
    `Partida preliminar: ${e.partida.codigo}`,
    `Valor ${e.incoterm}: ${usd(e.valorMercaderia)} – ${e.unidades} unidades`,
    `Origen: ${e.origen.nombre}`,
    `Modalidad: ${MODOS[e.modo]}`,
    `Peso: ${e.pesoKg} kg – Volumen: ${e.volumenM3} m³`,
    `Certificado de origen (TLC): ${e.aplicaTLC ? 'Sí' : 'No'}`,
    `Entrega: ${ZONAS[e.zona]}`,
    '',
    `Cotizar flete con: ${lista(internacionales)}`,
    `Cotizar transporte local con: ${lista(terrestres)}`,
    '',
    `Estimado de la plataforma: ${usd(r.totalUSD)} (${crc(r.totalCRC)}) – ${r.diasTotales} días`,
    c.notas ? `\nNotas del cliente: ${c.notas}` : '',
  ].join('\n').trim()
}

export function Solicitud({ entrada, r, producto }: Props) {
  const opciones = useMemo(() => proveedoresInternacionales(entrada.origen.id, entrada.modo), [entrada.origen.id, entrada.modo])
  const [elegidos, setElegidos] = useState<string[]>([])
  const [terrestres, setTerrestres] = useState<string[]>([])
  const [contacto, setContacto] = useState<Contacto>(leerContacto)
  const [copiado, setCopiado] = useState(false)

  // Al cambiar origen o modalidad, quitar los que ya no aplican
  useEffect(() => {
    setElegidos((prev) => prev.filter((id) => opciones.some((o) => o.id === id)))
  }, [opciones])

  useEffect(() => {
    try { localStorage.setItem('contacto', JSON.stringify({ ...contacto, notas: '' })) } catch { /* sin almacenamiento */ }
  }, [contacto])

  const alternar = (lista: string[], set: (v: string[]) => void, id: string) =>
    set(lista.includes(id) ? lista.filter((x) => x !== id) : [...lista, id])

  const selInt = opciones.filter((o) => elegidos.includes(o.id))
  const selTerr = TRANSPORTISTAS.filter((t) => terrestres.includes(t.id))
  const texto = armarSolicitud(entrada, r, producto, contacto, selInt, selTerr)
  const completo = contacto.nombre.trim() && (contacto.correo.trim() || contacto.telefono.trim())

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(texto)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    } catch { /* el navegador no permitió copiar */ }
  }

  const grupos = (['naviera', 'consolidador', 'aereo'] as const)
    .map((t) => ({ tipo: t, items: opciones.filter((o) => o.tipo === t) }))
    .filter((g) => g.items.length)

  return (
    <div className="solicitud">
      <h3>Pide tu cotización formal</h3>
      <p className="nota">
        Elige con quién quieres cotizar. {AGENCIA.nombre} pide las tarifas por ti, las compara y te envía la mejor opción con la
        clasificación confirmada por el agente aduanero.
      </p>

      <h4>Flete internacional · {entrada.origen.nombre} · {MODOS[entrada.modo]}</h4>
      {grupos.map((g) => (
        <div key={g.tipo} className="grupo-prov">
          <span className="tipo">{TIPO_ETIQUETA[g.tipo]}{g.tipo === 'naviera' && entrada.modo === 'LCL' ? ' (carga consolidada)' : ''}</span>
          <div className="chips">
            {g.items.map((p) => (
              <label key={p.id} className={`chip ${elegidos.includes(p.id) ? 'on' : ''}`} title={p.nota}>
                <input type="checkbox" checked={elegidos.includes(p.id)} onChange={() => alternar(elegidos, setElegidos, p.id)} />
                {p.nombre}
                {p.nota && <small>{p.nota}</small>}
              </label>
            ))}
          </div>
        </div>
      ))}
      {entrada.modo === 'LCL' && (
        <p className="nota">Para carga suelta (LCL) las navieras suelen cotizar a través de consolidadores; nosotros lo coordinamos.</p>
      )}

      <h4>Transporte terrestre en Costa Rica</h4>
      <div className="chips">
        {TRANSPORTISTAS.map((t) => (
          <label key={t.id} className={`chip ${terrestres.includes(t.id) ? 'on' : ''}`}>
            <input type="checkbox" checked={terrestres.includes(t.id)} onChange={() => alternar(terrestres, setTerrestres, t.id)} />
            {t.nombre}
            {t.nota && <small>{t.nota}</small>}
          </label>
        ))}
      </div>
      <p className="nota">Si no eliges ninguno, te recomendamos las mejores opciones.</p>

      <h4>Tus datos</h4>
      <div className="fila2">
        <label>Nombre *<input value={contacto.nombre} onChange={(e) => setContacto({ ...contacto, nombre: e.target.value })} /></label>
        <label>Empresa<input value={contacto.empresa} onChange={(e) => setContacto({ ...contacto, empresa: e.target.value })} /></label>
        <label>Correo<input type="email" value={contacto.correo} onChange={(e) => setContacto({ ...contacto, correo: e.target.value })} /></label>
        <label>Teléfono / WhatsApp<input type="tel" value={contacto.telefono} onChange={(e) => setContacto({ ...contacto, telefono: e.target.value })} /></label>
      </div>
      <label>Notas (fecha deseada, proveedor, link de Alibaba…)
        <input value={contacto.notas} onChange={(e) => setContacto({ ...contacto, notas: e.target.value })} />
      </label>

      <details className="vista">
        <summary>Ver la solicitud que se enviará</summary>
        <pre>{texto}</pre>
      </details>

      <div className="acciones">
        <a
          className={`btn primario ${completo ? '' : 'deshabilitado'}`}
          aria-disabled={!completo}
          target="_blank" rel="noreferrer"
          href={completo ? `https://wa.me/${AGENCIA.whatsapp}?text=${encodeURIComponent(texto)}` : undefined}
        >
          Enviar solicitud por WhatsApp
        </a>
        <a className={`btn ${completo ? '' : 'deshabilitado'}`} aria-disabled={!completo}
          href={completo ? `mailto:${AGENCIA.email}?subject=${encodeURIComponent('Solicitud de cotización – ' + (contacto.empresa || contacto.nombre))}&body=${encodeURIComponent(texto)}` : undefined}>
          Enviar por correo
        </a>
        <button className="btn" type="button" onClick={copiar}>{copiado ? 'Copiado ✓' : 'Copiar solicitud'}</button>
      </div>
      {!completo && <p className="nota">Escribe tu nombre y un correo o teléfono para enviar la solicitud.</p>}
      <p className="nota">También puedes escribirnos a {AGENCIA.email}.</p>
    </div>
  )
}
