// supabase/functions/_shared/drive.ts
// ─────────────────────────────────────────────────────────────────
// Dossier Google Drive des vidéos « Jeu de la semaine », lu avec une clé d'API
// Google (secret GOOGLE_DRIVE_CLE, limitée à l'API Drive). Le dossier doit rester
// partagé « toute personne disposant du lien ». Utilisé par les fonctions
// jeu-semaine (écran Communication) et check-events-notify (rappel du jeudi).
// Même dossier que DOSSIER_DRIVE dans src/services/jeuSemaine.js.
// ─────────────────────────────────────────────────────────────────

export const DOSSIER_DRIVE = '1bdQWQauOTWyaGZwvuAcZh-dvF-G_evWs'
const API = 'https://www.googleapis.com/drive/v3/files'

export type FichierDrive = { id: string; name: string; createdTime: string; size?: string; mimeType: string }

/** Erreur dont le message peut être montré tel quel au bénévole. */
export class ErreurDrive extends Error {
  constructor(message: string, readonly status = 502) { super(message) }
}

async function erreurDe(res: Response): Promise<ErreurDrive> {
  const texte = await res.text()
  console.error('Google Drive :', res.status, texte.slice(0, 500))
  if (res.status === 400 || res.status === 403) {
    return new ErreurDrive('La clé Google est absente ou refusée : vérifiez le secret GOOGLE_DRIVE_CLE.')
  }
  if (res.status === 404) return new ErreurDrive("Le dossier Drive est introuvable ou n'est plus partagé.")
  return new ErreurDrive("Le dossier Drive n'a pas pu être lu. Réessayez dans un instant.")
}

// Clé envoyée en en-tête (jamais dans l'adresse, qui finit dans les journaux) ; délai limité
async function appelDrive(url: string | URL, cle: string, delaiMs: number): Promise<Response> {
  try {
    return await fetch(url, { headers: { 'x-goog-api-key': cle }, signal: AbortSignal.timeout(delaiMs) })
  } catch (error) {
    console.error('Google Drive : appel impossible', (error as Error).name)
    throw new ErreurDrive("Le dossier Drive n'a pas pu être lu. Réessayez dans un instant.")
  }
}

export async function listerVideosDrive(cle: string): Promise<FichierDrive[]> {
  if (!cle) throw new ErreurDrive('La clé Google est absente ou refusée : vérifiez le secret GOOGLE_DRIVE_CLE.', 500)
  const fichiers: FichierDrive[] = []
  let page = ''
  do {
    const url = new URL(API)
    url.searchParams.set('q', `'${DOSSIER_DRIVE}' in parents and mimeType contains 'video/' and trashed = false`)
    url.searchParams.set('fields', 'nextPageToken, files(id, name, createdTime, size, mimeType)')
    url.searchParams.set('orderBy', 'createdTime')
    url.searchParams.set('pageSize', '200')
    if (page) url.searchParams.set('pageToken', page)
    const res = await appelDrive(url, cle, 15000)
    if (!res.ok) throw await erreurDe(res)
    const corps = await res.json()
    fichiers.push(...(corps.files ?? []))
    page = corps.nextPageToken ?? ''
  } while (page)
  return fichiers
}

export async function telechargerVideoDrive(cle: string, id: string): Promise<Uint8Array> {
  const res = await appelDrive(`${API}/${encodeURIComponent(id)}?alt=media`, cle, 60000)
  if (!res.ok) throw await erreurDe(res)
  return new Uint8Array(await res.arrayBuffer())
}
