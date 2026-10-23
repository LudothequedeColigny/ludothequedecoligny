import {
  COULEURS, chargerImage, chargerPolices, nouveauCanvas, recouvrir, dessinerFlou, degradeBas, voile,
  rectArrondi, police, couperLignes, etiquette, pastille, texteContoure, liberer,
} from './dessin.js'

/**
 * Diapositives de l'annonce d'un événement (carrousel 1080 × 1350) et de la story
 * du jour J (1080 × 1920), d'après la maquette validée par Victor
 * (« Maquette bilan soirée jeux/annonce.html »). Même contrat que carrousel.js / story.js.
 */
const L = 1080
const H = 1350
const H_STORY = 1920
// PNG et non SVG : un SVG dessiné sur canvas peut le « bloquer » sur Safari (export impossible)
const LOGO = '/social/logo-feuille.png'
const FOND_BOIS = '/social/fond-bois.jpg'
const TITRE = 'Bricolage Grotesque'

// ---------- petits outils ----------

const espacer = (ctx, px) => { if ('letterSpacing' in ctx) ctx.letterSpacing = `${px}px` }

/** Largeur d'un texte avec l'interlettrage courant (police déjà réglée). */
const largeur = (ctx, t) => ctx.measureText(t).width

/**
 * Ordonnée de la ligne de base d'une ligne de texte de hauteur `hLigne` dont le haut est en `haut`
 * (même calcul que le navigateur : demi-interligne + montée de la police).
 */
function baseLigne(ctx, haut, hLigne) {
  const m = ctx.measureText('Hg')
  const asc = m.fontBoundingBoxAscent
  const desc = m.fontBoundingBoxDescent
  if (asc == null || desc == null) return haut + hLigne * 0.78
  return haut + (hLigne - (asc + desc)) / 2 + asc
}

/** Fond flouté de `url`, ou à défaut aplat bleu ; renvoie rien. */
async function fondFloute(ctx, url, h, voileCouleur) {
  const img = await chargerImage(url)
  if (img) dessinerFlou(ctx, img, L, h)
  else voile(ctx, L, h, COULEURS.bleu)
  if (voileCouleur) voile(ctx, L, h, voileCouleur)
}

/** Carte à contour intérieur (comme `border` en CSS) et ombre pleine décalée. */
function carte(ctx, x, y, w, h, { rayon, bord, decal, ombre, fond = COULEURS.creme }) {
  ctx.fillStyle = ombre
  rectArrondi(ctx, x + decal, y + decal, w, h, rayon); ctx.fill()
  ctx.fillStyle = fond
  rectArrondi(ctx, x, y, w, h, rayon); ctx.fill()
  ctx.lineWidth = bord
  ctx.strokeStyle = COULEURS.encre
  rectArrondi(ctx, x + bord / 2, y + bord / 2, w - bord, h - bord, Math.max(0, rayon - bord / 2)); ctx.stroke()
}

/**
 * Règle la police à la plus grande taille (entre tailleMax et tailleMin, tailleMin comprise)
 * où le texte tient dans `max` ; si même la plus petite ne suffit pas, tronque avec « … ».
 * Renvoie le texte à dessiner ; la police reste réglée.
 */
function tailleQuiTient(ctx, texte, poids, tailleMax, tailleMin, max, famille, interlettrage = 0) {
  const regler = t => { police(ctx, poids, t, famille); espacer(ctx, interlettrage * t) }
  let t = tailleMax
  regler(t)
  while (t > tailleMin && largeur(ctx, texte) > max) { t = Math.max(tailleMin, t - 2); regler(t) }
  let res = String(texte)
  if (largeur(ctx, res) > max) {
    while (res.length > 1 && largeur(ctx, `${res}…`) > max) res = res.slice(0, -1)
    res = `${res.trimEnd()}…`
  }
  return res
}

/** Coupe en `nbMax` lignes au plus, la dernière finissant par « … » si le texte déborde. */
function limiterLignes(ctx, lignes, nbMax, max) {
  if (lignes.length <= nbMax) return lignes
  const res = lignes.slice(0, nbMax)
  let t = res[nbMax - 1]
  while (t.length > 1 && largeur(ctx, `${t}…`) > max) t = t.slice(0, -1)
  res[nbMax - 1] = `${t.trimEnd()}…`
  return res
}

