import { useNavigate } from 'react-router-dom'
import { ArrowLeft, User, Building2, Calendar, CheckCircle2, Info, Mail, Phone } from 'lucide-react'

export default function HowToBorrow() {
  const navigate = useNavigate()
  
  const now = new Date()
  const currentMonth = now.getMonth() // 0 = Janvier
  const currentYear = now.getFullYear()
  
  // Calcul de la cotisation dégressive
  const privateFee = 24 - (currentMonth * 2)
  const monthName = new Intl.DateTimeFormat('fr-FR', { month: 'long' }).format(now)

  return (
    <div className="min-h-screen bg-[#fdfaf6] font-sans pb-10 text-slate-900">
      
      {/* HEADER MIS À JOUR : SANS LOGO DROITE ET TEXTE RETOUR LONG */}
      <header className="bg-white border-b border-slate-100 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-20 flex items-center justify-between">
          
          {/* Bouton retour avec texte complet */}
          <div className="flex-1">
            <button 
              onClick={() => navigate('/')}
              className="flex items-center gap-2 text-slate-400 hover:text-[#1a5f7a] font-bold transition-colors text-[9px] sm:text-[10px] md:text-xs uppercase tracking-widest"
            >
              <ArrowLeft size={16} />
              <span>Retour à la page d'accueil</span>
            </button>
          </div>

          {/* Titre centré (caché sur très petits écrans pour éviter la collision avec le long texte de retour) */}
          <div className="hidden md:flex flex-1 justify-center text-center">
            <h1 className="text-xs font-black uppercase tracking-[0.2em] text-[#1a5f7a] whitespace-nowrap">
              Adhésion
            </h1>
          </div>

          {/* Espace vide à droite pour maintenir le centrage du titre sur desktop */}
          <div className="hidden md:block flex-1"></div> 
          
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 pt-12">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-black text-slate-900 mb-4">Devenir adhérent</h2>
          <p className="text-[#e38154] font-bold uppercase tracking-widest text-xs">L'adhésion est gérée par l'association PACTES</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* CARTE PARTICULIER */}
          <div className="bg-white rounded-[2.5rem] p-10 shadow-sm border border-slate-100 flex flex-col hover:border-[#1a5f7a] transition-all">
            <div className="w-16 h-16 bg-[#f0f7f9] text-[#1a5f7a] rounded-2xl flex items-center justify-center mb-6">
              <User size={32} />
            </div>
            <h3 className="text-2xl font-black text-slate-900 mb-2">Particuliers</h3>
            <p className="text-slate-500 text-sm mb-8 leading-relaxed">
              Pour les familles et habitants souhaitant profiter de notre collection de jeux.
            </p>

            <div className="bg-[#f0f7f9] rounded-2xl p-6 mb-8 border border-[#1a5f7a]/10">
              <div className="flex items-baseline gap-1 mb-1">
                <span className="text-4xl font-black text-[#1a5f7a]">{privateFee}€</span>
                <span className="text-[#1a5f7a]/70 font-bold text-sm">pour {currentYear}</span>
              </div>
              <p className="text-[10px] font-black text-[#e38154] uppercase tracking-wider">
                Tarif dégressif • mois de {monthName}
              </p>
            </div>

            <ul className="space-y-4 mb-10 flex-grow">
              <li className="flex gap-3 text-slate-700 font-medium">
                <CheckCircle2 className="text-[#1a5f7a] flex-shrink-0" size={20} />
                Emprunt de 3 jeux par mois
              </li>
              <li className="flex gap-3 text-slate-700 font-medium">
                <CheckCircle2 className="text-[#1a5f7a] flex-shrink-0" size={20} />
                Accès aux événements
              </li>
              <li className="flex gap-3 text-slate-700 font-medium">
                <CheckCircle2 className="text-[#1a5f7a] flex-shrink-0" size={20} />
                Valable jusqu'au 31/12
              </li>
            </ul>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex gap-3 items-start">
              <Info size={16} className="text-[#e38154] mt-0.5" />
              <p className="text-[10px] text-slate-500 italic leading-tight">
                La cotisation est de 24€ au 1er janvier, puis dégressive de 2€ par mois.
              </p>
            </div>
          </div>

          {/* CARTE ASSOCIATION */}
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
                <span className="text-4xl font-black text-[#e38154]">50€</span>
                <span className="text-[#e38154]/70 font-bold text-sm">par an</span>
              </div>
              <p className="text-[10px] font-black text-[#1a5f7a] uppercase tracking-wider">
                Adhésion sur année glissante
              </p>
            </div>

            <ul className="space-y-4 mb-10 flex-grow">
              <li className="flex gap-3 text-slate-700 font-medium">
                <CheckCircle2 className="text-[#e38154] flex-shrink-0" size={20} />
                Emprunt de 5 jeux par mois
              </li>
              <li className="flex gap-3 text-slate-700 font-medium">
                <CheckCircle2 className="text-[#e38154] flex-shrink-0" size={20} />
                Valable 1 an (de date à date)
              </li>
              <li className="flex gap-3 text-slate-700 font-medium">
                <CheckCircle2 className="text-[#e38154] flex-shrink-0" size={20} />
                Idéal pour les activités de groupe
              </li>
            </ul>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex gap-3 items-start">
              <Calendar size={16} className="text-[#1a5f7a] mt-0.5" />
              <p className="text-[10px] text-slate-500 italic leading-tight">
                Tarif fixe : l'adhésion expire à la date anniversaire l'année suivante.
              </p>
            </div>
          </div>
        </div>

        {/* SECTION COMMENT FAIRE */}
        <div className="mt-20 bg-[#1a5f7a] rounded-[3rem] p-12 text-white text-center relative overflow-hidden shadow-2xl shadow-cyan-900/20">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16"></div>
          <h3 className="text-3xl font-black mb-6">Comment s'inscrire ?</h3>
          <p className="text-cyan-100 max-w-2xl mx-auto mb-10 leading-relaxed font-medium">
            Passez nous voir au <span className="text-[#e38154] font-black">412 Grande Rue à Coligny</span> durant nos permanences. 
            L'inscription se fait sur place avec un bénévole.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4 text-[10px] font-black uppercase tracking-widest">
            <div className="px-6 py-3 border border-white/20 rounded-xl bg-white/10 backdrop-blur-sm">1ers Samedis (10h-12h)</div>
            <div className="px-6 py-3 border border-white/20 rounded-xl bg-white/10 backdrop-blur-sm">3es samedis (14h-16h)</div>
          </div>
        </div>

        {/* CONTACT */}
        <div className="mt-20 py-10 border-t border-slate-100">
            <div className="flex flex-col items-center">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-300 mb-8 text-center">Une question spécifique ?</p>
                <div className="flex flex-col md:flex-row items-center gap-8 md:gap-16">
                    <div className="flex items-center gap-4 group">
                        <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover:text-[#1a5f7a] transition-colors shadow-sm">
                            <User size={16} />
                        </div>
                        <span className="text-sm font-bold text-slate-600">Victor Guyon</span>
                    </div>
                    <div className="flex items-center gap-4 group">
                        <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover:text-[#e38154] transition-colors shadow-sm">
                            <Phone size={16} />
                        </div>
                        <span className="text-sm font-medium text-slate-400">06 71 41 56 96</span>
                    </div>
                    <div className="flex items-center gap-4 group">
                        <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover:text-[#1a5f7a] transition-colors shadow-sm">
                            <Mail size={16} />
                        </div>
                        <span className="text-sm font-medium text-slate-400">victor.guyon@hotmail.fr</span>
                    </div>
                </div>
            </div>
        </div>
      </main>
    </div>
  )
}