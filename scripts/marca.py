"""
Genera los recursos de marca de LANDEX según el Libro de Marca:
logotipo (wordmark con la "A" sin travesaño), monograma LX, favicon,
íconos de app e imagen para redes. Uso: python3 scripts/marca.py
Requiere rsvg-convert y la fuente Montserrat instalada para los PNG.
"""
from pathlib import Path
import subprocess

NAVY, AZUL, GRIS, GRIS_AZUL = '#101E30', '#48A9FF', '#91A4BD', '#B8C9DE'
OUT = Path(__file__).resolve().parent.parent / 'public' / 'brand'
PUB = OUT.parent

# Geometría del wordmark: altura de mayúscula 100, trazo 24.
LAND = [
    'M0 0H24V76H64V100H0Z',                                              # L
    'M72 100L104 0H136L168 100H142L120 30L98 100Z',                     # Λ (A sin travesaño)
    'M176 0H200L240 62V0H264V100H240L200 38V100H176Z',                  # N
    'M274 0H314A50 50 0 0 1 314 100H274ZM298 24V76H312A26 26 0 0 0 312 24Z',  # D
]
EX = [
    'M374 0H438V22H398V39H432V61H398V78H438V100H374Z',                  # E
    'M446 0H474L491 27.5L508 0H536L505 50L536 100H508L491 72.5L474 100H446L477 50Z',  # X
]
ANCHO = 536

def wordmark(land: str, x0=0, y0=0, escala=1.0) -> str:
    g = f'<g transform="translate({x0} {y0}) scale({escala})">'
    g += ''.join(f'<path d="{d}" fill="{land}" fill-rule="evenodd"/>' for d in LAND)
    g += ''.join(f'<path d="{d}" fill="{AZUL}"/>' for d in EX)
    return g + '</g>'

def tagline(x, y, color, tam=30) -> str:
    return (f'<line x1="{x}" y1="{y - tam * 0.33}" x2="{x + tam * 2.2}" y2="{y - tam * 0.33}" stroke="{AZUL}" stroke-width="{tam / 12:.1f}"/>'
            f'<text x="{x + tam * 2.8}" y="{y}" font-family="Montserrat, Arial, sans-serif" font-style="italic" font-weight="500" '
            f'font-size="{tam}" fill="{color}">International Trade Intelligence</text>')

def monograma(tam=512, fondo=True) -> str:
    # Monograma LX: L blanca en cursiva y X azul, sobre azul marino.
    s = tam / 512
    f = f'<rect width="{tam}" height="{tam}" rx="{112 * s}" fill="{NAVY}"/>' if fondo else ''
    L = 'M176 126H236L196 314H306L294 372H122Z'
    X1 = 'M262 126H322L410 372H350Z'
    X2 = 'M398 126H458L332 372H272Z'
    return (f + f'<g transform="scale({s})"><path d="{L}" fill="#FFFFFF"/>'
            f'<path d="{X2}" fill="{AZUL}"/><path d="{X1}" fill="{AZUL}"/></g>')

def svg(w, h, cuerpo, titulo='LANDEX') -> str:
    return (f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}" role="img" aria-label="{titulo}">'
            f'<title>{titulo}</title>{cuerpo}</svg>\n')

def escribir(nombre, contenido, carpeta=OUT):
    (carpeta / nombre).write_text(contenido, encoding='utf-8')

# Logotipo principal (con descriptor) y versión horizontal
escribir('landex-logo-light.svg', svg(ANCHO + 8, 160, wordmark(NAVY, 4, 4) + tagline(10, 150, GRIS, 26)))
escribir('landex-logo-dark.svg', svg(ANCHO + 8, 160, f'<rect width="100%" height="100%" fill="{NAVY}"/>' + wordmark('#FFFFFF', 4, 4) + tagline(10, 150, GRIS_AZUL, 26)))
escribir('landex-horizontal.svg', svg(ANCHO, 100, wordmark(NAVY)))
escribir('landex-horizontal-blanco.svg', svg(ANCHO, 100, wordmark('#FFFFFF')))
escribir('landex-lockup-dark.svg', svg(820, 200, f'<rect width="100%" height="100%" rx="24" fill="{NAVY}"/>'
         + f'<g transform="translate(40 40)">{monograma(120)}</g>' + wordmark('#FFFFFF', 200, 44, 0.95) + tagline(206, 178, GRIS_AZUL, 22)))
escribir('landex-icon.svg', svg(512, 512, monograma(512), 'LANDEX LX'))
escribir('favicon.svg', svg(64, 64, monograma(64), 'LANDEX'), PUB)

# Imagen para redes (1200 × 630): azul marino con franjas diagonales
og = (f'<rect width="1200" height="630" fill="{NAVY}"/>'
      f'<path d="M960 0H1120L760 630H600Z" fill="{AZUL}" opacity=".9"/>'
      f'<path d="M1150 0H1200V120L840 630H800Z" fill="{AZUL}" opacity=".35"/>'
      f'<rect x="80" y="96" width="90" height="10" rx="2" fill="{AZUL}"/>'
      + wordmark('#FFFFFF', 80, 150, 1.0)
      + tagline(84, 300, GRIS_AZUL, 26)
      + f'<text x="80" y="420" font-family="Montserrat, Arial, sans-serif" font-style="italic" font-weight="800" font-size="56" fill="#FFFFFF">Importa con inteligencia.</text>'
      + f'<text x="80" y="490" font-family="Montserrat, Arial, sans-serif" font-weight="500" font-size="26" fill="{GRIS_AZUL}">De la fábrica a tu bodega · A Ramos &amp; Co. Company</text>')
escribir('og-image.svg', svg(1200, 630, og))

def png(origen, destino, w, h):
    subprocess.run(['rsvg-convert', '-w', str(w), '-h', str(h), '-o', str(OUT / destino), str(OUT / origen)], check=True)

png('landex-icon.svg', 'icon-512.png', 512, 512)
png('landex-icon.svg', 'icon-192.png', 192, 192)
png('landex-icon.svg', 'apple-touch-icon.png', 180, 180)
png('og-image.svg', 'og-image.png', 1200, 630)
print('Recursos de marca generados en', OUT)
