import { useEffect, useState } from 'react'
import { carreSocial } from '../services/reseauxSociaux'

/**
 * Aperçus fidèles des images publiées : chaque image est mise au carré par la
 * même fonction que la publication (fond bois, en grand ou encadrée).
 * Renvoie les adresses à afficher, dans l'ordre ; pendant la fabrication, ou si
 * une image n'a pas pu être lue, l'adresse d'origine est montrée à sa place.
 */
export default function useApercusCarres(urls, { encadre = false } = {}) {
  const cle = urls.join('|')
  const [apercus, setApercus] = useState({ cle: '', liste: [] })

  useEffect(() => {
    let annule = false
    const crees = []
    ;(async () => {
      const liste = []
      // Une image à la fois : mémoire des téléphones
      for (const url of urls) {
        const blob = url ? await carreSocial(url, { encadre }) : null
        if (annule) return
        if (blob) {
          const adresse = URL.createObjectURL(blob)
          crees.push(adresse)
          liste.push(adresse)
        } else liste.push(url)
      }
      if (!annule) setApercus({ cle, liste })
    })()
    return () => {
      annule = true
      crees.forEach(a => URL.revokeObjectURL(a))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cle, encadre])

  return apercus.cle === cle ? apercus.liste : urls
}
