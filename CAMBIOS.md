# Fase 4, parte 2: cuentas, nube y documentos (2026-11-24)

Respaldo previo: etiqueta `respaldo-v6` y rama `respaldo-v6`. **Sin cambios en fórmulas, tarifas de referencia, aranceles ni impuestos.**

- **Supabase conectado** (proyecto `landex`, plan gratuito, East US). Se aplicó el esquema y luego un endurecimiento recomendado por el asesor de seguridad de Supabase:
  - las funciones internas ya no se pueden llamar por la API;
  - el consecutivo `LDX-AAAA-0001` lo asigna la base de datos;
  - las funciones tienen un `search_path` fijo.

  Se verificó en el Supabase real que un cliente no puede subirse de rol ni ver datos de otros, y que un visitante sin sesión no ve nada.
- **Inicio de sesión con enlace por correo** (sin contraseñas). El rol de la cuenta (cliente, agente u operador) decide qué herramientas se muestran. **El antiguo modo `#agencia` se eliminó**: ahora la seguridad la aplica la base de datos.
- **Mi perfil** se guarda en la cuenta.
- **Mis cotizaciones en la nube**: el cliente ve las suyas desde cualquier dispositivo, y la agencia ve las de todos los clientes, con buscador. Las guardadas en el navegador se pueden pasar a la cuenta.
- **Cotización formal de punta a punta**:
  - la agencia abre la cotización del cliente, valida, aplica tarifas y la emite;
  - el cliente la ve en su cuenta y la **acepta**;
  - una cotización aceptada ya no se modifica (se duplica).
- **Carga de documentos**: el cliente sube PDF, imágenes, Excel o Word (hasta 10 MB) a cada documento del expediente. La agencia los abre con enlaces temporales y los marca como revisados o con observaciones. Los archivos son privados.
- **Tarifas en la base de datos**: solo el operador las crea. Las *internas* solo las ve la agencia; las *publicadas* (reales y vigentes) las ven los clientes. Las tarifas que estaban en el navegador se pueden subir.
- Sin sesión, LANDEX sigue funcionando como antes, guardando en el navegador.

**Pendiente:** configurar un correo propio (Resend, gratis) para que los clientes reciban el enlace de acceso. Mientras tanto, Supabase solo envía correos a los miembros del equipo del proyecto.

# Fase 4, parte 1: confiabilidad, expediente y base de datos (2026-11-24)

Respaldo previo: etiqueta `respaldo-v5` y rama `respaldo-v5`. **Sin cambios en fórmulas, tarifas, aranceles ni impuestos.** Hay 46 pruebas y todas pasan, más 27 pruebas de permisos de la base de datos.

- **Indicador de confiabilidad** en el resultado y el PDF: porcentaje de los costos de importación (logística e impuestos, sin la mercancía) respaldado por tarifas confirmadas y clasificación validada. Lo acompaña una lista de lo que falta confirmar: Incoterm, medidas, clasificación, flete, destino, transporte y descarga. No se presenta como garantía de exactitud.
- **Documentos de tu importación**: lista automática según el caso.
  - Factura comercial, lista de empaque, documento de transporte (BL, AWB o carta de porte según la modalidad), ficha técnica, identificación del importador, comprobante de pago, y DUA y declaración de valor.
  - Certificado de origen solo con TLC, póliza de seguro solo si va asegurada, y permisos solo si el producto los requiere.
  - Indica quién aporta cada documento (tú, tu proveedor o LANDEX) según el Incoterm.
  - El cliente marca "Ya lo tengo"; en modo agencia hay estados: recibido, revisado u observado. El PDF usa la misma lista.
  - La carga de archivos llega al conectar Supabase.
- **Base de datos** (`supabase/schema.sql`), lista para Supabase:
  - Tablas de perfiles con rol (cliente, agente, operador), cotizaciones con consecutivo `LDX-AAAA-0001`, tarifas y documentos, más un bucket privado para los archivos.
  - La seguridad la aplica la base de datos: cada cliente ve solo lo suyo, nadie se sube de rol, solo la agencia emite formales y revisa documentos, solo el operador maneja tarifas, y una formal se anula si cambian los datos.
  - Probada en un PostgreSQL local que simula Supabase (`supabase/pruebas/`).
- Guía de configuración en `SUPABASE.md`.

# Fase 3: ecosistema logístico (2026-11-24)

Respaldo previo: etiqueta `respaldo-v4` y rama `respaldo-v4`. **Sin cambios en fórmulas, tarifas de referencia, aranceles ni impuestos.** Las tarifas de proveedores entran al motor como ajustes, un mecanismo que ya existía. Hay 39 pruebas y todas pasan. La guía de uso está en `TARIFAS.md`.

- **Tarifas de proveedores** (pestaña *Tarifas*, solo en modo agencia). Se registran por proveedor y categoría: forwarder, naviera, aerolínea, consolidador, transporte internacional y nacional, almacén fiscal, agencia, aseguradora, descarga y montacargas. Cada tarifa lleva ruta, modalidades, zona, cargos por concepto (por contenedor, m³, kg, monto fijo, % del valor o incluido, con mínimo), tránsito, vigencia, servicios incluidos y excluidos, condiciones y fuente.
  - Filtros de vigencia (vigentes, vencen en 7 días o menos, vencidas) y botón *Renovar*.
  - Exportación e importación de `tarifas.json`. El archivo publicado en `public/tarifas.json` lo ven los clientes.
