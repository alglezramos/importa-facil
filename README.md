# Importa Fácil – Cotizador de importaciones para pymes

Plataforma web de la agencia de aduanas para que una pyme cotice **el costo total de su importación puesto en su bodega**, desde la compra al proveedor (por ejemplo, en Alibaba) hasta la descarga.

> **Versión MVP.** Las tasas arancelarias, tarifas de flete y gastos locales son **de ejemplo**. Antes de usarla con clientes, el agente aduanero debe cargar datos reales (ver "Configuración").

> Detalle de la Fase 1 (motor de Landed Cost multiproducto) en [CAMBIOS.md](CAMBIOS.md).

## Qué hace

| Módulo | Qué resuelve |
| --- | --- |
| Cotizar importación | Varios productos por embarque, Incoterms 2020, 7 etapas logísticas, cubicaje, comparación de modalidades → costo total puesto y descargado, Landed Cost por SKU, pendientes y línea de tiempo |
| Clasificación e impuestos | Buscador de partidas con DAI, DAI preferencial por TLC, Selectivo de Consumo, IVA y permisos |
| Cómo funciona | Guía paso a paso de Alibaba a la bodega |
| Solicitud formal | Envía el resumen de la cotización por WhatsApp o correo a la agencia; también se puede imprimir o guardar como PDF |

## Lógica de cálculo (Costa Rica)

1. **Valor aduanero (CIF)** = mercadería (+ costos de origen si es EXW) + flete internacional + seguro.
   - CFR: el flete ya va en el precio. CIF: flete y seguro incluidos.
2. **DAI** = CIF × tasa DAI (tasa preferencial si hay certificado de origen y TLC).
3. **Selectivo de Consumo** = (CIF + DAI) × tasa SC.
4. **Ley 6946** = CIF × 1% (exento para origen centroamericano).
5. **IVA** = (CIF + DAI + SC + Ley 6946) × 13%. Se muestra también el costo sin IVA, porque es crédito fiscal para empresas inscritas.
6. **Costos en Costa Rica**: gastos en destino, honorarios de la agencia, coordinación logística y transporte a la bodega.

Flete: LCL por W/M (el mayor entre m³ y toneladas, mínimo 1); aéreo por kg cobrable (peso real vs. volumétrico a 167 kg/m³); FCL por contenedor.

Toda la lógica está en `src/lib/landed.ts` y tiene pruebas en `src/lib/landed.test.ts`.

## Configuración (lo que debe editar la agencia)

| Archivo | Qué contiene |
| --- | --- |
| `src/data/logistica.ts` | Costos de referencia por etapa, medidas y carga útil de contenedores, días por etapa |
| `src/data/config.ts` | Nombre de la agencia, WhatsApp, correo, tarifas de flete por origen, gastos en destino, transporte local, honorarios, seguro, días de tránsito y tipo de cambio |
| `src/data/arancel.ts` | Partidas arancelarias, tasas y permisos. Cambia `verificado: true` cuando el agente confirme cada partida |

## Cómo correrlo

Requisito: Node.js 20 o superior.

```bash
npm install
npm run dev      # abre http://localhost:5173
npm test         # pruebas del motor de cálculo
npm run build    # genera /dist para publicar
```

## Subirlo a GitHub

```bash
# 1. Crea un repositorio vacío en github.com (sin README)
git remote add origin https://github.com/TU-USUARIO/importa-facil.git
git branch -M main
git push -u origin main
```

## Publicarlo

La carpeta `dist/` es un sitio estático: se puede publicar en Netlify (arrastrar `dist`), Vercel o GitHub Pages.

## Próximos pasos sugeridos

- Cargar el arancel real y las tarifas de los forwarders aliados.
- Guardar cotizaciones y clientes (backend con Supabase o similar).
- Portal del cliente con carga de documentos y estados del embarque.
- Conexión con ATENA cuando Hacienda publique sus mecanismos de integración.
