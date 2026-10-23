# Rappels push Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rappels sur les téléphones des bénévoles (annonce à J-10, story le matin du jour J, bilan de permanence, bilan de soirée le lendemain), chacun une seule fois, qui ouvrent directement la bonne fenêtre.

**Architecture:** Règles pures en JavaScript dans le dossier de la fonction serveur (`rappels.js`, testées par Node, importées par Deno) → `check-events-notify/index.ts` lit événements et prêts, envoie par `send-push`, mémorise l'envoi ; mode simulation sans envoi. Côté site : dates de publication écrites par les fenêtres, et ouverture d'une fenêtre par `?annonce=` / `?bilan=`.

**Tech Stack:** Supabase Edge Functions (Deno), Postgres, React 18 + react-router, `node --test`.

**Spec:** `docs/superpowers/specs/2026-10-23-rappels-push-design.md`

## Global Constraints

- Dates des événements à l'heure de Paris sans fuseau (`timestamp without time zone`) ; côté serveur, comparer à `heureDeParis(now)`, jamais à l'heure universelle.
- `send-push` n'accepte que la clé de service de la fonction (renouvelée le 22/10/2026) : ne jamais l'appeler avec une autre clé ; ne jamais lancer de vrai envoi pendant les essais.
- Prêts : lire seulement `game_id`, `loan_date`, `return_date` — jamais l'emprunteur.
- Aucune écriture en base ni déploiement pendant les tâches (la migration et le déploiement se font à la mise en ligne, avec l'accord de Victor) ; essais navigateur avec écritures, stockage et Make interceptés.
- Code, commentaires et textes en français ; `npm run lint` 0 erreur (5 avertissements connus ; la commande sort en code 1 à cause d'eux, c'est normal) ; `npm test` vert.
- Commits : `git -c user.email=victor.guyon@hotmail.fr commit …`, message terminé par `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` ; jamais de `git push`.

## File Structure

| Fichier | Rôle |
|---|---|
| `supabase/functions/check-events-notify/rappels.js` (créé) | règles pures des rappels |
| `supabase/functions/check-events-notify/rappels.test.js` (créé) | tests (Node) |
| `package.json` (modifié) | `npm test` inclut `supabase/functions/**/*.test.js` |
| `supabase/migrations/20261023_rappels_push.sql` (créé) | 4 colonnes sur `events` |
| `supabase/functions/check-events-notify/index.ts` (modifié) | lecture, envoi, mémorisation, simulation |
| `src/components/admin/annonce/PublicationAnnonce.jsx` (modifié) | écrit `annonce_publiee_le` |
| `src/components/admin/bilan/PublicationBilan.jsx` (modifié) | écrit `bilan_publie_le` |
| `src/components/admin/bilan/PublicationBilanPermanence.jsx` (modifié) | écrit `bilan_publie_le` |
| `src/pages/admin/Evenements.jsx` (modifié) | ouvre la fenêtre demandée par `?annonce=` / `?bilan=` |
| `CLAUDE.md` (modifié) | piège « Notifications » complété |

---

### Task 1: Règles des rappels

**Files:**
- Create: `supabase/functions/check-events-notify/rappels.js`
- Test: `supabase/functions/check-events-notify/rappels.test.js`
- Modify: `package.json` (script `test`)

**Interfaces:**
- Produces (Task 2) : `typeEvenement(titre)`, `estPermanence(titre)`, `jeuxEmpruntes(prets): number`, `rappelsAEnvoyer({ maintenant: 'AAAA-MM-JJTHH:MM:SS', evenements, pretsParJour }): { id, colonne, title, body, url }[]` avec `colonne` ∈ `notif_annonce_sent_at | notif_jour_sent_at | notif_bilan_sent_at` et `url` = `/admin/evenements?annonce={id}` ou `?bilan={id}`.

- [ ] **Step 1: Élargir `npm test`**

Dans `package.json`, remplacer la ligne du script `test` par :
`"test": "TZ=Europe/Paris node --test \"src/**/*.test.js\" \"supabase/functions/**/*.test.js\"",`

- [ ] **Step 2: Écrire les tests** — `supabase/functions/check-events-notify/rappels.test.js` :

```js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { typeEvenement, estPermanence, jeuxEmpruntes, rappelsAEnvoyer } from './rappels.js'

const halloween = { id: 42, title: 'Soirée jeux de société - Spécial Halloween', date: '2026-11-06 19:00:00', end_time: '', archived_at: null }
const perm = { id: 43, title: 'Permanence de la ludothèque', date: '2026-11-07 10:00:00', end_time: '12:00', archived_at: null }
const rappels = (maintenant, evenements, pretsParJour) => rappelsAEnvoyer({ maintenant, evenements, pretsParJour })

test('genres : mêmes règles que le site', () => {
  assert.equal(typeEvenement('Soirée jeux'), 'soiree')
  assert.equal(typeEvenement('Après-midi jeux en famille'), 'famille')
  assert.equal(typeEvenement('Fête du jeu'), 'permanence')
  assert.equal(estPermanence('Permanence de la ludothèque'), true)
  assert.equal(estPermanence('Fête du jeu'), false)
  assert.equal(estPermanence('Soirée jeux à la place de la permanence'), false)
})

test('jeux empruntés : distincts, rendu le jour même non compté', () => {
  assert.equal(jeuxEmpruntes([
    { game_id: 1, loan_date: '2026-11-07' },
    { game_id: 1, loan_date: '2026-11-07' },
    { game_id: 2, loan_date: '2026-11-07', return_date: '2026-11-07' },
    { game_id: 3, loan_date: '2026-11-07', return_date: '2026-11-21' },
  ]), 2)
  assert.equal(jeuxEmpruntes([]), 0)
})

test('annonce : à J-10 à partir de 18h, une seule fois, pas si publiée', () => {
  assert.deepEqual(rappels('2026-10-27T17:45:00', [halloween]), [])
  assert.deepEqual(rappels('2026-10-27T18:00:00', [halloween]), [{
    id: 42, colonne: 'notif_annonce_sent_at', title: '📣 Soirée jeux de société - Spécial Halloween dans 10 jours',
    body: "Publiez l'annonce sur Facebook et Instagram.", url: '/admin/evenements?annonce=42',
  }])
  assert.deepEqual(rappels('2026-10-26T18:00:00', [halloween]), [])
  assert.deepEqual(rappels('2026-10-27T18:00:00', [{ ...halloween, notif_annonce_sent_at: '2026-10-27T17:00:00Z' }]), [])
  assert.deepEqual(rappels('2026-10-27T18:00:00', [{ ...halloween, annonce_publiee_le: '2026-10-25T10:00:00Z' }]), [])
  assert.deepEqual(rappels('2026-10-27T18:00:00', [{ ...halloween, archived_at: '2026-10-01' }]), [])
})

test('annonce : événement créé tard → le soir même ; « demain », « aujourd’hui »', () => {
  assert.equal(rappels('2026-11-01T18:15:00', [halloween])[0].title, '📣 Soirée jeux de société - Spécial Halloween dans 5 jours')
  assert.equal(rappels('2026-11-05T18:15:00', [halloween])[0].title, '📣 Soirée jeux de société - Spécial Halloween demain')
  const storyFaite = { ...halloween, notif_jour_sent_at: 'x' }
  assert.deepEqual(rappels('2026-11-06T18:15:00', [storyFaite]).map(r => r.title), ["📣 Soirée jeux de société - Spécial Halloween aujourd'hui"])
  assert.deepEqual(rappels('2026-11-06T19:30:00', [storyFaite]), [])
})

test('annonce : jamais pour une permanence ni un autre événement', () => {
  assert.deepEqual(rappels('2026-10-28T18:00:00', [perm, { ...perm, id: 44, title: 'Fête du jeu' }]), [])
})

test('story : le jour J à partir de 9h, tout événement, une seule fois', () => {
  assert.deepEqual(rappels('2026-11-07T08:45:00', [perm]), [])
  assert.deepEqual(rappels('2026-11-07T09:00:00', [perm]), [{
    id: 43, colonne: 'notif_jour_sent_at', title: "📸 C'est aujourd'hui : Permanence de la ludothèque",
    body: 'Enregistrez la story du jour J, puis publiez-la sur Instagram ou Facebook.', url: '/admin/evenements?annonce=43',
  }])
  assert.deepEqual(rappels('2026-11-07T09:00:00', [{ ...perm, notif_jour_sent_at: 'x' }]), [])
})

test('bilan de permanence : 1 h après la fin, pendant 24 h, avec des emprunts', () => {
  const prets = { '2026-11-07': [{ game_id: 1, loan_date: '2026-11-07' }, { game_id: 2, loan_date: '2026-11-07' }] }
  const p = { ...perm, notif_jour_sent_at: 'x' }
  assert.deepEqual(rappels('2026-11-07T12:45:00', [p], prets), [])
  assert.deepEqual(rappels('2026-11-07T13:00:00', [p], prets), [{
    id: 43, colonne: 'notif_bilan_sent_at', title: '📦 2 jeux empruntés ce matin',
    body: 'Publiez le bilan de la permanence sur Facebook et Instagram.', url: '/admin/evenements?bilan=43',
  }])
  assert.equal(rappels('2026-11-08T11:45:00', [p], prets).length, 1)
  assert.deepEqual(rappels('2026-11-08T12:00:00', [p], prets), [])
  assert.deepEqual(rappels('2026-11-07T13:00:00', [p], {}), [])
  assert.deepEqual(rappels('2026-11-07T13:00:00', [{ ...p, bilan_publie_le: 'x' }], prets), [])
  assert.deepEqual(rappels('2026-11-07T13:00:00', [{ ...p, notif_bilan_sent_at: 'x' }], prets), [])
})

test('bilan de permanence : singulier, après-midi, sans heure de fin', () => {
  const apm = { ...perm, date: '2026-11-21 14:00:00', end_time: '16:00', notif_jour_sent_at: 'x' }
  assert.equal(rappels('2026-11-21T17:00:00', [apm], { '2026-11-21': [{ game_id: 5, loan_date: '2026-11-21' }] })[0].title, '📦 1 jeu emprunté cet après-midi')
  const sansFin = { ...perm, end_time: null, notif_jour_sent_at: 'x' }
  const prets = { '2026-11-07': [{ game_id: 1, loan_date: '2026-11-07' }] }
  assert.deepEqual(rappels('2026-11-07T12:45:00', [sansFin], prets), [])
  assert.equal(rappels('2026-11-07T13:00:00', [sansFin], prets).length, 1)
})

test('bilan de soirée : le lendemain à partir de 9h, pas si publié', () => {
  const h = { ...halloween, notif_annonce_sent_at: 'x', notif_jour_sent_at: 'x' }
  assert.deepEqual(rappels('2026-11-07T08:45:00', [h]), [])
  assert.deepEqual(rappels('2026-11-07T09:00:00', [h]), [{
    id: 42, colonne: 'notif_bilan_sent_at', title: '📋 Bilan de Soirée jeux de société - Spécial Halloween',
    body: 'Renseignez les participants, les photos et les jeux joués, puis publiez le bilan.', url: '/admin/evenements?bilan=42',
  }])
  assert.deepEqual(rappels('2026-11-08T09:00:00', [h]), [])
  assert.deepEqual(rappels('2026-11-07T09:00:00', [{ ...h, bilan_publie_le: 'x' }]), [])
  assert.deepEqual(rappels('2026-11-08T09:00:00', [{ ...perm, notif_jour_sent_at: 'x' }], {}), [])
})
```

- [ ] **Step 3: Lancer — échec attendu** : `npm test` → FAIL (module `./rappels.js` introuvable).

- [ ] **Step 4: Écrire `supabase/functions/check-events-notify/rappels.js`**

```js
/**
 * Rappels envoyés aux téléphones des bénévoles par la tâche planifiée check-events-notify
 * (toutes les 15 min). Fonctions pures : testées par `npm test` (Node), utilisées telles
 * quelles par la fonction serveur (Deno).
 * Conception : docs/superpowers/specs/2026-10-23-rappels-push-design.md
 * Les dates des événements sont à l'heure de Paris, sans fuseau (« 2026-11-06 19:00:00 ») ;
 * `maintenant` est écrit de la même façon (« 2026-11-06T09:05:00 »).
 */

const sansAccents = t => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

// Mêmes règles que typeEvenement (src/services/diapos/regles.js) et estPermanence
// (src/services/diapos/permanence-regles.js) : la fonction serveur ne peut pas importer le site
export function typeEvenement(titre) {
  const t = sansAccents(titre)
  if (t.includes('soiree')) return 'soiree'
  if (t.includes('famil')) return 'famille'
  return 'permanence'
}
export const estPermanence = titre => typeEvenement(titre) === 'permanence' && sansAccents(titre).includes('permanence')

const MINUTES_JOUR = 24 * 60

// « 12:00 » ou « 12:00:00 » → 720
function minutesDe(heure) {
  const [h, m] = String(heure).split(':').map(Number)
  return (h || 0) * 60 + (m || 0)
}
// « 2026-11-06 19:00:00 » → { jour: '2026-11-06', minutes: 1140 }
function lire(texte) {
  const [jour, heure = '00:00'] = String(texte).replace('T', ' ').split(' ')
  return { jour, minutes: minutesDe(heure) }
}
// Numéro du jour dans le calendrier (sans fuseau) et instant en minutes
const numeroJour = jour => { const [a, m, j] = jour.split('-').map(Number); return Date.UTC(a, m - 1, j) / 86400000 }
const instant = ({ jour, minutes }) => numeroJour(jour) * MINUTES_JOUR + minutes

/** Jeux distincts empruntés : un prêt rendu le jour même ne compte pas (même règle que le bilan). */
export function jeuxEmpruntes(prets) {
  const jeux = new Set()
  for (const p of prets) {
    const renduLeJourMeme = p.return_date && p.loan_date
      && String(p.return_date).slice(0, 10) === String(p.loan_date).slice(0, 10)
    if (!renduLeJourMeme) jeux.add(p.game_id)
  }
  return jeux.size
}

const dansCombien = n => (n >= 2 ? `dans ${n} jours` : n === 1 ? 'demain' : "aujourd'hui")
const moment = minutesFin => (minutesFin < 13 * 60 ? 'ce matin' : minutesFin < 18 * 60 ? 'cet après-midi' : 'ce soir')

/**
 * Rappels à envoyer à l'instant `maintenant` : [{ id, colonne, title, body, url }].
 * `colonne` = date d'envoi à mémoriser sur l'événement (le rappel ne repart plus).
 * `pretsParJour` : { 'AAAA-MM-JJ': [{ game_id, loan_date, return_date? }] } (permanences).
 */
export function rappelsAEnvoyer({ maintenant, evenements, pretsParJour = {} }) {
  const n = lire(maintenant)
  const tMaintenant = instant(n)
  const rappels = []
  for (const ev of evenements) {
    if (ev.archived_at) continue
    const d = lire(ev.date)
    const type = typeEvenement(ev.title)
    const joursAvant = numeroJour(d.jour) - numeroJour(n.jour)
    const ajouter = (colonne, title, body, fenetre) => rappels.push({ id: ev.id, colonne, title, body, url: `/admin/evenements?${fenetre}=${ev.id}` })

    // 1. Annonce : soirée ou famille à venir dans 10 jours au plus, à partir de 18h
    if (type !== 'permanence' && !ev.annonce_publiee_le && !ev.notif_annonce_sent_at
      && n.minutes >= 18 * 60 && instant(d) > tMaintenant && joursAvant <= 10) {
      ajouter('notif_annonce_sent_at', `📣 ${ev.title} ${dansCombien(joursAvant)}`, "Publiez l'annonce sur Facebook et Instagram.", 'annonce')
    }
    // 2. Story : le jour J à partir de 9h, tout événement
    if (joursAvant === 0 && n.minutes >= 9 * 60 && !ev.notif_jour_sent_at) {
      ajouter('notif_jour_sent_at', `📸 C'est aujourd'hui : ${ev.title}`, 'Enregistrez la story du jour J, puis publiez-la sur Instagram ou Facebook.', 'annonce')
    }
    if (ev.bilan_publie_le || ev.notif_bilan_sent_at) continue
    // 3. Bilan de permanence : 1 h après la fin, pendant 24 h, s'il y a eu des emprunts
    if (estPermanence(ev.title)) {
      const minutesFin = ev.end_time ? minutesDe(ev.end_time) : d.minutes + 120
      const fin = numeroJour(d.jour) * MINUTES_JOUR + minutesFin
      const nb = jeuxEmpruntes(pretsParJour[d.jour] || [])
      if (tMaintenant >= fin + 60 && tMaintenant < fin + MINUTES_JOUR && nb > 0) {
        ajouter('notif_bilan_sent_at', `📦 ${nb} ${nb === 1 ? 'jeu emprunté' : 'jeux empruntés'} ${moment(minutesFin)}`, 'Publiez le bilan de la permanence sur Facebook et Instagram.', 'bilan')
      }
    }
    // 4. Bilan de soirée ou d'après-midi famille : le lendemain à partir de 9h
    if (type !== 'permanence' && joursAvant === -1 && n.minutes >= 9 * 60) {
      ajouter('notif_bilan_sent_at', `📋 Bilan de ${ev.title}`, 'Renseignez les participants, les photos et les jeux joués, puis publiez le bilan.', 'bilan')
    }
  }
  return rappels
}
```

- [ ] **Step 5: Lancer — succès attendu** : `npm test` (42 anciens + 9 nouveaux), `npm run lint` (0 erreur ; si ESLint signale le dossier `supabase/functions`, ne changer la configuration que si nécessaire et le dire dans le rapport).

- [ ] **Step 6: Commit**

```bash
git add package.json supabase/functions/check-events-notify/rappels.js supabase/functions/check-events-notify/rappels.test.js
git -c user.email=victor.guyon@hotmail.fr commit -m "feat: règles des rappels sur les téléphones des bénévoles

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Fonction serveur et migration

**Files:**
- Create: `supabase/migrations/20261023_rappels_push.sql`
- Modify: `supabase/functions/check-events-notify/index.ts`

**Interfaces:**
- Consumes: `rappelsAEnvoyer`, `estPermanence` (Task 1).
- Produces: colonnes `events.annonce_publiee_le`, `bilan_publie_le`, `notif_annonce_sent_at`, `notif_jour_sent_at` (timestamptz) ; corps `{"simulation": true, "maintenant": "AAAA-MM-JJTHH:MM:SS"}` → `{ simulation: true, maintenant, rappels }` sans envoi ni écriture.

- [ ] **Step 1: Migration** — `supabase/migrations/20261023_rappels_push.sql` :

```sql
-- Rappels sur les téléphones des bénévoles (étape 4 de la communication) :
-- dates de publication de l'annonce et du bilan, dates d'envoi des rappels.
-- Colonnes d'une table existante : droits hérités (lecture publique, modification par les
-- bénévoles connectés, fonction serveur avec la clé de service). Aucune donnée personnelle.
-- Conception : docs/superpowers/specs/2026-10-23-rappels-push-design.md
alter table public.events
  add column if not exists annonce_publiee_le timestamptz,
  add column if not exists bilan_publie_le timestamptz,
  add column if not exists notif_annonce_sent_at timestamptz,
  add column if not exists notif_jour_sent_at timestamptz;
