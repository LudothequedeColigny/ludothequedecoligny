import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
// Règles des rappels : module JavaScript testé par `npm test`
import { rappelsAEnvoyer, estPermanence, semaineDuRappel, rappelJeuSemaine, fileJeuSemaine } from './rappels.js'
import { listerVideosDrive } from '../_shared/drive.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

async function sendPush(payload: { title: string; body: string; url: string }) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/send-push`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      apikey: SUPABASE_SERVICE_ROLE_KEY,
    },
    body: JSON.stringify(payload),
  })
  const texte = await res.text()
  if (!res.ok) console.error('Erreur appel send-push:', res.status, texte)
  return { status: res.status, reponse: texte }
}

// Les dates des événements sont enregistrées à l'heure de Paris, sans fuseau
// (« 2026-11-06 19:00:00 »). On compare donc avec l'heure de Paris, écrite de la
// même façon : comparer avec l'heure universelle décalait les alertes d'une heure
// en hiver et de deux en été.
const PARIS = new Intl.DateTimeFormat('sv-SE', {
  timeZone: 'Europe/Paris',
  year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', second: '2-digit',
  hourCycle: 'h23',
})
const heureDeParis = (d: Date) => PARIS.format(d).replace(' ', 'T') // « 2026-11-06T19:00:00 »

// « 2026-11-06 » décalé de n jours du calendrier
const jourDecale = (jour: string, n: number) => {
  const [a, m, j] = jour.split('-').map(Number)
  return new Date(Date.UTC(a, m - 1, j + n)).toISOString().slice(0, 10)
}

const json = (corps: unknown, status = 200) =>
  new Response(JSON.stringify(corps), { status, headers: { 'Content-Type': 'application/json' } })

// Mot de passe partagé avec la tâche planifiée (cron.job « check-events-notify »)
const CRON_SECRET = Deno.env.get('CRON_SECRET') || ''

// send-push a accepté et joint au moins un téléphone (ou aucun n'est abonné) :
// sinon nouvel essai 15 min plus tard
function accepte({ status, reponse }: { status: number; reponse: string }) {
  if (status < 200 || status >= 300) return false
  let resultat: { total?: number; sent?: number } = {}
  try { resultat = JSON.parse(reponse) } catch { /* réponse illisible : considérée comme acceptée */ }
  return !(resultat.total && !resultat.sent)
}

// Rappel du jeudi (jeu de la semaine) : lu seulement le jeudi à partir de 17 h, tant
// qu'il n'est pas parti cette semaine. Le dossier Drive n'est donc pas interrogé
// toutes les 15 min. Une erreur (clé Google, dossier) n'envoie rien : surtout pas
// « Plus de vidéo en réserve » à tort.
async function rappelDuJeudi(maintenant: string) {
  const semaine = semaineDuRappel(maintenant)
  if (!semaine) return null
  const { data: deja, error } = await supabase.from('rappels_jeu_semaine').select('semaine').eq('semaine', semaine).maybeSingle()
  if (error) { console.error('Rappel jeu de la semaine (déjà envoyé ?) :', error.message); return null }
  if (deja) return null
  try {
    const [fichiers, lignes, jeux] = await Promise.all([
      listerVideosDrive(Deno.env.get('GOOGLE_DRIVE_CLE') || ''),
      supabase.from('jeux_semaine').select('drive_id, nom_fichier, game_id, legende, publie_le'),
      supabase.from('games').select('id, name, is_available'),
    ])
    if (lignes.error) throw lignes.error
    if (jeux.error) throw jeux.error
    const { attente } = fileJeuSemaine({ fichiers, lignes: lignes.data ?? [], jeux: jeux.data ?? [] })
    const publications = (lignes.data ?? []).filter(l => l.publie_le).map(l => heureDeParis(new Date(l.publie_le)))
    return rappelJeuSemaine({ semaine, attente, publications })
  } catch (e) {
    console.error('Rappel jeu de la semaine :', (e as { message?: string })?.message ?? String(e))
    return null
  }
}

// Copies des vidéos publiées depuis plus de 7 jours : effacées de l'espace « reels »
async function effacerCopiesAnciennes() {
  const limite = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString()
  const { data, error } = await supabase.from('jeux_semaine')
    .select('drive_id, copie_chemin')
    .not('copie_chemin', 'is', null).is('copie_effacee_le', null).lt('publie_le', limite)
  if (error) { console.error('Ménage des vidéos :', error.message); return 0 }
  if (!data?.length) return 0
  const { error: supprErr } = await supabase.storage.from('reels').remove(data.map(l => l.copie_chemin))
  if (supprErr) { console.error('Ménage des vidéos (stockage) :', supprErr.message); return 0 }
  const { error: majErr } = await supabase.from('jeux_semaine')
    .update({ copie_effacee_le: new Date().toISOString() }).in('drive_id', data.map(l => l.drive_id))
  if (majErr) console.error('Ménage des vidéos (base) :', majErr.message)
  return data.length
}

serve(async (req) => {
  if (!CRON_SECRET || req.headers.get('x-cron-secret') !== CRON_SECRET) {
    return json({ error: 'Non autorisé' }, 401)
  }

  try {
    const corps = await req.json().catch(() => ({}))
    // Mode essai (diagnostic) : envoie une notification par le chemin réel
    // (cette fonction → send-push → téléphones) et renvoie la réponse obtenue.
    if (corps?.essai === true) {
      const resultat = await sendPush({
        title: '🎲 Notification d\'essai',
        body: 'Bravo, les notifications de la ludothèque fonctionnent !',
        url: '/admin',
      })
      return json({ essai: true, ...resultat })
    }

    // Mode simulation : rappels qui partiraient à l'instant donné (heure de Paris),
    // sans rien envoyer ni écrire — pour vérifier avant et après une mise en ligne
    const simulation = corps?.simulation === true
    // Une heure fournie sans simulation explicite (faute de frappe, "true" en texte) ne doit
    // jamais déclencher un vrai passage avec envois
    if (!simulation && (corps?.simulation !== undefined || corps?.maintenant !== undefined)) {
      return json({ error: 'Simulation : écrire {"simulation": true, "maintenant": "AAAA-MM-JJTHH:MM:SS"}' }, 400)
    }
    const now = new Date()
    const maintenant = simulation && typeof corps.maintenant === 'string'
      ? corps.maintenant.replace(' ', 'T')
      : heureDeParis(now)

    // 1. Début d'événement (dans les 15 prochaines minutes) — inchangé, jamais en simulation
    let startingCount = 0
    if (!simulation) {
      const in15 = new Date(now.getTime() + 15 * 60 * 1000)
      const { data: startingEvents, error: startErr } = await supabase
        .from('events')
        .select('id, title, date')
        .gte('date', heureDeParis(now))
        .lte('date', heureDeParis(in15))
        .is('notif_bilan_sent_at', null)
      if (startErr) console.error('Erreur requête événements à venir:', startErr.message)
      for (const ev of startingEvents ?? []) {
        await sendPush({
          title: `🎲 ${ev.title} commence !`,
          body: 'Pensez à noter le nombre de participants, prendre des photos et renseigner les jeux joués.',
          url: '/admin/evenements',
        })
      }
      startingCount = startingEvents?.length ?? 0
    }

    // 2. Rappels : annonce (J-10), story du jour J, bilans (permanence, soirée / famille)
    const aujourdhui = maintenant.slice(0, 10)
    const { data: evenements, error: evErr } = await supabase
      .from('events')
      .select('id, title, date, end_time, archived_at, annonce_publiee_le, bilan_publie_le, notif_annonce_sent_at, notif_jour_sent_at, notif_bilan_sent_at')
      .is('archived_at', null)
      .gte('date', `${jourDecale(aujourdhui, -1)}T00:00:00`)
      .lte('date', `${jourDecale(aujourdhui, 11)}T23:59:59`)
    if (evErr) throw evErr

    // Prêts des jours de permanence : le jeu et les dates seulement, jamais l'emprunteur
    const jours = [...new Set((evenements ?? []).filter(e => estPermanence(e.title)).map(e => String(e.date).slice(0, 10)))]
    const pretsParJour: Record<string, unknown[]> = {}
    if (jours.length) {
      const [enCours, rendus] = await Promise.all([
        supabase.from('loans').select('game_id, loan_date').in('loan_date', jours),
        supabase.from('loan_history').select('game_id, loan_date, return_date').in('loan_date', jours),
      ])
      if (enCours.error) throw enCours.error
      if (rendus.error) throw rendus.error
      for (const p of [...(enCours.data ?? []), ...(rendus.data ?? [])]) {
        (pretsParJour[p.loan_date] ??= []).push(p)
      }
    }

    const rappels = rappelsAEnvoyer({ maintenant, evenements: evenements ?? [], pretsParJour })
    // 3. Jeu de la semaine : rappel du jeudi 17 h
    const jeuSemaine = await rappelDuJeudi(maintenant)
    if (simulation) return json({ simulation: true, maintenant, rappels, jeu_semaine: jeuSemaine })

    let envoyes = 0
    for (const r of rappels) {
      const envoi = await sendPush({ title: r.title, body: r.body, url: r.url })
      if (!accepte(envoi)) continue
      envoyes++
      const { error } = await supabase.from('events').update({ [r.colonne]: new Date().toISOString() }).eq('id', r.id)
      if (error) console.error(`Erreur mise à jour ${r.colonne}:`, error.message)
    }

    let jeuSemaineEnvoye = false
    if (jeuSemaine && accepte(await sendPush({ title: jeuSemaine.title, body: jeuSemaine.body, url: jeuSemaine.url }))) {
      jeuSemaineEnvoye = true
      const { error } = await supabase.from('rappels_jeu_semaine').insert({ semaine: jeuSemaine.semaine })
      if (error) console.error('Rappel jeu de la semaine (mémorisation) :', error.message)
    }
    const copiesEffacees = await effacerCopiesAnciennes()

    return json({ success: true, starting_notified: startingCount, rappels: rappels.length, envoyes, jeu_semaine_envoye: jeuSemaineEnvoye, copies_effacees: copiesEffacees })
  } catch (error) {
    console.error('Erreur générale check-events-notify:', error)
    // Les erreurs de Supabase ne sont pas toujours des « Error » : on lit leur message
    const message = (error as { message?: string })?.message ?? String(error)
    return json({ error: message }, 500)
  }
})
