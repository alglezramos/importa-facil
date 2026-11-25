# Cómo cargar tarifas reales y emitir cotizaciones formales

## 1. Activar el modo agencia
Abre `https://alglezramos.github.io/importa-facil/#agencia`. Aparece una banda amarilla, la pestaña **Tarifas** y el
**Panel de la agencia** en el cotizador. Para volver a la vista del cliente, pulsa *Salir* o abre la dirección con `#cliente`.

> El modo agencia **no es un acceso protegido**: solo oculta herramientas. Cualquiera que conozca el enlace puede
> activarlo. Los usuarios y permisos reales llegan con la Fase 4.

## 2. Registrar una tarifa
Pestaña **Tarifas → Registrar tarifa**. Por cada oferta que recibas:
- Proveedor, categoría y **fuente** (número de cotización del proveedor, correo y fecha).
- Ruta: origen, modalidades y zona de entrega en Costa Rica.
- **Vigencia** (desde y hasta) y días de tránsito.
- **Cargos**: un renglón por concepto (flete, THC, recargos, transporte nacional, etc.), con su forma de cobro
  (por contenedor, por m³, por kg, monto fijo, % del valor o "incluido") y un mínimo si aplica.
- Servicios incluidos y excluidos, y condiciones (días libres, sujeto a espacio, etc.).

Registra **el precio que le cobrarás al cliente**, no tu costo.

## 3. Publicarla para los clientes
Las tarifas registradas quedan solo en tu navegador. Para publicarlas:
1. Pulsa **Descargar tarifas.json**.
2. En GitHub, entra a la carpeta `public` y sube el archivo (Add file → Upload files), reemplazando el anterior.
3. En unos 2 minutos el sitio se actualiza.

**`public/tarifas.json` es público**: cualquier persona puede leerlo. No pongas ahí costos internos ni márgenes.
Las tarifas con `"ejemplo": true` son de prueba: solo se ven en modo agencia y nunca permiten una cotización formal.

## 4. Emitir una cotización formal
En el cotizador (modo agencia):
1. **Aplica** las ofertas en "Ofertas de proveedores". LANDEX recomienda la de menor costo total en bodega.
2. Confirma en el desglose los conceptos que ninguna tarifa cubre (por ejemplo, tus honorarios): estado *Confirmado* y monto.
3. En el editor de cada producto, confirma en TICA las tasas (DAI, Selectivo, IVA). Luego, en el Panel de la agencia,
   escribe el nombre del agente y pulsa **Marcar como validadas**.
4. El cliente debe tener nombre, identificación y un contacto en **Mi perfil**.
5. Cuando todos los requisitos están en verde, pulsa **Emitir cotización formal**.

La formal vence a los 15 días o cuando vence la primera tarifa aplicada, lo que ocurra primero. **Si cambias cualquier
dato después de emitirla, vuelve a ser estimada** y hay que emitirla de nuevo.
