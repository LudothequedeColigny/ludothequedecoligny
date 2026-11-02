/**
 * Règles de la fiche d'adhésion jointe au mail des bénévoles (tests : npm test).
 * `cotisationDuMois` est recopiée de src/services/tarifs.js : la fonction serveur
 * ne peut pas importer src/. La changer aux deux endroits (test d'égalité).
 */
export const cotisationDuMois = (prix, degressivite, minimum, mode, date = new Date()) => mode === 'degressif'
  ? Math.max((Number(prix) || 0) - date.getMonth() * (Number(degressivite) || 0), Number(minimum) || 0)
  : Number(prix) || 0

const MOIS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.']

// Montants de l'adhésion lus dans les Paramètres, pour le type d'adhérent
export function tableauTarifs(r, type) {
  const asso = type === 'Association'
  const prix = asso ? r.prix_association : r.prix_particulier
  const degressivite = asso ? r.degressivite_association : r.degressivite_mensuelle
  const minimum = asso ? r.prix_minimum_asso : r.prix_minimum
  const mode = asso ? r.mode_adhesion_association : r.mode_adhesion_particulier
  const pactes = Number(r.cotisation_pactes ?? 10) || 0
  if (mode !== 'degressif') {
    const ludotheque = cotisationDuMois(prix, degressivite, minimum, mode)
    return { mode: 'fixe', pactes, ludotheque, avecPactes: ludotheque + pactes, duree: 'pour un an' }
  }
  return {
    mode: 'degressif',
    pactes,
    duree: "jusqu'au 31 décembre",
    mois: MOIS.map((mois, i) => {
      const ludotheque = cotisationDuMois(prix, degressivite, minimum, mode, new Date(2026, i, 15))
      return { mois, ludotheque, avecPactes: ludotheque + pactes }
    }),
  }
}

export const nomAffiche = d => (d.type === 'Association' ? d.nom : `${d.prenom || ''} ${d.nom || ''}`).trim()

// Toutes les lignes restent sur la fiche, même vides : elles se complètent au stylo
export function lignesAdherent(d) {
  const asso = d.type === 'Association'
  return [
    ['Type', asso ? 'Structure / association' : 'Particulier'],
    ...(asso ? [['Nom de la structure', d.nom || '']] : [['Prénom', d.prenom || ''], ['Nom', d.nom || '']]),
    ['E-mail', d.email || ''],
    ['Téléphone', d.telephone || ''],
    ['Commune', d.commune || ''],
    ...(asso ? [] : [['Membres du foyer', d.foyer || '']]),
    ['Nous a connus par', d.origine || ''],
    ['Recevoir les dates', d.recevoir_dates ? 'Oui' : 'Non'],
  ]
}

// Fiche à remplir entièrement à la main : un tableau de cases remplace la valeur à cocher
export const lignesAdherentVierge = () => [
  ['Type', ['Particulier', 'Structure / association']],
  ['Prénom', ''],
  ['Nom ou structure', ''],
  ['E-mail', ''],
  ['Téléphone', ''],
  ['Commune', ''],
  ['Membres du foyer', ''],
  ['Nous a connus par', ''],
  ['Recevoir les dates', ['Oui', 'Non']],
]

export const dateFrancaise = iso => new Intl.DateTimeFormat('fr-FR', {
  day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Paris',
}).format(new Date(iso))

export function nomFichier(d) {
  const nom = nomAffiche(d).replace(/[\\/:*?"<>|\r\n\t]+/g, ' ').replace(/\s+/g, ' ').trim()
  return `Adhésion - ${nom}.pdf`
}

export function couperLignes(texte, largeurMax, mesure) {
  const lignes = []
  let ligne = ''
  for (const mot of String(texte).split(/\s+/).filter(Boolean)) {
    const essai = ligne ? `${ligne} ${mot}` : mot
    if (mesure(essai) <= largeurMax) { ligne = essai; continue }
    if (ligne) lignes.push(ligne)
    ligne = ''
    // Mot plus long que la ligne (adresse e-mail…) : coupé plutôt que de sortir du cadre
    for (const lettre of mot) {
      if (ligne && mesure(ligne + lettre) > largeurMax) { lignes.push(ligne); ligne = '' }
      ligne += lettre
    }
  }
  lignes.push(ligne)
  return lignes
}

// La police ne couvre pas tous les alphabets : le PDF doit se fabriquer quand même
export function texteAffichable(texte, aGlyphe) {
  return [...String(texte).replace(/\s+/g, ' ')].map(c => {
    if (aGlyphe(c)) return c
    const base = c.normalize('NFD').replace(/\p{M}/gu, '')
    return [...base].every(aGlyphe) && base ? base : '?'
  }).join('')
}
