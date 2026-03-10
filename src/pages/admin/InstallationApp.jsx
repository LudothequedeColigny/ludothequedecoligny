import { useState, useEffect } from 'react'
import { 
  Smartphone, Download, Share, Plus, MoreVertical, 
  CheckCircle2, ArrowLeft, Chrome, Globe, 
  Monitor, Wifi
} from 'lucide-react'

export default function InstallationApp() {
  const [installPrompt, setInstallPrompt] = useState(null)
  const [isInstalled, setIsInstalled] = useState(false)
  const [isInstalling, setIsInstalling] = useState(false)
  const [deviceType, setDeviceType] = useState('unknown') // 'ios', 'android', 'desktop'
  const [browserType, setBrowserType] = useState('unknown') // 'chrome', 'safari', 'firefox', 'other'

  useEffect(() => {
    // Détection du système d'exploitation
    const ua = navigator.userAgent.toLowerCase()
    const isIOS = /iphone|ipad|ipod/.test(ua)
    const isAndroid = /android/.test(ua)
    const isDesktop = !isIOS && !isAndroid

    if (isIOS) setDeviceType('ios')
    else if (isAndroid) setDeviceType('android')
    else setDeviceType('desktop')

    // Détection du navigateur
    if (/chrome|chromium|crios/.test(ua) && !/edg/.test(ua)) setBrowserType('chrome')
    else if (/safari/.test(ua) && !/chrome/.test(ua)) setBrowserType('safari')
    else if (/firefox|fxios/.test(ua)) setBrowserType('firefox')
    else setBrowserType('other')

    // Vérifier si déjà installé
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true)
    }

    // Écouter l'événement d'installation (Android/Chrome)
    const handleBeforeInstall = (e) => {
      e.preventDefault()
      setInstallPrompt(e)
    }
    window.addEventListener('beforeinstallprompt', handleBeforeInstall)
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall)
  }, [])

  const handleInstall = async () => {
    if (!installPrompt) return
    setIsInstalling(true)
    const result = await installPrompt.prompt()
    if (result?.outcome === 'accepted') {
      setIsInstalled(true)
      setInstallPrompt(null)
    }
    setIsInstalling(false)
  }

  // --- RENDU SELON L'ÉTAT ---

  // Déjà installé
  if (isInstalled) {
    return (
      <div className="p-4 md:p-10 bg-[#fdfaf6] min-h-screen font-sans text-slate-900 flex items-center justify-center">
        <div className="max-w-md w-full text-center">
          <div className="w-24 h-24 bg-emerald-500 rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-xl shadow-emerald-200 rotate-3">
            <CheckCircle2 size={48} className="text-white" />
          </div>
          <h1 className="text-3xl font-black uppercase tracking-tight text-slate-900 mb-3">
            Déjà installée !
          </h1>
          <p className="text-slate-500 font-medium mb-8">
            L'application est déjà installée sur cet appareil. Vous pouvez y accéder directement depuis votre écran d'accueil.
          </p>
          <button
            onClick={() => window.history.back()}
            className="inline-flex items-center gap-3 px-8 py-4 bg-[#1a5f7a] text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg active:scale-95 transition-all"
          >
            <ArrowLeft size={16} />
            Retour
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-10 bg-[#fdfaf6] min-h-screen font-sans text-slate-900">
      <div className="max-w-2xl mx-auto">

        {/* HEADER */}
        <div className="mb-10">
          <h1 className="text-2xl md:text-4xl font-black text-slate-900 tracking-tight flex items-center gap-4">
            <div className="p-3 bg-emerald-500 rounded-[1.2rem] shadow-lg shadow-emerald-200 text-white">
              <Smartphone size={28} />
            </div>
            <span>Installer <span className="text-emerald-500">l'Application</span></span>
          </h1>
          <p className="mt-4 text-slate-500 font-medium">
            Accédez à la ludothèque directement depuis votre écran d'accueil, comme une vraie application.
          </p>
        </div>

        {/* AVANTAGES */}
        <div className="grid grid-cols-3 gap-4 mb-10">
          {[
            { icon: <Wifi size={20} />, label: 'Accès rapide' },
            { icon: <Monitor size={20} />, label: 'Plein écran' },
            { icon: <Globe size={20} />, label: 'Toujours à jour' },
          ].map((item, i) => (
            <div key={i} className="bg-white rounded-[1.5rem] p-5 text-center shadow-sm border border-slate-100 flex flex-col items-center gap-3">
              <div className="p-3 bg-emerald-50 text-emerald-500 rounded-xl">
                {item.icon}
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">{item.label}</span>
            </div>
          ))}
        </div>

        {/* --- CAS 1 : INSTALLATION DIRECTE (Android + Chrome) --- */}
        {installPrompt && (
          <div className="bg-white rounded-[2.5rem] p-8 md:p-10 shadow-sm border border-slate-100 mb-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-emerald-50 text-emerald-500 rounded-xl">
                <Chrome size={20} />
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500">Installation disponible</span>
            </div>
            <h2 className="text-xl font-black uppercase tracking-tight text-slate-900 mb-3">
              Un seul clic suffit !
            </h2>
            <p className="text-slate-500 text-sm font-medium mb-8 leading-relaxed">
              Votre navigateur est compatible avec l'installation directe. Appuyez sur le bouton ci-dessous pour ajouter l'application à votre écran d'accueil.
            </p>
            <button
              onClick={handleInstall}
              disabled={isInstalling}
              className="w-full py-5 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-100 disabled:text-slate-400 text-white rounded-2xl font-black uppercase text-[11px] tracking-widest flex items-center justify-center gap-3 shadow-xl shadow-emerald-200 active:scale-95 transition-all"
            >
              {isInstalling ? (
                <span className="animate-pulse">Installation en cours...</span>
              ) : (
                <><Download size={18} /> Installer maintenant</>
              )}
            </button>
          </div>
        )}

        {/* --- CAS 2 : iOS (Safari) --- */}
        {deviceType === 'ios' && !installPrompt && (
          <div className="bg-white rounded-[2.5rem] p-8 md:p-10 shadow-sm border border-slate-100">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-slate-100 text-slate-500 rounded-xl text-sm font-black"></div>
              <span className="text-[10px] font-black uppercase tracking-widest text-[#1a5f7a]">iPhone / iPad</span>
            </div>
            <h2 className="text-xl font-black uppercase tracking-tight text-slate-900 mb-2">
              Marche à suivre
            </h2>
            <p className="text-slate-500 text-sm font-medium mb-8 leading-relaxed">
              Sur iOS, l'installation se fait via Safari en 3 étapes simples.
            </p>

            {browserType !== 'safari' && (
              <div className="bg-amber-50 border border-amber-100 rounded-2xl p-5 mb-8 flex gap-4 items-start">
                <div className="p-2 bg-amber-100 text-amber-500 rounded-xl shrink-0">
                  <Globe size={16} />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase text-amber-600 mb-1">Ouvrez Safari d'abord</p>
                  <p className="text-xs text-amber-700 font-medium leading-relaxed">
                    L'installation n'est possible que depuis Safari sur iPhone et iPad. Copiez l'URL et ouvrez-la dans Safari.
                  </p>
                </div>
              </div>
            )}

            <div className="space-y-4">
              {[
                {
                  number: '1',
                  icon: <Share size={20} />,
                  title: 'Appuyez sur Partager',
                  description: <>Appuyez sur l'icône <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 rounded-md text-[10px] font-black"><Share size={10} /> Partager</span> en bas de l'écran Safari.</>,
                  color: 'bg-[#f0f7f9] text-[#1a5f7a]',
                },
                {
                  number: '2',
                  icon: <Plus size={20} />,
                  title: 'Sur l\'écran d\'accueil',
                  description: <>Faites défiler les options et appuyez sur <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 rounded-md text-[10px] font-black"><Plus size={10} /> Sur l'écran d'accueil</span>.</>,
                  color: 'bg-[#fdf2ee] text-[#e38154]',
                },
                {
                  number: '3',
                  icon: <CheckCircle2 size={20} />,
                  title: 'Confirmer',
                  description: 'Appuyez sur "Ajouter" en haut à droite. L\'application apparaît immédiatement sur votre écran d\'accueil.',
                  color: 'bg-emerald-50 text-emerald-500',
                },
              ].map((step) => (
                <div key={step.number} className="flex gap-5 items-start p-5 bg-slate-50 rounded-2xl">
                  <div className={`w-12 h-12 shrink-0 rounded-xl flex items-center justify-center font-black text-lg ${step.color}`}>
                    {step.number}
                  </div>
                  <div className="flex-1">
                    <p className="font-black text-slate-900 text-sm uppercase tracking-tight mb-1">{step.title}</p>
                    <p className="text-xs text-slate-500 font-medium leading-relaxed">{step.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* --- CAS 3 : Android sans prompt (Firefox, Samsung Browser…) --- */}
        {deviceType === 'android' && !installPrompt && (
          <div className="bg-white rounded-[2.5rem] p-8 md:p-10 shadow-sm border border-slate-100">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-[#f0f7f9] text-[#1a5f7a] rounded-xl">
                <Chrome size={20} />
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest text-[#1a5f7a]">Android</span>
            </div>
            <h2 className="text-xl font-black uppercase tracking-tight text-slate-900 mb-2">
              Marche à suivre
            </h2>

            {browserType !== 'chrome' && (
              <div className="bg-amber-50 border border-amber-100 rounded-2xl p-5 mb-8 flex gap-4 items-start">
                <div className="p-2 bg-amber-100 text-amber-500 rounded-xl shrink-0">
                  <Chrome size={16} />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase text-amber-600 mb-1">Utilisez Chrome de préférence</p>
                  <p className="text-xs text-amber-700 font-medium leading-relaxed">
                    L'installation automatique fonctionne mieux avec Google Chrome sur Android. Copiez l'URL et ouvrez-la dans Chrome.
                  </p>
                </div>
              </div>
            )}

            <div className="space-y-4">
              {[
                {
                  number: '1',
                  title: 'Ouvrir le menu Chrome',
                  description: <>Appuyez sur les <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 rounded-md text-[10px] font-black"><MoreVertical size={10} /> 3 points</span> en haut à droite de Chrome.</>,
                  color: 'bg-[#f0f7f9] text-[#1a5f7a]',
                },
                {
                  number: '2',
                  title: 'Ajouter à l\'écran d\'accueil',
                  description: <>Appuyez sur <span className="px-2 py-0.5 bg-slate-100 rounded-md text-[10px] font-black">Ajouter à l'écran d'accueil</span> dans le menu déroulant.</>,
                  color: 'bg-[#fdf2ee] text-[#e38154]',
                },
                {
                  number: '3',
                  title: 'Confirmer l\'installation',
                  description: 'Une boîte de dialogue apparaît. Appuyez sur "Ajouter" pour finaliser l\'installation.',
                  color: 'bg-emerald-50 text-emerald-500',
                },
              ].map((step) => (
                <div key={step.number} className="flex gap-5 items-start p-5 bg-slate-50 rounded-2xl">
                  <div className={`w-12 h-12 shrink-0 rounded-xl flex items-center justify-center font-black text-lg ${step.color}`}>
                    {step.number}
                  </div>
                  <div className="flex-1">
                    <p className="font-black text-slate-900 text-sm uppercase tracking-tight mb-1">{step.title}</p>
                    <p className="text-xs text-slate-500 font-medium leading-relaxed">{step.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* --- CAS 4 : Desktop --- */}
        {deviceType === 'desktop' && !installPrompt && (
          <div className="bg-white rounded-[2.5rem] p-8 md:p-10 shadow-sm border border-slate-100">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-[#f0f7f9] text-[#1a5f7a] rounded-xl">
                <Monitor size={20} />
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest text-[#1a5f7a]">Ordinateur</span>
            </div>
            <h2 className="text-xl font-black uppercase tracking-tight text-slate-900 mb-3">
              Installation sur ordinateur
            </h2>
            <p className="text-slate-500 text-sm font-medium mb-8 leading-relaxed">
              Sur Chrome ou Edge, une icône d'installation <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 rounded-md text-[10px] font-black"><Download size={10} /></span> apparaît dans la barre d'adresse. Cliquez dessus pour installer l'application sur votre bureau.
            </p>
            <div className="space-y-4">
              {[
                {
                  number: '1',
                  title: 'Ouvrir dans Chrome ou Edge',
                  description: 'Pour bénéficier de l\'installation, utilisez Google Chrome ou Microsoft Edge.',
                  color: 'bg-[#f0f7f9] text-[#1a5f7a]',
                },
                {
                  number: '2',
                  title: 'Icône dans la barre d\'adresse',
                  description: 'Regardez à droite de la barre d\'adresse : une icône d\'écran ou de téléchargement indique que l\'application est installable.',
                  color: 'bg-[#fdf2ee] text-[#e38154]',
                },
                {
                  number: '3',
                  title: 'Confirmer',
                  description: 'Cliquez sur l\'icône puis sur "Installer". L\'application s\'ouvre dans sa propre fenêtre.',
                  color: 'bg-emerald-50 text-emerald-500',
                },
              ].map((step) => (
                <div key={step.number} className="flex gap-5 items-start p-5 bg-slate-50 rounded-2xl">
                  <div className={`w-12 h-12 shrink-0 rounded-xl flex items-center justify-center font-black text-lg ${step.color}`}>
                    {step.number}
                  </div>
                  <div className="flex-1">
                    <p className="font-black text-slate-900 text-sm uppercase tracking-tight mb-1">{step.title}</p>
                    <p className="text-xs text-slate-500 font-medium leading-relaxed">{step.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* NOTE DE BAS DE PAGE */}
        <p className="text-center mt-8 text-[9px] font-black text-slate-300 uppercase tracking-widest">
          Association PACTES — Ludothèque de Coligny
        </p>

      </div>
    </div>
  )
}