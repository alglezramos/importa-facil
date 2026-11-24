export const usd = (n: number) =>
  n.toLocaleString('es-CR', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 })

export const crc = (n: number) =>
  '₡' + Math.round(n).toLocaleString('es-CR')

export const pct = (n: number) => `${(n * 100).toLocaleString('es-CR', { maximumFractionDigits: 1 })}%`
