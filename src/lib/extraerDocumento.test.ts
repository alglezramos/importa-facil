import { describe, expect, it } from 'vitest'
import { extraerCampos } from './extraerDocumento'

describe('extracción documental', () => {
 it('detecta campos rotulados en inglés', () => {
  expect(extraerCampos('Supplier: ACME\nIncoterm: FOB Shanghai\nSKU: ABC-01\nQuantity: 20 pcs\nUnit price (USD): 10.25\nTotal gross weight: 30 kg\nTotal volume: 0.4 cbm')).toEqual({proveedor:'ACME',incoterm:'FOB',sku:'ABC-01',cantidad:'20',precio:'10.25',peso:'30',volumen:'0.4'})
 })
 it('no supone moneda', () => {
  expect(extraerCampos('Unit price: 10\nUnit price: EUR 20')).toEqual({})
 })
 it('omite campos contradictorios', () => {
  expect(extraerCampos('SKU: A\nSKU: B\nQuantity: 20\nQuantity: 30')).toEqual({})
 })
 it('no supone unidades de peso o volumen', () => {
  expect(extraerCampos('Total gross weight: 20 lb\nTotal volume: 30')).toEqual({})
 })
 it('detecta campos en español', () => {
  expect(extraerCampos('Proveedor: ACME\nPaís de fabricación: CN\nProducto: Mesa\nCantidad: 10\nPrecio unitario: USD 20\nPeso bruto total: 50 kg\nVolumen total: 1 m³')).toEqual({proveedor:'ACME',pais:'CN',nombre:'Mesa',cantidad:'10',precio:'20',peso:'50',volumen:'1'})
 })
})
