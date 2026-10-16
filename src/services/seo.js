// Ce que Google lit sur chaque page publique : titre, description, adresse de
// référence, et « données structurées » (fiche d'identité de la ludothèque,
// événements à venir) au format schema.org.
//
// Le site est une seule page dont le contenu change : sans ces réglages, toutes
// les pages portaient le même titre dans les résultats de Google.

import { useEffect } from 'react'

export const SITE_URL = 'https://www.ludothequedecoligny.fr'
const NOM_SITE = 'Ludothèque de Coligny'
export const FACEBOOK_URL = 'https://www.facebook.com/groups/ludothequedecoligny'

function setMeta(attr, key, content) {
  let el = document.head.querySelector(`meta[${attr}="${key}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, key)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

function setCanonical(href) {
  let el = document.head.querySelector('link[rel="canonical"]')
  if (!el) {
    el = document.createElement('link')
    el.setAttribute('rel', 'canonical')
    document.head.appendChild(el)
  }
  el.setAttribute('href', href)
}

/**
 * Titre, description et adresse de référence de la page.
 * `noindex` : page à ne pas montrer dans Google (connexion, 404…).
 */
export function usePageMeta({ title, description, path = '/', noindex = false }) {
  useEffect(() => {
    const fullTitle = title ? `${title} – ${NOM_SITE}` : NOM_SITE
    document.title = fullTitle
    if (description) {
      setMeta('name', 'description', description)
      setMeta('property', 'og:description', description)
    }
    setMeta('property', 'og:title', fullTitle)
    setMeta('property', 'og:url', SITE_URL + path)
    setCanonical(SITE_URL + path)
    setMeta('name', 'robots', noindex ? 'noindex' : 'index, follow')
  }, [title, description, path, noindex])
}

/** Ajoute un bloc de données structurées à la page, retiré en la quittant. */
export function useJsonLd(id, data) {
  const json = data ? JSON.stringify(data) : null
  useEffect(() => {
    if (!json) return
    const el = document.createElement('script')
    el.type = 'application/ld+json'
    el.id = `ld-${id}`
    el.textContent = json
    document.head.appendChild(el)
    return () => el.remove()
  }, [id, json])
}

// ── Dates à l'heure de Paris ────────────────────────────────────────────────
// Les dates des événements sont enregistrées sans fuseau (« 2026-10-24T14:00:00 »,
// heure de Coligny). Google exige le décalage horaire : on ajoute celui de Paris
// à cette date (+01:00 l'hiver, +02:00 l'été), quel que soit le fuseau de
// l'ordinateur qui affiche la page.
function decalageParis(dateNaive) {
  const instant = new Date(`${dateNaive.slice(0, 10)}T12:00:00Z`)
  const nom = new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/Paris', timeZoneName: 'longOffset' })
    .formatToParts(instant).find(p => p.type === 'timeZoneName')?.value || 'GMT+01:00'
  return nom.replace('GMT', '') || '+00:00'
}

function dateParis(dateNaive, heure) {
  if (!dateNaive) return null
  const jour = dateNaive.slice(0, 10)
  const h = (heure || dateNaive.slice(11, 16) || '00:00').slice(0, 5)
  return `${jour}T${h}:00${decalageParis(dateNaive)}`
}

const ADRESSE = adresse => ({
  '@type': 'PostalAddress',
  streetAddress: adresse.rue,
  postalCode: adresse.code_postal,
  addressLocality: adresse.ville,
  addressCountry: 'FR',
})

// ── Fiche d'identité de la ludothèque ──────────────────────────────────────
/**
 * Les horaires (« 1er et 3e samedis du mois ») ne s'expriment pas en horaires
 * hebdomadaires : on donne à Google chaque date d'ouverture des trois prochains
 * mois, ce qui évite qu'il affiche « Ouvert » les samedis où c'est fermé.
 */
export function ficheLudotheque({ adresse, horaires, telephone, facebook = FACEBOOK_URL }) {
  const creneaux = [
    { jour: horaires.horaire_1_jour, rang: horaires.horaire_1_rang, debut: horaires.horaire_1_debut, fin: horaires.horaire_1_fin, actif: true },
    { jour: horaires.horaire_2_jour, rang: horaires.horaire_2_rang, debut: horaires.horaire_2_debut, fin: horaires.horaire_2_fin, actif: horaires.horaire_2_actif === 'true' },
  ].filter(c => c.actif && c.debut && c.fin)

  return {
    '@context': 'https://schema.org',
    '@type': 'Library',
    '@id': `${SITE_URL}/#ludotheque`,
    name: NOM_SITE,
    description: "Ludothèque associative de Coligny (Ain), portée par l'association PACTES : prêt de jeux de société, après-midis et soirées jeux pour petits et grands.",
    url: SITE_URL,
    logo: `${SITE_URL}/icon-512.png`,
    image: `${SITE_URL}/partage.png`,
    ...(telephone ? { telephone } : {}),
    ...(adresse?.rue ? { address: ADRESSE(adresse) } : {}),
    areaServed: ['Coligny', 'Bresse', 'Ain'],
    parentOrganization: { '@type': 'Organization', name: 'Association PACTES' },
    ...(facebook ? { sameAs: [facebook] } : {}),
    ...(creneaux.length ? { openingHoursSpecification: datesOuverture(creneaux) } : {}),
  }
}

