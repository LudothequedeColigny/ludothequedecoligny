import { useEffect, useRef, useState } from 'react'
import { detourer, autocollant, tenir } from '../services/diapos/autocollant.js'
import { COULEURS, chargerImage, oublierImage, nouveauCanvas, liberer } from '../services/diapos/dessin.js'

/**
 * Jaquette → image « autocollant » (boîte détourée, liseré blanc, contour encre, ombre
 * pleine), le même effet que les publications des bilans. Page « La vie de la ludothèque ».
 *
 * - paresseux : le calcul ne démarre que quand la boîte arrive à l'écran ;
 * - un seul détourage à la fois (mémoire des téléphones), dans une file d'attente ;
 * - mis en cache par adresse et par couleur d'ombre, pour toute la visite ;
 * - seulement pour les images hébergées chez nous (stockage Supabase) : MyLudo interdit
 *   la réutilisation de ses jaquettes dans un canvas (et son serveur la refuse) ;
 * - renvoie null tant que l'image n'est pas prête, ou si elle ne peut pas l'être :
 *   la boîte garde alors sa jaquette simplement encadrée.
 *
 * Utilisation : const [ref, src] = useAutocollant(url, 'orange') ; ref sur la boîte.
 */

// Taille de la boîte dans l'image fabriquée (affichée à ~120 px : nette sur écran Retina)
const TAILLE = 240
// Côté maximal du calcul de détourage, plus petit que pour les publications
const COTE = 480
const LISERE = 9
const BORD = 4
const OMBRE = 10
const MARGE = LISERE + BORD + 2

// Notre stockage : seules ces images peuvent être lues dans un canvas
const HEBERGEE = /^https:\/\/[a-z0-9-]+\.supabase\.co\/storage\//

const prets = new Map() // clé → adresse de l'image prête (ou null si impossible)
const enCours = new Map() // clé → promesse
let file = Promise.resolve()

const pause = () => new Promise(r => setTimeout(r, 0))

async function fabriquer(url, couleur) {
  const img = await chargerImage(url)
  if (!img) return null
  let boite = null
  let sortie = null
  try {
    boite = detourer(img, COTE)
    const { w, h } = tenir(boite, TAILLE, TAILLE)
    sortie = nouveauCanvas(Math.ceil(w + 2 * MARGE + OMBRE), Math.ceil(h + 2 * MARGE + OMBRE))
    autocollant(sortie.ctx, boite, {
      cx: MARGE + w / 2, cy: MARGE + h / 2, w, h,
      lisere: LISERE, bord: BORD, ombre: OMBRE, couleurOmbre: couleur,
    })
    const blob = await new Promise(resolve => {
      // Image illisible (autre site) : toBlob refuse, on garde la jaquette encadrée
      try { sortie.canvas.toBlob(b => resolve(b), 'image/png') } catch { resolve(null) }
    })
    return blob ? URL.createObjectURL(blob) : null
  } catch {
    return null
  } finally {
    liberer(boite)
    liberer(sortie?.canvas)
  }
}

function demander(url, couleur, cle) {
  if (prets.has(cle)) return Promise.resolve(prets.get(cle))
  if (!enCours.has(cle)) {
    const tache = file.then(async () => {
      await pause() // laisse la page respirer entre deux boîtes
      const src = await fabriquer(url, couleur)
      // La jaquette d'origine n'est plus utile : elle ne reste pas en mémoire tout le long de la visite
      oublierImage(url)
      prets.set(cle, src)
      enCours.delete(cle)
      return src
    })
    file = tache.catch(() => {})
    enCours.set(cle, tache)
  }
  return enCours.get(cle)
}

/** `teinte` : 'orange' ou 'bleu' (couleur de l'ombre pleine). */
export default function useAutocollant(url, teinte = 'orange') {
  const ref = useRef(null)
  const couleur = teinte === 'bleu' ? COULEURS.bleu : COULEURS.orange
  const cle = url && HEBERGEE.test(url) ? `${couleur}|${url}` : null
  const [src, setSrc] = useState(() => (cle && prets.get(cle)) || null)

  useEffect(() => {
    if (!cle || prets.has(cle)) {
      setSrc(cle ? prets.get(cle) : null)
      return undefined
    }
    setSrc(null)
    let actif = true
    const lancer = () => demander(url, couleur, cle).then(s => { if (actif) setSrc(s) })
    const el = ref.current
    if (!el || typeof IntersectionObserver === 'undefined') {
      lancer()
      return () => { actif = false }
    }
    const observateur = new IntersectionObserver(([entree]) => {
      if (!entree.isIntersecting) return
      observateur.disconnect()
      lancer()
    }, { rootMargin: '150px' })
    observateur.observe(el)
    return () => {
      actif = false
      observateur.disconnect()
    }
  }, [cle, url, couleur])

  return [ref, src]
}
