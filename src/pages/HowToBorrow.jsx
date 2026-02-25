import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../services/supabaseClient' 
import { ArrowLeft, User, Building2, Calendar, CheckCircle2, Info, Mail, Phone, Landmark, ShieldCheck } from 'lucide-react'

export default function HowToBorrow() {
  const navigate = useNavigate()
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
    // AJOUT : Variables de contact par défaut
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

  return (
    <div className="min-h-screen bg-[#fdfaf6] font-sans pb-10 text-slate-900">
      <header className="bg-white border-b border-slate-100 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-20 flex items-center justify-between">
          <div className="flex-1">
            <button 
              onClick={() => navigate('/')}
              className="flex items-center gap-2 text-slate-400 hover:text-[#1a5f7a] font-bold transition-colors text-[9px] sm:text-[10px] md:text-xs uppercase tracking-widest"
            >
              <ArrowLeft size={16} />
              <span>Retour à la page d'accueil</span>
            </button>
          </div>
          <div className="hidden md:flex flex-1 justify-center text-center">
            <h1 className="text-xs font-black uppercase tracking-[0.2em] text-[#1a5f7a] whitespace-nowrap">
              Modalités d'emprunt
            </h1>
          </div>
          <div className="hidden md:block flex-1"></div> 
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 pt-12">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-black text-slate-900 mb-6">Comment emprunter un jeu ?</h2>
          <div className="max-w-3xl mx-auto bg-white border border-[#e38154]/20 rounded-[2rem] p-8 shadow-sm">
            <div className="flex items-center justify-center gap-3 mb-4 text-[#e38154]">
              <Landmark size={24} />
              <span className="font-black uppercase tracking-widest text-sm">Étape préalable</span>
            </div>
            <p className="text-slate-600 leading-relaxed font-medium">
              Pour profiter de la ludothèque, il faut d'abord être <span className="text-slate-900 font-bold">adhérent à l'Association PACTES</span> (contribution annuelle de <span className="text-[#e38154] font-black">10€</span>). 
              Une fois membre, vous pouvez adhérer à la ludothèque selon les tarifs ci-dessous.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-white rounded-[2.5rem] p-10 shadow-sm border border-slate-100 flex flex-col hover:border-[#1a5f7a] transition-all">
            <div className="w-16 h-16 bg-[#f0f7f9] text-[#1a5f7a] rounded-2xl flex items-center justify-center mb-6">
              <User size={32} />
            </div>
            <h3 className="text-2xl font-black text-slate-900 mb-2">Particuliers</h3>
            <p className="text-slate-500 text-sm mb-8 leading-relaxed">
              Une seule adhésion par foyer suffit pour que tout le monde puisse en profiter.
            </p>
            <div className="bg-[#f0f7f9] rounded-2xl p-6 mb-8 border border-[#1a5f7a]/10">
              <div className="flex items-baseline gap-1 mb-1">
                <span className="text-4xl font-black text-[#1a5f7a]">{feeParticulier}€</span>
                <span className="text-[#1a5f7a]/70 font-bold text-sm">
                  {appSettings.mode_adhesion_particulier === 'degressif' ? `pour ${currentYear}` : 'par an'}
                </span>
              </div>
              <p className="text-[10px] font-black text-[#e38154] uppercase tracking-wider">
                {appSettings.mode_adhesion_particulier === 'degressif' 
                  ? `Tarif dégressif • mois de ${monthName}` 
                  : 'Tarif fixe • Année glissante'}
              </p>
            </div>
            <ul className="space-y-4 mb-10 flex-grow">
              <li className="flex gap-3 text-slate-700 font-medium">
                <CheckCircle2 className="text-[#1a5f7a] flex-shrink-0" size={20} />
                Emprunt de {appSettings.quota_particulier} jeux par mois
              </li>
              <li className="flex gap-3 text-slate-700 font-medium">
                <CheckCircle2 className="text-[#1a5f7a] flex-shrink-0" size={20} />
                Valable pour tout le foyer
              </li>
              <li className="flex gap-3 text-slate-700 font-medium">
                <CheckCircle2 className="text-[#1a5f7a] flex-shrink-0" size={20} />
                {appSettings.mode_adhesion_particulier === 'degressif' ? "Expire le 31 décembre" : "Valable 1 an de date à date"}
              </li>
              {appSettings.active_caution_particulier === "true" && (
                <li className="flex gap-3 text-orange-600 font-black text-sm uppercase italic">
                  <ShieldCheck className="text-orange-500 flex-shrink-0" size={20} />
                  Caution de {appSettings.montant_caution_particulier}€ demandée
                </li>
              )}
            </ul>
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex gap-3 items-start">
              <Info size={16} className="text-[#e38154] mt-0.5" />
              <p className="text-[10px] text-slate-500 italic leading-tight">
                {appSettings.mode_adhesion_particulier === 'degressif' 
                  ? `Cotisation de ${appSettings.prix_particulier}€ au 1er janv, dégressive de ${appSettings.degressivite_mensuelle}€/mois (min ${appSettings.prix_minimum}€).`
                  : `Cotisation fixe de ${appSettings.prix_particulier}€ valable 12 mois à partir du jour de l'inscription.`}
              </p>
            </div>
          </div>

          <div className="bg-white rounded-[2.5rem] p-10 shadow-sm border border-slate-100 flex flex-col hover:border-[#e38154] transition-all">
            <div className="w-16 h-16 bg-[#fdf2ee] text-[#e38154] rounded-2xl flex items-center justify-center mb-6">
              <Building2 size={32} />
            </div>
            <h3 className="text-2xl font-black text-slate-900 mb-2">Collectivités</h3>
            <p className="text-slate-500 text-sm mb-8 leading-relaxed">
              Pour les structures (associations, écoles, mairies) de Coligny et alentours.
            </p>
            <div className="bg-[#fdf2ee] rounded-2xl p-6 mb-8 border border-[#e38154]/10">
              <div className="flex items-baseline gap-1 mb-1">
                <span className="text-4xl font-black text-[#e38154]">{feeAssociation}€</span>
                <span className="text-[#e38154]/70 font-bold text-sm">
                   {appSettings.mode_adhesion_association === 'degressif' ? `pour ${currentYear}` : 'par an'}
                </span>
              </div>
              <p className="text-[10px] font-black text-[#1a5f7a] uppercase tracking-wider">
                {appSettings.mode_adhesion_association === 'degressif' 
                  ? `Tarif dégressif • mois de ${monthName}` 
                  : 'Adhésion sur année glissante'}
              </p>
            </div>
            <ul className="space-y-4 mb-10 flex-grow">
              <li className="flex gap-3 text-slate-700 font-medium">
                <CheckCircle2 className="text-[#e38154] flex-shrink-0" size={20} />
                Emprunt de {appSettings.quota_association} jeux par mois
              </li>
              <li className="flex gap-3 text-slate-700 font-medium">
                <CheckCircle2 className="text-[#e38154] flex-shrink-0" size={20} />
                {appSettings.mode_adhesion_association === 'degressif' ? "Expire le 31 décembre" : "Valable 1 an de date à date"}
              </li>
              <li className="flex gap-3 text-slate-700 font-medium">
                <CheckCircle2 className="text-[#e38154] flex-shrink-0" size={20} />
                Idéal pour les activités de groupe
              </li>
              {appSettings.active_caution_association === "true" && (
                <li className="flex gap-3 text-orange-600 font-black text-sm uppercase italic">
                  <ShieldCheck className="text-orange-500 flex-shrink-0" size={20} />
                  Caution de {appSettings.montant_caution_association}€ demandée
                </li>
              )}
            </ul>
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex gap-3 items-start">
              <Calendar size={16} className="text-[#1a5f7a] mt-0.5" />
              <p className="text-[10px] text-slate-500 italic leading-tight">
                {appSettings.mode_adhesion_association === 'glissant' 
                  ? "Tarif fixe : l'adhésion expire à la date anniversaire l'année suivante."
                  : `Tarif dégressif sur base de ${appSettings.prix_association}€ (minimum ${appSettings.prix_minimum_asso}€).`}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-20 bg-[#1a5f7a] rounded-[3rem] p-12 text-white text-center relative overflow-hidden shadow-2xl">
          <h3 className="text-3xl font-black mb-6 text-white">Prêt à jouer ?</h3>
          <p className="text-cyan-100 max-w-2xl mx-auto mb-10 leading-relaxed font-medium">
            Passez nous voir au <span className="text-[#e38154] font-black">419 Grande Rue à Coligny</span> durant nos permanences. 
            L'inscription se fait directement sur place.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4 text-[10px] font-black uppercase tracking-widest">
            <div className="px-6 py-3 border border-white/20 rounded-xl bg-white/10 backdrop-blur-sm">1ers Samedis (10h-12h)</div>
            <div className="px-6 py-3 border border-white/20 rounded-xl bg-white/10 backdrop-blur-sm">3es samedis (14h-16h)</div>
          </div>
        </div>

        {/* SECTION CONTACT DYNAMIQUE */}
        <div className="mt-20 py-10 border-t border-slate-100">
            <div className="flex flex-col items-center">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-300 mb-8">Une question spécifique ?</p>
                <div className="flex flex-col md:flex-row items-center gap-8 md:gap-16">
                    <div className="flex items-center gap-4 group">
                        <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400">
                            <User size={16} />
                        </div>
                        <span className="text-sm font-bold text-slate-600">{appSettings.contact_nom}</span>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400">
                            <Phone size={16} />
                        </div>
                        <span className="text-sm font-medium text-slate-400">{appSettings.contact_tel}</span>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400">
                            <Mail size={16} />
                        </div>
                        <span className="text-sm font-medium text-slate-400">{appSettings.contact_email}</span>
                    </div>
                </div>
            </div>
        </div>
      </main>
    </div>
  )
}