import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import webpush from 'npm:web-push@3.6.7'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY')!
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY')!
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') ?? 'mailto:ludothequedecoligny@outlook.fr'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS })
  }

  try {
    const { title, body, url } = await req.json()

    if (!title || !body) {
      return new Response(
        JSON.stringify({ error: 'Paramètres manquants : title, body requis' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
      )
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    const { data: subscriptions, error } = await supabase
      .from('push_subscriptions')
      .select('id, endpoint, subscription')

    if (error) {
      console.error('Erreur récupération abonnements push:', error.message)
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
      })
    }

    const payload = JSON.stringify({ title, body, url: url ?? '/admin/evenements' })

    let sent = 0
    let expired = 0

    await Promise.all((subscriptions ?? []).map(async (sub) => {
      try {
        await webpush.sendNotification(sub.subscription, payload)
        sent++
      } catch (err) {
        const statusCode = err?.statusCode
        if (statusCode === 410 || statusCode === 404) {
          expired++
          const { error: deleteError } = await supabase.from('push_subscriptions').delete().eq('id', sub.id)
          if (deleteError) console.error('Erreur suppression abonnement expiré:', deleteError.message)
        } else {
          console.error('Erreur envoi push:', sub.endpoint, err?.message)
        }
      }
    }))

    return new Response(
      JSON.stringify({ success: true, total: subscriptions?.length ?? 0, sent, expired }),
      { status: 200, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
    )
  } catch (error) {
    console.error('Erreur générale send-push:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    })
  }
})
