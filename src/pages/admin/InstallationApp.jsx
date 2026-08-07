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
          <div className="mx-auto mb-8 flex h-24 w-24 rotate-3 items-center justify-center rounded-[28px] border-2 border-[#0f172a] bg-[#10b981] shadow-[6px_6px_0_#0f172a]">
            <CheckCircle2 size={48} className="text-white" />
          </div>
          <h1 className="mb-3 font-display text-[30px] font-extrabold uppercase tracking-[-0.04em] text-[#0f172a]">
            Déjà installée !
          </h1>
          <p className="mb-8 text-sm font-medium leading-[1.6] text-slate-500">
            L'application est déjà installée sur cet appareil. Vous pouvez y accéder directement depuis votre écran d'accueil.
          </p>
          <button
            onClick={() => window.history.back()}
            className="inline-flex items-center justify-center gap-2 rounded-[18px] border-2 border-[#0f172a] bg-[#1a5f7a] px-6 py-4 text-[10px] font-extrabold uppercase tracking-[0.14em] text-white shadow-[4px_4px_0_#0f172a] transition-[transform,box-shadow] duration-200 hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_#0f172a]"
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
          <h1 className="flex items-center gap-4 font-display text-[26px] font-extrabold leading-none tracking-[-0.045em] text-[#0f172a] md:text-[38px]">
            <div className="flex h-[54px] w-[54px] shrink-0 items-center justify-center rounded-[18px] border-2 border-[#0f172a] bg-[#10b981] text-white shadow-[4px_4px_0_#0f172a] md:h-[58px] md:w-[58px] md:rounded-[20px]">
              <Smartphone size={28} />
            </div>
            <span>Installer <span className="text-[#10b981]">l'application</span></span>
          </h1>
          <p className="mt-4 text-sm font-medium leading-[1.6] text-slate-500">
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
            <div key={i} className="flex flex-col items-center gap-3 rounded-[24px] border-2 border-[#0f172a] bg-white p-5 text-center shadow-[4px_4px_0_#10b981]">
              <div className="flex h-11 w-11 items-center justify-center rounded-[14px] border-2 border-[#0f172a] bg-[#ecfdf5] text-[#047857]">
                {item.icon}
              </div>
              <span className="text-[10px] font-extrabold uppercase leading-tight tracking-[0.12em] text-slate-500">{item.label}</span>
            </div>
          ))}
        </div>

        {/* --- CAS 1 : INSTALLATION DIRECTE (Android + Chrome) --- */}
        {installPrompt && (
          <div className="mb-6 rounded-[34px] border-2 border-[#0f172a] bg-white p-7 shadow-[6px_6px_0_#10b981] md:p-9">
            <div className="flex items-center gap-3 mb-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-[13px] border-2 border-[#0f172a] bg-[#ecfdf5] text-[#047857]">
                <Chrome size={20} />
              </div>
              <span className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#047857]">Installation disponible</span>
            </div>
            <h2 className="mb-3 font-display text-[22px] font-extrabold uppercase tracking-[-0.04em] text-[#0f172a]">
              Un seul clic suffit !
            </h2>
            <p className="mb-8 text-sm font-medium leading-[1.7] text-slate-500">
              Votre navigateur est compatible avec l'installation directe. Appuyez sur le bouton ci-dessous pour ajouter l'application à votre écran d'accueil.
            </p>
            <button
              onClick={handleInstall}
              disabled={isInstalling}
              className="flex w-full items-center justify-center gap-3 rounded-[18px] border-2 border-[#0f172a] bg-[#10b981] py-5 text-[11px] font-extrabold uppercase tracking-[0.16em] text-white shadow-[5px_5px_0_#0f172a] transition-[transform,box-shadow] duration-200 hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-[2px_2px_0_#0f172a] disabled:pointer-events-none disabled:opacity-40"
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
          <div className="rounded-[34px] border-2 border-[#0f172a] bg-white p-7 shadow-[6px_6px_0_#1a5f7a] md:p-9">
            <div className="flex items-center gap-3 mb-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-[13px] border-2 border-[#0f172a] bg-[#fdfaf6] text-[#0f172a]"></div>
              <span className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#1a5f7a]">iPhone / iPad</span>
            </div>
            <h2 className="mb-2 font-display text-[22px] font-extrabold uppercase tracking-[-0.04em] text-[#0f172a]">
              Marche à suivre
            </h2>
            <p className="mb-8 text-sm font-medium leading-[1.7] text-slate-500">
              Sur iOS, l'installation se fait via Safari en 3 étapes simples.
            </p>

            {browserType !== 'safari' && (
              <div className="mb-8 flex items-start gap-4 rounded-[20px] border-2 border-[#f59e0b] bg-[#fffbeb] p-5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px] border-2 border-[#0f172a] bg-[#fef3c7] text-[#b45309]">
                  <Globe size={16} />
                </div>
                <div>
                  <p className="mb-1 text-[10px] font-extrabold uppercase tracking-[0.1em] text-[#b45309]">Ouvrez Safari d'abord</p>
                  <p className="text-xs font-medium leading-relaxed text-[#92400e]">
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
                  description: <>Appuyez sur l'icône <span className="inline-flex items-center gap-1 rounded-md border border-[#0f172a] bg-[#fdfaf6] px-2 py-0.5 text-[10px] font-extrabold"><Share size={10} /> Partager</span> en bas de l'écran Safari.</>,
                  color: 'bg-[#f0f7f9] text-[#1a5f7a]',
                },
                {
                  number: '2',
                  icon: <Plus size={20} />,
                  title: 'Sur l\'écran d\'accueil',
                  description: <>Faites défiler les options et appuyez sur <span className="inline-flex items-center gap-1 rounded-md border border-[#0f172a] bg-[#fdfaf6] px-2 py-0.5 text-[10px] font-extrabold"><Plus size={10} /> Sur l'écran d'accueil</span>.</>,
                  color: 'bg-[#fdf2ee] text-[#e38154]',
                },
                {
                  number: '3',
                  icon: <CheckCircle2 size={20} />,
                  title: 'Confirmer',
                  description: 'Appuyez sur "Ajouter" en haut à droite. L\'application apparaît immédiatement sur votre écran d\'accueil.',
                  color: 'bg-[#ecfdf5] text-[#047857]',
                },
              ].map((step) => (
                <div key={step.number} className="flex items-start gap-5 rounded-[20px] border-2 border-[#0f172a] bg-[#fdfaf6] p-5">
                  <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-[15px] border-2 border-[#0f172a] font-display text-lg font-extrabold ${step.color}`}>
                    {step.number}
                  </div>
                  <div className="flex-1">
                    <p className="mb-1 text-sm font-extrabold uppercase tracking-tight text-[#0f172a]">{step.title}</p>
                    <p className="text-xs font-medium leading-relaxed text-slate-500">{step.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* --- CAS 3 : Android sans prompt (Firefox, Samsung Browser…) --- */}
        {deviceType === 'android' && !installPrompt && (
          <div className="rounded-[34px] border-2 border-[#0f172a] bg-white p-7 shadow-[6px_6px_0_#1a5f7a] md:p-9">
            <div className="flex items-center gap-3 mb-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-[13px] border-2 border-[#0f172a] bg-[#f0f7f9] text-[#1a5f7a]">
                <Chrome size={20} />
              </div>
              <span className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#1a5f7a]">Android</span>
            </div>
            <h2 className="mb-2 font-display text-[22px] font-extrabold uppercase tracking-[-0.04em] text-[#0f172a]">
              Marche à suivre
            </h2>

            {browserType !== 'chrome' && (
              <div className="mb-8 flex items-start gap-4 rounded-[20px] border-2 border-[#f59e0b] bg-[#fffbeb] p-5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px] border-2 border-[#0f172a] bg-[#fef3c7] text-[#b45309]">
                  <Chrome size={16} />
                </div>
                <div>
                  <p className="mb-1 text-[10px] font-extrabold uppercase tracking-[0.1em] text-[#b45309]">Utilisez Chrome de préférence</p>
                  <p className="text-xs font-medium leading-relaxed text-[#92400e]">
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
                  description: <>Appuyez sur les <span className="inline-flex items-center gap-1 rounded-md border border-[#0f172a] bg-[#fdfaf6] px-2 py-0.5 text-[10px] font-extrabold"><MoreVertical size={10} /> 3 points</span> en haut à droite de Chrome.</>,
                  color: 'bg-[#f0f7f9] text-[#1a5f7a]',
                },
                {
                  number: '2',
                  title: 'Ajouter à l\'écran d\'accueil',
                  description: <>Appuyez sur <span className="rounded-md border border-[#0f172a] bg-[#fdfaf6] px-2 py-0.5 text-[10px] font-extrabold">Ajouter à l'écran d'accueil</span> dans le menu déroulant.</>,
                  color: 'bg-[#fdf2ee] text-[#e38154]',
                },
                {
                  number: '3',
                  title: 'Confirmer l\'installation',
                  description: 'Une boîte de dialogue apparaît. Appuyez sur "Ajouter" pour finaliser l\'installation.',
                  color: 'bg-[#ecfdf5] text-[#047857]',
                },
              ].map((step) => (
                <div key={step.number} className="flex items-start gap-5 rounded-[20px] border-2 border-[#0f172a] bg-[#fdfaf6] p-5">
                  <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-[15px] border-2 border-[#0f172a] font-display text-lg font-extrabold ${step.color}`}>
                    {step.number}
                  </div>
                  <div className="flex-1">
                    <p className="mb-1 text-sm font-extrabold uppercase tracking-tight text-[#0f172a]">{step.title}</p>
                    <p className="text-xs font-medium leading-relaxed text-slate-500">{step.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* --- CAS 4 : Desktop --- */}
        {deviceType === 'desktop' && !installPrompt && (
          <div className="rounded-[34px] border-2 border-[#0f172a] bg-white p-7 shadow-[6px_6px_0_#1a5f7a] md:p-9">
            <div className="flex items-center gap-3 mb-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-[13px] border-2 border-[#0f172a] bg-[#f0f7f9] text-[#1a5f7a]">
                <Monitor size={20} />
              </div>
              <span className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#1a5f7a]">Ordinateur</span>
            </div>
            <h2 className="mb-3 font-display text-[22px] font-extrabold uppercase tracking-[-0.04em] text-[#0f172a]">
              Installation sur ordinateur
            </h2>
            <p className="mb-8 text-sm font-medium leading-[1.7] text-slate-500">
              Sur Chrome ou Edge, une icône d'installation <span className="inline-flex items-center gap-1 rounded-md border border-[#0f172a] bg-[#fdfaf6] px-2 py-0.5 text-[10px] font-extrabold"><Download size={10} /></span> apparaît dans la barre d'adresse. Cliquez dessus pour installer l'application sur votre bureau.
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
                  color: 'bg-[#ecfdf5] text-[#047857]',
                },
              ].map((step) => (
                <div key={step.number} className="flex items-start gap-5 rounded-[20px] border-2 border-[#0f172a] bg-[#fdfaf6] p-5">
                  <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-[15px] border-2 border-[#0f172a] font-display text-lg font-extrabold ${step.color}`}>
                    {step.number}
                  </div>
                  <div className="flex-1">
                    <p className="mb-1 text-sm font-extrabold uppercase tracking-tight text-[#0f172a]">{step.title}</p>
                    <p className="text-xs font-medium leading-relaxed text-slate-500">{step.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* NOTE DE BAS DE PAGE */}
        <p className="mt-8 text-center text-[9px] font-extrabold uppercase tracking-[0.16em] text-slate-300">
          Association PACTES — Ludothèque de Coligny
        </p>

      </div>
    </div>
  )
}