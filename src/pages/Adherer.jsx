import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../services/supabaseClient'
import { usePageMeta } from '../services/seo'
import TitrePactes from '../components/TitrePactes'
import PublicLayout from '../components/site/PublicLayout'
import Reveal from '../components/site/Reveal'
import MaskIcon from '../components/site/MaskIcon'
import SuccessModal from '../components/site/SuccessModal'
import { BTN_PRIMARY, EYEBROW, INPUT } from '../components/site/styles'
import { ORIGINES } from '../services/origines'
import { cotisationDuMois, dureeAdhesion } from '../services/tarifs'
import { Loader2 } from 'lucide-react'

/**
 * Page « Adhérer » : pourquoi adhérer, comment ça se passe, et le formulaire de
 * pré-inscription (adresse du QR code posé sur les tables en soirée).
 *
 * Pas de paiement en ligne (pas de HelloAsso, choix de l'association) : la
 * demande part dans la table preinscriptions via la fonction preinscrire ; le
 * serveur envoie la confirmation et prévient les bénévoles, qui la retrouvent
 * dans l'écran Adhérents et la finalisent à la permanence.
 */
const COMMUNES = ['Coligny', 'Saint-Amour', 'Marboz', 'Beaupont', 'Pirajoux', 'Villemotier', 'Salavre', 'Verjon']
const RANGS = { '1': '1ers', '2': '2es', '3': '3es', '4': '4es', '5': 'Derniers' }
const heure = h => (h || '').slice(0, 5).replace(':00', 'h').replace(':', 'h')

const LABEL = 'mb-2 block text-[10px] font-extrabold uppercase tracking-[0.16em] text-slate-500'