/** Affiche inclinée : contour encre, coins arrondis, ombre pleine encre. `h` = hauteur totale (contour compris), réduite si l'affiche dépasse `wMax` de large. */
function dessinerAffiche(ctx, img, { cx, haut, h, angle, ombre, wMax = L - 140 }) {
  const bord = 6
  const ratio = img.width / img.height
  let w = (h - 2 * bord) * ratio + 2 * bord
  if (w > wMax) { w = wMax; h = (w - 2 * bord) / ratio + 2 * bord }
  ctx.save()
  ctx.translate(cx, haut + h / 2)
  ctx.rotate((angle * Math.PI) / 180)
  ctx.fillStyle = COULEURS.encre
  rectArrondi(ctx, -w / 2 + ombre, -h / 2 + ombre, w, h, 14); ctx.fill()
  ctx.save()
  rectArrondi(ctx, -w / 2, -h / 2, w, h, 14); ctx.clip()
  ctx.drawImage(img, -w / 2 + bord, -h / 2 + bord, w - 2 * bord, h - 2 * bord)
  ctx.restore()
  ctx.lineWidth = bord
  ctx.strokeStyle = COULEURS.encre
  rectArrondi(ctx, -w / 2 + bord / 2, -h / 2 + bord / 2, w - bord, h - bord, 14 - bord / 2); ctx.stroke()
  ctx.restore()
}

/** Étiquette orange centrée horizontalement (largeur mesurée comme dans `etiquette`). */
function etiquetteCentree(ctx, texte, { y, taille, angle }) {
  police(ctx, 800, taille, TITRE)
  espacer(ctx, -0.04 * taille)
  const w = largeur(ctx, texte) + 68
  espacer(ctx, 0)
  return etiquette(ctx, [texte], { x: (L - w) / 2, y, taille, angle })
}

// ---------- 1 · L'affiche ----------

async function affiche(ctx, d, logo) {
  await fondFloute(ctx, d.fond, H, null)
  voile(ctx, L, H, 'rgba(15,23,42,0.45)')
  const imgAffiche = await chargerImage(d.affiche)
  if (imgAffiche) {
    etiquetteCentree(ctx, 'Prochain rendez-vous !', { y: 150, taille: 64, angle: -2 })
    dessinerAffiche(ctx, imgAffiche, { cx: L / 2, haut: 270, h: 1000, angle: 1.5, ombre: 18 })
    return
  }
  // Sans affiche : étiquette, titre de l'événement et date, le tout centré
  pastille(ctx, logo, 56, 56)
  let taille = 110
  let lignes = []
  for (; ; taille -= 2) {
    police(ctx, 800, taille, TITRE)
    espacer(ctx, -0.04 * taille)
    lignes = couperLignes(ctx, d.titre, 900)
    if (lignes.length <= 3 || taille <= 84) break
  }
  if (lignes.length > 3) lignes = limiterLignes(ctx, lignes, 3, 900)
  const hLigne = taille * 0.92
  const hEtiquette = 64 * 0.95 + 26
  const hQuand = 52 * 1.5
  const total = hEtiquette + 70 + lignes.length * hLigne + 56 + hQuand
  let y = (H - total) / 2
  etiquetteCentree(ctx, 'Prochain rendez-vous !', { y, taille: 64, angle: -2 })
  y += hEtiquette + 70
  ctx.textAlign = 'center'
  ctx.fillStyle = COULEURS.creme
  police(ctx, 800, taille, TITRE)
  espacer(ctx, -0.04 * taille)
  lignes.forEach((l, i) => ctx.fillText(l, L / 2, baseLigne(ctx, y + i * hLigne, hLigne)))
  espacer(ctx, 0)
  y += lignes.length * hLigne + 56
  ctx.fillText(tailleQuiTient(ctx, d.quand, 700, 52, 34, 940, 'Poppins'), L / 2, baseLigne(ctx, y, hQuand))
  ctx.textAlign = 'left'
}

// ---------- 2 · Ce qui vous attend ----------