```
Ne PAS l'appliquer (fait à la mise en ligne).

- [ ] **Step 2: Réécrire `supabase/functions/check-events-notify/index.ts`**

```ts
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
```

- [ ] **Step 3: Vérifier sans déployer**

Deno n'est pas installé : essayer `npx -y deno@2 check supabase/functions/check-events-notify/index.ts` (paquet npm officiel `deno`). Si la commande n'est pas disponible ou bloque sur le réseau, le noter dans le rapport (la vérification réelle se fera par la simulation après déploiement). Ne pas déployer, ne pas appliquer la migration. `npm test`, `npm run lint`.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20261023_rappels_push.sql supabase/functions/check-events-notify/index.ts
git -c user.email=victor.guyon@hotmail.fr commit -m "feat: rappels annonce, story et bilans dans check-events-notify (+ simulation)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Site — dates de publication et ouverture directe des fenêtres

**Files:**
- Modify: `src/components/admin/annonce/PublicationAnnonce.jsx` (après le `publierSurReseaux` réussi de `publier`)
- Modify: `src/components/admin/bilan/PublicationBilan.jsx` (après le `publierSurReseaux` réussi)
- Modify: `src/components/admin/bilan/PublicationBilanPermanence.jsx` (idem ; nouvelle prop optionnelle `onEventChange`)
- Modify: `src/pages/admin/Evenements.jsx` (`openFbModal` ligne ~794, `openBilanModal` ~932, montage de `PublicationBilanPermanence` ~2512, chargement des événements ~308)

**Interfaces:**
- Consumes: colonnes de Task 2 (pas encore en base pendant les essais : les écritures sont interceptées).

- [ ] **Step 1: Mémoriser la publication**

Dans chacune des trois fenêtres, juste après le `await publierSurReseaux(...)` réussi et avant
`setEtat('publie')` :

```js
// Date de publication : arrête les rappels sur les téléphones (check-events-notify)
const publieLe = new Date().toISOString()
const { error: errDate } = await supabase.from('events').update({ annonce_publiee_le: publieLe }).eq('id', event.id)
if (errDate) console.warn('Date de publication non enregistrée :', errDate)
else onEventChange?.({ annonce_publiee_le: publieLe })
```
(`bilan_publie_le` dans les deux fenêtres de bilan.) Un échec de cette écriture ne doit **pas**
transformer une publication réussie en erreur. `PublicationBilanPermanence` reçoit
`onEventChange={patch => majEvenement(bilanModal.event.id, patch)}` depuis Evenements.jsx, comme
`PublicationBilan`.

- [ ] **Step 2: Ouvrir la fenêtre demandée par l'adresse**

Dans `Evenements.jsx`, avec `useSearchParams` de `react-router-dom` : une fois la liste des
événements chargée (ne rien faire pendant le chargement), si l'adresse contient `annonce=<id>`
ou `bilan=<id>` :
1. retirer le paramètre de l'adresse (`setSearchParams` avec `{ replace: true }`) pour qu'un
   rechargement ne rouvre pas la fenêtre ;
2. chercher l'événement dans la liste chargée, sinon le lire en base
   (`supabase.from('events').select('*').eq('id', id).maybeSingle()`) ;
3. introuvable → toast d'avertissement « Cet événement n'existe plus. » ;
4. sinon `openFbModal(ev)` pour `annonce`, `openBilanModal(ev)` pour `bilan` (les mêmes fonctions
   que les boutons, rien de recopié).
Garder un seul traitement par adresse (pas de double ouverture si la liste se recharge).

- [ ] **Step 3: Vérifier dans le navigateur (tout intercepté)**

Script Playwright jetable dans le dossier de travail SDD (jamais dans le dépôt), connexion avec
`ADMIN_EMAIL=test@ludothequedecoligny.fr ADMIN_PASSWORD=testludotheque` passés sur la ligne de
commande ; intercepter toute requête non-GET/HEAD vers `/rest/v1/` (204), toute écriture vers
`/storage/v1/object` (`{"Key":"x"}`) et `hook.eu1.make.com` (200), et les journaliser.
- `/admin/evenements?annonce=42` → la fenêtre Annonce de la soirée Halloween s'ouvre ; l'adresse
  n'a plus de paramètre ; publier → le journal montre le PATCH `annonce_publiee_le` après Make.
- `/admin/evenements?bilan=39` → fenêtre Bilan de la permanence du 03/10 ; publier → PATCH
  `bilan_publie_le`.
- `/admin/evenements?bilan=38` → fenêtre Bilan de la soirée du 02/10 (ne pas publier : vérifier
  seulement l'ouverture ; puis, si possible sans effort, publier intercepté → PATCH `bilan_publie_le`).
- `/admin/evenements?bilan=999999` → toast « Cet événement n'existe plus. »
- `/admin/evenements` sans paramètre : comportement inchangé.
Regarder les photos (1280 et 390). Puis `npm run lint`, `npm test`,
`npx vite build --outDir /tmp/verif --emptyOutDir`.

- [ ] **Step 4: Commit**

```bash
git add src/components/admin/annonce/PublicationAnnonce.jsx src/components/admin/bilan/PublicationBilan.jsx src/components/admin/bilan/PublicationBilanPermanence.jsx src/pages/admin/Evenements.jsx
git -c user.email=victor.guyon@hotmail.fr commit -m "feat: dates de publication et ouverture directe des fenêtres depuis un rappel

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Documentation

**Files:** Modify `CLAUDE.md`, piège « Notifications des bénévoles » : ajouter les rappels
(annonce J-10 à 18h, story jour J 9h, bilan de permanence 1 h après la fin, bilan de soirée le
lendemain 9h), les colonnes `annonce_publiee_le` / `bilan_publie_le` / `notif_*_sent_at`, les
règles dans `check-events-notify/rappels.js` (testées par `npm test`, `typeEvenement` recopiée :
la modifier aux deux endroits), le mode simulation `{"simulation": true, "maintenant": "…"}`
(aucun envoi), et les adresses `?annonce=` / `?bilan=` lues par l'écran Communication. Commit.
