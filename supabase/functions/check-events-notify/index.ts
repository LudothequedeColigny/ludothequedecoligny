import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
// Règles des rappels : module JavaScript testé par `npm test`
import { rappelsAEnvoyer, estPermanence } from './rappels.js'

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
    if (simulation) return json({ simulation: true, maintenant, rappels })

    let envoyes = 0
    for (const r of rappels) {
      const { status } = await sendPush({ title: r.title, body: r.body, url: r.url })
      // Mémorisé seulement si send-push a accepté : sinon nouvel essai 15 min plus tard
      if (status < 200 || status >= 300) continue
      envoyes++
      const { error } = await supabase.from('events').update({ [r.colonne]: new Date().toISOString() }).eq('id', r.id)
      if (error) console.error(`Erreur mise à jour ${r.colonne}:`, error.message)
    }

    return json({ success: true, starting_notified: startingCount, rappels: rappels.length, envoyes })
  } catch (error) {
    console.error('Erreur générale check-events-notify:', error)
    return json({ error: error instanceof Error ? error.message : String(error) }, 500)
  }
})
