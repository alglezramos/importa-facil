import { useEffect, useState } from 'react'
import { enviarEnlace } from '../lib/nube'

interface Props { onCerrar: () => void }

export function Acceso({ onCerrar }: Props) {
  const [email, setEmail] = useState('')
  const [estado, setEstado] = useState<'inicio' | 'enviando' | 'enviado'>('inicio')
  const [error, setError] = useState('')
  const valido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())

  useEffect(() => {
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') onCerrar() }
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [onCerrar])

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!valido) return
    setEstado('enviando'); setError('')
    const err = await enviarEnlace(email.trim().toLowerCase())
    if (err) { setError(err); setEstado('inicio') } else setEstado('enviado')
  }

  return (
    <div className="modal-fondo" role="dialog" aria-modal="true" aria-label="Iniciar sesión" onClick={onCerrar}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="cerrar" aria-label="Cerrar" onClick={onCerrar}>×</button>
        <div className="wordmark"><span className="land">LAND</span><span className="ex">EX</span></div>
        {estado === 'enviado' ? (
          <>
            <h3>Revisa tu correo</h3>
            <p>Te enviamos un enlace a <b>{email}</b>. Ábrelo en este mismo navegador para entrar. Si no lo ves, revisa la carpeta de correo no deseado.</p>
            <button type="button" className="btn" onClick={() => setEstado('inicio')}>Usar otro correo</button>
          </>
        ) : (
          <form onSubmit={enviar}>
            <h3>Entra a tu cuenta</h3>
            <p className="nota">Te enviamos un enlace de acceso por correo, sin contraseñas. Si es tu primera vez, se crea tu cuenta.</p>
            <label>Correo<input type="email" autoFocus value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu@empresa.com" /></label>
            {error && <p className="error" role="alert">{error}</p>}
            <button type="submit" className="btn primario" disabled={!valido || estado === 'enviando'}>{estado === 'enviando' ? 'Enviando…' : 'Enviarme el enlace'}</button>
            <small className="nota">Con tu cuenta guardas tus cotizaciones, subes documentos y recibes cotizaciones formales.</small>
          </form>
        )}
      </div>
    </div>
  )
}
