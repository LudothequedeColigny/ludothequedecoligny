import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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
  if (!res.ok) {
    console.error('Erreur appel send-push:', res.status, await res.text())
  }
}

serve(async (_req) => {
  try {
    const now = new Date()

    // 1. Notifications de début d'événement (dans les 15 prochaines minutes)
    const in15 = new Date(now.getTime() + 15 * 60 * 1000)
    const { data: startingEvents, error: startErr } = await supabase
      .from('events')
      .select('id, title, date')
      .gte('date', now.toISOString())
      .lte('date', in15.toISOString())
      .is('notif_bilan_sent_at', null)

    if (startErr) console.error('Erreur requête événements à venir:', startErr.message)

    for (const ev of startingEvents ?? []) {
      await sendPush({
        title: `🎲 ${ev.title} commence !`,
        body: 'Pensez à noter le nombre de participants, prendre des photos et renseigner les jeux joués.',
        url: '/admin/evenements',
      })
    }

    // 2. Rappels de bilan pour les événements d'hier sans participants renseignés
    const yesterday = new Date(now)
    yesterday.setUTCDate(yesterday.getUTCDate() - 1)
    const yesterdayStart = new Date(Date.UTC(yesterday.getUTCFullYear(), yesterday.getUTCMonth(), yesterday.getUTCDate(), 0, 0, 0))
    const yesterdayEnd = new Date(Date.UTC(yesterday.getUTCFullYear(), yesterday.getUTCMonth(), yesterday.getUTCDate(), 23, 59, 59, 999))

    const { data: bilanEvents, error: bilanErr } = await supabase
      .from('events')
      .select('id, title, date')
      .gte('date', yesterdayStart.toISOString())
      .lte('date', yesterdayEnd.toISOString())
      .is('participants_count', null)
      .is('notif_bilan_sent_at', null)

    if (bilanErr) console.error('Erreur requête événements à bilan:', bilanErr.message)

    for (const ev of bilanEvents ?? []) {
      await sendPush({
        title: `📋 Bilan de ${ev.title}`,
        body: "N'oubliez pas de renseigner le nombre de participants, les photos et les jeux joués !",
        url: '/admin/evenements',
      })
      const { error: updateErr } = await supabase
        .from('events')
        .update({ notif_bilan_sent_at: new Date().toISOString() })
        .eq('id', ev.id)
      if (updateErr) console.error('Erreur mise à jour notif_bilan_sent_at:', updateErr.message)
    }

    return new Response(
      JSON.stringify({
        success: true,
        starting_notified: startingEvents?.length ?? 0,
        bilan_notified: bilanEvents?.length ?? 0,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Erreur générale check-events-notify:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})
