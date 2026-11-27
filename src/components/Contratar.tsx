import { tr } from '../lib/idioma'
import { useState } from 'react'
import { AGENCIA, ZONAS, MODOS } from '../data/config'
import { guardarPerfil, type EmbarqueForm, type Perfil } from '../lib/almacen'
import { usd } from '../lib/formato'
import type { Producto, ResultadoLanded } from '../lib/landed'
import { enviarSolicitud, guardarPerfilNube, type Usuario } from '../lib/nube'

export type Intencion = 'contratar' | 'cotizacion_formal' | 'revision_arancelaria'

interface Props {
  intencion: Intencion
  r: ResultadoLanded
  ef: EmbarqueForm
  productos: Producto[]
  usuario: Usuario | null
  perfil: Perfil
  /** Con sesión: guarda la cotización en la cuenta como "solicitada". Devuelve un error o null. */
  onEnviarCuenta: (i: Intencion) => Promise<string | null>
  onIniciarSesion: () => void
  onPerfil: (p: Perfil) => void
  onCerrar: () => void
}

export const TITULOS: Record<Intencion, string> = {
  revision_arancelaria: 'Solicitar revisión arancelaria',
  contratar: 'Quiero importar con LANDEX',
  cotizacion_formal: 'Solicitar cotización formal',
}

/** Resumen corto de la estimación para correos y solicitudes. */
export function resumenTexto(r: ResultadoLanded, ef: EmbarqueForm, productos: Producto[]) {
  return [
    `Productos: ${productos.map((p) => `${p.nombre || p.sku} (${p.cantidad} u)`).join(', ')}`,
    `Incoterm ${ef.incoterm} · ${MODOS[ef.modo]} · entrega en ${ZONAS[ef.zona]}`,
    `Estimado: ${usd(r.totales.total)} · ${r.tiempo.dias} días · ${r.estado === 'incompleta' ? `${r.pendientes.length} costo(s) pendiente(s)` : 'estimación completa'}`,
  ].join('\n')
}

