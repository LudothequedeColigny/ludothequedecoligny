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
 * Boutons affichés seulement si le téléphone les permet : zoom (×1 ×2 ×3),
 * lampe, changement d'objectif. L'objectif choisi est mémorisé sur l'appareil.
 */

const CLE_OBJECTIF = 'scanner_camera_id'
const ZOOM_PAR_DEFAUT = 2
const RELIRE_APRES_MS = 4000

const lireObjectif = () => { try { return localStorage.getItem(CLE_OBJECTIF) || null } catch { return null } }
const garderObjectif = id => { try { id ? localStorage.setItem(CLE_OBJECTIF, id) : localStorage.removeItem(CLE_OBJECTIF) } catch { /* navigation privée */ } }

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

  const [deviceId, setDeviceId] = useState(lireObjectif)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState('')
  const [flash, setFlash] = useState(false)
  const [cameras, setCameras] = useState([])        // objectifs arrière disponibles
  const [zoom, setZoom] = useState(null)            // { base, levels, current }
  const [torch, setTorch] = useState(null)          // null = pas de lampe, sinon allumée ou non
  const [canRefocus, setCanRefocus] = useState(false)

  useEffect(() => {
    let cancelled = false
    let timer = null
    let stream = null
    let busy = false
    let done = false
    let last = { code: null, seen: 0 }

    setReady(false)
    setError('')
    setZoom(null)
    setTorch(null)
    setCanRefocus(false)

    const stop = () => {
      clearTimeout(timer)
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

    const ouvrir = async id => {
      try {
        return await navigator.mediaDevices.getUserMedia(buildConstraints(id))
      } catch (err) {
        // Objectif mémorisé disparu (autre téléphone, mise à jour) : on repart
        // sur la caméra arrière par défaut.
        if (id && (err?.name === 'OverconstrainedError' || err?.name === 'NotFoundError')) {
          garderObjectif(null)
          return navigator.mediaDevices.getUserMedia(buildConstraints(null))
        }
        throw err
      }
    }

    ;(async () => {
      try {
        stream = await ouvrir(deviceId)
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
        const settings = track.getSettings?.() || {}

        if (caps.zoom && caps.zoom.max > caps.zoom.min) {
          const base = settings.zoom || caps.zoom.min || 1
          const levels = [1, 2, 3].filter(f => base * f <= caps.zoom.max + 0.01)
          if (levels.length > 1) {
            const current = levels.includes(ZOOM_PAR_DEFAUT) ? ZOOM_PAR_DEFAUT : 1
            if (current !== 1) await track.applyConstraints({ advanced: [{ zoom: base * current }] }).catch(() => {})
            if (cancelled) return
            setZoom({ base, levels, current })
          }
        }
        if (caps.torch) setTorch(false)
        if (caps.focusMode?.includes('single-shot')) setCanRefocus(true)

        const decode = await createDecoder()
        if (cancelled) return
        setReady(true)

        const tick = async () => {
          if (cancelled || done) return
          if (!busy && video.readyState >= 2 && video.videoWidth) {
            let code = null
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

  const choisirZoom = async f => {
    const track = trackRef.current
    if (!track || !zoom) return
    setZoom(z => ({ ...z, current: f }))
    await track.applyConstraints({ advanced: [{ zoom: zoom.base * f }] }).catch(() => {})
  }

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
    const suivant = cameras[(i + 1) % cameras.length].deviceId
    garderObjectif(suivant)
    setDeviceId(suivant)
  }

  // Toucher l'image relance la mise au point (téléphones qui le permettent).
  const refaireMiseAuPoint = async () => {
    const track = trackRef.current
    if (!track || !canRefocus) return
    await track.applyConstraints({ advanced: [{ focusMode: 'single-shot' }] }).catch(() => {})
    setTimeout(() => {
      trackRef.current?.applyConstraints({ advanced: [{ focusMode: 'continuous' }] }).catch(() => {})
    }, 1500)
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
        onClick={refaireMiseAuPoint}
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

      {(zoom || torch !== null || cameras.length > 1) && (
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          {zoom && (
            <div className="flex gap-1.5" role="group" aria-label="Zoom">
              {zoom.levels.map(f => (
                <button
                  key={f}
                  type="button"
                  onClick={() => choisirZoom(f)}
                  aria-pressed={zoom.current === f}
                  className={`${ROUND} ${zoom.current === f ? 'bg-[#1a5f7a] text-white' : 'bg-white text-[#0f172a] hover:bg-[#fdfaf6]'}`}
                >
                  ×{f}
                </button>
              ))}
            </div>
          )}
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
          {zoom
            ? 'Tenez le téléphone à 20-30 cm de la boîte : le zoom grossit le code.'
            : "Si l'image est floue, éloignez un peu le téléphone."}
          {cameras.length > 1 && ' Toujours flou ? Changez d’objectif.'}
        </p>
      )}
    </div>
  )
}
