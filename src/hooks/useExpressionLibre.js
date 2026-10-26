import { useEffect, useRef, useState } from 'react'
import { supabase } from '../services/supabaseClient'

/**
 * Expression libre des fenêtres Bilan : phrase et fond choisis, mémorisés sur
 * l'événement (`events.bilan_expression` = { texte, photo } ; null = pas d'image).
 * Visibles tout de suite ; la phrase est enregistrée après un court délai de saisie,
 * le fond tout de suite ; retour en arrière si l'écriture échoue
 * (même mécanisme que les textes de la fenêtre Annonce).
 */

// 3 lignes de l'image au plus, sans « … » (règle du 26/10/2026)
export const LONGUEUR_EXPRESSION = 90
// Délai avant d'enregistrer la phrase (le temps de finir de taper)
const DELAI_ENREGISTREMENT = 600
const ERREUR = "L'expression libre n'a pas pu être enregistrée. Réessayez dans un instant."
const ERREUR_FENETRE_FERMEE = "L'expression libre du bilan n'a pas pu être enregistrée. Rouvrez le bilan pour la corriger."

// Valeur lue sur l'événement, toujours de la forme { texte, photo }
const lire = v => ({
  texte: typeof v?.texte === 'string' ? v.texte : '',
  photo: typeof v?.photo === 'string' ? v.photo : null,
})
// Valeur enregistrée : null quand il n'y a ni phrase ni fond choisi
const aEnregistrer = ({ texte, photo }) => (texte.trim() || photo ? { texte, photo } : null)
const memeValeur = (a, b) => JSON.stringify(a) === JSON.stringify(b)

export default function useExpressionLibre(event, onEventChange, onErreur) {
  const [expression, setExpression] = useState(() => lire(event.bilan_expression))
  const [erreur, setErreur] = useState('')
  const enregistree = useRef(aEnregistrer(lire(event.bilan_expression)))
  const enAttente = useRef(null) // { minuterie, valeur } : enregistrement programmé
  const monte = useRef(true) // fenêtre encore ouverte
  // Rappels du dernier affichage (la fenêtre peut se fermer avant la fin d'un enregistrement)
  const rappels = useRef({ onEventChange, onErreur })
  rappels.current = { onEventChange, onErreur }
  // Enregistrements l'un après l'autre, dans l'ordre de la saisie
  const sauvegardes = useRef(Promise.resolve())
  const derniereSauvegarde = useRef(0)

  const enregistrerMaintenant = async (valeur, demande) => {
    const avant = enregistree.current
    if (memeValeur(avant, valeur)) return
    enregistree.current = valeur
    rappels.current.onEventChange({ bilan_expression: valeur })
    let echec = null
    try {
      const { error } = await supabase.from('events').update({ bilan_expression: valeur }).eq('id', event.id)
      echec = error
    } catch (e) {
      echec = e
    }
    if (echec) {
      console.error('Expression libre :', echec)
      if (enregistree.current === valeur) {
        enregistree.current = avant
        // Une saisie est encore en attente d'enregistrement : l'écran garde ce qui est tapé
        if (!enAttente.current) setExpression(x => (memeValeur(aEnregistrer(x), valeur) ? lire(avant) : x))
        rappels.current.onEventChange(e => (e.bilan_expression === valeur ? { bilan_expression: avant } : {}))
      }
      // Une saisie plus récente suit et sera enregistrée à son tour : pas de message
      if (demande !== derniereSauvegarde.current) return
      // Fenêtre déjà fermée : le message passe par l'écran Communication
      if (monte.current) setErreur(ERREUR)
      else rappels.current.onErreur?.(ERREUR_FENETRE_FERMEE)
    } else if (demande === derniereSauvegarde.current && monte.current) {
      setErreur('')
    }
  }
  const enregistrer = valeur => {
    const demande = ++derniereSauvegarde.current
    const p = sauvegardes.current.then(() => enregistrerMaintenant(valeur, demande))
    // Un échec imprévu ne doit pas bloquer les enregistrements suivants
    sauvegardes.current = p.catch(() => {})
    return p
  }
  const annulerAttente = () => {
    if (enAttente.current) clearTimeout(enAttente.current.minuterie)
    enAttente.current = null
  }

  // Fenêtre fermée : phrase en attente enregistrée tout de suite
  useEffect(() => {
    monte.current = true
    return () => {
      monte.current = false
      const attente = enAttente.current
      if (attente) {
        clearTimeout(attente.minuterie)
        enAttente.current = null
        enregistrer(attente.valeur)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const changerTexte = texte => {
    const suivante = { ...expression, texte: texte.slice(0, LONGUEUR_EXPRESSION) }
    setExpression(suivante)
    setErreur('')
    annulerAttente()
    const valeur = aEnregistrer(suivante)
    const minuterie = setTimeout(() => { enAttente.current = null; enregistrer(valeur) }, DELAI_ENREGISTREMENT)
    enAttente.current = { minuterie, valeur }
  }
  const changerPhoto = photo => {
    const suivante = { ...expression, photo }
    setExpression(suivante)
    setErreur('')
    annulerAttente()
    enregistrer(aEnregistrer(suivante))
  }

  return { expression, changerTexte, changerPhoto, erreur }
}

/**
 * Expression telle que la reçoivent les plans des images (phrase sans espaces autour,
 * photo seulement si elle est encore dans le bilan), ou null s'il n'y a pas d'image.
 * Sa forme JSON sert de clé : l'aperçu n'est redessiné que si l'image change.
 */
export function expressionPourApercu(expression, urls) {
  const texte = expression.texte.trim()
  if (!texte) return null
  return { texte, photo: expression.photo && urls.includes(expression.photo) ? expression.photo : null }
}
