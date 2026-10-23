import {
  COULEURS, chargerImage, nouveauCanvas, recouvrir, dessinerFlou, voile, police, couperLignes,
  pastille, texteContoure, liberer,
} from './dessin.js'
import {
  espacer, largeur, baseLigne, carte, tailleQuiTient, limiterLignes, dessinerPlan,
} from './annonce.js'

/**
 * Diapositives du bilan d'une permanence (carrousel 3 images 1080 × 1350), d'après la
 * maquette validée par Victor (« Maquette bilan soirée jeux/permanence.html »).
 * Règles et textes : permanence-regles.js. Même contrat que dessinerCarrousel (carrousel.js).
 */
const L = 1080
const H = 1350
const TITRE = 'Bricolage Grotesque'
const GRIS = '#475569'

// ---------- petits outils ----------

/** Raccourcit une ligne trop large en finissant par « … » (police déjà réglée). */
function tronquer(ctx, ligne, max) {
  if (largeur(ctx, ligne) <= max) return ligne
  let t = ligne
  while (t.length > 1 && largeur(ctx, `${t}…`) > max) t = t.slice(0, -1)
  return `${t.trimEnd()}…`
}

/** « ! », « ? », « : » jamais seuls en début de ligne (espace insécable de la maquette). */
function sansPonctuationOrpheline(lignes) {
  for (let i = 1; i < lignes.length; i++) {
    if (!/^[!?:;]/.test(lignes[i])) continue
    const mots = lignes[i - 1].split(' ')
    if (mots.length < 2) continue
    const dernier = mots.pop()
    lignes[i - 1] = mots.join(' ')
    lignes[i] = `${dernier} ${lignes[i]}`
  }
  return lignes
}

/**
 * Coupe le texte en lignes de `max` px. La taille ne baisse (de tailleMax à tailleMin)
 * que si un mot seul est plus large que `max` ; au-delà de `nbMax` lignes, la dernière
 * finit par « … » (comme un mot encore trop long à la plus petite taille).
 * Renvoie { lignes, taille } ; la police reste réglée (interlettrage compris).
 */
function lignesQuiTiennent(ctx, texte, { poids = 800, famille = TITRE, tailleMax, tailleMin, max, nbMax, interlettrage = 0 }) {
  let taille = tailleMax
  let lignes = []
  for (; ; taille -= 2) {
    police(ctx, poids, taille, famille)
    espacer(ctx, interlettrage * taille)
    lignes = sansPonctuationOrpheline(couperLignes(ctx, texte, max))
    const tient = lignes.every(l => largeur(ctx, l) <= max)
    if (tient || taille - 2 < tailleMin) break
  }
  lignes = limiterLignes(ctx, lignes, nbMax, max)
    .map(l => tronquer(ctx, l, max))
    // Pas de « du Rail :… » : la ponctuation coupée disparaît avant les points de suspension
    .map(l => l.replace(/[\s,;:!?–-]+…$/, '…'))
  return { lignes, taille }
}

// ---------- fond « mosaïque » (diapositives 1 et 3) ----------

/**
 * Les jaquettes en grille 4 × 2 qui déborde de 60 px de chaque côté (comme la maquette),
 * floutée, sous un voile bleu. Jaquette qui ne se charge pas : case laissée bleue.
 */
async function fondMosaique(ctx, urls) {
  if (urls?.length) {
    const images = await Promise.all(urls.map(u => chargerImage(u)))
    const { canvas, ctx: m } = nouveauCanvas(L, H)
    m.fillStyle = COULEURS.bleu
    m.fillRect(0, 0, L, H)
    const debord = 60
    const w = (L + 2 * debord) / 4
    const h = (H + 2 * debord) / 2
    images.forEach((img, i) => {
      if (img) recouvrir(m, img, -debord + (i % 4) * w, -debord + Math.floor(i / 4) * h, w, h)
    })
    // Réduction par moitiés avant le flou : réduit d'un coup (÷ 24), un canvas donne
    // des pavés crénelés au lieu d'un flou doux
    let petit = canvas
    while (petit.width > 40) {
      const { canvas: moitie, ctx: c } = nouveauCanvas(Math.round(petit.width / 2), Math.round(petit.height / 2))
      c.imageSmoothingQuality = 'high'
      c.drawImage(petit, 0, 0, moitie.width, moitie.height)
      liberer(petit)
      petit = moitie
    }
    dessinerFlou(ctx, petit, L, H)
    liberer(petit)
  } else voile(ctx, L, H, COULEURS.bleu)
  voile(ctx, L, H, 'rgba(26,95,122,0.72)')
}

// ---------- 1 · Le nombre ----------

