/**
 * Logotipo y monograma de LANDEX según el Libro de Marca.
 * Dibujados como vectores (no dependen de la fuente): "LAND" en azul marino
 * o blanco, con la "A" sin travesaño, y "EX" en azul eléctrico.
 * La misma geometría está en scripts/marca.py, que genera los archivos de public/brand.
 */
const AZUL = '#48A9FF'
const LAND = [
  'M0 0H24V76H64V100H0Z',
  'M72 100L104 0H136L168 100H142L120 30L98 100Z',
  'M176 0H200L240 62V0H264V100H240L200 38V100H176Z',
  'M274 0H314A50 50 0 0 1 314 100H274ZM298 24V76H312A26 26 0 0 0 312 24Z',
]
const EX = [
  'M374 0H438V22H398V39H432V61H398V78H438V100H374Z',
  'M446 0H474L491 27.5L508 0H536L505 50L536 100H508L491 72.5L474 100H446L477 50Z',
]

interface Props {
  /** "claro": para fondos claros (LAND azul marino). "oscuro": para fondos oscuros (LAND blanco). */
  sobre?: 'claro' | 'oscuro'
  /** Altura en píxeles de las letras. */
  alto?: number
  /** Muestra el descriptor "Landed Cost Intelligence" con su línea. */
  descriptor?: boolean
  className?: string
}

export function Logotipo({ sobre = 'claro', alto = 26, descriptor = false, className = '' }: Props) {
  const land = sobre === 'oscuro' ? '#FFFFFF' : '#101E30'
  return (
    <span className={`logotipo ${sobre} ${className}`}>
      <svg viewBox="0 0 536 100" height={alto} width={alto * 5.36} role="img" aria-label="LANDEX">
        {LAND.map((d) => <path key={d} d={d} fill={land} fillRule="evenodd" />)}
        {EX.map((d) => <path key={d} d={d} fill={AZUL} />)}
      </svg>
      {descriptor && <span className="logotipo-desc">Landed Cost Intelligence</span>}
    </span>
  )
}

export function Monograma({ tam = 40 }: { tam?: number }) {
  return (
    <svg viewBox="0 0 512 512" width={tam} height={tam} role="img" aria-label="LANDEX" className="monograma-lx">
      <rect width="512" height="512" rx="112" fill="#101E30" />
      <path d="M176 126H236L196 314H306L294 372H122Z" fill="#FFFFFF" />
      <path d="M398 126H458L332 372H272Z" fill={AZUL} />
      <path d="M262 126H322L410 372H350Z" fill={AZUL} />
    </svg>
  )
}
