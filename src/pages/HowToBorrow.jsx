import { useState, useEffect } from 'react'
import { supabase } from '../services/supabaseClient'
import { ShieldCheck, Download } from 'lucide-react'
import TitrePactes from '../components/TitrePactes'
import PublicLayout from '../components/site/PublicLayout'
import Reveal from '../components/site/Reveal'
import MaskIcon from '../components/site/MaskIcon'

export default function HowToBorrow() {
  const [appSettings, setAppSettings] = useState({
    prix_particulier: 0,
    degressivite_mensuelle: 0,
    prix_minimum: 0,
    mode_adhesion_particulier: "degressif",
    prix_association: 0,
    degressivite_association: 0,
    prix_minimum_asso: 0,
    mode_adhesion_association: "glissant",
    active_caution_particulier: "false",
    montant_caution_particulier: 0,
    active_caution_association: "false",
    montant_caution_association: 0,
    quota_particulier: 3,
    quota_association: 5,
    contact_nom: 'Victor Guyon',
    contact_tel: '06 71 41 56 96',
    contact_email: 'victor.guyon@hotmail.fr'
  })

  const now = new Date()
  const currentMonth = now.getMonth()
  const currentYear = now.getFullYear()
  const monthName = new Intl.DateTimeFormat('fr-FR', { month: 'long' }).format(now)

  useEffect(() => {
    loadSettings()
  }, [])

  async function loadSettings() {
    const { data } = await supabase.from('settings').select('*')
    if (data) {
      const obj = {}
      data.forEach(s => obj[s.id] = s.value)
      setAppSettings(prev => ({ ...prev, ...obj }))
    }
  }

  const calculateDisplayFee = (type) => {
    const isAsso = type === 'Association';
    const base = Number(isAsso ? appSettings.prix_association : appSettings.prix_particulier) || 0;
    const deg = Number(isAsso ? appSettings.degressivite_association : appSettings.degressivite_mensuelle) || 0;
    const min = Number(isAsso ? appSettings.prix_minimum_asso : appSettings.prix_minimum) || 0;
    const mode = isAsso ? appSettings.mode_adhesion_association : appSettings.mode_adhesion_particulier;

    if (mode === 'degressif') {
      const calculated = base - (currentMonth * deg);
      return Math.max(calculated, min);
    }
    return base;
  }

  const feeParticulier = calculateDisplayFee('Particulier');
  const feeAssociation = calculateDisplayFee('Association');

  // Les deux offres partagent la même structure : on la décrit une fois, on la rend deux fois.
  const OFFERS = [
    {
      key: 'particulier',
      title: 'Particuliers',
      intro: 'Une seule adhésion par foyer suffit pour que tout le monde puisse en profiter.',
      icon: '04.svg',
      accent: '#1a5f7a',
      tint: '#f0f7f9',
      counterTint: '#e38154',
      reveal: 'left',
      fee: feeParticulier,
      period: appSettings.mode_adhesion_particulier === 'degressif' ? `pour ${currentYear}` : 'par an',
      note: appSettings.mode_adhesion_particulier === 'degressif'
        ? `Tarif dégressif • mois de ${monthName}`
        : 'Tarif fixe • Année glissante',
      perks: [
        `Emprunt de ${appSettings.quota_particulier} jeux pour 1 mois maximum`,
        'Valable pour tout le foyer',
        appSettings.mode_adhesion_particulier === 'degressif' ? 'Expire le 31 décembre' : 'Valable 1 an de date à date',
      ],
      caution: appSettings.active_caution_particulier === 'true'
        ? `Caution de ${appSettings.montant_caution_particulier}€ demandée`
        : null,
      footnote: appSettings.mode_adhesion_particulier === 'degressif'
        ? `Cotisation de ${appSettings.prix_particulier}€ au 1er janv, dégressive de ${appSettings.degressivite_mensuelle}€/mois (min ${appSettings.prix_minimum}€).`
        : `Cotisation fixe de ${appSettings.prix_particulier}€ valable 12 mois à partir du jour de l'inscription.`,
    },
    {
      key: 'collectivite',
      title: 'Collectivités',
      intro: 'Pour les structures (associations, écoles, mairies) de Coligny et alentours.',
      icon: '02.svg',
      accent: '#e38154',
      tint: '#fdf1ea',
      counterTint: '#1a5f7a',
      reveal: 'right',
      fee: feeAssociation,
      period: appSettings.mode_adhesion_association === 'degressif' ? `pour ${currentYear}` : 'par an',
      note: appSettings.mode_adhesion_association === 'degressif'
        ? `Tarif dégressif • mois de ${monthName}`
        : 'Adhésion sur année glissante',
      perks: [
        `Emprunt de ${appSettings.quota_association} jeux pour 1 mois maximum`,
        appSettings.mode_adhesion_association === 'degressif' ? 'Expire le 31 décembre' : 'Valable 1 an de date à date',
        'Idéal pour les activités de groupe',
      ],
      caution: appSettings.active_caution_association === 'true'
        ? `Caution de ${appSettings.montant_caution_association}€ demandée`
        : null,
      footnote: appSettings.mode_adhesion_association === 'glissant'
        ? "Tarif fixe : l'adhésion expire à la date anniversaire l'année suivante."
        : `Tarif dégressif sur base de ${appSettings.prix_association}€ (minimum ${appSettings.prix_minimum_asso}€).`,
    },
  ]

  return (
    <PublicLayout>
      <main className="px-4 pb-16 pt-8 md:px-10 md:pb-24 md:pt-12">
        <div className="mx-auto max-w-[1080px]">
          <div className="mb-9 text-center md:mb-12">
            <h1 className="anim-soft-in mb-6 font-display text-[26px] font-extrabold leading-[1.02] tracking-[-0.045em] sm:text-[32px] md:text-[54px]">
              Comment emprunter <span className="text-[#1a5f7a]">un jeu ?</span>
            </h1>

            <Reveal
              variant="scale"
              className="mx-auto max-w-[760px] rounded-[32px] border-2 border-[#0f172a] bg-white p-6 shadow-[6px_6px_0_#e38154] md:p-9"
            >
              <div className="mb-4 inline-flex items-center gap-2.5 rounded-full bg-[#fdf1ea] px-4 py-2 text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#d06b42]">
                Étape préalable
              </div>
              <p className="text-[15.5px] font-medium leading-[1.68] text-slate-600">
                Pour profiter de la ludothèque, il faut d'abord être{' '}
                <strong className="text-[#0f172a]">adhérent à l'Association <TitrePactes className="align-middle text-base" /></strong>{' '}
                (contribution annuelle de <strong className="text-[#e38154]">10€</strong>).
                Une fois membre, vous pouvez adhérer à la ludothèque selon les tarifs ci-dessous.
              </p>
            </Reveal>
          </div>

          {/* ---------- TARIFS ---------- */}
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            {OFFERS.map(offer => (
              <Reveal
                key={offer.key}
                variant={offer.reveal}
                className="flex flex-col rounded-[34px] border-2 border-[#0f172a] bg-white p-7 md:p-10"
                style={{ boxShadow: `7px 7px 0 ${offer.accent}` }}
              >
                <div
                  className="mb-5 flex h-[58px] w-[58px] items-center justify-center rounded-[20px] border-2 border-[#0f172a]"
                  style={{ background: offer.tint }}
                >
                  <MaskIcon file={offer.icon} size={26} color={offer.accent} />
                </div>

                <h2 className="mb-2 font-display text-[24px] font-extrabold tracking-[-0.035em] md:text-[30px]">
                  {offer.title}
                </h2>
                <p className="mb-6 text-sm leading-[1.6] text-slate-500">{offer.intro}</p>

                <div
                  className="mb-6 rounded-[24px] border-2 border-[#0f172a] p-5"
                  style={{ background: offer.tint }}
                >
                  <div className="flex items-baseline gap-2">
                    <span
                      className="font-display text-[44px] font-extrabold leading-none tracking-[-0.05em]"
                      style={{ color: offer.accent }}
                    >
                      {offer.fee}€
                    </span>
                    <span className="text-sm font-bold" style={{ color: offer.accent }}>{offer.period}</span>
                  </div>
                  <div
                    className="mt-2 text-[10px] font-extrabold uppercase tracking-[0.16em]"
                    style={{ color: offer.counterTint }}
                  >
                    {offer.note}
                  </div>
                </div>

                <div className="mb-6 flex flex-col gap-3.5">
                  {offer.perks.map(perk => (
                    <div key={perk} className="flex items-start gap-3">
                      <span
                        className="mt-1 h-[18px] w-[18px] shrink-0 rounded-full"
                        style={{ background: offer.accent }}
                      />
                      <span className="text-[14.5px] font-medium text-slate-700">{perk}</span>
                    </div>
                  ))}
                  {offer.caution && (
                    <div className="flex items-start gap-3 text-orange-600">
                      <ShieldCheck size={20} className="mt-0.5 shrink-0 text-orange-500" />
                      <span className="text-sm font-extrabold uppercase italic">{offer.caution}</span>
                    </div>
                  )}
                </div>

                <div className="mt-auto rounded-[18px] border-2 border-dashed border-slate-200 bg-[#fdfaf6] p-4 text-[11px] italic leading-[1.55] text-slate-400">
                  {offer.footnote}
                </div>
              </Reveal>
            ))}
          </div>

          {/* ---------- CHARTE ---------- */}
          <Reveal className="mt-9 flex flex-col items-center gap-6 rounded-[34px] border-2 border-dashed border-[#0f172a] bg-white p-7 text-center sm:flex-row sm:items-center sm:text-left md:mt-12 md:p-11">
            <div className="flex h-[76px] w-[76px] shrink-0 items-center justify-center rounded-full border-2 border-[#0f172a] bg-[#fdfaf6]">
              <MaskIcon file="07.svg" size={32} color="#1a5f7a" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="mb-2 font-display text-[22px] font-extrabold uppercase tracking-[-0.03em]">
                Charte de la ludothèque
              </h2>
              <p className="mb-5 text-[13px] leading-[1.6] text-slate-500">
                Consultez les règles d'usage, de soin des jeux et de respect des permanences
                en téléchargeant notre charte officielle.
              </p>
              <a
                href="/charte-de-pret-ludotheque.pdf"
                download="charte-de-pret-ludotheque.pdf"
                className="inline-flex max-w-full items-center justify-center gap-3 text-balance rounded-[18px] border-2 border-[#0f172a] bg-white px-5 py-4 text-[10px] font-extrabold uppercase leading-relaxed tracking-[0.14em] text-[#1a5f7a] shadow-[4px_4px_0_#1a5f7a] transition-colors hover:bg-[#1a5f7a] hover:text-white"
              >
                <Download size={16} />
                Télécharger la charte de la ludothèque
              </a>
            </div>
          </Reveal>

          {/* ---------- APPEL À VENIR ---------- */}
          <Reveal className="mt-9 rounded-[32px] border-2 border-[#0f172a] bg-[#1a5f7a] p-8 text-center text-white shadow-[10px_10px_0_#0f172a] md:mt-12 md:rounded-[52px] md:p-14">
            <h2 className="mb-4 font-display text-[28px] font-extrabold tracking-[-0.04em] md:text-[42px]">
              Prêt à jouer ?
            </h2>
            <p className="mx-auto mb-7 max-w-[34em] text-base font-medium leading-[1.65] text-white/80">
              Passez nous voir au <strong className="text-[#e38154]">419 Grande Rue à Coligny</strong> durant
              nos permanences. L'inscription se fait directement sur place.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <div className="rounded-full border border-white/30 bg-white/10 px-5 py-3.5 text-[10px] font-extrabold uppercase tracking-[0.16em]">
                1ers Samedis (10h-12h)
              </div>
              <div className="rounded-full border border-white/30 bg-white/10 px-5 py-3.5 text-[10px] font-extrabold uppercase tracking-[0.16em]">
                3es Samedis (14h-16h)
              </div>
            </div>
          </Reveal>
        </div>
      </main>
    </PublicLayout>
  )
}
