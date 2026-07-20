// Génère les icônes PWA (public/icon-*.png) à partir de public/logo-feuille.svg :
// fond teal foncé, feuille centrée, ombre portée, coins arrondis (sauf variantes "maskable").
import { createCanvas, loadImage } from 'canvas'
import { readFileSync, writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import path from 'path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PUBLIC_DIR = path.resolve(__dirname, '../public')
const SVG_PATH = path.join(PUBLIC_DIR, 'logo-feuille.svg')

const BACKGROUND_COLOR = '#0f3d4f'
const LOGO_RATIO = 0.65 // La feuille occupe ~65% de la surface de l'icône

const ICONS = [
  { name: 'icon-72.png', size: 72, maskable: false },
  { name: 'icon-96.png', size: 96, maskable: false },
  { name: 'icon-128.png', size: 128, maskable: false },
  { name: 'icon-144.png', size: 144, maskable: false },
  { name: 'icon-152.png', size: 152, maskable: false },
  { name: 'icon-192.png', size: 192, maskable: false },
  { name: 'icon-384.png', size: 384, maskable: false },
  { name: 'icon-512.png', size: 512, maskable: false },
  { name: 'icon-maskable-192.png', size: 192, maskable: true },
  { name: 'icon-maskable-512.png', size: 512, maskable: true },
]

function loadLogoSvg() {
  let svg = readFileSync(SVG_PATH, 'utf8')
  const rootTagStart = svg.indexOf('<svg')
  const rootTagEnd = svg.indexOf('>', rootTagStart)
  const rootTag = svg.slice(rootTagStart, rootTagEnd)
  const viewBoxMatch = rootTag.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/)
  if (!/\swidth=/.test(rootTag) && viewBoxMatch) {
    const [, w, h] = viewBoxMatch
    svg = svg.replace('<svg ', `<svg width="${w}" height="${h}" `)
  }
  return loadImage(Buffer.from(svg))
}

function drawRoundedRectPath(ctx, x, y, width, height, radius) {
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.arcTo(x + width, y, x + width, y + height, radius)
  ctx.arcTo(x + width, y + height, x, y + height, radius)
  ctx.arcTo(x, y + height, x, y, radius)
  ctx.arcTo(x, y, x + width, y, radius)
  ctx.closePath()
}

async function generateIcon(logo, { name, size, maskable }) {
  const canvas = createCanvas(size, size)
  const ctx = canvas.getContext('2d')

  // Masque de coins arrondis pour les icônes "classiques" (pas les maskable, fond plein requis)
  if (!maskable) {
    drawRoundedRectPath(ctx, 0, 0, size, size, size * 0.2)
    ctx.clip()
  }

  ctx.fillStyle = BACKGROUND_COLOR
  ctx.fillRect(0, 0, size, size)

  const logoSize = size * LOGO_RATIO
  const logoX = (size - logoSize) / 2
  const logoY = (size - logoSize) / 2

  ctx.save()
  ctx.shadowColor = 'rgba(0,0,0,0.4)'
  ctx.shadowBlur = size * 0.08
  ctx.shadowOffsetY = size * 0.04
  ctx.drawImage(logo, logoX, logoY, logoSize, logoSize)
  ctx.restore()

  const outPath = path.join(PUBLIC_DIR, name)
  writeFileSync(outPath, canvas.toBuffer('image/png'))
  console.log(`✓ ${name} (${size}x${size}${maskable ? ', maskable' : ''})`)
}

async function main() {
  const logo = await loadLogoSvg()
  for (const icon of ICONS) {
    await generateIcon(logo, icon)
  }
  console.log(`\n${ICONS.length} icônes générées dans public/.`)
}

main().catch(err => {
  console.error('Erreur génération icônes:', err)
  process.exit(1)
})