const JOURS = { lundi: 1, mardi: 2, mercredi: 3, jeudi: 4, vendredi: 5, samedi: 6, dimanche: 0 }
const JOURS_EN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

/** Dates précises des permanences des 3 prochains mois (« 1er samedi », « dernier samedi »…). */
function datesOuverture(creneaux) {
  const aujourdhui = new Date()
  const specs = []
  for (let m = 0; m < 3; m++) {
    const annee = aujourdhui.getFullYear()
    const mois = aujourdhui.getMonth() + m
    for (const c of creneaux) {
      const jourSemaine = JOURS[(c.jour || 'samedi').toLowerCase()] ?? 6
      const dates = []
      const d = new Date(annee, mois, 1)
      while (d.getMonth() === ((mois % 12) + 12) % 12) {
        if (d.getDay() === jourSemaine) dates.push(new Date(d))
        d.setDate(d.getDate() + 1)
      }
      const rang = Number(c.rang)
      const date = rang === 5 ? dates[dates.length - 1] : dates[rang - 1]
      if (!date) continue
      const iso = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
      if (date < new Date(aujourdhui.toDateString())) continue
      specs.push({
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: `https://schema.org/${JOURS_EN[jourSemaine]}`,
        opens: c.debut.slice(0, 5),
        closes: c.fin.slice(0, 5),
        validFrom: iso,
        validThrough: iso,
      })
    }
  }
  return specs
}

// ── Événements ─────────────────────────────────────────────────────────────
/** Événements à venir, au format que Google utilise pour ses listes d'événements. */
export function evenementsPourGoogle(evenements, adresse) {
  const lieuParDefaut = {
    '@type': 'Place',
    name: NOM_SITE,
    ...(adresse?.rue ? { address: ADRESSE(adresse) } : {}),
  }
  return (evenements || []).filter(e => e.date && e.title).map(e => ({
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: e.title,
    startDate: dateParis(e.date),
    ...(e.end_time ? { endDate: dateParis(e.date, e.end_time) } : {}),
    eventStatus: 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    // Le lieu saisi (« Salle des fêtes de Coligny ») peut différer de la ludothèque :
    // on le transmet tel quel, en précisant la commune.
    location: e.location
      ? {
          '@type': 'Place',
          name: e.location,
          address: {
            '@type': 'PostalAddress',
            streetAddress: e.location,
            addressLocality: adresse?.ville || 'Coligny',
            ...(adresse?.code_postal ? { postalCode: adresse.code_postal } : {}),
            addressCountry: 'FR',
          },
        }
      : lieuParDefaut,
    ...(e.description ? { description: e.description } : {}),
    // Les images collées directement dans la fiche (data:…) ne sont pas des adresses web
    ...(e.image_url && e.image_url.startsWith('http') ? { image: [e.image_url] } : {}),
    organizer: { '@type': 'Organization', name: NOM_SITE, url: SITE_URL },
  }))
}
