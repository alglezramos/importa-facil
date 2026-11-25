# Conectar el dominio landex.co.cr

Hoy la plataforma vive en https://alglezramos.github.io/importa-facil/ y **sigue funcionando así** hasta que el dominio esté comprado y configurado. No hay que tocar nada del código: la app usa rutas relativas, así que funciona igual en la URL actual y en el dominio propio.

## 1. Comprar el dominio
Los dominios `.co.cr` se registran en NIC Costa Rica (nic.cr). Verifica que `landex.co.cr` esté disponible antes de comprarlo.

## 2. Configurar el DNS (en el panel de NIC o del proveedor DNS)

| Tipo | Nombre | Valor |
| --- | --- | --- |
| A | @ | 185.199.108.153 |
| A | @ | 185.199.109.153 |
| A | @ | 185.199.110.153 |
| A | @ | 185.199.111.153 |
| CNAME | www | alglezramos.github.io |

## 3. Activar el dominio en GitHub
1. Repositorio → **Settings → Pages → Custom domain**: escribe `landex.co.cr` y guarda.
2. Espera a que GitHub valide el DNS (minutos a horas).
3. Marca **Enforce HTTPS** cuando aparezca disponible.

La publicación usa GitHub Actions, por lo que **no hace falta un archivo CNAME** en el repositorio. Con el dominio activo, la URL antigua de github.io redirige sola al dominio nuevo.

## 4. Después de activarlo
En `index.html`, cambia `og:url` y `og:image` a `https://landex.co.cr/` y `https://landex.co.cr/brand/og-image.png`.
