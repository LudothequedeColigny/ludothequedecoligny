import React, { useEffect, useState } from 'react'
import { TabletSmartphone, Smartphone, Download, Share, PlusSquare, MoreVertical, CheckCircle2 } from 'lucide-react'

export default function InstallationApp() {
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [platform, setPlatform] = useState('unknown')

  useEffect(() => {
    const userAgent = window.navigator.userAgent.toLowerCase()
    if (/iphone|ipad|ipod/.test(userAgent)) {
      setPlatform('ios')
    } else if (/android/.test(userAgent)) {
      setPlatform('android')
    }

    const handler = (e) => {
      e.preventDefault()
      setDeferredPrompt(e)
    }

    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handleAndroidInstall = async () => {
    if (!deferredPrompt) {
      alert("Note : Pour installer l'application, vous devez impérativement utiliser le navigateur Google Chrome.")
      return
    }
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') setDeferredPrompt(null)
  }

  return (
    <div className="min-h-screen bg-[#fdfaf6] font-sans pb-20">
      
      {/* EN-TÊTE (Style Dashboard) */}
      <header className="p-4 md:p-10 max-w-7xl mx-auto">
        <h1 className="text-2xl md:text-4xl font-black text-slate-900 tracking-tight flex items-center gap-4">
          <div className="p-3 bg-[#e38154] rounded-[1.2rem] md:rounded-[1.5rem] shadow-lg shadow-orange-900/20 text-white">
            <Smartphone size={28} />
          </div>
          <div className="flex flex-col md:flex-row md:items-baseline md:gap-3">
            <span className="leading-none">Installer <span className="text-[#e38154]">l'App</span></span>
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#1a5f7a]">LudoColigny</span>
          </div>
        </h1>
      </header>

      <main className="max-w-4xl mx-auto px-4 md:px-10 space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-700">
        
        {/* BLOC PRIORITAIRE ANDROID */}
        {platform === 'android' && (
          <div className="bg-[#1a5f7a] rounded-[2.5rem] md:rounded-[3.5rem] p-8 md:p-12 text-white flex flex-col md:flex-row items-center justify-between gap-8 shadow-2xl shadow-cyan-900/20 relative overflow-hidden group">
            <div className="absolute -top-24 -right-24 w-64 h-64 bg-white/5 rounded-full"></div>
            
            <div className="relative z-10 text-center md:text-left">
              <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tight mb-3">
                LudoColigny sur Android
              </h2>
              <p className="text-xs md:text-base text-cyan-100/70 font-medium max-w-sm">
                Votre appareil permet une installation simplifiée via le navigateur <strong>Google Chrome</strong>.
              </p>
            </div>

            <button 
              onClick={handleAndroidInstall}
              className="w-full md:w-auto relative z-10 bg-[#e38154] text-white px-10 py-5 rounded-[1.5rem] font-black uppercase text-[11px] tracking-widest hover:bg-[#d16f43] transition-all shadow-xl shadow-orange-900/20 active:scale-95 flex items-center justify-center gap-4"
            >
              Installer maintenant
              <Download size={20} />
            </button>
          </div>
        )}

        {/* GRILLE D'INSTRUCTIONS */}
        <div className="grid grid-cols-1 gap-6">
          <div className="bg-white p-8 md:p-12 rounded-[2.5rem] shadow-sm border border-slate-100">
            <div className="flex items-center gap-4 mb-10">
              <div className={`p-4 rounded-2xl ${platform === 'ios' ? 'bg-[#f0f7f9] text-[#1a5f7a]' : 'bg-emerald-50 text-emerald-600'}`}>
                {platform === 'ios' ? <TabletSmartphone size={24} /> : <Smartphone size={24} />}
              </div>
              <div>
                <h3 className="text-lg font-black uppercase text-slate-900 tracking-tight">
                  {platform === 'ios' ? "Méthode iPhone (Safari)" : "Méthode Manuelle (Chrome)"}
                </h3>
                <p className="text-[10px] font-black uppercase tracking-widest text-[#e38154]">
                  Installation de LudoColigny
                </p>
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {platform === 'ios' ? (
                <>
                  <Step number="01" title="Partager" text="Appuyez sur l'icône de partage en bas de votre écran Safari.">
                    <Share className="text-[#1a5f7a]" size={24} />
                  </Step>
                  <Step number="02" title="Écran d'accueil" text="Faites défiler le menu et choisissez 'Sur l'écran d'accueil'.">
                    <PlusSquare className="text-[#1a5f7a]" size={24} />
                  </Step>
                </>
              ) : (
                <>
                  <Step number="01" title="Menu Chrome" text="Ouvrez le menu de Chrome (3 petits points en haut à droite).">
                    <MoreVertical className="text-emerald-600" size={24} />
                  </Step>
                  <Step number="02" title="Installer" text="Sélectionnez l'option 'Installer l'application'.">
                    <Download className="text-emerald-600" size={24} />
                  </Step>
                </>
              )}
              <Step number="03" title="Terminé" text="L'icône LudoColigny est maintenant sur votre écran d'accueil.">
                <CheckCircle2 className="text-emerald-500" size={24} />
              </Step>
            </div>
          </div>
        </div>

        <div className="bg-slate-100/50 p-6 rounded-[2rem] border border-dashed border-slate-200">
          <p className="text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed">
            Note : Si vous ne voyez pas les options d'installation, assurez-vous de ne pas être en mode "Navigation privée".
          </p>
        </div>
      </main>
    </div>
  )
}

function Step({ number, title, text, children }) {
  return (
    <div className="flex flex-col items-center md:items-start text-center md:text-left group">
      <div className="flex items-center gap-3 mb-4">
        <span className="text-2xl font-black text-slate-100 group-hover:text-[#e38154]/20 transition-colors italic leading-none">{number}</span>
        <div className="h-[2px] w-8 bg-slate-50"></div>
      </div>
      <div className="bg-slate-50 p-4 rounded-2xl mb-4 group-hover:scale-110 transition-transform">
        {children}
      </div>
      <h4 className="font-black uppercase text-[11px] tracking-widest text-slate-900 mb-2">{title}</h4>
      <p className="text-xs text-slate-500 font-medium leading-relaxed">{text}</p>
    </div>
  )
}