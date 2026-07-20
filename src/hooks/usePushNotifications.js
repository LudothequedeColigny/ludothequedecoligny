import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../services/supabaseClient'

const VAPID_PUBLIC_KEY = 'BJY-Dm41iAZH0ORCNSEfOLUhcA7C-9zTebrSI5QeG0DtKdd22OgTuERlbEzKQMkQXofU_TTOObGNqaUbbGDEQr8'

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)))
}

export function usePushNotifications() {
  const isSupported = typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window
  const [isSubscribed, setIsSubscribed] = useState(false)

  useEffect(() => {
    if (!isSupported) return
    async function checkSubscription() {
      try {
        const registration = await navigator.serviceWorker.ready
        const existingSub = await registration.pushManager.getSubscription()
        setIsSubscribed(!!existingSub)
      } catch (error) {
        console.error('Erreur vérification abonnement push:', error.message)
      }
    }
    checkSubscription()
  }, [isSupported])

  const subscribe = useCallback(async () => {
    if (!isSupported) return
    try {
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') return

      const registration = await navigator.serviceWorker.ready
      const sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      })

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        console.error('Erreur abonnement push: utilisateur non connecté')
        return
      }

      const { data, error } = await supabase
        .from('push_subscriptions')
        .upsert(
          { user_id: user.id, endpoint: sub.endpoint, subscription: sub.toJSON() },
          { onConflict: 'endpoint' }
        )
        .select()

      if (error || !data || data.length === 0) {
        console.error('Erreur enregistrement abonnement push:', error?.message)
        return
      }

      setIsSubscribed(true)
    } catch (error) {
      console.error('Erreur abonnement push:', error.message)
    }
  }, [isSupported])

  const unsubscribe = useCallback(async () => {
    if (!isSupported) return
    try {
      const registration = await navigator.serviceWorker.ready
      const sub = await registration.pushManager.getSubscription()
      if (sub) {
        const { error } = await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
        if (error) console.error('Erreur suppression abonnement push:', error.message)
        await sub.unsubscribe()
      }
      setIsSubscribed(false)
    } catch (error) {
      console.error('Erreur désabonnement push:', error.message)
    }
  }, [isSupported])

  return { isSubscribed, isSupported, subscribe, unsubscribe }
}