async function attente(ctx, d, logo) {
  const photo = await chargerImage(d.photo)
  if (photo) {
    if (d.floute) dessinerFlou(ctx, photo, L, H)
    else recouvrir(ctx, photo, 0, 0, L, H)
  } else voile(ctx, L, H, COULEURS.bleu)
  degradeBas(ctx, L, H)
  pastille(ctx, logo, 56, 56)

  const bord = 6
  const lCarte = L - 140
  const lTexte = lCarte - 2 * bord - 104
  const liste = (d.points || []).slice(0, 3)
  // Mesure à l'échelle k ; on réduit les textes par paliers si la carte monterait sous la pastille (y < 200)
  const mesurer = k => {
    const tT = Math.round(84 * k)
    const tP = Math.round(34 * k)
    police(ctx, 800, tT, TITRE)
    espacer(ctx, -0.04 * tT)
    const titre = limiterLignes(ctx, couperLignes(ctx, d.titre, lTexte), 3, lTexte)
    espacer(ctx, 0)
    police(ctx, 600, tP)
    const puce = largeur(ctx, '✦') + 18
    const points = liste.map(pt => limiterLignes(ctx, couperLignes(ctx, pt, lTexte - puce), 3, lTexte - puce))
    const hAvant = 26 * 1.5
    const hTitre = titre.length * tT * 0.92
    const hPoints = points.reduce((sm, pt) => sm + pt.length * tP * 1.25, 0) + Math.max(0, points.length - 1) * 16
    const h = bord + 46 + hAvant + 14 + hTitre + (points.length ? 30 + hPoints : 0) + 50 + bord
    return { tT, tP, titre, puce, points, hAvant, hTitre, h }
  }
  let k = 1
  let m = mesurer(k)
  while (H - 90 - m.h < 200 && k > 0.5) { k -= 0.06; m = mesurer(k) }
  const { tT, tP, titre, puce, points, hAvant, hTitre, h } = m
  const x = 70
  const y = H - 90 - h

  ctx.save()
  ctx.translate(x + lCarte / 2, y + h / 2)
  ctx.rotate((-1 * Math.PI) / 180)
  ctx.translate(-lCarte / 2, -h / 2)
  carte(ctx, 0, 0, lCarte, h, { rayon: 34, bord, decal: 16, ombre: COULEURS.orange })
  const tx = bord + 52
  let ty = bord + 46
  ctx.fillStyle = COULEURS.orange
  police(ctx, 800, 26)
  espacer(ctx, 0.18 * 26)
  ctx.fillText('CE QUI VOUS ATTEND', tx, baseLigne(ctx, ty, hAvant))
  espacer(ctx, 0)
  ty += hAvant + 14
  ctx.fillStyle = COULEURS.encre
  police(ctx, 800, tT, TITRE)
  espacer(ctx, -0.04 * tT)
  titre.forEach((l, i) => ctx.fillText(l, tx, baseLigne(ctx, ty + i * tT * 0.92, tT * 0.92)))
  espacer(ctx, 0)
  ty += hTitre + 30
  points.forEach(lignes => {
    police(ctx, 600, tP)
    const b = baseLigne(ctx, ty, tP * 1.25)
    ctx.fillStyle = COULEURS.bleu
    ctx.fillText('✦', tx, b)
    ctx.fillStyle = COULEURS.encre
    lignes.forEach((l, i) => ctx.fillText(l, tx + puce, b + i * tP * 1.25))
    ty += lignes.length * tP * 1.25 + 16
  })
  ctx.restore()
}

// ---------- 3 · Les infos pratiques ----------

// Pictogrammes en tracés (grille 24 × 24), jamais d'émoji
const PICTOS = {
  calendrier: {
    couleur: COULEURS.orange, teinte: '#fdf1ea',
    traits: ['M3 4h18v18H3z', 'M16 2v4M8 2v4M3 10h18'],
  },
  lieu: {
    couleur: COULEURS.bleu, teinte: '#f0f7f9',
    traits: ['M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z'], cercles: [[12, 10, 3, false]],
  },
  de: {
    couleur: '#10b981', teinte: '#ecfdf5',
    traits: ['M6 3h12a3 3 0 0 1 3 3v12a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V6a3 3 0 0 1 3-3z'],
    cercles: [[8, 8, 1.2, true], [16, 16, 1.2, true], [12, 12, 1.2, true]],
  },
  biscuit: {
    couleur: '#d97706', teinte: '#fffbeb',
    traits: ['M12 2a10 10 0 1 0 10 10 4 4 0 0 1-5-5 4 4 0 0 1-5-5', 'M8.5 8.5v.01M16 15.5v.01M12 12v.01M11 17v.01M7 14v.01'],
  },
}

