import { tr } from '../lib/idioma'
const AZUL = '#48A9FF'
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
  const ancho = Math.round(alto * 6)
  return (
    <span className={`logotipo ${sobre} ${className}`}>
      <img src="brand/landex-actual.webp" width={ancho} height={Math.round(ancho * 510 / 1660)}
        alt={descriptor ? tr("LANDEX · Landed Cost Intelligence") : tr("LANDEX")} />
    </span>
  )
}

export function Monograma({ tam = 40 }: { tam?: number }) {
  return (
    <svg viewBox="0 0 512 512" width={tam} height={tam} role="img" aria-label={tr("LANDEX")} className="monograma-lx">
      <rect width="512" height="512" rx="112" fill="#101E30" />
      <path d="M176 126H236L196 314H306L294 372H122Z" fill="#FFFFFF" />
      <path d="M398 126H458L332 372H272Z" fill={AZUL} />
      <path d="M262 126H322L410 372H350Z" fill={AZUL} />
    </svg>
  )
}
