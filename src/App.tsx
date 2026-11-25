import { useEffect, useState } from 'react'
import { Acceso } from './components/Acceso'
import { AgenciaAduanal, type Seccion } from './components/AgenciaAduanal'
import { Inicio } from './components/Inicio'
import { Solicitudes } from './components/Solicitudes'
import { Aliados } from './components/Aliados'
import { Clasificacion } from './components/Clasificacion'
import { Cotizador, type Apertura } from './components/Cotizador'
import { MisCotizaciones } from './components/MisCotizaciones'
import { Portal } from './components/Portal'
import { Perfil } from './components/Perfil'
import { guardarPerfil, leerPerfil, type Perfil as TPerfil } from './lib/almacen'
import { Guia } from './components/Guia'
import { Tarifas } from './components/Tarifas'
import { fijarAgencia } from './lib/formal'
import { alCambiarSesion, cargarUsuario, esStaff, ROLES, salir, type Usuario } from './lib/nube'
import { AGENCIA, EMPRESA, MARCA } from './data/config'
import { Logotipo } from './components/Marca'
import type { Clasificacion as Cls } from './lib/landed'

type Vista = 'inicio' | 'cotizar' | 'agencia' | 'clasificar' | 'guia' | 'aliados' | 'portal' | 'cotizaciones' | 'perfil' | 'solicitudes' | 'tarifas'

const VISTAS: Record<Vista, string> = {
  inicio: 'Inicio',
  cotizar: 'Cotizar',
  agencia: 'Agencia aduanal',
  clasificar: 'Aranceles e impuestos',
  guia: 'Cómo funciona',
  aliados: 'Socios Comerciales',
  portal: 'Mi LANDEX',
  cotizaciones: 'Mis cotizaciones',
  perfil: 'Mi perfil',
  solicitudes: 'Solicitudes',
  tarifas: 'Tarifas',
}