function pastilleIcone(ctx, nom, x, y) {
  const p = PICTOS[nom] || PICTOS.calendrier
  ctx.save()
  ctx.fillStyle = p.teinte
  rectArrondi(ctx, x, y, 110, 110, 22); ctx.fill()
  ctx.lineWidth = 4
  ctx.strokeStyle = COULEURS.encre
  rectArrondi(ctx, x + 2, y + 2, 106, 106, 20); ctx.stroke()
  ctx.translate(x + 55 - 31, y + 55 - 31)
  ctx.scale(62 / 24, 62 / 24)
  ctx.strokeStyle = p.couleur
  ctx.fillStyle = p.couleur
  ctx.lineWidth = 2.2
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  p.traits.forEach(t => ctx.stroke(new Path2D(t)))
  ;(p.cercles || []).forEach(([cx, cy, r, plein]) => {
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2)
    if (plein) ctx.fill()
    ctx.stroke()
  })
  ctx.restore()
}

async function infos(ctx, d, logo) {
  await fondFloute(ctx, d.fond, H, 'rgba(26,95,122,0.62)')
  pastille(ctx, logo, 56, 56)
  // Titre « Les infos pratiques »
  police(ctx, 800, 120, TITRE)
  espacer(ctx, -0.04 * 120)
  const debut = 'Les infos '
  ctx.fillStyle = COULEURS.creme
  const bt = baseLigne(ctx, 180, 120 * 0.92)
  ctx.fillText(debut, 70, bt)
  ctx.fillStyle = COULEURS.orange
  ctx.fillText('pratiques', 70 + largeur(ctx, debut), bt)
  espacer(ctx, 0)

  // Cartes (4 au plus) réparties entre y = 420 et H − 110 ; avec moins de cartes, écart limité et bloc centré
  const cartes = (d.cartes || []).slice(0, 4)
  const n = cartes.length
  if (!n) return
  const dispo = H - 110 - 420
  const hCarte = 192
  const ecart = n > 1 ? Math.min(40, (dispo - n * hCarte) / (n - 1)) : 0
  const y0 = 420 + (dispo - (n * hCarte + (n - 1) * ecart)) / 2
  const lCarte = L - 140
  const lTexte = lCarte - 10 - 80 - 110 - 34
  cartes.forEach((c, i) => {
    const y = y0 + i * (hCarte + ecart)
    carte(ctx, 70, y, lCarte, hCarte, { rayon: 30, bord: 5, decal: 12, ombre: COULEURS.encre })
    pastilleIcone(ctx, c.icone, 70 + 5 + 40, y + (hCarte - 110) / 2)
    const tx = 70 + 5 + 40 + 110 + 34
    const hTitre = 56 * 1.05
    const hDetail = c.detail ? 2 + 30 * 1.5 : 0
    const haut = y + (hCarte - hTitre - hDetail) / 2
    ctx.fillStyle = COULEURS.encre
    ctx.fillText(tailleQuiTient(ctx, c.titre, 800, 56, 36, lTexte, TITRE, -0.02), tx, baseLigne(ctx, haut, hTitre))
    espacer(ctx, 0)
    if (c.detail) {
      ctx.fillStyle = '#475569'
      ctx.fillText(tailleQuiTient(ctx, c.detail, 600, 30, 20, lTexte, 'Poppins'), tx, baseLigne(ctx, haut + hTitre + 2, 30 * 1.5))
    }
  })
}

// ---------- 4 · La dernière fois ----------

// Polaroïds de la maquette : position, taille totale, angle
const POLAROIDS = [
  { x: 80, y: 560, w: 470, h: 470, angle: -6 },
  { x: L - 70 - 440, y: 520, w: 440, h: 440, angle: 5 },
  { x: 300, y: 820, w: 480, h: 400, angle: -1 },
]

