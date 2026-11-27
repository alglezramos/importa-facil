import { tr } from '../lib/idioma'
import { useState } from 'react'
import { Logotipo } from './Marca'
import type { Perfil } from '../lib/almacen'

/** Datos mínimos para usar la cuenta (cotizar formalmente y usar LANDEX AI). */
export const registroCompleto = (p: Perfil) =>
  !!(p.nombre.trim() && p.telefono.replace(/\D/g, '').length >= 8 && p.identificacion.trim() && (p.tipo === 'fisica' || p.empresa.trim()))

interface Props {
  perfil: Perfil
  email: string
  onGuardar: (p: Perfil) => Promise<string | null>
  onSalir: () => void
}

/** Se muestra después del primer ingreso: la cuenta no se usa hasta completar estos datos. */
export function Registro({ perfil, email, onGuardar, onSalir }: Props) {
  const [p, setP] = useState<Perfil>({ ...perfil, email: perfil.email || email })
  const [acepto, setAcepto] = useState(false)
  const [error, setError] = useState('')
  const [guardando, setGuardando] = useState(false)
  const set = (c: Partial<Perfil>) => setP((x) => ({ ...x, ...c }))
  const listo = registroCompleto(p) && acepto

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!listo) return
    setGuardando(true); setError('')
    const err = await onGuardar({ ...p, nombre: p.nombre.trim(), empresa: p.empresa.trim(), identificacion: p.identificacion.trim(), telefono: p.telefono.trim() })
    setGuardando(false)
    if (err) setError(err)
  }

  return (
    <div className="modal-fondo" role="dialog" aria-modal="true" aria-label={tr("Completa tu registro")}>
      <div className="modal registro">
        <Logotipo alto={28} descriptor />
        <form onSubmit={enviar}>
          <h3>{tr("Completa tu registro")}</h3>
          <p className="nota">{tr("Entraste como ")}<b>{email}</b>{tr(". Antes de usar tu cuenta necesitamos estos datos para preparar tus cotizaciones y contactarte.")}</p>
          <div className="seg">
            <button type="button" className={p.tipo === 'juridica' ? 'activa' : ''} onClick={() => set({ tipo: 'juridica' })}>{tr("Empresa")}</button>
            <button type="button" className={p.tipo === 'fisica' ? 'activa' : ''} onClick={() => set({ tipo: 'fisica' })}>{tr("Persona física")}</button>
          </div>
          <label>{tr("Nombre completo *")}<input value={p.nombre} autoComplete="name" onChange={(e) => set({ nombre: e.target.value })} /></label>
          {p.tipo === 'juridica' && <label>{tr("Empresa *")}<input value={p.empresa} autoComplete="organization" onChange={(e) => set({ empresa: e.target.value })} /></label>}
          <label>{p.tipo === 'juridica' ? tr("Cédula jurídica *") : tr("Cédula o identificación *")}<input value={p.identificacion} onChange={(e) => set({ identificacion: e.target.value })} /></label>
          <label>{tr("Teléfono o WhatsApp *")}<input type="tel" value={p.telefono} autoComplete="tel" placeholder={tr("8888 8888")} onChange={(e) => set({ telefono: e.target.value })} /></label>
          <label className="check"><input type="checkbox" checked={acepto} onChange={(e) => setAcepto(e.target.checked)} />{tr("Acepto que LANDEX use estos datos para preparar mis cotizaciones y contactarme sobre ellas.")}</label>
          {error && <p className="error" role="alert">{tr(error)}</p>}
          <button type="submit" className="btn primario" disabled={!listo || guardando}>{guardando ? tr("Guardando…") : tr("Guardar y continuar")}</button>
          {!registroCompleto(p) && <small className="nota">{tr("Completa los campos marcados con *. El teléfono debe tener al menos 8 dígitos.")}</small>}
          <button type="button" className="link" onClick={onSalir}>{tr("Salir sin completar")}</button>
        </form>
      </div>
    </div>
  )
}
