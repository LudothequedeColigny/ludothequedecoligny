import { useEffect, useRef, useState } from 'react'
import { Flashlight, FlashlightOff, Loader2, SwitchCamera } from 'lucide-react'
import { buildConstraints, createDecoder, logCameraSettings } from '../../services/barcodeScanner'

/**
 * Image de la caméra + lecture des codes-barres, commune aux deux scanners
 * (« Scan rapide » des prêts, « Ajouter par scan » des jeux). La fenêtre qui
 * l'entoure reste propre à chaque écran.
 *
 * - `onDetected(code)` est appelée à chaque code lu ; la lecture est en pause
 *   tant qu'elle n'a pas fini (elle peut interroger la base).
 * - `continuous` : la caméra reste ouverte après une lecture (prêts, plusieurs
 *   jeux d'affilée). Le même code n'est relu qu'après l'avoir perdu de vue.
 *
 * La caméra est ouverte telle quelle et laissée faire sa mise au point seule :
 * c'est le fonctionnement qui lisait bien sur Android. Le zoom imposé, l'objectif
 * mémorisé et la mise au point au toucher ajoutés ensuite la bloquaient.
 * Boutons, seulement si le téléphone les permet : lampe, changement d'objectif
 * (le temps de la fenêtre, jamais mémorisé).
 *
 * Sous l'image, une ligne grise dit ce que la caméra a réellement accordé :
 * une capture d'écran suffit à diagnostiquer un téléphone qui ne lit pas.
 */

const RELIRE_APRES_MS = 4000

// Ancien réglage « objectif mémorisé » : un objectif sans mise au point restait
// imposé à chaque ouverture. On l'efface sur les téléphones qui l'ont gardé.
try { localStorage.removeItem('scanner_camera_id') } catch { /* navigation privée */ }

const estFrontale = label => /\bfront\b|avant|facetime|selfie/i.test(label || '')

function messageErreur(err) {
  if (!navigator.mediaDevices?.getUserMedia) return "La caméra n'est accessible que sur une adresse sécurisée (https)."
  switch (err?.name) {
    case 'NotAllowedError': return "Accès à la caméra refusé. Autorisez la caméra pour ce site dans les réglages du navigateur, puis réessayez."
    case 'NotFoundError': return "Aucune caméra n'a été trouvée sur cet appareil."
    case 'NotReadableError': return "La caméra est déjà utilisée par une autre application. Fermez-la puis réessayez."
    default: return "La caméra n'a pas pu être ouverte. Vérifiez l'autorisation dans le navigateur."
  }
}