async function souvenir(ctx, d, logo) {
  await fondFloute(ctx, d.fond, H, 'rgba(26,95,122,0.62)')
  pastille(ctx, logo, 56, 56)
  ctx.textAlign = 'center'
  ctx.fillStyle = COULEURS.creme
  police(ctx, 700, 52)
  ctx.fillText('La dernière fois,', L / 2, baseLigne(ctx, 180, 52 * 1.5))
  // « nous étions N ! » : crème puis orange, centré d'après la largeur mesurée
  ctx.textAlign = 'left'
  police(ctx, 800, 128, TITRE)
  espacer(ctx, -0.04 * 128)
  const debut = 'nous étions '
  const fin = `${d.nombre}\u00A0!`
  const w = largeur(ctx, debut) + largeur(ctx, fin)
  const bt = baseLigne(ctx, 180 + 78 + 6, 128 * 0.92)
  ctx.fillText(debut, (L - w) / 2, bt)
  ctx.fillStyle = COULEURS.orange
  ctx.fillText(fin, (L - w) / 2 + largeur(ctx, debut), bt)
  espacer(ctx, 0)

  const urls = (d.photos || []).slice(0, 3)
  const images = await Promise.all(urls.map(u => chargerImage(u)))
  urls.forEach((_, i) => {
    const p = POLAROIDS[i]
    const img = images[i]
    ctx.save()
    ctx.translate(p.x + p.w / 2, p.y + p.h / 2)
    ctx.rotate((p.angle * Math.PI) / 180)
    carte(ctx, -p.w / 2, -p.h / 2, p.w, p.h, { rayon: 0, bord: 5, decal: 14, ombre: COULEURS.encre })
    if (img) {
      ctx.save()
      ctx.beginPath()
      ctx.rect(-p.w / 2 + 23, -p.h / 2 + 23, p.w - 46, p.h - 92)
      ctx.clip()
      recouvrir(ctx, img, -p.w / 2 + 23, -p.h / 2 + 23, p.w - 46, p.h - 92)
      ctx.restore()
    }
    ctx.restore()
  })

  ctx.textAlign = 'center'
  ctx.fillStyle = COULEURS.creme
  ctx.fillText(tailleQuiTient(ctx, d.legende, 700, 36, 24, 940, 'Poppins'), L / 2, baseLigne(ctx, H - 64 - 54, 54))
  ctx.textAlign = 'left'
}

// ---------- 5 · On vous attend ----------

async function attend(ctx, d, logo) {
  const bois = await chargerImage(FOND_BOIS)
  if (bois) recouvrir(ctx, bois, 0, 0, L, H)
  else voile(ctx, L, H, COULEURS.bleu)
  pastille(ctx, logo, 56, 56)

  // Titre géant, en une ou deux lignes
  const grand = 176
  police(ctx, 800, grand, TITRE)
  espacer(ctx, -0.04 * grand)
  // Une ligne si ça tient, sinon deux (« attend ! » reste soudé)
  const lignes = largeur(ctx, 'On vous attend !') <= 920 ? ['On vous attend !'] : ['On vous', 'attend !']
  espacer(ctx, 0)
  const hLigne = grand * 0.92
  const hRappel = 64 * 1.2
  const hAction = 30 * 1.5 + 36 + 10
  const total = lignes.length * hLigne + 60 + hRappel + 70 + hAction
  let y = (H - total) / 2

  ctx.textAlign = 'center'
  lignes.forEach((l, i) => {
    const b = baseLigne(ctx, y + i * hLigne, hLigne)
    police(ctx, 800, grand, TITRE)
    texteContoure(ctx, l, L / 2, b, { taille: grand, contour: 4, ombre: 16 })
  })
  y += lignes.length * hLigne + 60
  ctx.fillStyle = COULEURS.creme
  ctx.fillText(tailleQuiTient(ctx, d.quand, 800, 64, 40, 920, TITRE, -0.03), L / 2, baseLigne(ctx, y, hRappel))
  espacer(ctx, 0)
  y += hRappel + 70

  // Deux pastilles d'action
  police(ctx, 800, 30)
  const textes = ['Enregistrez ce post', 'Identifiez un ami']
  const largeurs = textes.map(t => largeur(ctx, t) + 68 + 10)
  let x = (L - largeurs.reduce((s, v) => s + v, 0) - 22) / 2
  textes.forEach((t, i) => {
    carte(ctx, x, y, largeurs[i], hAction, { rayon: hAction / 2, bord: 5, decal: 9, ombre: COULEURS.encre })
    ctx.fillStyle = COULEURS.encre
    ctx.textAlign = 'left'
    police(ctx, 800, 30)
    ctx.fillText(t, x + 5 + 34, baseLigne(ctx, y + 5 + 18, 45))
    x += largeurs[i] + 22
  })

  ctx.textAlign = 'center'
  ctx.fillStyle = COULEURS.creme
  police(ctx, 700, 30)
  ctx.fillText('ludothequedecoligny.fr', L / 2, baseLigne(ctx, H - 60 - 45, 45))
  ctx.textAlign = 'left'
}

