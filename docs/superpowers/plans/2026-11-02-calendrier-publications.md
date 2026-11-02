# Calendrier des publications — plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** un onglet « Calendrier » dans Communication (grille du mois des actions de publication),
des délais réglables dans les Paramètres, et des rappels sur téléphone pilotés par ces mêmes réglages.

**Architecture:** une règle de calcul pure (`src/services/calendrierPublications.js`), recopiée à
l'identique dans la fonction serveur `check-events-notify` (test d'égalité), lit les réglages de la
table `settings` et produit les actions datées de chaque événement. L'onglet Calendrier et la
fenêtre de réglages sont deux briques React ; l'écran Communication fournit les fenêtres existantes
(mail, Annonce, Bilan).

**Tech Stack:** React 18 + Vite + Tailwind 3, Supabase (Postgres, fonction Deno), tests `node --test`.

**Spec:** `docs/superpowers/specs/2026-11-02-calendrier-publications-design.md`

## Global Constraints

- Dates des événements à l'heure de Paris, sans fuseau (« 2026-11-06 19:00:00 ») : aucune conversion en heure universelle.
- Jamais de nom de classe Tailwind assemblé avec une variable : couleurs variables par `style={{ … }}`.
- Charte : contour 2 px `#0f172a`, ombre pleine décalée, bleu canard `#1a5f7a`, orange `#e38154`, crème `#fdfaf6` ; Bricolage Grotesque (`font-display`), Poppins.
- Textes en français courant ; vouvoiement.
- `npm run lint` : 0 erreur (5 avertissements connus) ; `npm test` : tout passe.
- Rien n'est mis en ligne sans l'accord de Victor (migration, fonction, site : trois accords distincts ou un accord global explicite).
- Identifiants du compte de test seulement par `ADMIN_EMAIL` / `ADMIN_PASSWORD` dans la commande, jamais dans un fichier.
- `typeEvenement` / `estPermanence` / règles de calendrier : recopiés dans `rappels.js`, à changer aux deux endroits.

---

### Task 1 : la règle de calcul (site)

**Files:**
- Create: `src/services/calendrierPublications.js`
- Test: `src/services/calendrierPublications.test.js`