- **Ofertas de proveedores** en el resultado: comparación por tramo (internacional, aduana, nacional) con el costo de la oferta, el total en bodega si se aplica, el tránsito y la vigencia. LANDEX recomienda la de menor costo total. Al aplicarla, sus cargos reemplazan los montos de referencia y se recalculan si cambia la carga.
  - Una tarifa **nunca cobra** conceptos que no aplican al embarque ni los que el Incoterm deja a cargo del proveedor de la mercancía.
  - Los ajustes manuales del desglose siguen mandando sobre la tarifa.
- **Cotización formal**, separada de la estimada. Solo se puede emitir si:
  - el cliente está identificado,
  - las clasificaciones están validadas por el agente,
  - no hay pendientes,
  - ningún costo es referencial,
  - no hay tarifas de ejemplo,
  - las tarifas están vigentes.

  Vence a los 15 días o cuando vence la primera tarifa aplicada. Cualquier cambio posterior la devuelve a estimada (huella de datos). El PDF muestra "Cotización formal", los proveedores y tarifas aplicados, los costos extraordinarios no garantizados y las condiciones formales. *Mis cotizaciones* marca las formales.
- **Modo agencia** (`#agencia`): muestra el panel del operador. La casilla "validada por el agente" del editor de productos pasó a este modo, para que el cliente no pueda validar su propia clasificación. **No es un control de seguridad**; los usuarios y permisos llegan con la Fase 4.
- `public/tarifas.json` trae 4 tarifas **de ejemplo** para probar la pantalla. Solo se ven en modo agencia y no permiten emitir una formal.

# Fase 2: experiencia del cliente (2026-11-24)

Respaldo previo: etiqueta `respaldo-v3` y rama `respaldo-v3`. **Sin cambios en fórmulas, tarifas, aranceles ni impuestos.** La clave de guardado local se mantiene. Hay 30 pruebas y todas pasan.

- **Dos modos de cotizar.** "Mi primera importación" es un asistente de 6 pasos: producto, proveedor, qué incluye el precio, tamaño de la carga, entrega y prioridad. "Tengo experiencia importando" es el formulario detallado. Los dos comparten los datos, así que se puede cambiar de modo sin perder nada. El modo inicial depende de la experiencia indicada en el perfil.
  - "No sé" en el precio calcula todo desde la fábrica (EXW) y agrega el pendiente "Confirmar con el proveedor qué incluye su precio".
  - Los tamaños aproximados de carga (cajas, tarimas, contenedor) quedan como **dato por confirmar** en los pendientes.
  - "No sé cuál es" en la partida deja los impuestos pendientes. Nunca se muestran como cero.
  - La recomendación de modalidad (menor costo o mayor rapidez) sale de la comparación de modalidades que ya existía.
- **Mi perfil**: datos del cliente, entrega, capacidad de descarga y un presupuesto opcional. El perfil rellena la solicitud de cotización y el montacargas. El presupuesto solo se compara con el desembolso estimado.
- **Mis cotizaciones**: se guardan con consecutivo `LDX-AAAA-0001`, una vigencia de 15 días y su estado. Se pueden abrir, duplicar y eliminar. Por ahora se guardan en este navegador; el respaldo en el servidor llega con la Fase 4.
- **Cotización en PDF** con marca LANDEX. Incluye número, fechas, cliente, proveedor, embarque, totales, productos, desglose por etapa, servicios incluidos y excluidos según el estado de cada concepto, pendientes, documentos requeridos, línea de tiempo y condiciones.
- **Comparar partidas** en Clasificación (hasta 3), con capítulo, partida y DAI de referencia.
- **Móvil**: barra fija con el total y un acceso al resumen.
- Corrección: si los impuestos están pendientes, los totales y el PDF dicen "Pendiente" en lugar de USD 0,00.

# Rebranding a LANDEX (2026-11-24)

Respaldo previo: rama `respaldo-v2`. **Sin cambios en fórmulas, tarifas, aranceles, impuestos ni identificadores internos** (la clave de guardado local se mantiene para no perder cotizaciones guardadas). Las 29 pruebas del motor siguen pasando.

- Nueva identidad: logotipo LANDEX (claro, oscuro, con descriptor), ícono compacto, favicon, íconos de app e imagen para redes (`public/brand/`).
- Paleta y tipografía LANDEX en toda la interfaz: botones, tarjetas, tablas, gráficos y navegación.
- Encabezado con logotipo y descriptor, presentación "Importa con inteligencia." sobre el cotizador, y firma "A Ramos & Co. Company" en el pie.
- Título del navegador, descripción, Open Graph, `manifest.webmanifest` e ícono para pantalla de inicio en móviles.
- Cotizaciones impresas o guardadas en PDF con encabezado LANDEX; solicitudes de cotización firmadas como LANDEX.
- Nuevo en el embarque: **datos del proveedor** (empresa, dirección, contacto, teléfono y email), que se guardan y viajan en la solicitud. No intervienen en el cálculo.
- Guía del dominio `landex.co.cr` en `DOMINIO.md`. No se agregó archivo CNAME: va cuando el dominio esté comprado.
- "Iniciar sesión" no se agregó todavía: sin cuentas reales del lado del servidor sería un botón falso. Llega con la Fase 4.