// ---------- Affiche seule (permanence, autres événements) ----------

/**
 * Comme la diapositive 1 d'une soirée : affiche penchée sur son fond flouté, étiquette
 * en haut, et une courte phrase en bas (2 lignes au plus ; vide : affiche plus grande).
 */
async function afficheSeule(ctx, d) {
  await fondFloute(ctx, d.fond, H, 'rgba(15,23,42,0.45)')
  etiquetteCentree(ctx, d.etiquette, { y: 110, taille: 64, angle: -2 })

  const max = L - 160
  let taille = 56
  let lignes = []
  if (d.phrase) {
    for (; ; taille -= 2) {
      police(ctx, 800, taille, TITRE)
      espacer(ctx, -0.03 * taille)
      lignes = couperLignes(ctx, d.phrase, max)
      if (lignes.length <= 2 || taille <= 40) break
    }
    lignes = limiterLignes(ctx, lignes, 2, max)
    // Deux lignes : coupe équilibrée plutôt qu'un mot seul sur la seconde
    if (lignes.length === 2 && couperLignes(ctx, d.phrase, max).length === 2) {
      let w = max
      while (w > max / 2 && couperLignes(ctx, d.phrase, w - 10).length === 2) w -= 10
      lignes = couperLignes(ctx, d.phrase, w)
    }
  }
  const hLigne = taille * 1.1
  const basPhrase = H - 70
  const hautPhrase = basPhrase - lignes.length * hLigne

  // Affiche entre l'étiquette et la phrase, centrée dans l'espace libre
  const img = await chargerImage(d.affiche)
  if (img) {
    const haut = 250
    const bas = lignes.length ? hautPhrase - 56 : H - 80
    let h = bas - haut
    const bord = 6
    const wMax = L - 140
    const ratio = img.width / img.height
    if ((h - 2 * bord) * ratio + 2 * bord > wMax) h = (wMax - 2 * bord) / ratio + 2 * bord
    dessinerAffiche(ctx, img, { cx: L / 2, haut: haut + (bas - haut - h) / 2, h, angle: 1.5, ombre: 18, wMax })
  }

  if (lignes.length) {
    ctx.textAlign = 'center'
    ctx.fillStyle = COULEURS.creme
    police(ctx, 800, taille, TITRE)
    espacer(ctx, -0.03 * taille)
    lignes.forEach((l, i) => ctx.fillText(l, L / 2, baseLigne(ctx, hautPhrase + i * hLigne, hLigne)))
    espacer(ctx, 0)
    ctx.textAlign = 'left'
  }
}

const DESSINS = { affiche, attente, infos, souvenir, attend, afficheSeule }

// ---------- Story du jour J ----------

