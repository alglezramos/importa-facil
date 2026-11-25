import { useEffect, useState } from 'react'
import { Acceso } from './components/Acceso'
import { Aliados } from './components/Aliados'
import { Clasificacion } from './components/Clasificacion'
import { Cotizador, type Apertura } from './components/Cotizador'
import { MisCotizaciones } from './components/MisCotizaciones'
import { Perfil } from './components/Perfil'
import { guardarPerfil, leerPerfil, type Perfil as TPerfil } from './lib/almacen'
import { Guia } from './components/Guia'
import { Tarifas } from './components/Tarifas'
import { fijarAgencia } from './lib/formal'
import { alCambiarSesion, cargarUsuario, esStaff, ROLES, salir, type Usuario } from './lib/nube'
import { MARCA } from './data/config'
import type { Clasificacion as Cls } from './lib/landed'

type Vista = 'cotizar' | 'cotizaciones' | 'clasificar' | 'guia' | 'aliados' | 'perfil' | 'tarifas'

const VISTAS: Record<Vista, string> = {
  cotizar: 'Cotizar importación',
  cotizaciones: 'Mis cotizaciones',
  clasificar: 'Clasificación e impuestos',
  guia: 'Cómo funciona',
  aliados: 'Socios Comerciales',
  perfil: 'Mi perfil',
  tarifas: 'Tarifas',
}

export default function App() {
  const [vista, setVista] = useState<Vista>('cotizar')
  const [clasificacionNueva, setClasificacionNueva] = useState<Cls | null>(null)
  const usarPartida = (c: Cls) => { setClasificacionNueva(c); setVista('cotizar'); window.scrollTo(0, 0) }
  const [perfil, setPerfil] = useState<TPerfil>(leerPerfil)
  const [apertura, setApertura] = useState<Apertura | null>(null)
  const [usuario, setUsuario] = useState<Usuario | null>(null)
  const [acceso, setAcceso] = useState(false)
  const [versionTarifas, setVersionTarifas] = useState(0)
  const agencia = esStaff(usuario)
  fijarAgencia(agencia)
  const abrir = (a: Omit<Apertura, 'vez'>) => { setApertura({ ...a, vez: Date.now() }); setVista('cotizar'); window.scrollTo(0, 0) }

  useEffect(() => alCambiarSesion(async (s) => {
    if (!s) { setUsuario(null); return }
    const x = await cargarUsuario(s, leerPerfil())
    if (!x) return
    setUsuario(x.usuario)
    setPerfil(x.perfil)
    guardarPerfil(x.perfil)
    setAcceso(false)
    // Limpia el código de acceso de la dirección
    if (location.search.includes('code=')) history.replaceState(null, '', location.pathname + location.hash)
  }), [])

  const visibles = (Object.keys(VISTAS) as Vista[]).filter((v) => v !== 'tarifas' || usuario?.rol === 'operador')

  return (
    <div className="app">
      <header>
        <div className="marca">
          <h1 className="wordmark" aria-label={MARCA.nombre}><span className="land">LAND</span><span className="ex">EX</span></h1>
          <p className="descriptor">{MARCA.descriptor}</p>
        </div>
        <div className="cuenta">
          {usuario ? (
            <>
              <span className="quien"><b>{perfil.nombre || usuario.email}</b><small>{ROLES[usuario.rol]}</small></span>
              <button type="button" className="btn-cuenta" onClick={async () => { await salir(); setVista('cotizar') }}>Salir</button>
            </>
          ) : (
            <button type="button" className="btn-cuenta" onClick={() => setAcceso(true)}>Iniciar sesión</button>
          )}
        </div>
        <nav>
          {visibles.map((v) => (
            <button key={v} className={vista === v ? 'activa' : ''} onClick={() => setVista(v)}>
              {VISTAS[v]}
            </button>
          ))}
        </nav>
        {agencia && <div className="banda-agencia">Sesión de agencia · {ROLES[usuario!.rol]}: ves las cotizaciones de todos los clientes.</div>}
      </header>

      <div className="print-brand" aria-hidden>
        <span className="wordmark"><span className="land">LAND</span><span className="ex">EX</span></span>
        <span>{MARCA.descriptor} · {MARCA.firma} · {new Date().toLocaleDateString('es-CR')}</span>
      </div>

      <main>
        {vista === 'cotizar' && (
          <section className="hero">
            <div>
              <h2>{MARCA.eslogan}</h2>
              <p>Conoce el costo real de tu importación antes de tomar una decisión. {MARCA.propuesta}</p>
            </div>
            <ul className="pilares" aria-label="Qué calcula LANDEX">
              <li>Landed Cost</li><li>Global Trade</li><li>Cost Intelligence</li>
            </ul>
          </section>
        )}
        {vista === 'cotizar' && (
          <Cotizador clasificacionNueva={clasificacionNueva} perfil={perfil} apertura={apertura} versionTarifas={versionTarifas}
            usuario={usuario} onIniciarSesion={() => setAcceso(true)} />
        )}
        {vista === 'cotizaciones' && (
          <MisCotizaciones usuario={usuario} perfilBase={perfil} onAbrir={(a) => abrir(a)} onNueva={() => abrir({ cotizacion: null })}
            onIniciarSesion={() => setAcceso(true)} />
        )}
        {vista === 'perfil' && <Perfil usuario={usuario} onGuardado={setPerfil} />}
        {vista === 'clasificar' && <Clasificacion onUsar={usarPartida} />}
        {vista === 'guia' && <Guia />}
        {vista === 'aliados' && <Aliados />}
        {vista === 'tarifas' && usuario?.rol === 'operador' && <Tarifas onCambio={() => setVersionTarifas((x) => x + 1)} />}
      </main>

      {acceso && <Acceso onCerrar={() => setAcceso(false)} />}

      <footer>
        <p>
          Cotización referencial. La clasificación, los impuestos y las tarifas se confirman en la cotización formal del
          agente aduanero. Tarifas y tasas de esta versión son de ejemplo.
        </p>
        <p className="firma">{MARCA.nombre} © {new Date().getFullYear()} · {MARCA.firma.toUpperCase()}</p>
      </footer>
    </div>
  )
}