/** Paso de conversión: envía la estimación a LANDEX sin volver a pedir lo que el cliente ya escribió. */
export function Contratar({ intencion, r, ef, productos, usuario, perfil, onEnviarCuenta, onIniciarSesion, onPerfil, onCerrar }: Props) {
  const [c, setC] = useState({ nombre: perfil.nombre, empresa: perfil.empresa, correo: usuario?.email ?? perfil.email, telefono: perfil.telefono })
  const [notas, setNotas] = useState('')
  const [acepto, setAcepto] = useState(false)
  const [trampa, setTrampa] = useState('')
  const [estado, setEstado] = useState<'editando' | 'enviando' | 'listo'>('editando')
  const [error, setError] = useState('')
  const correoOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.correo.trim())
  const faltaNombre = !perfil.nombre.trim()
  const faltaTel = !perfil.telefono.trim()
  const valido = c.nombre.trim().length >= 2 && correoOk && acepto

  const enviar = async () => {
    setError('')
    if (trampa) { setEstado('listo'); return } // campo trampa: un robot lo llenó
    setEstado('enviando')
    const nuevoPerfil = { ...perfil, nombre: c.nombre.trim() || perfil.nombre, empresa: c.empresa.trim() || perfil.empresa, telefono: c.telefono.trim() || perfil.telefono, email: perfil.email || c.correo.trim() }
    guardarPerfil(nuevoPerfil); onPerfil(nuevoPerfil)
    let err: string | null
    if (usuario) {
      if (faltaNombre || faltaTel) await guardarPerfilNube(usuario.id, nuevoPerfil)
      err = await onEnviarCuenta(intencion)
    } else {
      err = await enviarSolicitud({
        tipo: 'importacion', nombre: c.nombre, empresa: c.empresa, correo: c.correo, telefono: c.telefono, consentimiento: acepto,
        datos: {
          intencion, notas: notas.trim(), embarque: { ...ef, intencion }, productos,
          resumen: { total: r.totales.total, mercancia: r.totales.mercancia, impuestos: r.totales.impuestos, dias: r.tiempo.dias, estado: r.estado, pendientes: r.pendientes },
        },
      })
    }
    if (err) { setError(err); setEstado('editando'); return }
    setEstado('listo')
  }

  if (estado === 'listo') {
    return (
      <section className="contratar listo" role="status">
        <h3>{tr("Recibimos tu solicitud")}</h3>
        <p>{intencion === 'contratar'
          ? tr("Un especialista de LANDEX revisará tu estimación, confirmará la clasificación y las tarifas, y te contactará para iniciar tu importación.")
          : tr("Un especialista de LANDEX revisará tu estimación y te enviará la cotización formal.")}{tr(" Te escribiremos a ")}<b>{c.correo}</b>.</p>
        {!usuario && <p>{tr("Si creas tu cuenta con ese mismo correo podrás ver la cotización formal y subir tus documentos. ")}<button type="button" className="link" onClick={onIniciarSesion}>{tr("Crear mi cuenta")}</button></p>}
        <button type="button" className="btn" onClick={onCerrar}>{tr("Cerrar")}</button>
      </section>
    )
  }

  return (
    <section className="contratar">
      <h3>{tr(TITULOS[intencion])}</h3>
      <p className="nota">{tr("Enviaremos a LANDEX la estimación que acabas de hacer, con todos sus datos: no tienes que volver a escribirlos.")}</p>
      {intencion === 'revision_arancelaria' && <><p>{tr("El agente revisará la clasificación y los impuestos. Si hace falta precisar el material o el uso, te pedirá una ficha técnica.")}</p><ul>{productos.filter((p) => r.productos.some((item) => item.id === p.id && item.impuestos.pendientes.length)).map((p) => <li key={p.id}><b>{p.nombre || p.sku}</b> · {p.cantidad}{tr(" unidades · ")}{p.paisFabricacion} · {p.descripcion}</li>)}</ul></>}
      <pre className="resumen-envio">{resumenTexto(r, ef, productos)}</pre>
      {r.estado === 'incompleta' && <p className="aviso">{tr("Tu estimación tiene costos pendientes. No pasa nada: LANDEX los completa al preparar la cotización formal.")}</p>}

      {usuario ? (
        <>
          <p>{tr("Te contactaremos como ")}<b>{perfil.nombre || usuario.email}</b> ({usuario.email}).</p>
          {(faltaNombre || faltaTel) && (
            <div className="campos">
              {faltaNombre && <label>{tr("Tu nombre")}<input value={c.nombre} onChange={(e) => setC({ ...c, nombre: e.target.value })} autoComplete="name" /></label>}
              {faltaTel && <label>{tr("Teléfono (opcional)")}<input value={c.telefono} onChange={(e) => setC({ ...c, telefono: e.target.value })} autoComplete="tel" inputMode="tel" /></label>}
            </div>
          )}
        </>
      ) : (
        <div className="campos">
          <label>{tr("Nombre*")}<input value={c.nombre} onChange={(e) => setC({ ...c, nombre: e.target.value })} autoComplete="name" /></label>
          <label>{tr("Empresa")}<input value={c.empresa} onChange={(e) => setC({ ...c, empresa: e.target.value })} autoComplete="organization" /></label>
          <label>{tr("Correo*")}<input type="email" value={c.correo} onChange={(e) => setC({ ...c, correo: e.target.value })} autoComplete="email" aria-invalid={!!c.correo && !correoOk} /></label>
          <label>{tr("Teléfono")}<input value={c.telefono} onChange={(e) => setC({ ...c, telefono: e.target.value })} autoComplete="tel" inputMode="tel" /></label>
          <label className="ancho">{tr("Algo más que debamos saber (opcional)")}<textarea rows={2} value={notas} onChange={(e) => setNotas(e.target.value)} /></label>
          <label className="trampa" aria-hidden>{tr("Sitio web")}<input tabIndex={-1} autoComplete="off" value={trampa} onChange={(e) => setTrampa(e.target.value)} /></label>
        </div>
      )}
      <label className="check"><input type="checkbox" checked={acepto} onChange={(e) => setAcepto(e.target.checked)} />{tr("Acepto que LANDEX use estos datos solo para responder esta solicitud y contactarme sobre ella.")}</label>
      {error && <p className="error" role="alert">{tr(error)}</p>}
      <div className="acciones">
        <button type="button" className="btn primario" disabled={(!usuario && !valido) || (!!usuario && !acepto) || estado === 'enviando'} onClick={enviar}>
          {estado === 'enviando' ? tr("Enviando…") : tr("Enviar a LANDEX")}
        </button>
        <button type="button" className="btn" onClick={onCerrar}>{tr("Cancelar")}</button>
      </div>
      <p className="nota">{tr("También puedes escribirnos a ")}<a href={`mailto:${AGENCIA.email}`}>{AGENCIA.email}</a>.</p>
    </section>
  )
}