**Interfaces:**
- Produces :
  - `ACTIONS_PUBLICATION` : `[{ cle, libelle, court, couleur, jours, heure, permanence, faitLe }]` (ordre d'affichage)
  - `BILAN` : `{ cle: 'bilan', libelle, court, couleur, faitLe: 'bilan_publie_le' }`
  - `reglagesPublication(settings: object) → { [cle]: { jours: number, heure: 'HH:MM', rappel: boolean } }`
  - `decalerJour(jour: 'AAAA-MM-JJ', n: number) → 'AAAA-MM-JJ'`
  - `actionsEvenement(ev, reglages) → [{ cle, evenementId, jour, heure, faitLe }]` (bilan compris, heure `null`)
  - `etatAction(action, aujourdhui: 'AAAA-MM-JJ') → 'fait' | 'a_faire' | 'en_retard'`
  - `actionsParJour(evenements, reglages) → { 'AAAA-MM-JJ': [{ ...action, evenement }] }`

- [ ] **Step 1 : écrire les tests**

```js
// src/services/calendrierPublications.test.js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { ACTIONS_PUBLICATION, reglagesPublication, decalerJour, actionsEvenement, etatAction, actionsParJour } from './calendrierPublications.js'

const defauts = reglagesPublication({})
const soiree = { id: 1, title: 'Soirée jeux', date: '2026-11-21 19:00:00' }
const perm = { id: 2, title: 'Permanence de la ludothèque', date: '2026-11-07 10:00:00' }
const fete = { id: 3, title: 'Fête du jeu', date: '2026-12-05 14:00:00' }

test('réglages : valeurs par défaut', () => {
  assert.deepEqual(defauts, {
    mail_collectivites: { jours: 21, heure: '18:00', rappel: true },
    annonce: { jours: 10, heure: '18:00', rappel: true },
    mail_adherents: { jours: 7, heure: '18:00', rappel: true },
    story_veille: { jours: 1, heure: '17:00', rappel: true },
    story_jour: { jours: 0, heure: '09:00', rappel: true },
  })
})

test('réglages : lus dans settings, valeurs illisibles ignorées', () => {
  const r = reglagesPublication({
    publication_annonce_jours: '14', publication_annonce_heure: '19:30', publication_annonce_rappel: 'false',
    publication_mail_adherents_jours: '', publication_story_veille_jours: '-2', publication_story_jour_jours: '3.5',
    publication_mail_collectivites_heure: '25:00', publication_story_jour_heure: '08:15:00',
  })
  assert.deepEqual(r.annonce, { jours: 14, heure: '19:30', rappel: false })
  assert.equal(r.mail_adherents.jours, 7)
  assert.equal(r.story_veille.jours, 1)
  assert.equal(r.story_jour.jours, 0)
  assert.equal(r.mail_collectivites.heure, '18:00')
  assert.equal(r.story_jour.heure, '08:15')
  assert.equal(reglagesPublication({ publication_annonce_jours: '61' }).annonce.jours, 10)
})

test('décaler un jour : changement de mois et d’année', () => {
  assert.equal(decalerJour('2026-11-07', -10), '2026-10-28')
  assert.equal(decalerJour('2026-12-31', 1), '2027-01-01')
  assert.equal(decalerJour('2026-03-01', -1), '2026-02-28')
})

test('soirée : toutes les actions, aux bons jours, bilan le lendemain', () => {
  assert.deepEqual(actionsEvenement(soiree, defauts).map(a => [a.cle, a.jour, a.heure]), [
    ['mail_collectivites', '2026-10-31', '18:00'],
    ['annonce', '2026-11-11', '18:00'],
    ['mail_adherents', '2026-11-14', '18:00'],
    ['story_veille', '2026-11-20', '17:00'],
    ['story_jour', '2026-11-21', '09:00'],
    ['bilan', '2026-11-22', null],
  ])
})

test('permanence allégée : annonce, stories, bilan le jour même', () => {
  assert.deepEqual(actionsEvenement(perm, defauts).map(a => [a.cle, a.jour]), [
    ['annonce', '2026-10-28'], ['story_veille', '2026-11-06'], ['story_jour', '2026-11-07'], ['bilan', '2026-11-07'],
  ])
})

test('autre événement (ni soirée, ni famille, ni permanence) : allégé, sans bilan', () => {
  assert.deepEqual(actionsEvenement(fete, defauts).map(a => a.cle), ['annonce', 'story_veille', 'story_jour'])
})

test('fait : lu dans les colonnes de l’événement ; archivé ou sans date : rien', () => {
  const fait = actionsEvenement({ ...soiree, annonce_publiee_le: '2026-11-10T10:00:00Z', mail_collectivites_envoye_le: 'x' }, defauts)
  assert.equal(fait.find(a => a.cle === 'annonce').faitLe, '2026-11-10T10:00:00Z')
  assert.equal(fait.find(a => a.cle === 'mail_collectivites').faitLe, 'x')
  assert.equal(fait.find(a => a.cle === 'story_jour').faitLe, null)
  assert.deepEqual(actionsEvenement({ ...soiree, archived_at: '2026-11-01' }, defauts), [])
  assert.deepEqual(actionsEvenement({ id: 9, title: 'Soirée' }, defauts), [])
})

test('état : fait, à faire, en retard', () => {
  assert.equal(etatAction({ jour: '2026-11-11', faitLe: 'x' }, '2026-11-20'), 'fait')
  assert.equal(etatAction({ jour: '2026-11-11', faitLe: null }, '2026-11-11'), 'a_faire')
  assert.equal(etatAction({ jour: '2026-11-11', faitLe: null }, '2026-11-12'), 'en_retard')
})

test('par jour : actions rangées par date, dans l’ordre des actions', () => {
  const jours = actionsParJour([soiree, perm], defauts)
  assert.deepEqual(jours['2026-11-07'].map(a => [a.cle, a.evenement.id]), [['story_jour', 2], ['bilan', 2]])
  assert.equal(Object.values(jours).flat().length, 10)
})

test('les clés des actions sont celles attendues par les Paramètres', () => {
  assert.deepEqual(ACTIONS_PUBLICATION.map(a => a.cle), ['mail_collectivites', 'annonce', 'mail_adherents', 'story_veille', 'story_jour'])
})
```

- [ ] **Step 2 : lancer, vérifier l'échec**

Run : `TZ=Europe/Paris node --test src/services/calendrierPublications.test.js`
Expected : FAIL (« Cannot find module … calendrierPublications.js »).

- [ ] **Step 3 : écrire la règle**

```js
// src/services/calendrierPublications.js
import { typeEvenement } from './diapos/regles.js'
import { estPermanence } from './diapos/permanence-regles.js'

/**
 * Calendrier des publications (onglet Calendrier de Communication) : pour chaque événement,
 * les actions de communication datées. Délais et heures de rappel réglés dans les Paramètres
 * (table settings, clés publication_<clé>_jours / _heure / _rappel), défauts ci-dessous.
 * Conception : docs/superpowers/specs/2026-11-02-calendrier-publications-design.md
 * COPIÉ À L'IDENTIQUE dans supabase/functions/check-events-notify/rappels.js (la fonction ne peut
 * pas importer le site) : changer les deux ; rappels.test.js compare les deux copies.
 * Dates à l'heure de Paris, sans fuseau (« 2026-11-06 19:00:00 »).
 */
export const ACTIONS_PUBLICATION = [
  { cle: 'mail_collectivites', libelle: 'Mail mairies & presse', court: 'Mail mairies', couleur: '#1a5f7a', jours: 21, heure: '18:00', permanence: false, faitLe: 'mail_collectivites_envoye_le' },
  { cle: 'annonce', libelle: 'Annonce réseaux', court: 'Annonce', couleur: '#3b82f6', jours: 10, heure: '18:00', permanence: true, faitLe: 'annonce_publiee_le' },
  { cle: 'mail_adherents', libelle: 'Mail adhérents', court: 'Mail adhérents', couleur: '#10b981', jours: 7, heure: '18:00', permanence: false, faitLe: 'mail_adherents_envoye_le' },
  { cle: 'story_veille', libelle: 'Story de la veille', court: 'Story veille', couleur: '#a855f7', jours: 1, heure: '17:00', permanence: true, faitLe: 'story_veille_faite_le' },
  { cle: 'story_jour', libelle: 'Story du jour J', court: 'Story J', couleur: '#e38154', jours: 0, heure: '09:00', permanence: true, faitLe: 'story_jour_faite_le' },
]
export const BILAN = { cle: 'bilan', libelle: 'Bilan', court: 'Bilan', couleur: '#0f172a', faitLe: 'bilan_publie_le' }

const HEURE = /^([01]\d|2[0-3]):[0-5]\d$/
const vide = v => v === undefined || v === null || String(v).trim() === ''

export function reglagesPublication(settings = {}) {
  return Object.fromEntries(ACTIONS_PUBLICATION.map(a => {
    const brut = settings[`publication_${a.cle}_jours`]
    const j = Number(brut)
    const h = String(settings[`publication_${a.cle}_heure`] ?? '').slice(0, 5)
    const r = settings[`publication_${a.cle}_rappel`]
    return [a.cle, {
      jours: !vide(brut) && Number.isInteger(j) && j >= 0 && j <= 60 ? j : a.jours,
      heure: HEURE.test(h) ? h : a.heure,
      rappel: vide(r) ? true : String(r) !== 'false',
    }]
  }))
}

export function decalerJour(jour, n) {
  const [a, m, j] = jour.split('-').map(Number)
  return new Date(Date.UTC(a, m - 1, j + n)).toISOString().slice(0, 10)
}

export function actionsEvenement(ev, reglages) {
  if (!ev?.date || ev.archived_at) return []
  const jourEv = String(ev.date).slice(0, 10)
  const type = typeEvenement(ev.title)
  const liste = ACTIONS_PUBLICATION
    .filter(a => type !== 'permanence' || a.permanence)
    .map(a => ({ cle: a.cle, evenementId: ev.id, jour: decalerJour(jourEv, -reglages[a.cle].jours), heure: reglages[a.cle].heure, faitLe: ev[a.faitLe] || null }))
  // Bilan : mêmes règles que les fenêtres Bilan (soirée / famille le lendemain, permanence le jour même)
  if (type !== 'permanence') liste.push({ cle: 'bilan', evenementId: ev.id, jour: decalerJour(jourEv, 1), heure: null, faitLe: ev.bilan_publie_le || null })
  else if (estPermanence(ev.title)) liste.push({ cle: 'bilan', evenementId: ev.id, jour: jourEv, heure: null, faitLe: ev.bilan_publie_le || null })
  return liste
}

export function etatAction(action, aujourdhui) {
  if (action.faitLe) return 'fait'
  return action.jour < aujourdhui ? 'en_retard' : 'a_faire'
}

export function actionsParJour(evenements, reglages) {
  const jours = {}
  for (const ev of evenements) {
    for (const a of actionsEvenement(ev, reglages)) (jours[a.jour] ||= []).push({ ...a, evenement: ev })
  }
  const ordre = [...ACTIONS_PUBLICATION.map(a => a.cle), 'bilan']
  for (const liste of Object.values(jours)) liste.sort((x, y) => ordre.indexOf(x.cle) - ordre.indexOf(y.cle) || String(x.evenement.date).localeCompare(String(y.evenement.date)))
  return jours
}
```

Note : `estPermanence` de `permanence-regles.js` appelle son propre `typeEvenement` ; aucune
autre dépendance. Vérifier qu'aucun import de ces deux fichiers ne touche au navigateur (ce sont
des règles pures, déjà testées par `npm test`).

