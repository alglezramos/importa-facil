import { tr } from '../lib/idioma'

type Idioma = 'es' | 'en'
interface Props {
  idioma: Idioma
  nombre?: string
  rol?: string
  onIdioma: (idioma: Idioma) => void
  onSalir: () => void
  onIngresar: () => void
}

export function CuentaCabecera({ idioma, nombre, rol, onIdioma, onSalir, onIngresar }: Props) {
  const iniciales = nombre?.split('@')[0].split(/[\s._-]+/u).filter(Boolean)
    .slice(0, 2).map(palabra => Array.from(palabra)[0]).join('').toLocaleUpperCase()

  return <div className="cuenta">
    <label className="elegir-idioma">
      <span aria-hidden="true">
        <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><path d="M3 12h18"/></svg>
        {idioma.toUpperCase()}
        <svg className="chevron" viewBox="0 0 16 16"><path d="m4 6 4 4 4-4"/></svg>
      </span>
      <select className="idioma-selector" aria-label={idioma === 'en' ? 'Language' : 'Idioma'} value={idioma}
        onChange={e => onIdioma(e.target.value === 'en' ? 'en' : 'es')}>
        <option value="es" lang="es">Español</option>
        <option value="en" lang="en">English</option>
      </select>
    </label>
    {rol ? <>
      <div className="cuenta-perfil">
        <span className="cuenta-avatar" aria-hidden="true">{iniciales || '•'}</span>
        <span className="quien"><b title={nombre}>{nombre}</b><small>{rol}</small></span>
      </div>
      <button type="button" className="cuenta-salir" onClick={onSalir}>
        <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M10 4H5a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h5m5-13 5 5-5 5m5-5H9"/></svg>
        {tr('Salir')}
      </button>
    </> : <button type="button" className="btn-cuenta" onClick={onIngresar}>{tr('Ingresar a Mi LANDEX')}</button>}
  </div>
}