export default function BarcodeCamera({ onDetected, continuous = false }) {
  const videoRef = useRef(null)
  const boxRef = useRef(null)
  const trackRef = useRef(null)
  const onDetectedRef = useRef(onDetected)
  onDetectedRef.current = onDetected

  const [deviceId, setDeviceId] = useState(null)   // null = caméra arrière par défaut
  const [ready, setReady] = useState(false)
  const [error, setError] = useState('')
  const [flash, setFlash] = useState(false)
  const [cameras, setCameras] = useState([])        // objectifs arrière disponibles
  const [torch, setTorch] = useState(null)          // null = pas de lampe, sinon allumée ou non
  const [infos, setInfos] = useState(null)          // ce que la caméra a accordé
  const [analysees, setAnalysees] = useState(0)     // images examinées

  useEffect(() => {
    let cancelled = false
    let timer = null
    let compteur = null
    let stream = null
    let busy = false
    let done = false
    let images = 0
    let last = { code: null, seen: 0 }

    setReady(false)
    setError('')
    setTorch(null)
    setInfos(null)
    setAnalysees(0)

    const stop = () => {
      clearTimeout(timer)
      clearInterval(compteur)
      stream?.getTracks().forEach(t => t.stop())
      trackRef.current = null
    }

    // Partie de l'image réellement visible dans le cadre (l'image est rognée
    // pour le remplir) : c'est là que le bénévole vise.
    const zoneVisible = video => {
      const vw = video.videoWidth, vh = video.videoHeight
      const box = boxRef.current
      const ratio = box ? box.clientWidth / box.clientHeight : 4 / 3
      if (vw / vh > ratio) {
        const w = Math.round(vh * ratio)
        return { x: Math.round((vw - w) / 2), y: 0, w, h: vh }
      }
      const h = Math.round(vw / ratio)
      return { x: 0, y: Math.round((vh - h) / 2), w: vw, h }
    }

    const handle = async code => {
      const now = Date.now()
      const dejaVu = code === last.code && now - last.seen < RELIRE_APRES_MS
      last = { code, seen: now }
      if (dejaVu) return
      busy = true
      setFlash(true)
      setTimeout(() => setFlash(false), 350)
      navigator.vibrate?.(60)
      if (!continuous) done = true
      try {
        await onDetectedRef.current?.(code)
      } finally {
        busy = false
        last.seen = Date.now()
      }
    }

    ;(async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia(buildConstraints(deviceId))
        if (cancelled) { stop(); return }
        const video = videoRef.current
        const track = stream.getVideoTracks()[0]
        trackRef.current = track
        video.srcObject = stream
        await video.play().catch(() => {})
        logCameraSettings(track)

        // Objectifs arrière (les noms ne sont connus qu'après l'autorisation).
        const devices = await navigator.mediaDevices.enumerateDevices().catch(() => [])
        if (cancelled) return
        setCameras(devices.filter(d => d.kind === 'videoinput' && d.deviceId && !estFrontale(d.label)))

        const caps = track.getCapabilities?.() || {}
        if (caps.torch) setTorch(false)

        const decode = await createDecoder()
        if (cancelled) return
        const s = track.getSettings?.() || {}
        setInfos({
          objectif: track.label || 'caméra',
          definition: s.width && s.height ? `${s.width}×${s.height}` : '?',
          lecteur: decode.kind,
          miseAuPoint: s.focusMode || (caps.focusMode ? caps.focusMode.join('/') : 'auto'),
        })
        setReady(true)
        compteur = setInterval(() => setAnalysees(images), 1000)

        const tick = async () => {
          if (cancelled || done) return
          if (!busy && video.readyState >= 2 && video.videoWidth) {
            let code = null
            images++
            try { code = await decode(video, zoneVisible(video)) } catch { /* image pas prête */ }
            if (code && !cancelled) await handle(code)
          }
          if (!cancelled && !done) timer = setTimeout(tick, 80)
        }
        tick()
      } catch (err) {
        console.error('Scanner – caméra indisponible :', err)
        if (!cancelled) setError(messageErreur(err))
      }
    })()

    return () => { cancelled = true; stop() }
  }, [deviceId, continuous])

  const basculerLampe = async () => {
    const track = trackRef.current
    if (!track || torch === null) return
    const on = !torch
    setTorch(on)
    await track.applyConstraints({ advanced: [{ torch: on }] }).catch(() => setTorch(!on))
  }

  const changerObjectif = () => {
    if (cameras.length < 2) return
    const actuel = trackRef.current?.getSettings?.().deviceId || deviceId
    const i = cameras.findIndex(c => c.deviceId === actuel)
    setDeviceId(cameras[(i + 1) % cameras.length].deviceId)
  }

  const ROUND = 'flex h-11 min-w-11 items-center justify-center rounded-[14px] border-2 border-[#0f172a] px-3 text-[12px] font-extrabold transition-colors'

  return (
    <div>
      {error && (
        <div className="mb-4 rounded-[18px] border-2 border-[#f43f5e] bg-[#fff1f2] p-4 text-center text-[10.5px] font-extrabold uppercase leading-snug tracking-[0.08em] text-[#be123c]">
          {error}
        </div>
      )}

      <div
        ref={boxRef}
        className={`relative aspect-[4/3] w-full overflow-hidden rounded-[20px] border-2 bg-[#0f172a] transition-colors ${flash ? 'border-[#10b981]' : 'border-[#0f172a]'}`}
      >
        <video ref={videoRef} className="h-full w-full object-cover" autoPlay muted playsInline />

        {/* Viseur : quatre coins et un trait central */}
        <div className="pointer-events-none absolute inset-x-[10%] inset-y-[22%]">
          <span className="absolute left-0 top-0 h-6 w-6 rounded-tl-[10px] border-l-[3px] border-t-[3px] border-white" />
          <span className="absolute right-0 top-0 h-6 w-6 rounded-tr-[10px] border-r-[3px] border-t-[3px] border-white" />
          <span className="absolute bottom-0 left-0 h-6 w-6 rounded-bl-[10px] border-b-[3px] border-l-[3px] border-white" />
          <span className="absolute bottom-0 right-0 h-6 w-6 rounded-br-[10px] border-b-[3px] border-r-[3px] border-white" />
          <span className={`absolute inset-x-3 top-1/2 h-[2px] -translate-y-1/2 ${flash ? 'bg-[#10b981]' : 'bg-[#e38154]'}`} />
        </div>

        {!ready && !error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-white">
            <Loader2 size={26} className="animate-spin" />
            <span className="text-[10px] font-extrabold uppercase tracking-[0.14em]">Ouverture de la caméra…</span>
          </div>
        )}
      </div>

      {(torch !== null || cameras.length > 1) && (
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          {torch !== null && (
            <button
              type="button"
              onClick={basculerLampe}
              aria-label={torch ? 'Éteindre la lampe' : 'Allumer la lampe'}
              aria-pressed={torch}
              className={`${ROUND} ${torch ? 'bg-[#e38154] text-white' : 'bg-white text-[#0f172a] hover:bg-[#fdfaf6]'}`}
            >
              {torch ? <FlashlightOff size={18} /> : <Flashlight size={18} />}
            </button>
          )}
          {cameras.length > 1 && (
            <button
              type="button"
              onClick={changerObjectif}
              aria-label="Changer d'objectif"
              title="Changer d'objectif"
              className={`${ROUND} gap-2 bg-white text-[#0f172a] hover:bg-[#fdfaf6]`}
            >
              <SwitchCamera size={18} />
              <span className="text-[9.5px] uppercase tracking-[0.12em]">Objectif</span>
            </button>
          )}
        </div>
      )}

      {!error && (
        <p className="mt-3 text-center text-[11px] font-medium leading-[1.55] text-slate-500">
          Placez le code-barres dans le cadre. S'il reste flou, éloignez un peu le téléphone.
        </p>
      )}

      {infos && (
        <p className="mt-2 break-words text-center text-[9px] leading-[1.5] text-slate-400">
          {infos.objectif} · {infos.definition} · lecteur {infos.lecteur} · mise au point {infos.miseAuPoint} · {analysees} images
        </p>
      )}
    </div>
  )
}
