# Fase 4 · Configurar Supabase (gratis)

## 1. Crear el proyecto
1. En **supabase.com**, entra con el correo de LANDEX y pulsa *New project*.
2. Nombre `landex`, región **East US (North Virginia)** y una contraseña de base de datos fuerte. **Guárdala tú.**
3. Espera a que termine de crearse (unos 2 minutos).

## 2. Crear las tablas y la seguridad
1. *SQL Editor → New query*.
2. Pega el contenido completo de `supabase/schema.sql` y pulsa **Run**. Debe terminar con *Success*.
   Se puede volver a ejecutar sin perder datos.

Se crean:

| Tabla | Para qué sirve |
|---|---|
| `perfiles` | Datos del cliente y su **rol**: cliente, agente u operador |
| `cotizaciones` | Cada cotización con su número `LDX-AAAA-0001`, sus datos, estado y emisión formal |
| `tarifas` | Tarifas de proveedores. Los clientes solo ven las publicadas, vigentes y reales |
| `documentos` | Expediente de cada importación: factura, BL, lista de empaque… |
| Bucket `documentos` | Archivos **privados**, de hasta 10 MB (PDF, imágenes, Excel, Word) |

## 3. Inicio de sesión
*Authentication → URL Configuration*:
- **Site URL:** `https://alglezramos.github.io/importa-facil/`
- **Redirect URLs:** agrega la misma dirección y, cuando tengas el dominio, `https://landex.co.cr/**`.

El acceso es con **enlace mágico por correo**: el usuario escribe su correo y recibe un enlace para entrar. No hay
contraseñas que administrar. El plan gratuito envía pocos correos por hora; para producción conviene configurar un
servicio de correo (por ejemplo, Resend, que también tiene plan gratuito).

## 4. Darte el rol de operador
1. Entra a LANDEX con tu correo, una vez que la página esté conectada.
2. En el *SQL Editor* ejecuta (con tu correo):
   ```sql
   update public.perfiles set rol = 'operador' where email = 'tu-correo@...';
   ```
3. Cuando tu tía entre por primera vez:
   ```sql
   update public.perfiles set rol = 'agente' where email = 'correo-de-ella@...';
   ```

## 5. Pasarme los datos de conexión
En *Project Settings → API* copia:
- **Project URL**
- La clave **anon / public**

Esos dos datos son públicos por diseño: van dentro de la página, y la seguridad la ponen las reglas de la base de
datos. **Nunca compartas la clave `service_role` ni la contraseña de la base de datos.**

## Qué protege la base de datos

| Acción | Cliente | Agente | Operador |
|---|---|---|---|
| Ver y editar sus propias cotizaciones | ✓ | ✓ (todas) | ✓ (todas) |
| Ver cotizaciones de otros clientes | ✗ | ✓ | ✓ |
| Emitir una cotización formal | ✗ | ✓ | ✓ |
| Aceptar una formal vigente propia | ✓ | ✓ | ✓ |
| Subir documentos a sus cotizaciones | ✓ | ✓ | ✓ |
| Marcar documentos como revisados u observados | ✗ | ✓ | ✓ |
| Crear y publicar tarifas | ✗ | ✗ | ✓ |
| Cambiar roles | ✗ | ✗ | ✓ |

Si el cliente modifica los datos de una cotización formal, la emisión se anula automáticamente. Estas reglas se
probaron en una base de datos local que simula Supabase (ver `supabase/pruebas/`).

## Límites del plan gratuito
500 MB de base de datos, 1 GB de archivos y 50.000 usuarios activos al mes. Los proyectos sin actividad durante
7 días se pausan, y se reactivan desde el panel. Antes de recibir clientes reales conviene evaluar el plan Pro
(USD 25/mes), que no se pausa e incluye respaldos diarios.
