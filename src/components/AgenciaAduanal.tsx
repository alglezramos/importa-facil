import { useState, type ReactNode } from 'react'
import { AGENCIA } from '../data/config'
import { guardarPerfil, leerPerfil } from '../lib/almacen'
import { enviarSolicitud, type TipoSolicitud, type Usuario } from '../lib/nube'

export type Seccion = 'desalmacenaje' | 'empresarial'

const UBICACIONES = ['En tránsito', 'En puerto', 'En aeropuerto', 'En almacén fiscal', 'En frontera terrestre', 'Todavía en origen', 'No estoy seguro']
const DOCUMENTOS = ['Factura comercial', 'Packing list', 'BL, guía aérea o carta de porte', 'Certificado de origen', 'Permisos o notas técnicas', 'Póliza de seguro']
const COMPLEMENTARIOS = ['Transporte hasta mi bodega', 'Descarga', 'Almacenamiento', 'Custodia', 'Devolución de contenedor', 'Seguro de carga']
const INTERESES = ['Agencia aduanal para operaciones recurrentes', 'Tarifas corporativas', 'Coordinación logística integral', 'Reunión con un especialista']

type Campos = Record<string, string | string[]>

function Casillas({ nombre, opciones, valor, onCambio }: { nombre: string; opciones: string[]; valor: string[]; onCambio: (v: string[]) => void }) {
  return (
    <fieldset className="casillas">
      <legend>{nombre}</legend>
      {opciones.map((o) => (
        <label key={o} className="check"><input type="checkbox" checked={valor.includes(o)}
          onChange={(e) => onCambio(e.target.checked ? [...valor, o] : valor.filter((x) => x !== o))} />{o}</label>
      ))}
    </fieldset>
  )
}

function Formulario({ tipo, titulo, intro, usuario, campos, obligatorios, children, onListo }: {
  tipo: TipoSolicitud; titulo: string; intro: string; usuario: Usuario | null
  campos: Campos; obligatorios: string[]; children: ReactNode; onListo: () => void
}) {
  const pf = leerPerfil()
  const [c, setC] = useState({ nombre: pf.nombre, empresa: pf.empresa, correo: usuario?.email ?? pf.email, telefono: pf.telefono })
  const [acepto, setAcepto] = useState(false)
  const [trampa, setTrampa] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')
  const correoOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.correo.trim())
  const faltan = obligatorios.filter((k) => !String(campos[k] ?? '').trim())
  const valido = c.nombre.trim().length >= 2 && correoOk && acepto && !faltan.length && (tipo !== 'empresarial' || !!c.empresa.trim())

  const enviar = async (ev: React.FormEvent) => {
    ev.preventDefault()
    if (!valido) return
    if (trampa) { onListo(); return }
    setEnviando(true); setError('')
    const err = await enviarSolicitud({ tipo, ...c, consentimiento: acepto, datos: campos })
    setEnviando(false)
    if (err) { setError(err); return }
    guardarPerfil({ ...pf, nombre: pf.nombre || c.nombre.trim(), empresa: pf.empresa || c.empresa.trim(), email: pf.email || c.correo.trim(), telefono: pf.telefono || c.telefono.trim() })
    onListo()
  }

  return (
    <form className="panel form-servicio" onSubmit={enviar} noValidate>
      <h2>{titulo}</h2>
      <p className="intro">{intro}</p>
      <fieldset>
        <legend>Tus datos</legend>
        <div className="campos">
          <label>Nombre*<input value={c.nombre} onChange={(e) => setC({ ...c, nombre: e.target.value })} autoComplete="name" required /></label>
          <label>Empresa{tipo === 'empresarial' ? '*' : ''}<input value={c.empresa} onChange={(e) => setC({ ...c, empresa: e.target.value })} autoComplete="organization" /></label>
          <label>Correo*<input type="email" value={c.correo} onChange={(e) => setC({ ...c, correo: e.target.value })} autoComplete="email" required aria-invalid={!!c.correo && !correoOk} /></label>
          <label>Teléfono<input value={c.telefono} onChange={(e) => setC({ ...c, telefono: e.target.value })} autoComplete="tel" inputMode="tel" /></label>
          <label className="trampa" aria-hidden>Sitio web<input tabIndex={-1} autoComplete="off" value={trampa} onChange={(e) => setTrampa(e.target.value)} /></label>
        </div>
      </fieldset>
      {children}
      <label className="check"><input type="checkbox" checked={acepto} onChange={(e) => setAcepto(e.target.checked)} />
        Acepto que LANDEX use estos datos solo para responder esta solicitud y contactarme sobre ella.</label>
      {faltan.length > 0 && <p className="nota">Completa los campos marcados con *.</p>}
      {error && <p className="error" role="alert">{error}</p>}
      <div className="acciones">
        <button type="submit" className="btn primario" disabled={!valido || enviando}>{enviando ? 'Enviando…' : 'Enviar solicitud'}</button>
      </div>
      <p className="nota">¿Prefieres escribirnos? <a href={`mailto:${AGENCIA.email}`}>{AGENCIA.email}</a></p>
    </form>
  )
}

