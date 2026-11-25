/** Extraction conservadora de campos explícitamente rotulados en texto.
 * Nunca infiere moneda, unidades, país ni clasificación arancelaria.
 */
export type Campo = 'proveedor'|'incoterm'|'pais'|'nombre'|'sku'|'cantidad'|'precio'|'peso'|'volumen'
export type Sugerencias = Partial<Record<Campo,string>>
const etiquetas: Record<Campo,RegExp> = {
 proveedor:/^(?:supplier|seller|proveedor|exporter|exportador)\s*[:：]\s*(.+)$/i,
 incoterm:/^(?:incoterm(?:s)?|delivery terms|trade terms)\s*[:：]\s*([A-Z]{3})(?:\s|$)/i,
 pais:/^(?:country of manufacture|pa[ií]s de fabricaci[oó]n)\s*[:：]\s*([A-Z]{2})\s*$/i,
 nombre:/^(?:product(?: name)?|producto|item description|descripci[oó]n del producto)\s*[:：]\s*(.+)$/i,
 sku:/^(?:sku|item code|c[oó]digo de producto)\s*[:：]\s*(.+)$/i,
 cantidad:/^(?:qty|quantity|cantidad)\s*[:：]\s*(\d+(?:\.\d+)?)\s*(?:pcs|units|unidades|uds)?\s*$/i,
 precio:/^(?:unit price(?:\s*\(USD\))?|precio unitario(?:\s*\(USD\))?)\s*[:：]\s*(?:USD\s*)?(\d+(?:\.\d{1,4})?)\s*(?:USD)?\s*$/i,
 peso:/^(?:total gross weight|peso bruto total)\s*[:：]\s*(\d+(?:\.\d+)?)\s*kg\s*$/i,
 volumen:/^(?:total volume|volumen total)\s*[:：]\s*(\d+(?:\.\d+)?)\s*(?:cbm|m3|m³)\s*$/i,
}
export function extraerCampos(texto:string):Sugerencias {
 const encontrados: Record<string,Set<string>>={}
 for(const linea of texto.slice(0,200000).split(/\r?\n/)){
  for(const [k,pat] of Object.entries(etiquetas)){
   const m=linea.trim().match(pat)
   if(!m)continue
   if(k==='precio'&&!/\bUSD\b/i.test(linea))continue
   const v=m[1].trim()
   if(!v)continue
   if(!encontrados[k])encontrados[k]=new Set()
   encontrados[k].add(v)
  }
 }
 const salida:Sugerencias={}
 for(const [k,v] of Object.entries(encontrados))if(v.size===1)salida[k as Campo]=[...v][0]
 return salida
}