async function nombre(ctx, d, logo) {
  await fondMosaique(ctx, d.mosaique)
  pastille(ctx, logo, 56, 56)

  // Le nombre : 540 px, réduit s'il ne tient pas dans 940 px (3 chiffres et plus)
  const texteNombre = String(d.nombre)
  let tNombre = 540
  for (; tNombre > 200; tNombre -= 10) {
    police(ctx, 800, tNombre, TITRE)
    espacer(ctx, -0.04 * tNombre)
    if (largeur(ctx, texteNombre) <= 940) break
  }
  espacer(ctx, 0)
  const suite = lignesQuiTiennent(ctx, d.suite, { tailleMax: 92, tailleMin: 72, max: 940, nbMax: 2, interlettrage: -0.04 })
  espacer(ctx, 0)

  // Bloc centré verticalement : avant (Poppins, interligne 1,5), nombre (0,86), suite (0,92)
  const hAvant = 60 * 1.5
  const hNombre = tNombre * 0.86
  const hSuite = suite.taille * 0.92
  const total = hAvant + 14 + hNombre + 34 + suite.lignes.length * hSuite
  let y = (H - total) / 2

  ctx.textAlign = 'center'
  ctx.fillStyle = COULEURS.creme
  const avant = tailleQuiTient(ctx, d.intro, 700, 60, 40, 940, 'Poppins')
  ctx.fillText(avant, L / 2, baseLigne(ctx, y, hAvant))
  y += hAvant + 14

  police(ctx, 800, tNombre, TITRE)
  texteContoure(ctx, texteNombre, L / 2, baseLigne(ctx, y, hNombre), { taille: tNombre, contour: 5, ombre: 22 })
  y += hNombre + 34

  ctx.fillStyle = COULEURS.creme
  police(ctx, 800, suite.taille, TITRE)
  espacer(ctx, -0.04 * suite.taille)
  suite.lignes.forEach((l, i) => ctx.fillText(l, L / 2, baseLigne(ctx, y + i * hSuite, hSuite)))
  espacer(ctx, 0)
  ctx.textAlign = 'left'
}

// ---------- 2 · Les jeux partis ----------

const GRILLE = { gauche: 70, droite: L - 86, haut: 340, bas: 1260, colonnes: 4, ecartX: 30 }
const BORD_CASE = 5
const MARGE_CASE = 18
const H_NOM = 28 * 1.02

