/**
 * Codes-barres EAN-13 des boîtes (code du commerce, le même que lit le scanner
 * de l'écran Prêts). Testé par `npm test`.
 */

const L = ['0001101', '0011001', '0010011', '0111101', '0100011', '0110001', '0101111', '0111011', '0110111', '0001011']
const G = ['0100111', '0110011', '0011011', '0100001', '0011101', '0111001', '0000101', '0010001', '0001001', '0010111']
const R = ['1110010', '1100110', '1101100', '1000010', '1011100', '1001110', '1010000', '1000100', '1001000', '1110100']
// Parité des 6 premiers chiffres selon le chiffre de tête
const PARITE = ['LLLLLL', 'LLGLGG', 'LLGGLG', 'LLGGGL', 'LGLLGG', 'LGGLLG', 'LGGGLL', 'LGLGLG', 'LGLGGL', 'LGGLGL']

const cleValide = code => {
  const d = code.split('').map(Number)
  const somme = d.slice(0, 12).reduce((s, c, i) => s + c * (i % 2 ? 3 : 1), 0)
  return (10 - (somme % 10)) % 10 === d[12]
}

/** Code saisi → 13 chiffres valides (UPC-A complété d'un 0), sinon null. */
export function codeEan13(brut) {
  let code = String(brut ?? '').replace(/\D/g, '')
  if (code.length === 12) code = '0' + code
  return code.length === 13 && cleValide(code) ? code : null
}

/** Les 95 modules (1 = barre noire) d'un code de 13 chiffres valide. */
export function motifEan13(code) {
  const d = code.split('').map(Number)
  let s = '101'
  for (let i = 1; i <= 6; i++) s += (PARITE[d[0]][i - 1] === 'L' ? L : G)[d[i]]
  s += '01010'
  for (let i = 7; i <= 12; i++) s += R[d[i]]
  return s + '101'
}
