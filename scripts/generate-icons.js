// Génère les icônes PWA (public/icon-*.png) à partir de public/logo-feuille.svg :
// fond teal foncé, feuille centrée, ombre portée, coins arrondis (sauf variantes "maskable").
// Rastérisation via sharp/librsvg (rendu vectoriel net à chaque résolution cible,
// contrairement à canvas qui redimensionnait un bitmap basse résolution -> flou/pixelisé).
import sharp from 'sharp'
import { readFileSync, writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import path from 'path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PUBLIC_DIR = path.resolve(__dirname, '../public')
const SVG_PATH = path.join(PUBLIC_DIR, 'logo-feuille.svg')

const BACKGROUND_COLOR = { r: 0x0f, g: 0x3d, b: 0x4f, alpha: 1 }
const LOGO_RATIO = 0.65 // La feuille occupe ~65% de la surface de l'icône
const SHADOW_OPACITY = 0.4

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

function getSvgNaturalSize() {
  const svg = readFileSync(SVG_PATH, 'utf8')
  const match = svg.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/)
  return match ? parseFloat(match[1]) : 212.6
}

// Rastérise le SVG directement à logoSize px : la densité (DPI) est calculée pour
// que librsvg produise le rendu vectoriel exact à cette résolution, sans upscale flou.
async function rasterizeLogo(logoSize, naturalSize) {
  const density = Math.round(72 * (logoSize / naturalSize))
  return sharp(SVG_PATH, { density })
    .resize(logoSize, logoSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer()
}

// Silhouette noire semi-transparente du logo, placée dans un calque transparent à la
// taille finale de l'icône puis floutée : le flou dissipe ainsi ses bords dans la marge
// de l'icône au lieu d'être coupé net au bord d'un calque plus petit (artefact visible).
async function buildShadowLayer(logoBuffer, logoSize, iconSize, logoX, shadowTop, blurSigma) {
  const alpha = await sharp(logoBuffer)
    .ensureAlpha()
    .extractChannel(3)
    .linear(SHADOW_OPACITY, 0)
    .raw()
    .toBuffer()

  const blackRgb = await sharp({
    create: { width: logoSize, height: logoSize, channels: 3, background: { r: 0, g: 0, b: 0 } },
  })
    .raw()
    .toBuffer()

  const shadowShape = await sharp(blackRgb, { raw: { width: logoSize, height: logoSize, channels: 3 } })
    .joinChannel(alpha, { raw: { width: logoSize, height: logoSize, channels: 1 } })
    .png()
    .toBuffer()

  return sharp({
    create: { width: iconSize, height: iconSize, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite([{ input: shadowShape, left: logoX, top: shadowTop }])
    .blur(blurSigma)
    .png()
    .toBuffer()
}

function roundedRectMask(size, radius) {
  return Buffer.from(
    `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="0" width="${size}" height="${size}" rx="${radius}" ry="${radius}" fill="#fff"/>
    </svg>`
  )
}

async function generateIcon({ name, size, maskable }, naturalSize) {
  const logoSize = Math.round(size * LOGO_RATIO)
  const logoX = Math.round((size - logoSize) / 2)
  const logoY = Math.round((size - logoSize) / 2)
  const shadowBlur = Math.max(1, size * 0.08)
  const shadowOffsetY = Math.round(size * 0.04)

  const logoBuffer = await rasterizeLogo(logoSize, naturalSize)
  const shadowLayer = await buildShadowLayer(logoBuffer, logoSize, size, logoX, logoY + shadowOffsetY, shadowBlur)

  let icon = sharp({
    create: { width: size, height: size, channels: 4, background: BACKGROUND_COLOR },
  }).composite([
    { input: shadowLayer, left: 0, top: 0 },
    { input: logoBuffer, left: logoX, top: logoY },
  ])

  let buffer = await icon.png().toBuffer()

  if (!maskable) {
    const mask = roundedRectMask(size, size * 0.2)
    buffer = await sharp(buffer)
      .composite([{ input: mask, blend: 'dest-in' }])
      .png()
      .toBuffer()
  }

  writeFileSync(path.join(PUBLIC_DIR, name), buffer)
  console.log(`✓ ${name} (${size}x${size}${maskable ? ', maskable' : ''})`)
}

async function main() {
  const naturalSize = getSvgNaturalSize()
  for (const icon of ICONS) {
    await generateIcon(icon, naturalSize)
  }
  console.log(`\n${ICONS.length} icônes générées dans public/.`)
}

main().catch(err => {
  console.error('Erreur génération icônes:', err)
  process.exit(1)
})
