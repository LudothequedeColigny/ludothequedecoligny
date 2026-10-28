/**
 * Règles de l'onglet « Jeu de la semaine » (écran Communication) : vidéos Reels
 * déposées par Victor dans un dossier Google Drive, publiées une par semaine sur
 * Facebook et Instagram. Fonctions pures, testées par `npm test`.
 * Conception : docs/superpowers/specs/2026-10-28-jeu-de-la-semaine-design.md
 *
 * `normaliserNom`, `nomDuFichier`, `reconnaitreJeu`, `fileJeuSemaine` et `prochaineVideo`
 * sont recopiées dans supabase/functions/check-events-notify/rappels.js (la fonction
 * serveur ne peut pas importer `src/`) : les changer aux deux endroits. Un test vérifie
 * que les deux copies donnent les mêmes résultats. Ce fichier n'importe rien pour cela.
 */

export const DOSSIER_DRIVE = '1bdQWQauOTWyaGZwvuAcZh-dvF-G_evWs'
export const LIEN_DOSSIER_DRIVE = `https://drive.google.com/drive/folders/${DOSSIER_DRIVE}`

/** « Sky Team » → « skyteam » : sans accents, minuscules, lettres et chiffres seulement. */
export const normaliserNom = t => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '')

/** « SkyTeam_jeu-de-la-semaine.mp4 » → « SkyTeam » : ce qui précède le premier « _ ». */
export const nomDuFichier = nom => String(nom || '').replace(/\.[a-z0-9]+$/i, '').split('_')[0]

/**
 * Jeu du catalogue dont le nom correspond exactement au nom du fichier, ou null
 * (aucun ou plusieurs : le bénévole choisit). Jamais de correspondance partielle :
 * « Sky » ne doit pas donner « Skyjo ».
 */
export function reconnaitreJeu(nomFichier, jeux) {
  const cle = normaliserNom(nomDuFichier(nomFichier))
  if (!cle) return null
  const trouves = (jeux || []).filter(j => normaliserNom(j.name) === cle)
  return trouves.length === 1 ? trouves[0] : null
}

/**
 * File d'attente et vidéos déjà publiées. `fichiers` = liste du Drive ({ id, name,
 * createdTime }), `lignes` = table jeux_semaine, `jeux` = table games.
 * Un jeu choisi à la main (`game_id`) l'emporte sur la reconnaissance par le nom.
 * Une vidéo publiée puis supprimée du Drive reste dans les publiées.
 */
export function fileJeuSemaine({ fichiers = [], lignes = [], jeux = [] }) {
  const parId = new Map(lignes.map(l => [l.drive_id, l]))
  const jeuDe = (ligne, nomFichier) => {
    if (ligne?.game_id != null) return jeux.find(j => String(j.id) === String(ligne.game_id)) ?? null
    return reconnaitreJeu(nomFichier, jeux)
  }
  const video = (driveId, nomFichier, creeLe, ligne) => ({
    driveId, nomFichier, creeLe, jeu: jeuDe(ligne, nomFichier), legende: ligne?.legende ?? null, publieLe: ligne?.publie_le ?? null,
  })
  const attente = fichiers
    .map(f => video(f.id, f.name, f.createdTime, parId.get(f.id)))
    .filter(v => !v.publieLe)
    .sort((a, b) => String(a.creeLe).localeCompare(String(b.creeLe)))
  const surDrive = new Map(fichiers.map(f => [f.id, f]))
  const publiees = lignes
    .filter(l => l.publie_le)
    .map(l => video(l.drive_id, l.nom_fichier, surDrive.get(l.drive_id)?.createdTime ?? null, l))
    .sort((a, b) => String(b.publieLe).localeCompare(String(a.publieLe)))
  return { attente, publiees }
}

/**
 * Vidéo proposée : la première dont le jeu est reconnu et disponible. `sautee` = la
 * première vidéo passée parce que son jeu est en prêt (pour le dire à l'écran).
 * Aucune disponible : la plus ancienne. File vide : null.
 */
export function prochaineVideo(attente = []) {
  if (attente.length === 0) return null
  const i = attente.findIndex(v => v.jeu && v.jeu.is_available !== false)
  if (i === -1) return { video: attente[0], sautee: null }
  const sautee = attente.slice(0, i).find(v => v.jeu && v.jeu.is_available === false) ?? null
  return { video: attente[i], sautee }
}

const minuscule = t => t.charAt(0).toLowerCase() + t.slice(1)

// Première phrase de la description du catalogue, 200 caractères au plus
function premierePhrase(description) {
  const texte = String(description || '').replace(/\s+/g, ' ').trim()
  if (!texte) return ''
  const phrase = (texte.match(/^.*?[.!?…](?=\s|$)/) || [texte])[0]
  if (phrase.length <= 200) return phrase
  const coupe = phrase.slice(0, 199)
  return `${coupe.slice(0, coupe.lastIndexOf(' ') > 0 ? coupe.lastIndexOf(' ') : 199)}…`
}

// « Sky Team » → « #SkyTeam », « 7 Wonders : Duel » → « #7WondersDuel »
function motClic(nom) {
  const mots = String(nom || '').normalize('NFD').replace(/[̀-ͯ]/g, '').split(/[^A-Za-z0-9]+/).filter(Boolean)
  return mots.length ? `#${mots.map(m => m.charAt(0).toUpperCase() + m.slice(1)).join('')}` : ''
}

/** Légende proposée (modèle validé par Victor le 28/10/2026). Chiffres lus dans le catalogue. */
export function legendeProposee(jeu, prochaine) {
  const min = Number(jeu?.min_players) || 0
  const max = Number(jeu?.max_players) || 0
  const duree = Number(jeu?.duration) || 0
  const age = Number(jeu?.min_age) || 0
  const infos = [
    min > 0 && max >= min ? `👥 ${min === max ? `${min} joueur${min > 1 ? 's' : ''}` : `${min} à ${max} joueurs`}` : '',
    duree > 0 ? `⏱ ${duree} min` : '',
    age > 0 ? `dès ${age} ans` : '',
  ].filter(Boolean).join(' · ')
  const permanence = prochaine
    ? `📍 À emprunter à la ludothèque, ${[minuscule(prochaine.jour), prochaine.heures].filter(Boolean).join(' ')}.`
    : '📍 À emprunter à la ludothèque.'
  return [
    `🎲 Le jeu de la semaine : ${String(jeu?.name || '').trim()}`,
    ...[infos, premierePhrase(jeu?.description)].filter(Boolean),
    '',
    permanence,
    '👉 Pas encore adhérent ? ludothequedecoligny.fr/adherer',
    '',
    ['#ludotheque #coligny #jeudesociete', motClic(jeu?.name)].filter(Boolean).join(' '),
  ].join('\n')
}