/** Rutas con # para enlazar secciones (compatible con GitHub Pages y con el regreso del enlace de acceso). */
const RUTAS: Record<string, Vista> = {
  '': 'inicio', inicio: 'inicio', cotizar: 'cotizar', 'agencia-aduanal': 'agencia', desalmacenar: 'agencia', empresas: 'agencia',
  clasificacion: 'clasificar', 'como-funciona': 'guia', socios: 'aliados', portal: 'portal', cotizaciones: 'cotizaciones', perfil: 'perfil',
  solicitudes: 'solicitudes', tarifas: 'tarifas',
}
const HASH: Record<Vista, string> = {
  inicio: '', cotizar: 'cotizar', agencia: 'agencia-aduanal', clasificar: 'clasificacion', guia: 'como-funciona', aliados: 'socios',
  portal: 'portal', cotizaciones: 'cotizaciones', perfil: 'perfil', solicitudes: 'solicitudes', tarifas: 'tarifas',
}
const leerRuta = () => location.hash.replace(/^#\/?/, '').split('?')[0]
const vistaDeRuta = (): Vista => RUTAS[leerRuta()] ?? 'inicio'

export default function App() {
  const [vista, setVistaEstado] = useState<Vista>(vistaDeRuta)
  const [seccion, setSeccion] = useState<Seccion>(leerRuta() === 'empresas' ? 'empresarial' : 'desalmacenaje')
  const setVista = (v: Vista) => {
    setVistaEstado(v)
    const h = HASH[v]
    if (leerRuta() !== h) history.pushState(null, '', h ? `#${h}` : location.pathname + location.search)
    window.scrollTo(0, 0)
  }
  useEffect(() => {
    const alCambiar = () => { setVistaEstado(vistaDeRuta()); if (leerRuta() === 'empresas') setSeccion('empresarial'); if (leerRuta() === 'desalmacenar') setSeccion('desalmacenaje') }
    window.addEventListener('popstate', alCambiar)
    return () => window.removeEventListener('popstate', alCambiar)
  }, [])
  const irAgencia = (s: Seccion) => {
    setSeccion(s); setVistaEstado('agencia')
    const h = s === 'empresarial' ? 'empresas' : 'desalmacenar'
    if (leerRuta() !== h) history.pushState(null, '', `#${h}`)
    window.scrollTo(0, 0)
  }
  const [clasificacionNueva, setClasificacionNueva] = useState<Cls | null>(null)
  const usarPartida = (c: Cls) => { setClasificacionNueva(c); setVista('cotizar') }
  const [perfil, setPerfil] = useState<TPerfil>(leerPerfil)
  const [apertura, setApertura] = useState<Apertura | null>(null)
  const [usuario, setUsuario] = useState<Usuario | null>(null)
  const [acceso, setAcceso] = useState(false)
  const [versionTarifas, setVersionTarifas] = useState(0)
  const agencia = esStaff(usuario)
  fijarAgencia(agencia)
  const abrir = (a: Omit<Apertura, 'vez'>) => { setApertura({ ...a, vez: Date.now() }); setVista('cotizar') }

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

  const visibles = (Object.keys(VISTAS) as Vista[]).filter((v) => (v !== 'tarifas' || usuario?.rol === 'operador') && (v !== 'solicitudes' || agencia))

  return (
    <div className="app">
      <header>
        <div className="marca">
          <h1 className="marca-h1"><a href="#" onClick={(e) => { e.preventDefault(); setVista('inicio') }} aria-label="LANDEX, ir al inicio"><Logotipo sobre="oscuro" alto={30} descriptor /></a></h1>
        </div>
        <div className="cuenta">
          {usuario ? (
            <>
              <span className="quien"><b>{perfil.nombre || usuario.email}</b><small>{ROLES[usuario.rol]}</small></span>
              <button type="button" className="btn-cuenta" onClick={async () => { await salir(); setVista('inicio') }}>Salir</button>
            </>
          ) : (
            <button type="button" className="btn-cuenta" onClick={() => { setVista('portal'); setAcceso(true) }}>Ingresar a Mi LANDEX</button>
          )}
        </div>
        <nav>
          {visibles.map((v) => (
            <button key={v} className={vista === v ? 'activa' : ''} aria-current={vista === v ? 'page' : undefined} onClick={() => setVista(v)}>
              {v === 'portal' && agencia ? 'LANDEX Business' : VISTAS[v]}
            </button>
          ))}
        </nav>
        {agencia && <div className="banda-agencia">Sesión de agencia · {ROLES[usuario!.rol]}: ves las cotizaciones de todos los clientes.</div>}
      </header>

      <div className="print-brand" aria-hidden>
        <Logotipo alto={22} />
        <span>{MARCA.descriptor} · {MARCA.firma} · {new Date().toLocaleDateString('es-CR')}</span>
      </div>

      <main>
        {vista === 'inicio' && (
          <Inicio onCotizar={(modo) => (modo ? abrir({ cotizacion: null, modo }) : setVista('cotizar'))} onAgencia={irAgencia}
            onSocios={() => setVista('aliados')} onGuia={() => setVista('guia')} />
        )}
        {vista === 'agencia' && <AgenciaAduanal seccion={seccion} onSeccion={irAgencia} usuario={usuario} onCotizar={() => setVista('cotizar')} />}
        {vista === 'solicitudes' && agencia && <Solicitudes perfilBase={perfil} onAbrir={(a) => abrir(a)} />}
        {vista === 'cotizar' && (
          <section className="hero">
            <div>
              <span className="barra-marca" aria-hidden />
              <h2>{MARCA.eslogan}</h2>
              <p>Estima el costo de tu importación antes de tomar una decisión. {MARCA.propuesta}</p>
            </div>
            <ul className="pilares" aria-label="Qué calcula LANDEX">
              <li>Landed Cost</li><li>Global Trade</li><li>Cost Intelligence</li>
            </ul>
          </section>
        )}
        {vista === 'cotizar' && (
          <Cotizador clasificacionNueva={clasificacionNueva} perfil={perfil} apertura={apertura} versionTarifas={versionTarifas}
            usuario={usuario} onIniciarSesion={() => setAcceso(true)} onPerfil={setPerfil} />
        )}
        {vista === 'portal' && (usuario ? <Portal key={usuario.id} usuario={usuario} perfil={perfil} onAbrir={abrir} onCotizaciones={() => setVista('cotizaciones')} onSolicitudes={() => setVista('solicitudes')} onTarifas={() => setVista('tarifas')} /> : <section className="panel"><h2>Mi LANDEX</h2><p>Ingresa para consultar tus operaciones y cotizaciones.</p><div className="acciones"><button type="button" className="btn primario" onClick={() => setAcceso(true)}>Ingresar</button><button type="button" className="btn" onClick={() => setVista('cotizaciones')}>Ver cotizaciones locales</button></div></section>)}
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
        <nav className="pie-enlaces" aria-label="Enlaces del pie">
          <button type="button" className="link" onClick={() => setVista('cotizar')}>Cotizar</button>
          <button type="button" className="link" onClick={() => irAgencia('desalmacenaje')}>Necesito desalmacenar</button>
          <button type="button" className="link" onClick={() => irAgencia('empresarial')}>Empresas</button>
          <button type="button" className="link" onClick={() => setVista('aliados')}>Socios comerciales</button>
          <a href={`mailto:${AGENCIA.email}`}>{AGENCIA.email}</a>
          {EMPRESA.terminosUrl && <a href={EMPRESA.terminosUrl}>Términos y condiciones</a>}
          {EMPRESA.privacidadUrl && <a href={EMPRESA.privacidadUrl}>Política de privacidad</a>}
        </nav>
        <p>
          Las estimaciones son referenciales. La clasificación, los impuestos y las tarifas se confirman en la cotización
          formal del agente aduanero. Las tarifas y tasas de esta versión son de ejemplo.
        </p>
        <p className="firma"><span>A Ramos &amp; Co. Company</span> {MARCA.nombre} © {new Date().getFullYear()}</p>
      </footer>
    </div>
  )
}
