/**
 * Règles de l'onglet « Posts » de Communication : trois modèles d'image 4:5 (maquettes validées
 * par Victor le 28/10/2026, « Maquette bilan soirée jeux/post-simple-maquette »). Fonctions pures,
 * testées par `npm test`. Dessin : post.js.
 * Conception : docs/superpowers/specs/2026-10-28-posts-modeles-design.md
 */

export const MODELES = [
  { id: 'photo-carte', nom: 'Photo + carte', description: 'Raconter un moment' },
  { id: 'photo-encadree', nom: 'Photo encadrée', description: 'Un chiffre, une ambiance' },
  { id: 'message', nom: 'Message', description: 'Une info pratique, sans photo' },
]

export const LIMITES = { surTitre: 30, titre: 50, texte: 160, intro: 40, titreBlanc: 30, titreOrange: 20, legende: 40, titreMessage: 40, phrases: 140 }

export const BOUTONS = ['Enregistrez ce post', 'Partagez-le', 'Identifiez un ami', "Plus d'infos sur le site"]

export const champsVides = () => ({
  modele: 'photo-carte',
  surTitre: 'À la ludothèque', titre: '', texte: '',
  intro: '', titreBlanc: '', titreOrange: '', legende: '',
  titreMessage: '', phrases: '', boutons: ['Enregistrez ce post', 'Partagez-le'],
})

export const avecPhoto = modele => modele === 'photo-carte' || modele === 'photo-encadree'

// Espaces superflus retirés (les retours à la ligne des phrases du message sont gardés), coupé à la limite
const net = (texte, limite) => String(texte || '').split('\n').map(l => l.replace(/\s+/g, ' ').trim()).filter(Boolean).join('\n').slice(0, limite)

/** Ce qui manque pour publier (phrase à afficher), ou null. */
export function postPret(champs, aPhoto) {
  if (avecPhoto(champs.modele) && !aPhoto) return 'Ajoutez une photo.'
  const titre = champs.modele === 'photo-carte' ? champs.titre
    : champs.modele === 'photo-encadree' ? `${champs.titreBlanc || ''}${champs.titreOrange || ''}`
      : champs.titreMessage
  return net(titre, 999) ? null : 'Écrivez un titre.'
}

/** Textes prêts à dessiner pour le modèle choisi. */
export function planPost(champs) {
  const L = LIMITES
  if (champs.modele === 'photo-encadree') {
    return { modele: 'photo-encadree', intro: net(champs.intro, L.intro), titreBlanc: net(champs.titreBlanc, L.titreBlanc), titreOrange: net(champs.titreOrange, L.titreOrange), legende: net(champs.legende, L.legende) }
  }
  if (champs.modele === 'message') {
    const boutons = [...new Set((champs.boutons || []).filter(b => BOUTONS.includes(b)))].slice(0, 2)
    return { modele: 'message', titre: net(champs.titreMessage, L.titreMessage), phrases: net(champs.phrases, L.phrases), boutons }
  }
  return { modele: 'photo-carte', surTitre: net(champs.surTitre, L.surTitre), titre: net(champs.titre, L.titre), texte: net(champs.texte, L.texte) }
}
