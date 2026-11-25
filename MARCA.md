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