export default function Adherer() {
  usePageMeta({
    title: 'Adhérer à la ludothèque',
    description: "Pré-inscrivez-vous en ligne à la ludothèque de Coligny (Ain) : plus de 300 jeux de société à emprunter, pour les habitants de Coligny, Saint-Amour, Marboz et alentours.",
    path: '/adherer',
  })

  const [s, setS] = useState({})
  const [gameCount, setGameCount] = useState(null)
  const [form, setForm] = useState({ type: 'Particulier', prenom: '', nom: '', email: '', tel: '', commune: '', foyer: '', origine: '', dates: true })
  const [etat, setEtat] = useState('saisie') // saisie | envoi | fait | erreur

  useEffect(() => {
    supabase.from('settings').select('*').then(({ data }) => {
      const obj = {}
      ;(data || []).forEach(r => { obj[r.id] = r.value })
      setS(obj)
    })
    supabase.from('games').select('id', { count: 'exact', head: true }).then(({ count }) => { if (count) setGameCount(count) })
  }, [])

  // Cotisation ludothèque du mois, comme sur « Comment emprunter » (services/tarifs.js)
  const fee = cotisationDuMois(s.prix_particulier, s.degressivite_mensuelle, s.prix_minimum, s.mode_adhesion_particulier)
  const feeAsso = cotisationDuMois(s.prix_association, s.degressivite_association, s.prix_minimum_asso, s.mode_adhesion_association)
  // Durée affichée : jusqu'au 31 décembre (dégressif) ou un an de date à date
  const duree = dureeAdhesion
  // Adhésion à l'association, réglée dans Paramètres → Finance (10 € jusqu'ici)
  const pactes = Number(s.cotisation_pactes ?? 10) || 0
  const total = fee + pactes
  const permanences = [1, 2]
    .filter(n => n === 1 || s.horaire_2_actif === 'true')
    .map(n => `${RANGS[s[`horaire_${n}_rang`]] || ''} ${(s[`horaire_${n}_jour`] || 'samedi').toLowerCase()}s (${heure(s[`horaire_${n}_debut`])}-${heure(s[`horaire_${n}_fin`])})`)

  const pret = !!s.prix_particulier

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const envoyer = async (e) => {
    e.preventDefault()
    setEtat('envoi')
    const { data: id, error } = await supabase.rpc('preinscrire', {
      demande: {
        type: form.type,
        prenom: form.type === 'Association' ? '' : form.prenom,
        nom: form.nom,
        email: form.email,
        telephone: form.tel,
        commune: form.commune,
        foyer: form.type === 'Association' ? '' : form.foyer,
        origine: form.origine,
        recevoir_dates: form.dates,
      },
    })
    if (error || !id) { setEtat('erreur'); return }
    // Confirmation à la personne + alerte aux bénévoles ; un échec n'annule pas la demande
    supabase.functions.invoke('send-email', { body: { preinscription: id } }).catch(() => {})
    setEtat('fait')
  }
  const asso = form.type === 'Association'

  const RAISONS = [
    { icon: 'ludo-raison-tester.svg', color: '#1a5f7a', tint: '#e6f0f3', title: "Testez avant d'acheter", text: "Jouez un mois à la maison, et n'achetez que les jeux qui vous plaisent vraiment." },
    { icon: 'ludo-raison-unique.svg', color: '#e38154', tint: '#fdf1ea', title: 'Les jeux à usage unique', text: "Unlock!, escape games, enquêtes : on n'y joue qu'une fois. Ici, ils s'empruntent." },
    { icon: 'ludo-raison-maison.svg', color: '#1a5f7a', tint: '#e6f0f3', title: gameCount ? `${gameCount} jeux à la maison` : 'Des centaines de jeux', text: 'Un nouveau jeu toutes les deux semaines, des tout-petits aux grands-parents.' },
    // Prix du moment lu dans les Paramètres : il change avec le mois (dégressif) et le type d'adhérent
    { icon: 'ludo-raison-prix.svg', color: '#e38154', tint: '#fdf1ea', title: pret ? `Toute la ludothèque pour ${total} €` : 'Une adhésion à petit prix', text: pret ? `Pour tout le foyer, ${duree(s.mode_adhesion_particulier)} : adhésion PACTES (${pactes} €) et ludothèque (${fee} €) comprises. Structures : ${feeAsso} € ${duree(s.mode_adhesion_association)}, plus l'adhésion PACTES.` : 'Tous les tarifs sont sur la page Comment emprunter.' },
  ]

  const ETAPES = [
    { title: 'Pré-inscrivez-vous ici', text: 'Deux minutes, sans payer en ligne.' },
    { title: 'Passez à une permanence', text: `${pret ? `${permanences.join(' ou ')}, au ` : 'Au '}${s.adresse_rue || '419 Grande Rue'}. On finalise : règlement et signature de la charte de prêt.` },
    { title: 'Repartez avec vos jeux', text: "Le jour même. Vous pouvez aussi adhérer pendant une soirée jeux et emporter celui que vous venez d'essayer." },
  ]

  return (
    <PublicLayout>
      <main className="px-4 pb-16 pt-8 md:px-10 md:pb-24 md:pt-12">
        <div className="mx-auto max-w-[1080px]">
          <div className="mb-9 text-center md:mb-12">
            <div className={EYEBROW}>Adhérer</div>
            <h1 className="anim-soft-in mt-3 font-display text-[28px] font-extrabold leading-[1.02] tracking-[-0.045em] sm:text-[36px] md:text-[54px]">
              Pourquoi <span className="text-[#e38154]">adhérer ?</span>
            </h1>
            <button
              type="button"
              onClick={() => document.getElementById('formulaire')?.scrollIntoView({ behavior: 'instant', block: 'start' })}
              className={`${BTN_PRIMARY} mt-6`}
            >
              Me pré-inscrire en 2 minutes ↓
            </button>
          </div>

          {/* ---------- RAISONS ---------- */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {RAISONS.map(r => (
              <Reveal key={r.title} className="rounded-[28px] border-2 border-[#0f172a] bg-white p-6" style={{ boxShadow: `6px 6px 0 ${r.color}` }}>
                <div className="mb-4 flex h-[52px] w-[52px] items-center justify-center rounded-[18px] border-2 border-[#0f172a]" style={{ background: r.tint }}>
                  <MaskIcon file={r.icon} size={34} color={r.color} />
                </div>
                <h2 className="mb-2 font-display text-[19px] font-extrabold leading-[1.15] tracking-[-0.03em]">{r.title}</h2>
                <p className="text-[13.5px] leading-[1.6] text-slate-500">{r.text}</p>
              </Reveal>
            ))}
          </div>

          {/* ---------- ÉTAPES + FORMULAIRE ---------- */}
          <div className="mt-10 grid grid-cols-1 gap-8 md:mt-14 lg:grid-cols-[1fr_1.25fr] lg:gap-10">
            <Reveal>
              <h2 className="mb-6 font-display text-[24px] font-extrabold tracking-[-0.04em] md:text-[32px]">
                Comment <span className="text-[#1a5f7a]">ça se passe</span>
              </h2>
              <ol className="flex flex-col gap-4">
                {ETAPES.map((e, i) => (
                  <li key={e.title} className="flex gap-4">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-[#0f172a] bg-[#1a5f7a] font-display text-[17px] font-extrabold text-white">{i + 1}</span>
                    <div className="min-w-0 pt-1">
                      <div className="font-display text-[17px] font-extrabold tracking-[-0.02em]">{e.title}</div>
                      <p className="mt-1 text-[13.5px] leading-[1.6] text-slate-500">{e.text}</p>
                    </div>
                  </li>
                ))}
              </ol>
              <p className="mt-6 text-[13px] leading-[1.6] text-slate-500">
                L'adhésion à la ludothèque passe par l'adhésion à l'association <TitrePactes className="text-[13px]" />.
                Détail des tarifs sur la page <Link to="/comment-emprunter" className="font-bold text-[#1a5f7a] underline">Comment emprunter</Link>.
              </p>
            </Reveal>

            <Reveal id="formulaire" className="scroll-mt-28 rounded-[32px] border-2 border-[#0f172a] bg-white p-6 shadow-[8px_8px_0_#e38154] md:p-9">
              <h2 className="mb-5 font-display text-[22px] font-extrabold uppercase tracking-[-0.04em] md:text-[26px]">
                Ma <span className="text-[#e38154]">pré-inscription</span>
              </h2>
              <form className="flex flex-col gap-4" onSubmit={envoyer}>
                <div className="flex gap-2">
                  {['Particulier', 'Association'].map(t => (
                    <button key={t} type="button" onClick={() => set('type', t)}
                      className={`flex-1 rounded-[16px] border-2 border-[#0f172a] py-3 text-[10px] font-extrabold uppercase tracking-[0.12em] ${form.type === t ? 'bg-[#1a5f7a] text-white' : 'bg-[#fdfaf6] text-slate-500'}`}>
                      {t === 'Association' ? 'Structure / asso' : t}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {!asso && (
                    <label className="min-w-0"><span className={LABEL}>Prénom</span>
                      <input id="adh-prenom" required autoComplete="given-name" className={INPUT} value={form.prenom} onChange={e => set('prenom', e.target.value)} />
                    </label>
                  )}
                  <label className={`min-w-0 ${asso ? 'sm:col-span-2' : ''}`}><span className={LABEL}>{asso ? 'Nom de la structure' : 'Nom'}</span>
                    <input id="adh-nom" required autoComplete="family-name" className={INPUT} value={form.nom} onChange={e => set('nom', e.target.value)} />
                  </label>
                  <label className="min-w-0"><span className={LABEL}>E-mail</span>
                    <input id="adh-email" type="email" required autoComplete="email" className={INPUT} value={form.email} onChange={e => set('email', e.target.value)} />
                  </label>
                  <label className="min-w-0"><span className={LABEL}>Téléphone</span>
                    <input id="adh-tel" type="tel" autoComplete="tel" className={INPUT} value={form.tel} onChange={e => set('tel', e.target.value)} />
                  </label>
                </div>

                <label><span className={LABEL}>Commune</span>
                  <input id="adh-commune" list="adh-communes" className={INPUT} value={form.commune} onChange={e => set('commune', e.target.value)} />
                  <datalist id="adh-communes">{COMMUNES.map(c => <option key={c} value={c} />)}</datalist>
                </label>

                {!asso && (
                  <label><span className={LABEL}>Autres membres du foyer <span className="normal-case tracking-normal text-slate-400">(facultatif)</span></span>
                    <input id="adh-foyer" placeholder="Ex. : Léa, Tom" className={INPUT} value={form.foyer} onChange={e => set('foyer', e.target.value)} />
                  </label>
                )}

                <label><span className={LABEL}>Comment nous avez-vous connus ?</span>
                  <select id="adh-origine" className={`${INPUT} cursor-pointer`} value={form.origine} onChange={e => set('origine', e.target.value)}>
                    <option value="">Choisir…</option>
                    {ORIGINES.map(o => <option key={o}>{o}</option>)}
                  </select>
                </label>

                <label className="flex cursor-pointer items-start gap-3 rounded-[18px] border-2 border-[#0f172a] bg-[#fdfaf6] p-4">
                  <input id="adh-dates" type="checkbox" className="mt-0.5 h-5 w-5 shrink-0 accent-[#e38154]" checked={form.dates} onChange={e => set('dates', e.target.checked)} />
                  <span className="text-[13px] font-semibold leading-[1.5] text-slate-600">Recevoir les prochaines dates (soirées, après-midi jeux) par e-mail</span>
                </label>

                {etat === 'erreur' && (
                  <p className="flex items-center gap-2 text-[12.5px] font-bold text-rose-600">
                    <MaskIcon file="ludo-alerte.svg" size={20} color="currentColor" className="shrink-0" /> L'envoi n'a pas fonctionné. Vérifiez votre adresse e-mail et réessayez.
                  </p>
                )}
                <button type="submit" disabled={etat === 'envoi'} className={`${BTN_PRIMARY} w-full`}>
                  {etat === 'envoi' ? <Loader2 className="animate-spin" size={18} /> : 'Envoyer ma pré-inscription'}
                </button>

                <p className="text-[11.5px] leading-[1.55] text-slate-500">
                  Vos coordonnées servent uniquement à gérer votre adhésion et ne sont jamais transmises.
                  Sans visite à une permanence sous 3 mois, la pré-inscription est effacée.{' '}
                  <Link to="/confidentialite" className="underline">En savoir plus</Link>
                </p>
              </form>
            </Reveal>
          </div>
        </div>
      </main>

      <SuccessModal
        open={etat === 'fait'}
        onClose={() => { setEtat('saisie'); setForm(f => ({ ...f, prenom: '', nom: '', email: '', tel: '', commune: '', foyer: '', origine: '' })) }}
        title="À très vite !"
        message={`Votre pré-inscription est bien reçue, un e-mail de confirmation vous attend. Passez nous voir à une permanence pour la finaliser et repartir avec vos premiers jeux : ${permanences.join(' ou ')}.`}
        actionLabel="Parfait"
      />
    </PublicLayout>
  )
}
