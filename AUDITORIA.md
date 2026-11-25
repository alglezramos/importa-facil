# Auditoría frente al prompt maestro (25/11/2026)

Revisión del repositorio `alglezramos/importa-facil`, comparado con el plan de evolución de LANDEX.

**Estados posibles:** ✅ implementado · 🟡 parcial · ⬜ pendiente · 🔧 requiere configuración externa · ⚖️ requiere validación profesional.

## Fase 1: lanzamiento comercial y conversión

| # | Requerimiento | Estado | Observación |
|---|---|---|---|
| 3 | Página de inicio comercial | ⬜ → ✅ v1 | Antes la app abría directo en el cotizador. Las imágenes son ilustraciones propias: no hay fotos con licencia. |
| 4 | Cuatro entradas por perfil de cliente | 🟡 → ✅ v1 | Ya existían el modo guiado y el experto. Se agregaron "Necesito desalmacenar" y "Soluciones empresariales". |
| 5 | Conversión desde el resultado | 🟡 → ✅ v1 | Antes había guardar, PDF y correo. Se agregó "Quiero importar con LANDEX" sin volver a pedir datos. |
| 6 | Alcance de servicios y separación de costos | ⬜ → ✅ v1 | Es una capa de presentación: el motor no cambia. |
| 7 | Confianza y datos corporativos | ⬜ → 🟡 | Se muestran solo los datos que ya existen. Faltan razón social, cédula jurídica, agente, teléfono, términos y privacidad 🔧⚖️. |
| 7 | Dominio landex.cr y correo | ✅ | landex.cr con HTTPS. cotizaciones@ e info@ reenvían al Gmail. Los correos de acceso salen por Resend. |
| 7 | Quitar teléfonos de ejemplo | ⬜ → ✅ | WhatsApp oculto hasta tener un número real. |

## Fases 2 a 7 (roadmap)

| # | Requerimiento | Estado | Observación |
|---|---|---|---|
| 8 | Asistente para principiantes | 🟡 | Ya tiene 6 pasos y opciones "no sé". Falta llevarlo a 5 pasos con cubicaje visual. |
| 9 | Cotizador inverso por presupuesto | 🟡 | Hoy solo compara el presupuesto con el resultado. Falta resolver el monto de compra. |
| 10 | Carga de documentos | ✅ | Expediente privado por cotización. No hay OCR. |
| 11 | Resumen y estados de costos | ✅ | Indica si cada costo es confirmado, estimado o pendiente, con indicador de confiabilidad y comparación de modalidades. |
| 12 | Motor de cotización | 🟡 ⚖️ | Incoterms protegidos, tratados comerciales condicionados y tarifas con vigencia. Faltan tasas oficiales y la revisión del agente. |
| 13 | Mi LANDEX (portal del cliente) | 🟡 | Hay cotizaciones, documentos y perfil. Faltan importaciones, productos, proveedores y facturación. |
| 14–16 | Seguimiento, real contra estimado, notificaciones | ⬜ | |
| 17–19 | Panel ejecutivo, CRM y operaciones | ⬜ | La v1 agrega una bandeja de solicitudes: es la semilla del CRM. |
| 20 | Tarifas | 🟡 | Hay proveedor, vigencia, fuente y publicación. Falta separar costo negociado, precio comercial y margen. |
| 21 | Socios | ✅ | 27 logos. Esencial Costa Rica oculto hasta tener licencia. Falta la ficha administrativa por socio. |
| 22–23 | Supabase, roles y RLS | 🟡 | Hay tres roles (cliente, agente y operador) con RLS probada. Faltan los roles comercial, logística y superadministrador. |
| 24 | Autenticación | ✅ | Enlace por correo vía Resend y redirección a landex.cr. Falta el correo en español con la marca. |
| 25 | Fuentes oficiales | ⬜ ⚖️ 🔧 | |
| 26 | Libro de marca | ✅ | Botón principal con contraste corregido. |
| 27–29 | Navegación, módulos y SEO | 🟡 | La v1 agrega rutas con #, robots.txt y sitemap. |
| 30 | One Chain | ⬜ | Fuera de alcance, como pide el prompt. |

## Riesgos abiertos

- **Logos de socios sin acuerdos firmados:** se publican como "socios" por decisión de Ale.
- **Formularios públicos sin protección contra spam:** solo hay un campo trampa y validaciones en la base de datos. Si llega spam, hay que agregar un captcha.
- **Avisos de solicitudes nuevas:** no llegan por correo. El equipo las ve en la pestaña Solicitudes. Para recibir avisos por correo hace falta una función en Supabase con una clave de Resend guardada por Ale.