/** Entrada para quien ya tiene mercancía en camino (desalmacenaje) y para empresas con operaciones recurrentes. */
export function AgenciaAduanal({ seccion, onSeccion, usuario, onCotizar }: { seccion: Seccion; onSeccion: (s: Seccion) => void; usuario: Usuario | null; onCotizar: () => void }) {
  const [d, setD] = useState<Campos>({ mercancia: '', pais: '', modalidad: '', valor: '', llegada: '', ubicacion: '', detalleUbicacion: '', documentos: [], servicios: [], notas: '' })
  const [m, setM] = useState<Campos>({ cargo: '', frecuencia: '', modalidades: '', origenes: '', productos: '', intereses: [], notas: '' })
  const [listo, setListo] = useState<Seccion | null>(null)
  const sd = (k: string, v: string | string[]) => setD((x) => ({ ...x, [k]: v }))
  const sm = (k: string, v: string | string[]) => setM((x) => ({ ...x, [k]: v }))

  return (
    <div className="agencia-aduanal">
      <div className="seg" role="tablist" aria-label="Tipo de servicio">
        <button type="button" role="tab" aria-selected={seccion === 'desalmacenaje'} className={seccion === 'desalmacenaje' ? 'activa' : ''} onClick={() => onSeccion('desalmacenaje')}>Necesito desalmacenar</button>
        <button type="button" role="tab" aria-selected={seccion === 'empresarial'} className={seccion === 'empresarial' ? 'activa' : ''} onClick={() => onSeccion('empresarial')}>Soluciones empresariales</button>
      </div>

      {listo === seccion ? (
        <section className="panel enviado" role="status">
          <h2>Recibimos tu solicitud</h2>
          <p>Un especialista de LANDEX la revisará y te contactará al correo que indicaste. Si es urgente, escríbenos a <a href={`mailto:${AGENCIA.email}`}>{AGENCIA.email}</a>.</p>
          <div className="acciones"><button type="button" className="btn" onClick={() => setListo(null)}>Enviar otra solicitud</button></div>
        </section>
      ) : seccion === 'desalmacenaje' ? (
        <Formulario tipo="desalmacenaje" usuario={usuario} campos={d} obligatorios={['mercancia']} onListo={() => setListo('desalmacenaje')}
          titulo="Ya tengo mercancía por desalmacenar"
          intro="¿Tu carga viene en camino o ya está en el puerto, aeropuerto o almacén fiscal? Cuéntanos lo que sabes y LANDEX se encarga del trámite aduanero. No necesitas completar el cotizador.">
          <fieldset>
            <legend>Tu mercancía</legend>
            <div className="campos">
              <label className="ancho">¿Qué mercancía es?*<input value={d.mercancia as string} onChange={(e) => sd('mercancia', e.target.value)} placeholder="Ej.: 300 sillas de oficina de metal y malla" /></label>
              <label>País de origen<input value={d.pais as string} onChange={(e) => sd('pais', e.target.value)} /></label>
              <label>Modalidad
                <select value={d.modalidad as string} onChange={(e) => sd('modalidad', e.target.value)}>
                  <option value="">Selecciona…</option><option>Marítimo</option><option>Aéreo</option><option>Terrestre</option><option>Courier</option><option>No estoy seguro</option>
                </select>
              </label>
              <label>Valor comercial aproximado (USD)<input inputMode="decimal" value={d.valor as string} onChange={(e) => sd('valor', e.target.value)} /></label>
              <label>Fecha estimada de llegada<input type="date" value={d.llegada as string} onChange={(e) => sd('llegada', e.target.value)} /></label>
              <label>¿Dónde está la mercancía?
                <select value={d.ubicacion as string} onChange={(e) => sd('ubicacion', e.target.value)}>
                  <option value="">Selecciona…</option>{UBICACIONES.map((u) => <option key={u}>{u}</option>)}
                </select>
              </label>
              <label>Detalle de la ubicación<input value={d.detalleUbicacion as string} onChange={(e) => sd('detalleUbicacion', e.target.value)} placeholder="Ej.: Moín, Juan Santamaría, nombre del almacén" /></label>
            </div>
          </fieldset>
          <Casillas nombre="Documentos que ya tienes" opciones={DOCUMENTOS} valor={d.documentos as string[]} onCambio={(v) => sd('documentos', v)} />
          <Casillas nombre="Servicios adicionales que necesitas" opciones={COMPLEMENTARIOS} valor={d.servicios as string[]} onCambio={(v) => sd('servicios', v)} />
          <label className="ancho">Comentarios<textarea rows={3} value={d.notas as string} onChange={(e) => sd('notas', e.target.value)} /></label>
          <p className="nota">Si tu compra todavía no sale del proveedor, te conviene <button type="button" className="link" onClick={onCotizar}>cotizar la importación completa</button>.</p>
        </Formulario>
      ) : (
        <Formulario tipo="empresarial" usuario={usuario} campos={m} obligatorios={['frecuencia']} onListo={() => setListo('empresarial')}
          titulo="Soluciones empresariales"
          intro="Para empresas que importan con frecuencia y buscan una agencia aduanal y un socio logístico permanente. Cuéntanos cómo importas y coordinamos una reunión.">
          <fieldset>
            <legend>Tus importaciones</legend>
            <div className="campos">
              <label>Tu cargo<input value={m.cargo as string} onChange={(e) => sm('cargo', e.target.value)} /></label>
              <label>¿Cuántas importaciones al año?*
                <select value={m.frecuencia as string} onChange={(e) => sm('frecuencia', e.target.value)}>
                  <option value="">Selecciona…</option><option>1 a 3</option><option>4 a 12</option><option>13 a 50</option><option>Más de 50</option>
                </select>
              </label>
              <label>Modalidades que usas<input value={m.modalidades as string} onChange={(e) => sm('modalidades', e.target.value)} placeholder="Ej.: marítimo FCL y aéreo" /></label>
              <label>Principales países de origen<input value={m.origenes as string} onChange={(e) => sm('origenes', e.target.value)} placeholder="Ej.: China, Estados Unidos" /></label>
              <label className="ancho">¿Qué productos importas?<input value={m.productos as string} onChange={(e) => sm('productos', e.target.value)} /></label>
            </div>
          </fieldset>
          <Casillas nombre="¿Qué te interesa?" opciones={INTERESES} valor={m.intereses as string[]} onCambio={(v) => sm('intereses', v)} />
          <label className="ancho">Comentarios o disponibilidad para reunirnos<textarea rows={3} value={m.notas as string} onChange={(e) => sm('notas', e.target.value)} /></label>
        </Formulario>
      )}
    </div>
  )
}
