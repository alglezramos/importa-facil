import { tr } from '../lib/idioma'
import { useEffect, useState } from 'react'
import { guardarPerfil, leerPerfil, type Perfil as TPerfil } from '../lib/almacen'
import { guardarPerfilNube, type Usuario } from '../lib/nube'

interface Props { usuario: Usuario | null; onGuardado?: (p: TPerfil) => void }

export function Perfil({ usuario, onGuardado }: Props) {
  const [p, setP] = useState<TPerfil>(leerPerfil)
  const [ok, setOk] = useState(false)
  const [error, setError] = useState('')
  const [guardando, setGuardando] = useState(false)
  useEffect(() => { if (usuario) setP((x) => ({ ...leerPerfil(), email: usuario.email || x.email })) }, [usuario])
  const set = (c: Partial<TPerfil>) => { setP((x) => ({ ...x, ...c })); setOk(false) }
  const emailMalo = !!p.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.email)
  const faltan = [!p.nombre.trim() && 'nombre', !(p.email.trim() || p.telefono.trim()) && 'correo o teléfono'].filter(Boolean)

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (emailMalo || faltan.length) return
    setError('')
    if (usuario) {
      setGuardando(true)
      const err = await guardarPerfilNube(usuario.id, p)
      setGuardando(false)
      if (err) { setError(`No se pudo guardar en tu cuenta: ${err}`); return }
    }
    guardarPerfil(p)
    setOk(true)
    onGuardado?.(p)
  }

  return (
    <section className="panel perfil">
      <h2>{tr("Mi perfil")}</h2>
      <p className="intro">{tr("Guarda tus datos una vez y LANDEX los usa en cada cotización y solicitud. ")}{usuario ? tr("Se guardan en tu cuenta LANDEX.") : tr("Sin iniciar sesión se guardan solo en este navegador.")}</p>
      <form onSubmit={guardar} className="perfil-form">
        <fieldset>
          <legend>{tr("Contacto")}</legend>
          <div className="seg" role="radiogroup" aria-label={tr("Tipo de cliente")}>
            <button type="button" className={p.tipo === 'juridica' ? 'activa' : ''} onClick={() => set({ tipo: 'juridica' })}>{tr("Empresa (persona jurídica)")}</button>
            <button type="button" className={p.tipo === 'fisica' ? 'activa' : ''} onClick={() => set({ tipo: 'fisica' })}>{tr("Persona física")}</button>
          </div>
          <div className="fila2">
            <label>{tr("Nombre completo *")}<input value={p.nombre} autoComplete="name" onChange={(e) => set({ nombre: e.target.value })} /></label>
            {p.tipo === 'juridica' && <label>{tr("Empresa")}<input value={p.empresa} autoComplete="organization" onChange={(e) => set({ empresa: e.target.value })} /></label>}
            <label>{p.tipo === 'juridica' ? tr("Cédula jurídica") : tr("Cédula de identidad")}<input value={p.identificacion} inputMode="numeric" onChange={(e) => set({ identificacion: e.target.value })} /></label>
            <label>{tr("Correo")}<input type="email" value={p.email} autoComplete="email" aria-invalid={emailMalo} readOnly={!!usuario} title={usuario ? tr("Es el correo de tu cuenta") : undefined} onChange={(e) => set({ email: e.target.value.trim() })} /></label>
            <label>{tr("Teléfono / WhatsApp")}<input type="tel" value={p.telefono} autoComplete="tel" onChange={(e) => set({ telefono: e.target.value })} /></label>
            <label>{tr("¿Cuánta experiencia tienes importando?")}<select value={p.experiencia} onChange={(e) => set({ experiencia: e.target.value as TPerfil['experiencia'] })}>
                <option value="ninguna">{tr("Es mi primera importación")}</option>
                <option value="alguna">{tr("He importado algunas veces")}</option>
                <option value="frecuente">{tr("Importo con frecuencia")}</option>
              </select>
            </label>
          </div>
          {emailMalo && <small className="nota error">{tr("Revisa el formato del correo.")}</small>}
        </fieldset>

        <fieldset>
          <legend>{tr("Entrega y descarga")}</legend>
          <label>{tr("Dirección de entrega")}<input value={p.direccionEntrega} autoComplete="street-address" placeholder={tr("Provincia, cantón, distrito y señas")} onChange={(e) => set({ direccionEntrega: e.target.value })} /></label>
          <div className="fila2">
            <label>{tr("Capacidad de descarga en tu bodega")}<input value={p.capacidadDescarga} placeholder={tr("Ej.: rampa para camión, 2 personas")} onChange={(e) => set({ capacidadDescarga: e.target.value })} /></label>
            <label>{tr("Restricciones de acceso para camiones o contenedores")}<input value={p.restriccionesAcceso} placeholder={tr("Ej.: calle angosta, solo camión pequeño")} onChange={(e) => set({ restriccionesAcceso: e.target.value })} /></label>
          </div>
          <label className="check"><input type="checkbox" checked={p.tieneMontacargas} onChange={(e) => set({ tieneMontacargas: e.target.checked })} />{tr("Tengo montacargas en mi bodega")}</label>
        </fieldset>

        <fieldset>
          <legend>{tr("Presupuesto (opcional)")}</legend>
          <label>{tr("Monto disponible para la importación (USD)")}<input type="number" min={0} value={p.presupuestoUSD ?? ''} onChange={(e) => set({ presupuestoUSD: e.target.value === '' ? null : Number(e.target.value) })} />
          </label>
          <small className="nota">{tr("Solo se usa para mostrarte si el costo total de la importación cabe en ese monto.")}</small>
        </fieldset>

        {faltan.length > 0 && <p className="nota">{tr("Para guardar falta: ")}{faltan.join(' y ')}.</p>}
        <div className="acciones">
          <button type="submit" className="btn primario" disabled={faltan.length > 0 || emailMalo || guardando}>{guardando ? tr("Guardando…") : tr("Guardar perfil")}</button>
          {ok && <span className="nota" role="status">{tr("Perfil guardado")}{usuario ? tr(" en tu cuenta") : ''}.</span>}
          {error && <span className="nota error" role="alert">{tr(error)}</span>}
        </div>
      </form>
    </section>
  )
}
