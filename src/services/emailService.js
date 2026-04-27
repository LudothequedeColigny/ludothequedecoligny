import { supabase } from './supabaseClient'

/**
 * Envoie un email via la Supabase Edge Function send-email (Resend)
 * @param {string|string[]} to - Destinataire(s)
 * @param {string} subject - Objet du mail
 * @param {string} html - Corps du mail en HTML
 */
export async function sendEmail({ to, subject, html, image_url = null, image_urls = null, send_confirmation = false }) {
  const { data, error } = await supabase.functions.invoke('send-email', {
    body: { to, subject, html, image_url, image_urls, send_confirmation },
  })

  if (error) throw error
  return data
}

/**
 * Génère la liste complète des destinataires (mairies + adhérents)
 * @returns {Promise<string[]>}
 */
export async function getAllRecipients() {
  const collectivites = [
    "mairie@domsure.fr",
    "mairie@beaupont.fr",
    "mairie.verjon@wanadoo.fr",
    "contact@mairie-beny.fr",
    "accueil@saintamour39.fr",
    "mairie@lestroischateaux.fr",
    "mairie.valdepy@orange.fr",
    "villemotier@wanadoo.fr",
    "mairie.valsuran@valsuran.fr",
    "mairie@andelot-morval.fr",
    "mairie.veria@wanadoo.fr",
    "mairie.broissia@orange.fr",
    "mairie.balanod@aricia.fr",
    "mairie.montagnalereconduit@wanadoo.fr",
    "mairiejoudes@wanadoo.fr",
    "mairie.condal@wanadoo.fr",
    "mairie@cormoz.fr",
    "mairie@foissiat.com",
    "mairie@saintetiennedubois.fr",
    "genemapi@hotmail.fr",
    "mairie-salavre@orange.fr",
  ]

  const { data: members } = await supabase.from('members').select('email')
  const memberEmails = members
    ? members.map(m => m.email).filter(e => e && e.includes('@'))
    : []

  return [...new Set([...collectivites, ...memberEmails])]
}

/**
 * Formate le corps HTML d'un email d'événement
 */
export function formatEventEmailHtml(event) {
  const start = new Date(event.date)
  const dateFormatee = start.toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'long', year: 'numeric'
  })
  const heureDebut = start.toLocaleTimeString('fr-FR', {
    hour: '2-digit', minute: '2-digit'
  })
  const plageHoraire = event.end_time
    ? `de ${heureDebut} à ${event.end_time.replace(':', 'h')}`
    : `à partir de ${heureDebut}`

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1a1a1a;">
      <div style="background-color: #1a5f7a; padding: 24px; border-radius: 12px 12px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 20px;">Association PACTES – Ludothèque de Coligny</h1>
      </div>
      <div style="background-color: #fdfaf6; padding: 32px; border-radius: 0 0 12px 12px; border: 1px solid #e2e8f0;">
        <p>Bonjour,</p>
        <p>L'association PACTES à Coligny souhaiterait vous informer d'un événement organisé :</p>
        <div style="background-color: white; border-left: 4px solid #e38154; padding: 16px; margin: 24px 0; border-radius: 0 8px 8px 0;">
          <h2 style="color: #1a5f7a; margin: 0 0 8px 0; font-size: 18px;">${event.title}</h2>
          <p style="margin: 4px 0;">📅 Le <strong>${dateFormatee}</strong> — ${plageHoraire}</p>
          <p style="margin: 4px 0;">📍 ${event.location}</p>
          ${event.description ? `<p style="margin: 12px 0 0 0; color: #555;">${event.description}</p>` : ''}
        </div>
        <p>Pourriez-vous intégrer cet événement dans vos communications afin de le faire connaître à vos concitoyens ?</p>
        <p>Vous en souhaitant bonne réception.</p>
        <p>Bonne journée.</p>
        <p style="margin-top: 24px;">
          <strong>Victor Guyon</strong><br/>
          06 71 41 56 96<br/>
          <a href="https://www.ludothequedecoligny.fr" style="color: #1a5f7a;">www.ludothequedecoligny.fr</a>
        </p>
      </div>
    </div>
  `
}