async function grille(ctx, d, logo) {
  voile(ctx, L, H, COULEURS.creme)
  pastille(ctx, logo, 56, 56)

  // Titre « Ils sont partis jouer : », « jouer : » en orange (deux lignes s'il ne tient pas)
  police(ctx, 800, 110, TITRE)
  espacer(ctx, -0.04 * 110)
  const debut = 'Ils sont partis '
  const fin = 'jouer\u00A0:'
  const hTitre = 110 * 0.92
  if (largeur(ctx, debut + fin) <= 940) {
    const b = baseLigne(ctx, 170, hTitre)
    ctx.fillStyle = COULEURS.encre
    ctx.fillText(debut, 70, b)
    ctx.fillStyle = COULEURS.orange
    ctx.fillText(fin, 70 + largeur(ctx, debut), b)
  } else {
    ctx.fillStyle = COULEURS.encre
    ctx.fillText(debut.trim(), 70, baseLigne(ctx, 170, hTitre))
    ctx.fillStyle = COULEURS.orange
    ctx.fillText(fin, 70, baseLigne(ctx, 170 + hTitre, hTitre))
  }
  espacer(ctx, 0)

  // Cases : jaquette chargée → nom dessous ; sinon nom dans la case
  const cases = (d.cases || []).slice(0, 12)
  const images = await Promise.all(cases.map(c => (c.autres ? null : chargerImage(c.jaquette))))
  const lCase = (GRILLE.droite - GRILLE.gauche - (GRILLE.colonnes - 1) * GRILLE.ecartX) / GRILLE.colonnes
  const noms = cases.map((c, i) => (images[i]
    ? lignesQuiTiennent(ctx, c.nom, { tailleMax: 28, tailleMin: 22, max: lCase, nbMax: 2, interlettrage: -0.02 })
    : null))
  espacer(ctx, 0)

  // Rangées : hauteur = case + nom le plus haut de la rangée (comme la grille CSS)
  const rangees = []
  for (let i = 0; i < cases.length; i += GRILLE.colonnes) rangees.push(cases.slice(i, i + GRILLE.colonnes).map((_, k) => i + k))
  const hNoms = rangees.map(r => Math.max(0, ...r.map(i => (noms[i] ? 20 + noms[i].lignes.length * H_NOM : 0))))
  const ecartY = rangees.length >= 3 ? 36 : 56
  const zone = GRILLE.bas - GRILLE.haut
  const sommeNoms = hNoms.reduce((s, v) => s + v, 0)
  const ecarts = (rangees.length - 1) * ecartY
  const hCase = Math.min(214, (zone - ecarts - sommeNoms) / rangees.length)
  const hGrille = rangees.length * hCase + sommeNoms + ecarts
  let y = GRILLE.haut + (zone - hGrille) / 2
  // Moins de 4 jeux : la rangée unique est centrée plutôt que collée à gauche
  const n = rangees.length === 1 ? cases.length : GRILLE.colonnes
  const x0 = GRILLE.gauche + (GRILLE.droite - GRILLE.gauche - n * lCase - (n - 1) * GRILLE.ecartX) / 2

  rangees.forEach((rangee, r) => {
    rangee.forEach((i, k) => {
      const x = x0 + k * (lCase + GRILLE.ecartX)
      const c = cases[i]
      const ombre = i % 2 ? COULEURS.orange : COULEURS.bleu
      const fond = c.autres ? COULEURS.orange : '#ffffff'
      carte(ctx, x, y, lCase, hCase, { rayon: 26, bord: BORD_CASE, decal: 11, ombre, fond })
      const interieur = { x: x + BORD_CASE + MARGE_CASE, y: y + BORD_CASE + MARGE_CASE, w: lCase - 2 * (BORD_CASE + MARGE_CASE), h: hCase - 2 * (BORD_CASE + MARGE_CASE) }
      const img = images[i]
      if (img) {
        // Jaquette entière, centrée (« contain »)
        const k2 = Math.min(interieur.w / img.width, interieur.h / img.height)
        const w = img.width * k2
        const h = img.height * k2
        ctx.drawImage(img, interieur.x + (interieur.w - w) / 2, interieur.y + (interieur.h - h) / 2, w, h)
        // Nom dessous, centré
        ctx.textAlign = 'center'
        ctx.fillStyle = COULEURS.encre
        police(ctx, 800, noms[i].taille, TITRE)
        espacer(ctx, -0.02 * noms[i].taille)
        noms[i].lignes.forEach((l, n) => ctx.fillText(l, x + lCase / 2, baseLigne(ctx, y + hCase + 20 + n * H_NOM, H_NOM)))
      } else {
        // Sans jaquette (ou case « … et N autres ») : le texte au centre de la case
        const texte = c.autres ? `… et ${c.autres} autres` : c.nom
        const t = c.autres
          ? lignesQuiTiennent(ctx, texte, { tailleMax: 40, tailleMin: 28, max: interieur.w, nbMax: 3, interlettrage: -0.02 })
          : lignesQuiTiennent(ctx, texte, { tailleMax: 30, tailleMin: 22, max: interieur.w, nbMax: 3, interlettrage: -0.02 })
        const hLigne = t.taille * 1.02
        const haut = interieur.y + (interieur.h - t.lignes.length * hLigne) / 2
        ctx.textAlign = 'center'
        ctx.fillStyle = COULEURS.encre
        t.lignes.forEach((l, n) => ctx.fillText(l, x + lCase / 2, baseLigne(ctx, haut + n * hLigne, hLigne)))
      }
      espacer(ctx, 0)
      ctx.textAlign = 'left'
    })
    y += hCase + hNoms[r] + ecartY
  })
}

// ---------- 3 · Prochaine permanence ----------

/**
 * Paragraphe à graisses mêlées (Poppins) : `segments` = [[texte, poids], …], coupé en lignes
 * de `max` px. Un mot peut chevaucher deux segments (« place » + « , ») ; la ponctuation
 * haute reste collée au mot qui la précède. Renvoie des lignes de mots, chaque mot = [{ t, poids }].
 */
function couperParagraphe(ctx, segments, taille, max) {
  const mots = []
  let courant = null
  for (const [texte, poids] of segments) {
    String(texte).split(' ').forEach((m, i) => {
      if (i > 0) courant = null
      if (!m) return
      if (courant) courant.push({ t: m, poids })
      else if (/^[!?:;]+$/.test(m) && mots.length) {
        courant = mots[mots.length - 1]
        courant.push({ t: `\u00A0${m}`, poids })
      } else {
        courant = [{ t: m, poids }]
        mots.push(courant)
      }
    })
  }
  const mesure = mot => mot.reduce((s, r) => { police(ctx, r.poids, taille); return s + largeur(ctx, r.t) }, 0)
  police(ctx, 600, taille)
  const espace = largeur(ctx, ' ')
  const lignes = []
  let ligne = []
  let w = 0
  for (const mot of mots) {
    const lm = mesure(mot)
    if (ligne.length && w + espace + lm > max) {
      lignes.push(ligne)
      ligne = []
      w = 0
    }
    w += (ligne.length ? espace : 0) + lm
    ligne.push(mot)
  }
  if (ligne.length) lignes.push(ligne)
  return lignes
}