# Cambios – Fase 1: motor de Landed Cost multiproducto

Fecha: 2026-11-24 · Respaldo de la versión anterior: rama `respaldo-v1` (GitHub) y etiqueta `respaldo-v1` (local).

## Limitaciones de la versión anterior

- Un solo producto y una sola partida por embarque, con una partida seleccionada por defecto.
- Solo 4 Incoterms; aplicaba el TLC automáticamente con solo marcar "tengo certificado".
- Sin etapas de descarga ni devolución de contenedor; sin cubicaje ni validación de capacidad.
- Los costos desconocidos se trataban como cero.

## Qué se implementó

**Motor (`src/lib/landed.ts`)**, centralizado y probado:
- 7 etapas: bodega del proveedor, logística en origen, transporte internacional, logística en destino, nacionalización, transporte nacional, descarga y cierre (incluye montacargas y devolución del contenedor vacío).
- Cada concepto tiene estado: incluido en el precio, no aplica, estimado, confirmado, pendiente de cotizar o incluido en otro servicio. **Un pendiente nunca suma cero**: queda fuera del total, se lista y la cotización se marca "incompleta".
- Incoterms 2020 completos (EXW, FCA, FAS, FOB, CFR, CIF, CPT, CIP, DAP, DPU, DDP), con explicación sencilla y punto de transferencia del riesgo. Lo que paga el proveedor queda "incluido" y no se duplica. Valida que FAS/FOB/CFR/CIF solo se usen en marítimo.
- Multiproducto: impuestos por producto (DAI, Selectivo, Ley 6946, IVA y otros) sobre su propio valor aduanero.
- Valor aduanero = mercancía + gastos hasta el puerto de importación (etapas 1 a 3), sea que los pague el proveedor o el cliente.
- Distribución de costos compartidos por valor, peso, volumen, unidades o asignación directa, configurable por concepto. Cálculo en centavos con resto mayor: **la suma de los SKU es exactamente el total**.
- Cubicaje: 20', 40', 40' High Cube y tráiler; valida volumen con factor de estiba, carga útil, medidas de bultos contra puerta y largo del equipo, bultos no apilables y cantidad de contenedores. Aéreo con peso volumétrico y aviso de carguero.
- Comparación automática de modalidades (LCL, FCL 20/40/40HC, aéreo, terrestre) en costo y tiempo; no recomienda las incompatibles.
- Tasas faltantes quedan **pendientes de validación**. La preferencia por TLC solo se aplica si la clasificación está validada por el agente; si no, se muestra como ahorro potencial.
- Resultado: total, desembolso, IVA recuperable, costo neto sin IVA, Landed Cost total y unitario por SKU, rango referencial, supuestos, pendientes y línea de tiempo con actividades en paralelo.

**Interfaz**
- Lista de productos con agregar, editar, duplicar y eliminar; carga masiva por CSV (plantilla descargable; el Excel la abre).
- Sin partida por defecto; buscador del arancel completo dentro del producto.
- Desglose por etapa desplegable: cambiar estado, monto confirmado y criterio de reparto por concepto.
- Tabla de Landed Cost por SKU y exportación a CSV/Excel.
- Guardado automático de la cotización en el navegador.
- Escenario de prueba NOVA HOME CR cargable con un clic.

**Pruebas** (`npm test`, 29 en total): NOVA HOME (EXW Ningbo, 40', descarga y devolución), multiproducto de 5 SKU, reparto exacto, asignación directa, FOB, CIF sin duplicar, DDP, Incoterm incompatible, LCL, aéreo, terrestre desde Centroamérica, bultos que no caben, contenedores necesarios, tasas pendientes y TLC sin validar.

## Pendiente y dependencias

- **Tarifas reales**: todas las tarifas son referenciales (`src/data/logistica.ts` y `src/data/config.ts`). Sin tarifas de proveedores no hay cotización formal.
- **Tasas de Costa Rica**: el DAI viene del Arancel Centroamericano (referencia regional). Faltan Selectivo, tasas nacionales y TLC desde TICA.
- **Fase 2**: modo guiado "Mi primera importación", perfil del cliente, PDF con identidad de Ramos & Co.
- **Fase 3**: tarifas por proveedor, comparación de ofertas, cotización formal con vigencia.
- **Fase 4**: base de datos (Supabase), administración protegida con autenticación del lado del servidor, historial. Una contraseña en el navegador no es seguridad válida, por eso el panel administrativo queda para esta fase.
- La marca "validada por el agente" hoy la puede activar cualquiera en su navegador; en la Fase 4 quedará restringida al agente.
