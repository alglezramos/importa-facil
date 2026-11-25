import { useState } from 'react'
import { Aliados } from './components/Aliados'
import { Clasificacion } from './components/Clasificacion'
import { Cotizador } from './components/Cotizador'
import { Guia } from './components/Guia'
import { MARCA } from './data/config'
import type { Clasificacion as Cls } from './lib/landed'

type Vista = 'cotizar' | 'clasificar' | 'guia' | 'aliados'

const VISTAS: Record<Vista, string> = {
  cotizar: 'Cotizar importación',
  clasificar: 'Clasificación e impuestos',
  guia: 'Cómo funciona',
  aliados: 'Socios Comerciales',
}

export default function App() {
  const [vista, setVista] = useState<Vista>('cotizar')
  const [clasificacionNueva, setClasificacionNueva] = useState<Cls | null>(null)
  const usarPartida = (c: Cls) => { setClasificacionNueva(c); setVista('cotizar'); window.scrollTo(0, 0) }

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
        {vista === 'cotizar' && <Cotizador clasificacionNueva={clasificacionNueva} />}
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