const ADHERER = [
  [['Pas encore adhérent ? ', 600], ["L'adhésion se fait sur place", 800], [', pour tout le foyer.', 600]],
  [['Toutes les infos : ', 600], ['ludothequedecoligny.fr/adherer', 800]],
]

async function prochaine(ctx, d, logo) {
  await fondMosaique(ctx, d.mosaique)
  pastille(ctx, logo, 56, 56)

  // « À votre tour ! » puis « Prochaine permanence » (contour + ombre orange), en haut à gauche
  let y = 230
  const hAvant = 56 * 1.5
  ctx.fillStyle = COULEURS.creme
  const avant = tailleQuiTient(ctx, 'À votre tour\u00A0!', 700, 56, 40, 940, 'Poppins')
  ctx.fillText(avant, 70, baseLigne(ctx, y, hAvant))
  y += hAvant + 8
  const titre = lignesQuiTiennent(ctx, 'Prochaine permanence', { tailleMax: 140, tailleMin: 90, max: 940, nbMax: 2, interlettrage: -0.04 })
  const hTitre = titre.taille * 0.92
  titre.lignes.forEach((l, i) => {
    police(ctx, 800, titre.taille, TITRE)
    texteContoure(ctx, l, 70, baseLigne(ctx, y + i * hTitre, hTitre), { taille: titre.taille, contour: 2.5, ombre: 14 })
  })
  espacer(ctx, 0)

  // Carte crème : jour, heures, lieu (lignes vides retirées) ; sans date connue, une seule ligne
  const bord = 6
  const xTexte = 70 + bord + 48
  const lTexte = 940 - 2 * bord - 2 * 48
  const p = d.prochaine
  const lignes = p
    ? [
      { texte: p.jour, poids: 800, taille: 74, min: 48, famille: TITRE, inter: -0.03, h: 74, couleur: COULEURS.encre, marge: 0 },
      { texte: p.heures, poids: 700, taille: 40, min: 28, famille: 'Poppins', inter: 0, h: 60, couleur: COULEURS.bleu, marge: 14 },
      { texte: p.lieu, poids: 600, taille: 32, min: 24, famille: 'Poppins', inter: 0, h: 48, couleur: GRIS, marge: 6 },
    ].filter(l => l.texte)
    : [{ texte: 'Bientôt : surveillez nos publications', poids: 700, taille: 40, min: 28, famille: 'Poppins', inter: 0, h: 60, couleur: COULEURS.bleu, marge: 0 }]
  lignes[0].marge = 0
  const hContenu = lignes.reduce((s, l) => s + l.marge + l.h, 0)
  const hCarte = 2 * bord + 2 * 44 + hContenu
  carte(ctx, 70, 640, 940, hCarte, { rayon: 34, bord, decal: 16, ombre: COULEURS.orange })
  let ty = 640 + bord + 44
  lignes.forEach(l => {
    ty += l.marge
    ctx.fillStyle = l.couleur
    const t = tailleQuiTient(ctx, l.texte, l.poids, l.taille, l.min, lTexte, l.famille, l.inter)
    ctx.fillText(t, xTexte, baseLigne(ctx, ty, l.h))
    espacer(ctx, 0)
    ty += l.h
  })

  // En bas : l'adhésion, dernière ligne posée à 110 px du bas
  const taille = 32
  const hLigne = taille * 1.4
  const paragraphe = ADHERER.flatMap(segments => couperParagraphe(ctx, segments, taille, 940))
  let haut = H - 110 - paragraphe.length * hLigne
  ctx.fillStyle = COULEURS.creme
  police(ctx, 600, taille)
  const espace = largeur(ctx, ' ')
  paragraphe.forEach(ligne => {
    police(ctx, 600, taille)
    const b = baseLigne(ctx, haut, hLigne)
    let x = 70
    ligne.forEach((mot, i) => {
      if (i) x += espace
      mot.forEach(r => {
        police(ctx, r.poids, taille)
        ctx.fillText(r.t, x, b)
        x += largeur(ctx, r.t)
      })
    })
    haut += hLigne
  })
}

const DESSINS = { nombre, grille, prochaine }

/**
 * Dessine les 3 images du bilan (4:5). Avec `onDiapo(canvas, index)` (fonction async),
 * chaque image lui est confiée dès qu'elle est dessinée puis libérée : une seule image
 * pleine taille en mémoire à la fois (téléphones). Sans `onDiapo`, les canvas sont rendus
 * et l'appelant les libère. En cas d'erreur, tout est libéré puis l'erreur relancée.
 */
export function dessinerBilanPermanence(plan, onDiapo) {
  return dessinerPlan(plan, H, DESSINS, onDiapo)
}
