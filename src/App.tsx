import { useEffect, useState } from 'react'
import { Acceso } from './components/Acceso'
import { Registro, registroCompleto } from './components/Registro'
import { Nosotros } from './components/Nosotros'
import { AgenciaAduanal, type Seccion } from './components/AgenciaAduanal'
import { Servicios } from './components/Servicios'
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
import { alCambiarSesion, cargarUsuario, esStaff, guardarPerfilNube, ROLES, salir, type Usuario } from './lib/nube'
import { AGENCIA, EMPRESA, MARCA } from './data/config'
import { Logotipo } from './components/Marca'
import { cargarTasasValidadas } from './lib/tasas'
import type { Clasificacion as Cls } from './lib/landed'

type Vista = 'servicios' | 'inicio' | 'cotizar' | 'agencia' | 'clasificar' | 'guia' | 'aliados' | 'nosotros' | 'portal' | 'cotizaciones' | 'perfil' | 'solicitudes' | 'tarifas'

const VISTAS: Record<Vista, string> = {
  inicio: 'Inicio',
  cotizar: 'Cotizar',
  clasificar: 'LANDEX AI',
  servicios: 'Servicios',
  agencia: 'Desalmacenaje',
  guia: 'Cómo funciona',
  aliados: 'Socios Comerciales',
  nosotros: 'Nosotros',
  portal: 'Mi LANDEX',
  cotizaciones: 'Mis cotizaciones',
  perfil: 'Mi perfil',
  solicitudes: 'Solicitudes',
  tarifas: 'Tarifas',
}