- [ ] **Step 4 : lancer, vérifier le succès**

Run : `TZ=Europe/Paris node --test src/services/calendrierPublications.test.js`
Expected : PASS (10 tests).

- [ ] **Step 5 : commit**

```bash
git add src/services/calendrierPublications.js src/services/calendrierPublications.test.js
git commit -m "feat: calendrier des publications — règle de calcul des actions datées"
```

---

### Task 2 : rappels sur téléphone pilotés par les réglages

**Files:**
- Modify: `supabase/functions/check-events-notify/rappels.js` (copie de la règle + rappels génériques)
- Modify: `supabase/functions/check-events-notify/rappels.test.js`
- Modify: `supabase/functions/check-events-notify/index.ts:155-192`

**Interfaces:**
- Consumes : la règle de la Task 1 (copiée à l'identique : `ACTIONS_PUBLICATION`, `BILAN`, `reglagesPublication`, `decalerJour`, `actionsEvenement`, `etatAction`).
- Produces : `rappelsAEnvoyer({ maintenant, evenements, pretsParJour, reglages })` — `reglages` facultatif (défaut `reglagesPublication({})`) ; rappels `{ id, colonne, title, body, url }` ; nouvelles colonnes `notif_mail_collectivites_sent_at`, `notif_mail_adherents_sent_at`, `notif_story_veille_sent_at`.

- [ ] **Step 1 : copier la règle dans `rappels.js`**

Après `estPermanence` (ligne 20), coller le bloc de `src/services/calendrierPublications.js` à partir
de `export const ACTIONS_PUBLICATION` jusqu'à la fin de `etatAction` (sans les imports ni
`actionsParJour`), précédé du commentaire :

```js
// ── Calendrier des publications ──────────────────────────────────────────────
// Copie à l'identique de src/services/calendrierPublications.js (la fonction ne peut pas importer
// le site) : les changer aux deux endroits. rappels.test.js compare les deux copies.
```

- [ ] **Step 2 : remplacer les règles 1 (annonce) et 2 (story) par la boucle générique**

Dans `rappelsAEnvoyer`, signature `({ maintenant, evenements, pretsParJour = {}, reglages = reglagesPublication({}) })`.
Remplacer les blocs « 1. Annonce » et « 2. Story » par :

```js
    // 1. Actions du calendrier des publications (délais et heures réglés dans les Paramètres)
    for (const a of actionsEvenement(ev, reglages)) {
      if (a.cle === 'bilan') continue
      const r = reglages[a.cle]
      if (!r.rappel || a.faitLe || ev[NOTIF[a.cle]]) continue
      const atteint = n.jour > a.jour || (n.jour === a.jour && n.minutes >= minutesDe(r.heure))
      if (!atteint) continue
      // Dernière chance : story de la veille avant le jour J, story du jour J le jour même,
      // le reste tant que l'événement n'a pas commencé
      const encoreUtile = a.cle === 'story_jour' ? n.jour === d.jour
        : a.cle === 'story_veille' ? n.jour < d.jour
        : instant(d) > tMaintenant
      if (!encoreUtile) continue
      const [title, body] = TEXTES[a.cle](ev, joursAvant)
      const fenetre = a.cle === 'annonce' || a.cle === 'story_jour' ? `annonce=${ev.id}` : `calendrier=${a.jour}`
      rappels.push({ id: ev.id, colonne: NOTIF[a.cle], title, body, url: `/admin/evenements?${fenetre}` })
    }
```

et, au-dessus de `rappelsAEnvoyer` :

```js
const NOTIF = {
  mail_collectivites: 'notif_mail_collectivites_sent_at',
  annonce: 'notif_annonce_sent_at',
  mail_adherents: 'notif_mail_adherents_sent_at',
  story_veille: 'notif_story_veille_sent_at',
  story_jour: 'notif_jour_sent_at',
}
const TEXTES = {
  mail_collectivites: (ev, n) => [`✉️ Mail aux mairies : ${ev.title}`, `Envoyez le mail aux mairies, à la presse et aux écoles (événement ${dansCombien(n)}).`],
  annonce: (ev, n) => [`📣 ${ev.title} ${dansCombien(n)}`, "Publiez l'annonce sur Facebook et Instagram."],
  mail_adherents: (ev, n) => [`✉️ Mail aux adhérents : ${ev.title}`, `Envoyez le mail aux adhérents et aux inscrits (événement ${dansCombien(n)}).`],
  story_veille: ev => [`📸 Demain : ${ev.title}`, 'Postez une story pour rappeler le rendez-vous de demain.'],
  story_jour: ev => [`📸 C'est aujourd'hui : ${ev.title}`, 'Enregistrez la story du jour J, puis publiez-la sur Instagram ou Facebook.'],
}
```

(`dansCombien` doit être déclaré avant `TEXTES`.) Les bilans (blocs 3 et 4) restent inchangés.

- [ ] **Step 3 : adapter les tests existants et en ajouter**

Dans `rappels.test.js`, ajouter `const seuls = (colonne, liste) => liste.filter(r => r.colonne === colonne)`
et entourer de `seuls('notif_annonce_sent_at', …)`, `seuls('notif_jour_sent_at', …)`,
`seuls('notif_bilan_sent_at', …)` chaque `rappels(...)` des tests annonce / story / bilan existants
(ils restent sinon identiques). Remplacer le test « annonce : jamais pour une permanence ni un autre
événement » par :

