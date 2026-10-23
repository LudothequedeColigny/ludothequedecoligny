import { supabase } from './supabaseClient'

/**
 * Publication sur Facebook et Instagram, commune à l'écran Communication :
 * affiches, bilans d'événements, posts libres et annonces de nouveaux jeux.
 *
 * Le site envoie tout au scénario Make (webhook ci-dessous). Make aiguille :
 * 2 images ou plus → carrousel Facebook + Instagram ; sinon → photo seule.
 */

export const MAKE_WEBHOOK_URL = 'https://hook.eu1.make.com/f67dbu4u19znh05m9tmkak3wx5hqeqf9'

// Instagram et Facebook limitent un carrousel à 10 images
export const MAX_SOCIAL_PHOTOS = 10

// ─── Mise au format carré avant publication sur les réseaux ──────────────────
// Instagram et Facebook rognent les images qui ne sont pas carrées : une affiche
// A4 en hauteur y perd son haut et son bas. On la recentre donc sur un carré,
// sur le fond bois bleu canard de la ludothèque (choisi par Victor en octobre
// 2026 à la place du blanc). Le fond est déjà flouté dans le fichier : le flou
// du navigateur (ctx.filter) ne fonctionne pas sur Safari.
// Renvoie null si l'image n'a pas pu être lue, l'appelant se rabat alors sur
// l'image d'origine plutôt que d'échouer.
const SOCIAL_MAX_SIZE = 1440
const FOND_BOIS = '/social/fond-bois.jpg'

const chargerImage = (src, crossOrigin) => new Promise((resolve) => {
  const img = new window.Image()
  if (crossOrigin) img.crossOrigin = 'anonymous'
  img.onload = () => resolve(img)
  img.onerror = () => resolve(null)
  img.src = src
})

let fondBois = null
const chargerFondBois = () => (fondBois ??= chargerImage(FOND_BOIS, false))

/**
 * `encadre` : image réduite, avec contour encre et ombre pleine décalée
 * (style papier découpé) — pour les jaquettes, souvent déjà carrées sur fond
 * blanc, où le bois ne se verrait pas sinon. Sans : image en grand (affiches,
 * photos), pour rester lisible sur téléphone.
 */
const toSquareBlob = async (srcUrl, { encadre = false } = {}) => {
  const [img, fond] = await Promise.all([chargerImage(srcUrl, true), chargerFondBois()])
  if (!img) return null

  // Instagram réduit tout ce qui dépasse 1440 px et refuse les fichiers de plus
  // de 8 Mo : les grandes photos sont donc réduites dès ici.
  const scale = Math.min(1, SOCIAL_MAX_SIZE / Math.max(img.width, img.height))
  const size = encadre ? SOCIAL_MAX_SIZE : Math.max(Math.round(img.width * scale), Math.round(img.height * scale))
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (fond) ctx.drawImage(fond, 0, 0, size, size)
  else { ctx.fillStyle = '#1a5f7a'; ctx.fillRect(0, 0, size, size) }

  // Proportions de l'exemple validé par Victor, sur un carré de 1440 px
  const k = size / SOCIAL_MAX_SIZE
  const marge = encadre ? Math.round(160 * k) : 0
  const place = size - 2 * marge
  const r = Math.min(place / img.width, place / img.height)
  const w = Math.round(img.width * r)
  const h = Math.round(img.height * r)
  // Arrondi : un décalage d'un demi-pixel rééchantillonnerait toute l'affiche
  // et la rendrait légèrement floue.
  const x = Math.round((size - w) / 2)
  const y = Math.round((size - h) / 2)

  if (encadre) {
    const ombre = Math.round(22 * k)
    ctx.fillStyle = '#0f172a'
    ctx.fillRect(x + ombre, y + ombre, w, h)
    ctx.fillStyle = '#ffffff'   // jaquettes détourées : pas de transparence sur le bois
    ctx.fillRect(x, y, w, h)
  }
  ctx.drawImage(img, x, y, w, h)
  if (encadre) {
    const trait = Math.round(6 * k)
    ctx.lineWidth = trait
    ctx.strokeStyle = '#0f172a'
    ctx.strokeRect(x + trait / 2, y + trait / 2, w - trait, h - trait)
  }

  return new Promise((resolve) => {
    try {
      canvas.toBlob(blob => resolve(blob), 'image/jpeg', 0.9)
    } catch {
      resolve(null)   // image d'un autre domaine : le canvas est verrouillé
    }
  })
}

// Nom du fichier carré dérivé d'une adresse publique Supabase : « affiche.png »
// devient « affiche-social.jpg » (JPEG : seul format accepté par Instagram).
export function socialFileNameFrom(publicUrl) {
  const path = publicUrl?.split('/event-images/')[1]?.split('?')[0]
  if (!path) return null
  return decodeURIComponent(path).replace(/\.[a-z0-9]+$/i, '') + '-social.jpg'
}

/** Dépose une image déjà prête (JPEG) dans Storage et renvoie son adresse publique, ou null. */
export async function uploadSocialBlob(blob, fileName) {
  const { error } = await supabase.storage
    .from('event-images').upload(fileName, blob, { contentType: 'image/jpeg', upsert: true })
  if (error) {
    console.warn('Image pour les réseaux non enregistrée :', error.message)
    return null
  }
  const { data } = supabase.storage.from('event-images').getPublicUrl(fileName)
  return data.publicUrl
}

/**
 * Version carrée d'une image (fond bois, en grand ou encadrée), sans l'envoyer :
 * sert aux aperçus, qui doivent montrer exactement ce qui sera publié.
 * Renvoie un Blob JPEG, ou null si l'image n'a pas pu être lue.
 */
export function carreSocial(srcUrl, options) {
  return toSquareBlob(srcUrl, options)
}

// Dépose la version carrée d'une image dans Storage et renvoie son adresse
// publique, ou null si la conversion ou l'envoi n'ont pas abouti.
export async function uploadSquareVersion(srcUrl, fileName, options) {
  const blob = await toSquareBlob(srcUrl, options)
  if (!blob) return null
  return uploadSocialBlob(blob, fileName)
}

/**
 * Envoie une publication à Make. Une seule image : publiée seule ; plusieurs :
 * carrousel. Les champs `images` et `facebook_photos` ont les noms imposés par
 * les modules Make « Instagram — Create a Carousel Post » et « Facebook Pages —
 * Create a Post with Photos ». `extra` : champs informatifs propres à l'appelant.
 */
export async function publierSurReseaux({ message, imageUrls, extra = {} }) {
  const res = await fetch(MAKE_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message,
      image_url: imageUrls[0],
      image_urls: imageUrls,
      images: imageUrls.map(url => ({ media_type: 'IMAGE', image_url: url })),
      facebook_photos: imageUrls.map(url => ({ type: 'url', url })),
      photo_count: imageUrls.length,
      ...extra,
    }),
  })
  if (!res.ok) throw new Error('Erreur Make: ' + res.status)
}