async function jourJ(ctx, d, logo) {
  const h = H_STORY
  if (d.fond) {
    await fondFloute(ctx, d.fond, h, 'rgba(15,23,42,0.45)')
  } else voile(ctx, L, h, COULEURS.bleu)
  pastille(ctx, logo, 70, 270)

  // Étiquette « C'est ce soir ! » : taille réduite si la formule est longue, 2 lignes en dernier recours
  const maxEt = L - 140 - 68
  let taille = 150
  let lignes = [d.formule]
  for (; taille >= 100; taille -= 2) {
    police(ctx, 800, taille, TITRE)
    espacer(ctx, -0.04 * taille)
    if (largeur(ctx, d.formule) <= maxEt) break
  }
  if (taille < 100) {
    taille = 120
    police(ctx, 800, taille, TITRE)
    espacer(ctx, -0.04 * taille)
    lignes = couperLignes(ctx, d.formule, maxEt)
  }
  espacer(ctx, 0)
  const { hauteur } = etiquette(ctx, lignes, { x: 70, y: 400, taille, angle: -3 })
  const basEtiquette = 400 + hauteur

  ctx.fillStyle = COULEURS.creme
  const lMax = L - 140
  const imgAffiche = await chargerImage(d.affiche)
  if (imgAffiche) {
    // Titre en 2 lignes au plus, puis l'affiche inclinée, puis la ligne « heure · lieu »
    police(ctx, 800, 74, TITRE)
    espacer(ctx, -0.03 * 74)
    const titre = limiterLignes(ctx, couperLignes(ctx, d.titre, lMax), 2, lMax)
    const hLigne = 74 * 0.92
    const hautTitre = Math.max(640, basEtiquette + 72)
    titre.forEach((l, i) => ctx.fillText(l, 76, baseLigne(ctx, hautTitre + i * hLigne, hLigne)))
    espacer(ctx, 0)
    const haut = Math.max(790, hautTitre + titre.length * hLigne + 50)
    dessinerAffiche(ctx, imgAffiche, { cx: L / 2, haut, h: Math.min(700, 1495 - haut), angle: 3, ombre: 18 })
  } else {
    // Sans affiche : titre plus grand, centré, et la ligne juste dessous
    let t = 110
    let titre = []
    for (; ; t -= 2) {
      police(ctx, 800, t, TITRE)
      espacer(ctx, -0.03 * t)
      titre = couperLignes(ctx, d.titre, lMax)
      if (titre.length <= 3 || t <= 84) break
    }
    titre = limiterLignes(ctx, titre, 3, lMax)
    const hLigne = t * 0.92
    const hLigneBas = 38 * 1.5
    const total = titre.length * hLigne + 60 + hLigneBas
    const zoneHaut = basEtiquette + 60
    const zoneBas = 1540
    let y = zoneHaut + (zoneBas - zoneHaut - total) / 2
    ctx.textAlign = 'center'
    police(ctx, 800, t, TITRE)
    espacer(ctx, -0.03 * t)
    titre.forEach((l, i) => ctx.fillText(l, L / 2, baseLigne(ctx, y + i * hLigne, hLigne)))
    espacer(ctx, 0)
    y += titre.length * hLigne + 60
    ctx.fillText(tailleQuiTient(ctx, d.ligne, 700, 38, 26, 940, 'Poppins'), L / 2, baseLigne(ctx, y, hLigneBas))
    ctx.textAlign = 'left'
    return
  }
  // Ligne « 19h · Salle des fêtes » au-dessus de la zone recouverte par Instagram (1580)
  ctx.textAlign = 'center'
  ctx.fillStyle = COULEURS.creme
  ctx.fillText(tailleQuiTient(ctx, d.ligne, 700, 38, 26, 940, 'Poppins'), L / 2, baseLigne(ctx, 1520, 38 * 1.5))
  ctx.textAlign = 'left'
}

/** Boucle commune : une image à la fois, confiée à `onDiapo` puis libérée (cf. carrousel.js). */
async function dessinerPlan(plan, hauteur, dessins, onDiapo) {
  await chargerPolices()
  const logo = await chargerImage(LOGO)
  const canvases = []
  for (let i = 0; i < plan.length; i++) {
    const d = plan[i]
    const { canvas, ctx } = nouveauCanvas(L, hauteur)
    try {
      ctx.fillStyle = COULEURS.encre
      ctx.fillRect(0, 0, L, hauteur)
      await dessins[d.type](ctx, d, logo)
      if (onDiapo) await onDiapo(canvas, i)
    } catch (e) {
      // En cas d'échec (ou d'abandon demandé par l'appelant), rien ne reste en mémoire
      liberer(canvas)
      canvases.forEach(liberer)
      throw e
    }
    if (onDiapo) liberer(canvas)
    else canvases.push(canvas)
  }
  return canvases
}

/**
 * Dessine les images de l'annonce (4:5). Avec `onDiapo(canvas, index)` (fonction async),
 * chaque image lui est confiée dès qu'elle est dessinée puis libérée ; sinon les canvas
 * sont rendus et l'appelant les libère.
 */
export function dessinerAnnonce(plan, onDiapo) {
  return dessinerPlan(plan, H, DESSINS, onDiapo)
}

/** Dessine la story du jour J (9:16, rien dans les 250 px du haut ni les 340 px du bas). */
export function dessinerStoryJourJ(plan, onDiapo) {
  return dessinerPlan(plan, H_STORY, { jourJ }, onDiapo)
}
