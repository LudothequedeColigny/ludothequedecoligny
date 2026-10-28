// Effet mosaïque : moyenne les couleurs par bloc. 15 px pour une photo de
// 1 200 px de large ; le bloc grandit avec la photo, pour que le floutage
// reste aussi fort quelle que soit sa définition.
export const BLUR_BLOCK_SIZE = 15
export const blocDeFloutage = largeurPhoto => Math.max(BLUR_BLOCK_SIZE, Math.round(BLUR_BLOCK_SIZE * largeurPhoto / 1200))
export function pixelateRegion(ctx, x, y, w, h, bloc = BLUR_BLOCK_SIZE) {
  for (let by = y; by < y + h; by += bloc) {
    for (let bx = x; bx < x + w; bx += bloc) {
      const bw = Math.min(bloc, x + w - bx)
      const bh = Math.min(bloc, y + h - by)
      if (bw <= 0 || bh <= 0) continue
      const block = ctx.getImageData(bx, by, bw, bh)
      let r = 0, g = 0, b = 0, a = 0
      const n = block.data.length / 4
      for (let i = 0; i < block.data.length; i += 4) {
        r += block.data[i]; g += block.data[i + 1]; b += block.data[i + 2]; a += block.data[i + 3]
      }
      r = Math.round(r / n); g = Math.round(g / n); b = Math.round(b / n); a = Math.round(a / n)
      ctx.fillStyle = `rgba(${r},${g},${b},${a / 255})`
      ctx.fillRect(bx, by, bw, bh)
    }
  }
}

// Côté le plus long d'une photo chargée dans un éditeur de floutage (px)
export const COTE_MAX_PHOTO = 2400
