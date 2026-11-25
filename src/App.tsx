import { useState } from 'react'
import { Aliados } from './components/Aliados'
import { Clasificacion } from './components/Clasificacion'
import { Cotizador, type Apertura } from './components/Cotizador'
import { MisCotizaciones } from './components/MisCotizaciones'
import { Perfil } from './components/Perfil'
import { leerPerfil, type Perfil as TPerfil } from './lib/almacen'
import { Guia } from './components/Guia'
import { MARCA } from './data/config'
import type { Clasificacion as Cls } from './lib/landed'

type Vista = 'cotizar' | 'cotizaciones' | 'clasificar' | 'guia' | 'aliados' | 'perfil'

const VISTAS: Record<Vista, string> = {
  cotizar: 'Cotizar importación',
  cotizaciones: 'Mis cotizaciones',
  clasificar: 'Clasificación e impuestos',
  guia: 'Cómo funciona',
  aliados: 'Socios Comerciales',
  perfil: 'Mi perfil',
}

export default function App() {
  const [vista, setVista] = useState<Vista>('cotizar')
  const [clasificacionNueva, setClasificacionNueva] = useState<Cls | null>(null)
  const usarPartida = (c: Cls) => { setClasificacionNueva(c); setVista('cotizar'); window.scrollTo(0, 0) }
  const [perfil, setPerfil] = useState<TPerfil>(leerPerfil)
  const [apertura, setApertura] = useState<Apertura | null>(null)
  const abrir = (a: Omit<Apertura, 'vez'>) => { setApertura({ ...a, vez: Date.now() }); setVista('cotizar'); window.scrollTo(0, 0) }

  return (
    <div className="app">
      <header>
        <div className="marca">
          <h1 className="wordmark" aria-label={MARCA.nombre}><span className="land">LAND</span><span className="ex">EX</span></h1>
          <p className="descriptor">{MARCA.descriptor}</p>
        </div>
        <nav>
          {(Object.keys(VISTAS) as Vista[]).map((v) => (
            <button key={v} className={vista === v ? 'activa' : ''} onClick={() => setVista(v)}>
              {VISTAS[v]}
            </button>
          ))}
        </nav>
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
        {vista === 'cotizar' && <Cotizador clasificacionNueva={clasificacionNueva} perfil={perfil} apertura={apertura} />}
        {vista === 'cotizaciones' && <MisCotizaciones onAbrir={(c, copia) => abrir({ cotizacion: c, copia })} onNueva={() => abrir({ cotizacion: null })} />}
        {vista === 'perfil' && <Perfil onGuardado={setPerfil} />}
        {vista === 'clasificar' && <Clasificacion onUsar={usarPartida} />}
        {vista === 'guia' && <Guia />}
        {vista === 'aliados' && <Aliados />}
      </main>

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
