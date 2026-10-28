// supabase/functions/jeu-semaine/index.ts
// ─────────────────────────────────────────────────────────────────
// Edge Function — onglet « Jeu de la semaine » de l'écran Communication.
//   { action: 'liste' }                              → vidéos du dossier Drive
//   { action: 'preparer', drive_id, nom_fichier }    → copie de la vidéo dans l'espace
//     public « reels » (Instagram ne sait pas lire Google Drive) et son adresse
// Réservé aux bénévoles connectés. La copie est effacée 7 jours après la
// publication par check-events-notify.
// Conception : docs/superpowers/specs/2026-10-28-jeu-de-la-semaine-design.md
// ─────────────────────────────────────────────────────────────────
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { listerVideosDrive, telechargerVideoDrive, ErreurDrive } from '../_shared/drive.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || ''
const CLE_DRIVE = Deno.env.get('GOOGLE_DRIVE_CLE') || ''
const TAILLE_MAX = 100 * 1024 * 1024   // limite de l'espace « reels »

const supabase = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '')

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' },
  })
}

// Réservé aux bénévoles connectés, comme la recherche Wikiludo.
async function isVolunteer(req: Request): Promise<boolean> {
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') || ''
  const token = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '')
  if (!token || token === anonKey) return false
  const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: anonKey, Authorization: `Bearer ${token}` },
  })
  if (!res.ok) return false
  const user = await res.json()
  return !!user?.id && user?.role === 'authenticated'
}

async function preparer(driveId: string, nomFichier: string) {
  // Seulement une vidéo du dossier : la fonction ne copie pas n'importe quel fichier Drive public
  const fichier = (await listerVideosDrive(CLE_DRIVE)).find(f => f.id === driveId)
  if (!fichier) return json({ error: "Cette vidéo n'est plus dans le dossier Drive." }, 404)
  if (Number(fichier.size || 0) > TAILLE_MAX) {
    return json({ error: 'Cette vidéo pèse plus de 100 Mo : réduisez-la avant de la publier.' }, 413)
  }

  // Copie déjà faite (essai précédent qui a échoué chez Make) : réutilisée
  const { data: ligne, error: lectureErr } = await supabase.from('jeux_semaine')
    .select('copie_chemin, copie_effacee_le').eq('drive_id', driveId).maybeSingle()
  if (lectureErr) throw lectureErr
  let chemin = ligne?.copie_chemin && !ligne.copie_effacee_le ? ligne.copie_chemin : ''

  if (!chemin) {
    const octets = await telechargerVideoDrive(CLE_DRIVE, driveId)
    const type = fichier.mimeType === 'video/quicktime' ? 'video/quicktime' : 'video/mp4'
    chemin = `${driveId}-${crypto.randomUUID().slice(0, 8)}.${type === 'video/quicktime' ? 'mov' : 'mp4'}`
    const { error: envoiErr } = await supabase.storage.from('reels').upload(chemin, octets, { contentType: type })
    if (envoiErr) throw envoiErr
    // Seules ces colonnes sont écrites : le jeu choisi et la légende sont gardés
    const { error: ecritureErr } = await supabase.from('jeux_semaine').upsert({
      drive_id: driveId, nom_fichier: nomFichier || fichier.name, copie_chemin: chemin, copie_effacee_le: null, modifie_le: new Date().toISOString(),
    }, { onConflict: 'drive_id' })
    if (ecritureErr) throw ecritureErr
  }
  const { data } = supabase.storage.from('reels').getPublicUrl(chemin)
  return json({ url: data.publicUrl })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (!(await isVolunteer(req))) return json({ error: 'Non autorisé' }, 401)

  try {
    const corps = await req.json().catch(() => ({}))
    if (corps?.action === 'liste') return json({ fichiers: await listerVideosDrive(CLE_DRIVE) })
    if (corps?.action === 'preparer') {
      const driveId = String(corps.drive_id || '')
      if (!/^[A-Za-z0-9_-]{10,}$/.test(driveId)) return json({ error: 'Vidéo inconnue.' }, 400)
      return await preparer(driveId, String(corps.nom_fichier || ''))
    }
    return json({ error: 'Action inconnue.' }, 400)
  } catch (error) {
    if (error instanceof ErreurDrive) return json({ error: error.message }, error.status)
    console.error('jeu-semaine :', error)
    return json({ error: "La vidéo n'a pas pu être préparée. Réessayez dans un instant." }, 500)
  }
})
