import { useState } from 'react'
import { guardarPerfil, leerPerfil, type Perfil as TPerfil } from '../lib/almacen'

interface Props { onGuardado?: (p: TPerfil) => void }

export function Perfil({ onGuardado }: Props) {
  const [p, setP] = useState<TPerfil>(leerPerfil)
  const [ok, setOk] = useState(false)
  const set = (c: Partial<TPerfil>) => { setP((x) => ({ ...x, ...c })); setOk(false) }
  const emailMalo = !!p.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.email)
  const faltan = [!p.nombre.trim() && 'nombre', !(p.email.trim() || p.telefono.trim()) && 'correo o teléfono'].filter(Boolean)

  const guardar = (e: React.FormEvent) => {
    e.preventDefault()
    if (emailMalo || faltan.length) return
    guardarPerfil(p)
    setOk(true)
    onGuardado?.(p)
  }

  return (
    <section className="panel perfil">
      <h2>Mi perfil</h2>
      <p className="intro">Guarda tus datos una vez y LANDEX los usa en cada cotización y solicitud. Se guardan solo en este navegador.</p>
      <form onSubmit={guardar} className="perfil-form">
        <fieldset>
          <legend>Contacto</legend>
          <div className="seg" role="radiogroup" aria-label="Tipo de cliente">
            <button type="button" className={p.tipo === 'juridica' ? 'activa' : ''} onClick={() => set({ tipo: 'juridica' })}>Empresa (persona jurídica)</button>
            <button type="button" className={p.tipo === 'fisica' ? 'activa' : ''} onClick={() => set({ tipo: 'fisica' })}>Persona física</button>
          </div>
          <div className="fila2">
            <label>Nombre completo *<input value={p.nombre} autoComplete="name" onChange={(e) => set({ nombre: e.target.value })} /></label>
            {p.tipo === 'juridica' && <label>Empresa<input value={p.empresa} autoComplete="organization" onChange={(e) => set({ empresa: e.target.value })} /></label>}
            <label>{p.tipo === 'juridica' ? 'Cédula jurídica' : 'Cédula de identidad'}<input value={p.identificacion} inputMode="numeric" onChange={(e) => set({ identificacion: e.target.value })} /></label>
            <label>Correo<input type="email" value={p.email} autoComplete="email" aria-invalid={emailMalo} onChange={(e) => set({ email: e.target.value.trim() })} /></label>
            <label>Teléfono / WhatsApp<input type="tel" value={p.telefono} autoComplete="tel" onChange={(e) => set({ telefono: e.target.value })} /></label>
            <label>¿Cuánta experiencia tienes importando?
              <select value={p.experiencia} onChange={(e) => set({ experiencia: e.target.value as TPerfil['experiencia'] })}>
                <option value="ninguna">Es mi primera importación</option>
                <option value="alguna">He importado algunas veces</option>
                <option value="frecuente">Importo con frecuencia</option>
              </select>
            </label>
          </div>
          {emailMalo && <small className="nota error">Revisa el formato del correo.</small>}
        </fieldset>

        <fieldset>
          <legend>Entrega y descarga</legend>
          <label>Dirección de entrega<input value={p.direccionEntrega} autoComplete="street-address" placeholder="Provincia, cantón, distrito y señas" onChange={(e) => set({ direccionEntrega: e.target.value })} /></label>
          <div className="fila2">
            <label>Capacidad de descarga en tu bodega<input value={p.capacidadDescarga} placeholder="Ej.: rampa para camión, 2 personas" onChange={(e) => set({ capacidadDescarga: e.target.value })} /></label>
            <label>Restricciones de acceso para camiones o contenedores<input value={p.restriccionesAcceso} placeholder="Ej.: calle angosta, solo camión pequeño" onChange={(e) => set({ restriccionesAcceso: e.target.value })} /></label>
          </div>
          <label className="check"><input type="checkbox" checked={p.tieneMontacargas} onChange={(e) => set({ tieneMontacargas: e.target.checked })} />Tengo montacargas en mi bodega</label>
        </fieldset>

        <fieldset>
          <legend>Presupuesto (opcional)</legend>
          <label>Monto disponible para la importación (USD)
            <input type="number" min={0} value={p.presupuestoUSD ?? ''} onChange={(e) => set({ presupuestoUSD: e.target.value === '' ? null : Number(e.target.value) })} />
          </label>
          <small className="nota">Solo se usa para mostrarte si el costo total de la importación cabe en ese monto.</small>
        </fieldset>

        {faltan.length > 0 && <p className="nota">Para guardar falta: {faltan.join(' y ')}.</p>}
        <div className="acciones">
          <button type="submit" className="btn primario" disabled={faltan.length > 0 || emailMalo}>Guardar perfil</button>
          {ok && <span className="nota" role="status">Perfil guardado.</span>}
        </div>
      </form>
    </section>
  )
}
