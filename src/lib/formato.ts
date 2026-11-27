import { formatoRegional } from './idioma'
export const usd = (n: number) =>
  n.toLocaleString(formatoRegional(), { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 })

export const crc = (n: number) =>
  '₡' + Math.round(n).toLocaleString(formatoRegional())

export const pct = (n: number) => `${(n * 100).toLocaleString(formatoRegional(), { maximumFractionDigits: 1 })}%`