```js
test('annonce : aussi pour les permanences ; jamais de mail pour une permanence', () => {
  const liste = rappels('2026-10-28T18:00:00', [perm])
  assert.deepEqual(liste.map(r => r.colonne), ['notif_annonce_sent_at'])
})

test('mail aux mairies : J-21 à 18h, ouvre le calendrier, une fois, pas si envoyé', () => {
  const soiree = { id: 50, title: 'Soirée jeux', date: '2026-11-21 19:00:00', archived_at: null }
  assert.deepEqual(seuls('notif_mail_collectivites_sent_at', rappels('2026-10-31T17:59:00', [soiree])), [])
  assert.deepEqual(seuls('notif_mail_collectivites_sent_at', rappels('2026-10-31T18:00:00', [soiree])), [{
    id: 50, colonne: 'notif_mail_collectivites_sent_at', title: '✉️ Mail aux mairies : Soirée jeux',
    body: 'Envoyez le mail aux mairies, à la presse et aux écoles (événement dans 21 jours).', url: '/admin/evenements?calendrier=2026-10-31',
  }])
  assert.deepEqual(seuls('notif_mail_collectivites_sent_at', rappels('2026-11-02T10:00:00', [{ ...soiree, mail_collectivites_envoye_le: 'x' }])), [])
  assert.deepEqual(seuls('notif_mail_collectivites_sent_at', rappels('2026-11-02T10:00:00', [{ ...soiree, notif_mail_collectivites_sent_at: 'x' }])), [])
  // événement créé tard : part au passage suivant, même avant l'heure
  assert.equal(seuls('notif_mail_collectivites_sent_at', rappels('2026-11-10T10:00:00', [soiree])).length, 1)
  // événement commencé : plus de rappel
  assert.deepEqual(seuls('notif_mail_collectivites_sent_at', rappels('2026-11-21T19:30:00', [soiree])), [])
})

test('story de la veille : J-1 à 17h, jamais le jour J', () => {
  const soiree = { id: 51, title: 'Soirée jeux', date: '2026-11-21 19:00:00', archived_at: null }
  assert.deepEqual(seuls('notif_story_veille_sent_at', rappels('2026-11-20T16:59:00', [soiree])), [])
  assert.equal(seuls('notif_story_veille_sent_at', rappels('2026-11-20T17:00:00', [soiree]))[0].title, '📸 Demain : Soirée jeux')
  assert.deepEqual(seuls('notif_story_veille_sent_at', rappels('2026-11-21T10:00:00', [soiree])), [])
  assert.deepEqual(seuls('notif_story_veille_sent_at', rappels('2026-11-20T17:00:00', [{ ...soiree, story_veille_faite_le: 'x' }])), [])
})

test('réglages : délai, heure et interrupteur respectés', () => {
  const soiree = { id: 52, title: 'Soirée jeux', date: '2026-11-21 19:00:00', archived_at: null }
  const reglages = serveur.reglagesPublication({ publication_annonce_jours: '14', publication_annonce_heure: '12:00', publication_mail_adherents_rappel: 'false' })
  const r = (m) => rappelsAEnvoyer({ maintenant: m, evenements: [soiree], reglages })
  assert.deepEqual(seuls('notif_annonce_sent_at', r('2026-11-07T11:59:00')), [])
  assert.equal(seuls('notif_annonce_sent_at', r('2026-11-07T12:00:00')).length, 1)
  assert.deepEqual(seuls('notif_mail_adherents_sent_at', r('2026-11-15T18:00:00')), [])
})

test('calendrier des publications : les deux copies de la règle donnent les mêmes résultats', async () => {
  const siteCal = await import('../../../src/services/calendrierPublications.js')
  assert.deepEqual(serveur.ACTIONS_PUBLICATION, siteCal.ACTIONS_PUBLICATION)
  assert.deepEqual(serveur.BILAN, siteCal.BILAN)
  const reglages = { publication_annonce_jours: '12', publication_story_veille_heure: '16:30', publication_mail_collectivites_rappel: 'false' }
  assert.deepEqual(serveur.reglagesPublication(reglages), siteCal.reglagesPublication(reglages))
  const regl = siteCal.reglagesPublication(reglages)
  for (const ev of [halloween, perm, { id: 9, title: 'Après-midi en famille', date: '2027-01-02 14:00:00' }, { id: 10, title: 'Fête du jeu', date: '2026-12-05 14:00:00' }]) {
    assert.deepEqual(serveur.actionsEvenement(ev, regl), siteCal.actionsEvenement(ev, regl))
  }
  assert.equal(serveur.decalerJour('2026-12-31', 1), siteCal.decalerJour('2026-12-31', 1))
})
```

Le test d'annonce « créé tard » qui attend « dans 5 jours » à `2026-11-01T18:15:00` reste vrai.

- [ ] **Step 4 : lancer les tests**

Run : `npm test`
Expected : tout passe (les anciens tests filtrés + les nouveaux).

- [ ] **Step 5 : la fonction lit les réglages et les nouvelles colonnes**

Dans `index.ts`, importer `reglagesPublication` depuis `./rappels.js`. Avant la lecture des
événements (étape 2) :

```ts
    const { data: lignesReglages } = await supabase.from('settings').select('id, value').like('id', 'publication_%')
    const reglages = reglagesPublication(Object.fromEntries((lignesReglages ?? []).map(l => [l.id, l.value])))
    const horizon = Math.max(...Object.values(reglages).map(r => r.jours)) + 1
```

Remplacer `jourDecale(aujourdhui, 11)` par `jourDecale(aujourdhui, horizon)` ; compléter le
`select` des événements avec `mail_collectivites_envoye_le, mail_adherents_envoye_le, story_veille_faite_le, story_jour_faite_le, notif_mail_collectivites_sent_at, notif_mail_adherents_sent_at, notif_story_veille_sent_at` ;
passer `reglages` à `rappelsAEnvoyer({ maintenant, evenements: evenements ?? [], pretsParJour, reglages })`.
Mettre à jour le commentaire « 2. Rappels : … » (« actions du calendrier des publications, bilans »).

- [ ] **Step 6 : commit**

```bash
git add supabase/functions/check-events-notify/
git commit -m "feat: rappels — délais du calendrier des publications lus dans les Paramètres"
```

---

### Task 3 : migration de la base

**Files:**
- Create: `supabase/migrations/20261102_calendrier_publications.sql`

- [ ] **Step 1 : écrire la migration**

```sql
-- Calendrier des publications (onglet Calendrier de Communication) : ce qui est fait, et les
-- rappels déjà partis, pour chaque action. Table existante : pas de nouveau droit d'accès.
-- Conception : docs/superpowers/specs/2026-11-02-calendrier-publications-design.md
alter table public.events
  add column if not exists mail_collectivites_envoye_le timestamptz,
  add column if not exists mail_adherents_envoye_le timestamptz,
  add column if not exists story_veille_faite_le timestamptz,
  add column if not exists story_jour_faite_le timestamptz,
  add column if not exists notif_mail_collectivites_sent_at timestamptz,
  add column if not exists notif_mail_adherents_sent_at timestamptz,
  add column if not exists notif_story_veille_sent_at timestamptz;

-- Les mails déjà envoyés partaient à tous les publics à la fois
update public.events
  set mail_collectivites_envoye_le = coalesce(mail_collectivites_envoye_le, mail_sent_at),
      mail_adherents_envoye_le = coalesce(mail_adherents_envoye_le, mail_sent_at)
  where mail_sent_at is not null;
```