/** Rutas con # para enlazar secciones (compatible con GitHub Pages y con el regreso del enlace de acceso). */
const RUTAS: Record<string, Vista> = {
  servicios: 'servicios', '': 'inicio', inicio: 'inicio', cotizar: 'cotizar', 'agencia-aduanal': 'agencia', desalmacenar: 'agencia', empresas: 'agencia',
  clasificacion: 'clasificar', 'landex-ai': 'clasificar', 'como-funciona': 'guia', socios: 'aliados', nosotros: 'nosotros', 'quienes-somos': 'nosotros', portal: 'portal', cotizaciones: 'cotizaciones', perfil: 'perfil',
  solicitudes: 'solicitudes', tarifas: 'tarifas',
}
const HASH: Record<Vista, string> = {
  servicios: 'servicios', inicio: '', cotizar: 'cotizar', agencia: 'agencia-aduanal', clasificar: 'landex-ai', guia: 'como-funciona', aliados: 'socios', nosotros: 'nosotros',
  portal: 'portal', cotizaciones: 'cotizaciones', perfil: 'perfil', solicitudes: 'solicitudes', tarifas: 'tarifas',
}
const leerRuta = () => location.hash.replace(/^#\/?/, '').split('?')[0]
const vistaDeRuta = (): Vista => RUTAS[leerRuta()] ?? 'inicio'

export default function App() {
  const [vista, setVistaEstado] = useState<Vista>(vistaDeRuta)
  const [seccion, setSeccion] = useState<Seccion>(leerRuta() === 'empresas' ? 'empresarial' : 'desalmacenaje')
  const setVista = (v: Vista) => {
    setVistaEstado(v)
    setAcceso(false)
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
  const [descripcionNueva, setDescripcionNueva] = useState<string | undefined>()
  const usarPartida = (c: Cls, desc?: string) => { setClasificacionNueva({ ...c }); setDescripcionNueva(desc); setVista('cotizar') }
  const [perfil, setPerfil] = useState<TPerfil>(leerPerfil)
  const [apertura, setApertura] = useState<Apertura | null>(null)
  const [usuario, setUsuario] = useState<Usuario | null>(null)
  const [acceso, setAcceso] = useState(false)
  // La ventana de ingreso se cierra al iniciar sesión o al cambiar de sección.
  useEffect(() => { if (usuario) setAcceso(false) }, [usuario])
  const [versionTarifas, setVersionTarifas] = useState(0)
  useEffect(() => { cargarTasasValidadas() }, [])
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

  const privadas: Vista[] = ['portal', 'cotizaciones', 'perfil', 'solicitudes', 'tarifas']
  const espacioPrivado = !!usuario && privadas.includes(vista)
  const menuPrivado = visibles.filter(v => privadas.includes(v))

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
        <nav aria-label="Navegación principal">
          {visibles.filter(v => (v !== 'agencia' && !privadas.includes(v)) || v === 'portal').map((v) => (
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
        <div className={espacioPrivado ? 'workspace' : undefined}>
          {espacioPrivado && <aside className="workspace-menu" aria-label="Navegación del portal">
            <strong>{agencia ? 'LANDEX Business' : 'Mi LANDEX'}</strong>
            {menuPrivado.map(v => <button key={v} type="button" className={vista === v ? 'activa' : ''} aria-current={vista === v ? 'page' : undefined} onClick={() => setVista(v)}>{v === 'portal' ? 'Resumen' : v === 'solicitudes' ? 'CRM comercial' : VISTAS[v]}</button>)}
            <button type="button" onClick={() => setVista('cotizar')}>Nueva cotización</button>
          </aside>}
          <div className="workspace-content">
        {vista === 'inicio' && (
          <Inicio onHistoria={() => setVista('nosotros')} onCotizar={(modo) => (modo ? abrir({ cotizacion: null, modo }) : setVista('cotizar'))} onAgencia={irAgencia} onLandexAI={() => setVista('clasificar')}
            onSocios={() => setVista('aliados')} onGuia={() => setVista('guia')} />
        )}
        {vista === 'servicios' && <Servicios onAgencia={irAgencia} onCotizar={() => abrir({ cotizacion: null, modo: 'guiado' })} />}
        {vista === 'agencia' && <AgenciaAduanal seccion={seccion} onSeccion={irAgencia} usuario={usuario} onCotizar={() => setVista('cotizar')} />}
        {vista === 'solicitudes' && agencia && <Solicitudes perfilBase={perfil} onAbrir={(a) => abrir(a)} />}
        {vista === 'cotizar' && (
          <section className="hero">
            <div>
              <h2>Cotizá tu importación</h2>
              <p>Elegí cómo ingresar los datos de tu embarque.</p>
            </div>
          </section>
        )}
        {vista === 'cotizar' && (
          <Cotizador clasificacionNueva={clasificacionNueva} descripcionNueva={descripcionNueva} perfil={perfil} apertura={apertura} versionTarifas={versionTarifas}
            usuario={usuario} onIniciarSesion={() => setAcceso(true)} onPerfil={setPerfil} />
        )}
        {vista === 'portal' && (usuario ? <Portal key={usuario.id} usuario={usuario} perfil={perfil} onAbrir={abrir} onCotizaciones={() => setVista('cotizaciones')} onSolicitudes={() => setVista('solicitudes')} onTarifas={() => setVista('tarifas')} onNueva={() => setVista('cotizar')} /> : <section className="panel"><h2>Mi LANDEX</h2><p>Ingresa para consultar tus operaciones y cotizaciones.</p><div className="acciones"><button type="button" className="btn primario" onClick={() => setAcceso(true)}>Ingresar</button><button type="button" className="btn" onClick={() => setVista('cotizaciones')}>Ver cotizaciones locales</button></div></section>)}
        {vista === 'cotizaciones' && (
          <MisCotizaciones usuario={usuario} perfilBase={perfil} onAbrir={(a) => abrir(a)} onNueva={() => abrir({ cotizacion: null })}
            onIniciarSesion={() => setAcceso(true)} />
        )}
        {vista === 'perfil' && <Perfil usuario={usuario} onGuardado={setPerfil} />}
        {vista === 'clasificar' && <Clasificacion onUsar={usarPartida} conectado={!!usuario} onIngresar={() => setAcceso(true)} onCotizar={() => setVista('cotizar')} equipo={esStaff(usuario)} />}
        {vista === 'guia' && <Guia onCotizar={() => setVista('cotizar')} onAgencia={() => irAgencia('desalmacenaje')} />}
        {vista === 'aliados' && <Aliados />}
        {vista === 'nosotros' && <Nosotros onCotizar={() => setVista('cotizar')} onContacto={() => irAgencia('empresarial')} />}
        {vista === 'tarifas' && usuario?.rol === 'operador' && <Tarifas onCambio={() => setVersionTarifas((x) => x + 1)} />}
          </div>
        </div>
      </main>

      {acceso && <Acceso onCerrar={() => setAcceso(false)} />}
      {usuario && !esStaff(usuario) && !registroCompleto(perfil) && (
        <Registro perfil={perfil} email={usuario.email}
          onGuardar={async (p) => { const e = await guardarPerfilNube(usuario.id, p); if (!e) { setPerfil(p); guardarPerfil(p) } return e }}
          onSalir={async () => { await salir(); setVista('inicio') }} />
      )}

      <footer>


        <div className="pie-identidad">
          <div className="pie-marca"><Logotipo alto={23} /><span>Una iniciativa de Ramos &amp; Co.</span></div>
        <nav className="pie-enlaces" aria-label="Enlaces del pie">
          {vista !== 'inicio' && <a href={`mailto:${AGENCIA.email}`}>{AGENCIA.email}</a>}
          {EMPRESA.terminosUrl && <a href={EMPRESA.terminosUrl}>Términos y condiciones</a>}
          {EMPRESA.privacidadUrl && <a href={EMPRESA.privacidadUrl}>Política de privacidad</a>}
        </nav>
          <small>© {new Date().getFullYear()} {MARCA.nombre}</small>
        </div>
        <p>
          Las estimaciones son referenciales. La clasificación, los impuestos y las tarifas se confirman en la cotización
          formal del agente aduanero. Las tarifas de esta versión son valores de referencia internos de ejemplo, no ofertas vigentes de proveedores.
        </p>
      </footer>
    </div>
  )
}
