# Identidad LANDEX

**LANDEX** · International Trade Intelligence · *Importa con inteligencia.* · De la fábrica a tu bodega. · A Ramos & Co. Company

## Arquitectura del grupo
- **Ramos & Co.** (empresa matriz)
  - **LANDEX**: International Trade Intelligence. Cotización y Landed Cost de la fábrica del proveedor a la bodega del importador. *Unidad activa.*
  - **ONE CHAIN**: Supply Chain Solutions (inventarios, procurement, demanda, almacenamiento, distribución). *Etapa futura: sin funcionalidades en esta versión.*

La marca está centralizada en `src/data/config.ts` (`MARCA`), para que otras unidades del grupo puedan reutilizar el motor y los componentes.

## Paleta
| Uso | Color |
| --- | --- |
| Azul marino (fondos, texto principal) | `#101E30` |
| Azul eléctrico (acento, "EX", botones) | `#48A9FF` |
| Blanco | `#FFFFFF` |
| Gris azulado (texto sobre fondo oscuro, bordes) | `#B8C9DE` |
| Gris corporativo (firma, elementos secundarios) | `#91A4BD` |
| Fondo claro | `#F5F7FA` |

Los botones principales usan texto azul marino sobre azul eléctrico, porque el blanco sobre `#48A9FF` no alcanza el contraste mínimo de lectura.

## Tipografía
- Logotipo y titulares: **Sora** 700/800 (geométrica, gruesa).
- Interfaz: **Inter**.

## Archivos (`public/brand/`)
| Archivo | Uso |
| --- | --- |
| `landex-logo-light.svg` | Logo sobre fondos claros (LAND azul marino) |
| `landex-logo-dark.svg` | Logo sobre fondos oscuros (LAND blanco) |
| `landex-lockup-dark.svg` | Logo + descriptor + firma |
| `landex-icon.svg`, `icon-192.png`, `icon-512.png`, `apple-touch-icon.png` | Ícono compacto (favicon, app, móvil) |
| `og-image.png` | Imagen para redes sociales (1200×630) |

Los SVG del logotipo usan texto con la fuente Sora. Para imprenta o señalética, conviene convertirlos a trazos con un diseñador.

## Libro de Marca (aplicado el 2026-11-24)

La interfaz sigue el *Libro de Marca LANDEX* (manual de identidad corporativa):

- **Tipografía:** Montserrat en el logotipo, la interfaz y el PDF. Se sirve desde la propia página (`@fontsource/montserrat`), sin Google Fonts.
- **Paleta:** azul marino `#101E30` (≈60%), azul eléctrico `#48A9FF` (≈20%, acentos y acciones), blanco y gris claro `#F5F7FA` (fondos), gris corporativo `#91A4BD` (texto secundario) y gris azulado `#B8C9DE` (soporte).
- **Logotipo:** LAND en azul marino (o blanco sobre fondo oscuro), con la "A" sin travesaño, y EX en azul eléctrico. El descriptor *International Trade Intelligence* va en itálica, después de una línea azul. Está dibujado en vectores en `src/components/Marca.tsx` y `scripts/marca.py`.
- **Monograma LX:** L blanca y X azul sobre azul marino. Se usa en el favicon, los íconos de la app y la imagen para redes.
- **Estilo:** botones en píldora (la acción principal en azul eléctrico, con texto blanco en mayúsculas), barra azul corta sobre los títulos, etiquetas de sección "/ TÍTULO" en mayúsculas espaciadas, franjas diagonales azules como acento y firma "| A Ramos & Co. Company".
- **Regenerar los recursos** (`public/brand`, `public/favicon.svg`): `python3 scripts/marca.py`, que requiere rsvg-convert y Montserrat instalada.

Nota de accesibilidad: el libro pide texto blanco sobre azul eléctrico en el botón principal, pero ese contraste es de unos 2,5:1, por debajo del 4,5:1 que recomienda la WCAG. Por decisión de Ale (24/11/2026), el botón usa texto azul marino sobre azul eléctrico, que da un contraste de unos 7:1.