- [ ] **Step 2 : commit** (la migration n'est appliquée qu'à la Task 9, avec l'accord de Victor)

```bash
git add supabase/migrations/20261102_calendrier_publications.sql
git commit -m "feat: calendrier des publications — colonnes « fait » et « rappel parti »"
```

---

### Task 4 : la fenêtre d'envoi des mails note chaque public

**Files:**
- Modify: `src/pages/admin/Evenements.jsx` (`openComposeModal` ~l. 560, fin de l'envoi ~l. 751)

**Interfaces:**
- Produces : `openComposeModal(event, publics = 'tous')` avec `publics` ∈ `'tous' | 'collectivites' | 'adherents'`.

- [ ] **Step 1 : publics pré-cochés**

Signature `const openComposeModal = async (event, publics = 'tous') => {`. Après `setActiveMailTab('collectivites')` :
`if (publics === 'adherents') setActiveMailTab('adherents')`.
Contacts : `checked: publics === 'adherents' ? false : publics === 'collectivites' ? true : c.categorie === 'mairie'`
(depuis le calendrier, « Mail mairies » coche mairies, presse et écoles).
Adhérents et inscrits : `checked: publics !== 'collectivites'`.

- [ ] **Step 2 : dates « fait » par public**

Remplacer la boucle qui écrit `mail_sent_at` par :

```js
      // Une date par public : le calendrier des publications sait ce qui est parti
      const groupesEnvoyes = new Set(activeRecipients.filter(r => !failed.includes(r.email)).map(r => r.group))
      const maintenantIso = new Date().toISOString()
      const dates = { mail_sent_at: maintenantIso }
      if (['mairie', 'presse', 'ecole'].some(g => groupesEnvoyes.has(g))) dates.mail_collectivites_envoye_le = maintenantIso
      if (['adherent', 'abonne'].some(g => groupesEnvoyes.has(g))) dates.mail_adherents_envoye_le = maintenantIso
      for (const b of selectedEvents) {
        await supabase.from('events').update(dates).eq('id', b.event.id)
      }
```

- [ ] **Step 3 : vérifier**

Run : `npx eslint src/pages/admin/Evenements.jsx` → 0 erreur.

- [ ] **Step 4 : commit**

```bash
git add src/pages/admin/Evenements.jsx
git commit -m "feat: envoi des mails — date d'envoi notée par public (mairies, adhérents)"
```

---

### Task 5 : la story du jour J notée faite au partage

**Files:**
- Modify: `src/components/admin/annonce/PublicationAnnonce.jsx:336-347`

- [ ] **Step 1 :** dans la fonction de partage de la story, remplacer l'appel par :

```js
      const resultat = await partagerFichiers(fichiers, 'Story du jour J')
      if (resultat === 'telecharge') setErreur(PARTAGE_INDISPONIBLE)
      // Partagée depuis le téléphone (Instagram, Facebook…) : le calendrier la compte comme faite
      if (resultat === 'partage' && !event.story_jour_faite_le) {
        const faiteLe = new Date().toISOString()
        const { error } = await supabase.from('events').update({ story_jour_faite_le: faiteLe }).eq('id', event.id)
        if (!error) onEventChange?.({ story_jour_faite_le: faiteLe })
      }
```

`navigator.share` doit rester la première attente après le toucher (CLAUDE.md) : l'écriture vient
après, c'est bien le cas.

- [ ] **Step 2 :** `npx eslint src/components/admin/annonce/PublicationAnnonce.jsx` → 0 erreur.

- [ ] **Step 3 : commit**

```bash
git add src/components/admin/annonce/PublicationAnnonce.jsx
git commit -m "feat: fenêtre Annonce — story du jour J notée faite quand elle est partagée"
```

---

### Task 6 : l'onglet « Calendrier » de Communication

**Files:**
- Create: `src/components/admin/CalendrierPublications.jsx`
- Modify: `src/pages/admin/Evenements.jsx` (`COMM_TABS` l. 23, état `activeTab` l. 157, rendu des onglets ~l. 1505, adresse `?calendrier=` à côté du traitement de `?onglet=` ~l. 965)

**Interfaces:**
- Consumes : `ACTIONS_PUBLICATION`, `BILAN`, `reglagesPublication`, `actionsParJour`, `etatAction` (Task 1) ; `grilleMois`, `NOMS_MOIS`, `JOURS_COURTS` (`services/calendrier.js`) ; `openComposeModal(event, publics)` (Task 4), `openFbModal(ev)`, `openBilanModal(ev)`, `majEvenement(id, patch)` (existants).
- Produces : `<CalendrierPublications evenements jourInitial onMail onAnnonce onBilan onMarquer />`.

- [ ] **Step 1 : la brique**

```jsx
// src/components/admin/CalendrierPublications.jsx
import { useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Check } from 'lucide-react'
import { supabase } from '../../services/supabaseClient'
import { grilleMois, NOMS_MOIS, JOURS_COURTS } from '../../services/calendrier'
import { ACTIONS_PUBLICATION, BILAN, reglagesPublication, actionsParJour, etatAction } from '../../services/calendrierPublications'

/**
 * Onglet « Calendrier » de Communication : les actions de publication de chaque événement
 * (mail mairies, annonce, mail adhérents, stories, bilan) sur une grille du mois.
 * Délais réglés dans les Paramètres (carte « Calendrier des publications »).
 * Conception : docs/superpowers/specs/2026-11-02-calendrier-publications-design.md
 */
const INFOS = Object.fromEntries([...ACTIONS_PUBLICATION, BILAN].map(a => [a.cle, a]))
const auJour = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const ETATS = { fait: 'Fait', a_faire: 'À faire', en_retard: 'En retard' }
const jourLisible = jour => new Date(`${jour}T12:00:00`).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })

export default function CalendrierPublications({ evenements, jourInitial, onMail, onAnnonce, onBilan, onMarquer }) {
  const aujourdhui = auJour(new Date())
  const depart = jourInitial || aujourdhui
  const [mois, setMois] = useState({ annee: Number(depart.slice(0, 4)), mois: Number(depart.slice(5, 7)) - 1 })
  const [jourChoisi, setJourChoisi] = useState(jourInitial || null)
  const [reglages, setReglages] = useState(() => reglagesPublication({}))

  useEffect(() => {
    supabase.from('settings').select('id, value').like('id', 'publication_%').then(({ data }) => {
      setReglages(reglagesPublication(Object.fromEntries((data || []).map(l => [l.id, l.value]))))
    })
  }, [])

  const parJour = useMemo(() => actionsParJour(evenements, reglages), [evenements, reglages])
  const semaines = useMemo(() => grilleMois(mois.annee, mois.mois), [mois])
  const prefixe = `${mois.annee}-${String(mois.mois + 1).padStart(2, '0')}`
  const joursDuMois = Object.keys(parJour).filter(j => j.startsWith(prefixe)).sort()
  const joursEvenement = useMemo(() => new Set(evenements.filter(e => !e.archived_at && e.date).map(e => String(e.date).slice(0, 10))), [evenements])

  const changerMois = n => {
    setJourChoisi(null)
    setMois(m => { const k = m.annee * 12 + m.mois + n; return { annee: Math.floor(k / 12), mois: k % 12 } })
  }

  const bouton = a => {
    const ev = a.evenement
    if (a.cle === 'mail_collectivites') return { texte: 'Envoyer', agir: () => onMail(ev, 'collectivites') }
    if (a.cle === 'mail_adherents') return { texte: 'Envoyer', agir: () => onMail(ev, 'adherents') }
    if (a.cle === 'annonce' || a.cle === 'story_jour') return { texte: a.cle === 'annonce' ? 'Publier' : 'Story', agir: () => onAnnonce(ev) }
    if (a.cle === 'bilan') return { texte: 'Bilan', agir: () => onBilan(ev) }
    return null
  }

  const ligne = a => {
    const info = INFOS[a.cle]
    const etat = etatAction(a, aujourdhui)
    const b = bouton(a)
    const marquable = a.cle === 'story_veille' || a.cle === 'story_jour'
    return (
      <li key={`${a.cle}-${a.evenementId}`} className="flex flex-wrap items-center gap-3 rounded-[18px] border-2 border-[#0f172a] bg-white p-3.5">
        <span className="h-3 w-3 shrink-0 rounded-full border-2 border-[#0f172a]" style={{ background: info.couleur }} />
        <div className="min-w-0 flex-1">
          <div className="font-display text-[15px] font-extrabold leading-tight">{info.libelle}</div>
          <div className="truncate text-[12.5px] font-medium text-slate-500">{a.evenement.title} · {new Date(String(a.evenement.date).replace(' ', 'T')).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}</div>
        </div>
        <span className={`rounded-full px-2.5 py-1 text-[10.5px] font-extrabold uppercase tracking-[0.08em] ${etat === 'fait' ? 'bg-emerald-50 text-emerald-700' : etat === 'en_retard' ? 'bg-rose-50 text-rose-600' : 'bg-slate-100 text-slate-600'}`}>
          {ETATS[etat]}
        </span>
        {b && etat !== 'fait' && (
          <button type="button" onClick={b.agir} className="rounded-[12px] border-2 border-[#0f172a] bg-[#e38154] px-3.5 py-2 text-[11px] font-extrabold uppercase tracking-[0.1em] text-white shadow-[3px_3px_0_#0f172a] transition-[transform,box-shadow] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[1px_1px_0_#0f172a]">
            {b.texte}
          </button>
        )}
        {marquable && (
          <button type="button" onClick={() => onMarquer(a.evenement, info.faitLe, a.faitLe ? null : new Date().toISOString())}
            className="rounded-[12px] border-2 border-[#0f172a] bg-white px-3.5 py-2 text-[11px] font-extrabold uppercase tracking-[0.1em] text-[#1a5f7a] shadow-[3px_3px_0_#1a5f7a]">
            {a.faitLe ? 'Annuler' : "C'est fait"}
          </button>
        )}
      </li>
    )
  }

  const etiquette = a => {
    const info = INFOS[a.cle]
    const etat = etatAction(a, aujourdhui)
    return (
      <span key={`${a.cle}-${a.evenementId}`} title={`${info.libelle} — ${a.evenement.title}`}
        className={`flex items-center gap-1 truncate rounded-[6px] px-1.5 py-0.5 text-[10.5px] font-bold leading-tight text-white ${etat === 'fait' ? 'line-through opacity-50' : ''}`}
        style={{ background: etat === 'en_retard' ? '#e11d48' : info.couleur }}>
        {etat === 'fait' && <Check size={10} className="shrink-0" />}{info.court}
      </span>
    )
  }

  const liste = jourChoisi ? (parJour[jourChoisi] || []) : joursDuMois.flatMap(j => parJour[j])

  return (
    <div className="space-y-5">
      <div className="rounded-[26px] border-2 border-[#0f172a] bg-white p-4 shadow-[5px_5px_0_#1a5f7a] md:p-6">
        <div className="mb-4 flex items-center justify-between">
          <button type="button" onClick={() => changerMois(-1)} aria-label="Mois précédent" className="flex h-10 w-10 items-center justify-center rounded-[12px] border-2 border-[#0f172a] bg-[#fdfaf6]"><ChevronLeft size={20} /></button>
          <h2 className="font-display text-[22px] font-extrabold tracking-[-0.03em] md:text-[26px]">{NOMS_MOIS[mois.mois]} {mois.annee}</h2>
          <button type="button" onClick={() => changerMois(1)} aria-label="Mois suivant" className="flex h-10 w-10 items-center justify-center rounded-[12px] border-2 border-[#0f172a] bg-[#fdfaf6]"><ChevronRight size={20} /></button>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-extrabold uppercase tracking-[0.08em] text-slate-500">
          {JOURS_COURTS.map(j => <div key={j} className="py-1">{j}</div>)}
        </div>
        <div className="mt-1 grid grid-cols-7 gap-1">
          {semaines.flat().map(c => {
            const actions = parJour[c.cle] || []
            const choisi = jourChoisi === c.cle
            return (
              <button key={c.cle} type="button" onClick={() => setJourChoisi(choisi ? null : c.cle)}
                className={`flex min-h-[54px] flex-col gap-1 rounded-[10px] border-2 p-1 text-left md:min-h-[96px] ${choisi ? 'border-[#0f172a] bg-[#fdf1ea]' : 'border-transparent hover:border-slate-200'} ${c.dansLeMois ? '' : 'opacity-35'}`}>
                <span className={`flex h-6 w-6 items-center justify-center rounded-full text-[12px] font-extrabold ${c.cle === aujourdhui ? 'border-2 border-[#0f172a]' : ''} ${joursEvenement.has(c.cle) ? 'bg-[#0f172a] text-white' : ''}`}>{c.jour}</span>
                {/* Ordinateur : étiquettes ; téléphone : pastilles */}
                <span className="hidden flex-col gap-0.5 md:flex">{actions.slice(0, 3).map(etiquette)}{actions.length > 3 && <span className="text-[10px] font-bold text-slate-500">+{actions.length - 3}</span>}</span>
                <span className="flex flex-wrap gap-0.5 md:hidden">
                  {actions.map(a => <span key={`${a.cle}-${a.evenementId}`} className="h-2 w-2 rounded-full" style={{ background: etatAction(a, aujourdhui) === 'en_retard' ? '#e11d48' : INFOS[a.cle].couleur, opacity: a.faitLe ? 0.35 : 1 }} />)}
                </span>
              </button>
            )
          })}
        </div>
        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5 text-[11.5px] font-semibold text-slate-600">
          {[...ACTIONS_PUBLICATION, BILAN].map(a => (
            <span key={a.cle} className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full" style={{ background: a.couleur }} />{a.court}</span>
          ))}
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-[#e11d48]" />En retard</span>
        </div>
      </div>

      <div>
        <h3 className="mb-3 font-display text-[18px] font-extrabold tracking-[-0.02em]">
          {jourChoisi ? jourLisible(jourChoisi) : `Toutes les actions de ${NOMS_MOIS[mois.mois].toLowerCase()}`}
        </h3>
        {liste.length === 0
          ? <p className="rounded-[18px] border-2 border-dashed border-slate-300 bg-white p-5 text-[14px] text-slate-500">Rien à publier {jourChoisi ? 'ce jour-là' : 'ce mois-ci'}.</p>
          : <ul className="space-y-2.5">{liste.map(ligne)}</ul>}
      </div>
    </div>
  )
}
```

- [ ] **Step 2 : l'onglet dans Communication**

`COMM_TABS` : insérer après `events` : `{ id: 'calendrier', label: 'Calendrier', shadow: '#a855f7' },`
(et mettre à jour le commentaire « Les cinq onglets » → « Les six onglets » ; le commentaire de
`activeTab` liste `'calendrier'`). Importer la brique, ajouter un état
`const [jourCalendrier, setJourCalendrier] = useState(null)` et, près des autres rendus d'onglet :

```jsx
        {activeTab === 'calendrier' && (
          <CalendrierPublications
            key={jourCalendrier || 'mois'}
            evenements={events}
            jourInitial={jourCalendrier}
            onMail={(ev, publics) => openComposeModal(ev, publics)}
            onAnnonce={openFbModal}
            onBilan={openBilanModal}
            onMarquer={async (ev, colonne, valeur) => {
              const { error } = await supabase.from('events').update({ [colonne]: valeur }).eq('id', ev.id)
              if (error) addToast("Enregistrement impossible : " + error.message, 'error')
              else majEvenement(ev.id, { [colonne]: valeur })
            }}
          />
        )}
```

Vérifier que `events` contient bien tous les événements non archivés avec leurs colonnes
(`select('*')`) et que `majEvenement` met à jour la liste `events` (sinon utiliser `fetchEvents()`).

- [ ] **Step 3 : l'adresse `?calendrier=AAAA-MM-JJ` des rappels**

À côté de l'effet qui traite `?onglet=jeu-semaine` :

```js
  // Rappel du calendrier des publications : ouvre l'onglet sur le jour, puis retire le paramètre
  useEffect(() => {
    const jour = searchParams.get('calendrier')
    if (!jour) return
    if (/^\d{4}-\d{2}-\d{2}$/.test(jour)) { setJourCalendrier(jour); setActiveTab('calendrier') }
    const sans = new URLSearchParams(searchParams)
    sans.delete('calendrier')
    setSearchParams(sans, { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])
```

- [ ] **Step 4 :** `npx eslint src/components/admin/CalendrierPublications.jsx src/pages/admin/Evenements.jsx` → 0 erreur ; `npx vite build --outDir /tmp/verif --emptyOutDir` → sans erreur.

- [ ] **Step 5 : commit**

```bash
git add src/components/admin/CalendrierPublications.jsx src/pages/admin/Evenements.jsx
git commit -m "feat: Communication — onglet Calendrier des publications (grille du mois)"
```

---

### Task 7 : la carte « Calendrier des publications » des Paramètres

**Files:**
- Create: `src/components/admin/ReglagesPublications.jsx`
- Modify: `src/pages/admin/Parametres.jsx` (état des fenêtres ~l. 37, liste des cartes ~l. 566, rendu ~l. 1162)

**Interfaces:**
- Consumes : `ACTIONS_PUBLICATION`, `reglagesPublication` (Task 1).
- Produces : `<ReglagesPublications onClose />` ; clés `publication_<cle>_jours|_heure|_rappel` dans `settings`.

- [ ] **Step 1 : la fenêtre**

```jsx
// src/components/admin/ReglagesPublications.jsx
import { useEffect, useState } from 'react'
import { X, Loader2 } from 'lucide-react'
import { supabase } from '../../services/supabaseClient'
import { useToast } from '../ToastContext'
import MaskIcon from '../site/MaskIcon'
import { ACTIONS_PUBLICATION, reglagesPublication } from '../../services/calendrierPublications'

/**
 * Paramètres → « Calendrier des publications » : délai avant l'événement, heure du rappel et
 * interrupteur du rappel pour chaque action. Les mêmes réglages pilotent l'onglet Calendrier de
 * Communication et les rappels sur téléphone (check-events-notify).
 */
export default function ReglagesPublications({ onClose }) {
  const { addToast } = useToast()
  const [valeurs, setValeurs] = useState(null)
  const [enregistrement, setEnregistrement] = useState(false)

  useEffect(() => {
    supabase.from('settings').select('id, value').like('id', 'publication_%').then(({ data }) => {
      setValeurs(reglagesPublication(Object.fromEntries((data || []).map(l => [l.id, l.value]))))
    })
  }, [])
  useEffect(() => {
    const echap = e => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', echap)
    return () => window.removeEventListener('keydown', echap)
  }, [onClose])

  const changer = (cle, champ, v) => setValeurs(vs => ({ ...vs, [cle]: { ...vs[cle], [champ]: v } }))

  const enregistrer = async () => {
    setEnregistrement(true)
    const lignes = ACTIONS_PUBLICATION.flatMap(a => {
      const r = valeurs[a.cle]
      return [
        { id: `publication_${a.cle}_jours`, value: String(r.jours) },
        { id: `publication_${a.cle}_heure`, value: r.heure },
        { id: `publication_${a.cle}_rappel`, value: r.rappel ? 'true' : 'false' },
      ]
    })
    const { error } = await supabase.from('settings').upsert(lignes, { onConflict: 'id' })
    setEnregistrement(false)
    if (error) { addToast('Enregistrement impossible : ' + error.message, 'error'); return }
    addToast('Calendrier des publications enregistré.', 'success')
    onClose()
  }

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-[#0f172a]/70 p-4" onClick={onClose}>
      <div className="flex max-h-[92vh] w-full max-w-[640px] flex-col overflow-hidden rounded-[28px] border-2 border-[#0f172a] bg-white shadow-[8px_8px_0_#0f172a]" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between gap-4 border-b-2 border-slate-100 p-6">
          <div className="flex items-center gap-3.5">
            <div className="flex h-12 w-12 items-center justify-center rounded-[16px] border-2 border-[#0f172a] bg-[#faf5ff] text-[#a855f7]"><MaskIcon file="ludo-calendrier.svg" size={30} color="currentColor" /></div>
            <div>
              <h3 className="font-display text-[19px] font-extrabold tracking-[-0.04em]">Calendrier des publications</h3>
              <p className="mt-1 text-[12.5px] text-slate-500">Quand communiquer avant chaque événement.</p>
            </div>
          </div>
          <button onClick={onClose} aria-label="Fermer" className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-[14px] border-2 border-[#0f172a] bg-[#fdfaf6] text-[#1a5f7a] transition-colors hover:bg-[#e38154] hover:text-white"><X size={22} /></button>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto p-6">
          {!valeurs ? <Loader2 className="mx-auto animate-spin text-[#1a5f7a]" /> : ACTIONS_PUBLICATION.map(a => (
            <div key={a.cle} className="rounded-[18px] border-2 border-[#0f172a] p-4">
              <div className="mb-3 flex items-center gap-2.5">
                <span className="h-3 w-3 rounded-full border-2 border-[#0f172a]" style={{ background: a.couleur }} />
                <span className="font-display text-[16px] font-extrabold">{a.libelle}</span>
                {!a.permanence && <span className="text-[11.5px] text-slate-500">(soirées et après-midis famille)</span>}
              </div>
              <div className="flex flex-wrap items-center gap-x-5 gap-y-3 text-[13.5px] font-semibold">
                <label className="flex items-center gap-2">
                  <input type="number" min="0" max="60" value={valeurs[a.cle].jours}
                    onChange={e => changer(a.cle, 'jours', Math.max(0, Math.min(60, parseInt(e.target.value, 10) || 0)))}
                    className="w-16 rounded-[12px] border-2 border-[#0f172a] bg-[#fdfaf6] px-2 py-1.5 text-center font-bold" />
                  {valeurs[a.cle].jours === 0 ? 'le jour même' : valeurs[a.cle].jours === 1 ? 'jour avant' : 'jours avant'}
                </label>
                <label className="flex items-center gap-2">
                  Rappel à
                  <input type="time" value={valeurs[a.cle].heure} onChange={e => changer(a.cle, 'heure', e.target.value || a.heure)}
                    className="rounded-[12px] border-2 border-[#0f172a] bg-[#fdfaf6] px-2 py-1.5 font-bold" />
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={valeurs[a.cle].rappel} onChange={e => changer(a.cle, 'rappel', e.target.checked)} className="h-5 w-5 accent-[#1a5f7a]" />
                  Rappel sur téléphone
                </label>
              </div>
            </div>
          ))}
          <p className="text-[12.5px] leading-relaxed text-slate-500">
            Les permanences n'ont que l'annonce et les deux stories. Les bilans gardent leurs règles
            (permanence : 1 h après la fin ; soirée et famille : le lendemain à 9 h).
          </p>
        </div>

        <div className="border-t-2 border-slate-100 p-6">
          <button type="button" onClick={enregistrer} disabled={!valeurs || enregistrement}
            className="flex w-full items-center justify-center gap-2.5 rounded-[18px] border-2 border-[#0f172a] bg-[#1a5f7a] py-4 text-[11px] font-extrabold uppercase tracking-[0.16em] text-white shadow-[5px_5px_0_#0f172a] transition-[transform,box-shadow] duration-200 hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-[2px_2px_0_#0f172a] disabled:opacity-50">
            {enregistrement ? <Loader2 size={16} className="animate-spin" /> : 'Enregistrer'}
          </button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2 : la carte**

Dans `Parametres.jsx` : `import ReglagesPublications from '../../components/admin/ReglagesPublications'` ;
état `const [showPublicationsModal, setShowPublicationsModal] = useState(false)` ; carte ajoutée à la liste :

```js
          { onClick: () => setShowPublicationsModal(true), icon: <MaskIcon file="ludo-calendrier.svg" size={30} color="currentColor" />, color: '#a855f7', tint: '#faf5ff', title: 'Publications', desc: 'Calendrier & rappels', cta: 'Régler' },
```

et à côté de `CategoriesJeux` : `{showPublicationsModal && <ReglagesPublications onClose={() => setShowPublicationsModal(false)} />}`.
Ne pas toucher à `handleUpdatePrice` (les clés `publication_*` sont aussi lues par `fetchSettings` :
sans effet, elles sont réécrites telles quelles).

- [ ] **Step 3 :** `npx eslint src/components/admin/ReglagesPublications.jsx src/pages/admin/Parametres.jsx` → 0 erreur.

- [ ] **Step 4 : commit**

```bash
git add src/components/admin/ReglagesPublications.jsx src/pages/admin/Parametres.jsx
git commit -m "feat: Paramètres — carte « Calendrier des publications » (délais, heures, rappels)"
```

---

### Task 8 : aperçu pour Victor (rien n'est mis en ligne)

- [ ] **Step 1 :** `npm run lint` (0 erreur), `npm test` (tout passe), `npx vite build --outDir /tmp/verif --emptyOutDir`.
- [ ] **Step 2 :** lancer `npx vite --port 5199 --strictPort --no-open` et photographier, compte de test
  (identifiants dans la commande seulement) :
  - `/admin/evenements` puis clic sur l'onglet Calendrier (`--click=` sur le bouton « Calendrier ») à 1280 et 390 ;
  - un jour avec actions sélectionné (second `--click`) ;
  - `/admin/parametres`, carte Publications ouverte, à 1280 et 390.
  Sans migration, les états « fait » des mails viennent de `mail_sent_at` absents : l'aperçu montre
  des actions « à faire » / « en retard », c'est attendu.
- [ ] **Step 3 :** regarder chaque photo (débordements, lisibilité, téléphone), corriger, re-photographier
  en lot ; copier les images dans `Bureau/PERSO/Ludothèque/Maquette calendrier publications/` et les montrer à Victor.

---

### Task 9 : mise en ligne (après l'accord de Victor) et documentation

- [ ] **Step 1 :** appliquer la migration : `supabase db query --linked -f supabase/migrations/20261102_calendrier_publications.sql`, puis vérifier les colonnes (`information_schema.columns`).
- [ ] **Step 2 :** déployer la fonction : `supabase functions deploy check-events-notify --project-ref epzfnymfksxnhprcodec`.
- [ ] **Step 3 :** simulation des rappels (commande de la tâche `check-events-notify` avec
  `{"simulation": true, "maintenant": "<date>"}`, `timeout_milliseconds := 30000`, réponse dans
  `net._http_response`) à J-21 18:05 et J-1 17:05 d'une soirée à venir : les rappels attendus apparaissent.
- [ ] **Step 4 :** CLAUDE.md : ligne `/admin/evenements` (« six onglets », Calendrier), brique
  `CalendrierPublications` et `ReglagesPublications` au tableau des briques, et dans les pièges
  « Rappels » : délais lus dans les Paramètres, règle copiée dans `rappels.js`, nouvelles colonnes.
- [ ] **Step 5 :** commit, `git push` (auteur `victor.guyon@hotmail.fr`), attendre la publication Vercel,
  photographier l'onglet Calendrier en ligne.
