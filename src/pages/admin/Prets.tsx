import { useState, useEffect, useRef, useMemo } from 'react'
import {
  Share2, ChevronDown, ChevronUp,
  Trash2,
  Edit2,
  X,
  Plus,
  Hash,
  CreditCard,
  Phone,
  Mail,
  Search,
  MapPin,
  Eye,
  User,
  Send,
  AlertTriangle,
  Building2,
  Home,
  ChevronRight,
  ExternalLink,
  Calendar,
  Clock,
  CheckCircle,
  Loader2,
  ScanLine
} from 'lucide-react'
import { supabase } from '../../services/supabaseClient'
import TutorialOverlay, { TutorialButton } from '../../components/TutorialOverlay'
import { sendEmail } from '../../services/emailService'
import { useToast } from '../../components/ToastContext'
import { SkeletonRow } from '../../components/Skeleton'
import AdminPageHeader from '../../components/admin/AdminPageHeader'
import AdminBanner from '../../components/admin/AdminBanner'
import SearchField from '../../components/admin/SearchField'
import IconButton from '../../components/admin/IconButton'
import ConfirmModal from '../../components/admin/ConfirmModal'
import FormModal, { FieldLabel, FIELD } from '../../components/admin/FormModal'
import { BTN_ORANGE, BTN_INK } from '../../components/admin/buttons'

/**
 * Rappel de l'état du jeu au moment où il est parti : soit les remarques notées
 * avant le prêt, soit la mention qu'il n'y en avait aucune.
 */
function ObservationsPanel({ game }: { game: any }) {
  if (game?.observations) {
    return (
      <div className="mb-6 rounded-[18px] border-2 border-[#f59e0b] bg-[#fffbeb] p-4 text-left">
        <div className="mb-2 flex items-center gap-2">
          <AlertTriangle size={14} className="shrink-0 text-[#f59e0b]" />
          <span className="text-[9px] font-extrabold uppercase tracking-[0.14em] text-[#b45309]">Observations avant prêt</span>
        </div>
        <p className="text-xs font-medium leading-relaxed text-[#92400e]">{game.observations}</p>
      </div>
    )
  }
  return (
    <div className="mb-6 rounded-[18px] border-2 border-[#10b981] bg-[#ecfdf5] p-4 text-left">
      <div className="flex items-center gap-2">
        <CheckCircle size={14} className="shrink-0 text-[#10b981]" />
        <span className="text-[9px] font-extrabold uppercase tracking-[0.14em] text-[#047857]">Aucune observation enregistrée</span>
      </div>
      <p className="mt-1 text-[10.5px] font-medium leading-relaxed text-[#047857]">
        Le jeu était en bon état au départ — tout composant manquant est imputable à l'emprunteur.
      </p>
    </div>
  )
}


const PRETS_TUTORIAL_STEPS = (openForm, closeForm, openRelance) => [
  {
    id: 'prets-header',
    noSpotlight: true,
    title: `Bienvenue sur la page Prêts`,
    description: `Cette page centralise tous les emprunts actifs de la ludothèque. Vous pouvez créer de nouveaux prêts, enregistrer des retours, prolonger des emprunts et envoyer des relances.`,
    action: () => { closeForm(); openRelance(false) },
  },
  {
    id: 'prets-scanner-btn',
    title: `Scan rapide : prêt ou retour`,
    description: `Ce bouton ouvre la caméra. Scannez le code-barres d'un jeu disponible pour le prêter, ou d'un jeu déjà emprunté pour enregistrer son retour — sans chercher dans la liste.`,
    action: () => { closeForm(); openRelance(false) },
    tip: `Sur iPhone, le scanner fonctionne uniquement dans Safari. Autorisez l'accès caméra dans Réglages > Safari si nécessaire.`,
  },
  {
    id: 'prets-add-btn',
    title: `Créer un nouveau prêt`,
    description: `Ouvre le formulaire d'enregistrement d'un prêt. Nous allons le parcourir ensemble.`,
    action: () => { closeForm(); openRelance(false) },
  },
  {
    id: 'prets-form-modal',
    title: `Formulaire de prêt`,
    description: `Ce formulaire permet d'enregistrer un emprunt en trois étapes : choisir l'adhérent, ajouter les jeux empruntés, puis valider avec la date.`,
    action: () => { openForm(); openRelance(false) },
    actionDelay: 400,
  },
  {
    id: 'prets-form-adherent',
    title: `Sélectionner l'adhérent`,
    description: `Tapez les premières lettres du nom ou prénom de l'adhérent. Cliquez sur son nom dans la liste pour le sélectionner. Son quota d'emprunts restant s'affiche aussitôt.`,
    action: () => { openForm(); openRelance(false) },
    actionDelay: 400,
  },
  {
    id: 'prets-form-jeux',
    title: `Ajouter les jeux empruntés`,
    description: `Recherchez les jeux à emprunter par nom ou numéro d'inventaire. Seuls les jeux disponibles apparaissent. Ajoutez-en plusieurs si nécessaire. Vous pouvez aussi scanner leurs codes-barres depuis l'écran précédent.`,
    action: () => { openForm(); openRelance(false) },
    actionDelay: 400,
  },
  {
    id: 'prets-form-date-submit',
    title: `Date et validation du prêt`,
    description: `La date est pré-remplie avec la date du jour, modifiable si besoin. Cliquez sur "Valider le prêt" pour enregistrer. Les jeux passent en statut emprunté et disparaissent du catalogue public.`,
    action: () => { openForm(); openRelance(false) },
    actionDelay: 400,
  },
  {
    id: 'prets-search',
    title: `Rechercher un prêt`,
    description: `Filtrez la liste par nom d'adhérent ou titre de jeu pour retrouver rapidement un prêt en cours.`,
    action: () => { closeForm(); openRelance(false) },
  },
  {
    id: 'prets-list-row1',
    id2: 'prets-list-row2',
    title: `Liste des prêts actifs`,
    description: `Chaque ligne affiche la date de sortie, l'adhérent, le jeu emprunté et les actions disponibles. Les prêts en retard apparaissent en rouge.`,
    action: () => { closeForm(); openRelance(false) },
  },
  {
    id: 'prets-action-extend',
    title: `Prolonger un prêt`,
    description: `L'icône horloge prolonge le prêt de 14 jours supplémentaires après confirmation. Utile pour éviter qu'un prêt passe en retard.`,
    action: () => { closeForm(); openRelance(false) },
  },
  {
    id: 'prets-action-return',
    title: `Valider un retour`,
    description: `Ce bouton enregistre le retour du jeu après confirmation. Le jeu redevient disponible dans le catalogue public immédiatement.`,
    action: () => { closeForm(); openRelance(false) },
  },
  {
    id: 'prets-action-relance',
    title: `Relancer un adhérent en retard`,
    description: `Cette icône apparaît uniquement sur les prêts en retard. Cliquez dessus pour ouvrir la fenêtre de relance qui regroupe les coordonnées de l'adhérent, les jeux non rendus et les outils de suivi.`,
    action: () => { closeForm(); openRelance(false) },
    tip: `Si aucun prêt n'est en retard en ce moment, cette icône n'est pas visible dans le tableau.`,
  },
  {
    id: 'prets-relance-modal',
    title: `Fenêtre de relance`,
    description: `Cette fenêtre regroupe tout ce qu'il faut pour contacter un adhérent en retard : ses coordonnées complètes et la liste des jeux non rendus avec leur date de sortie.`,
    action: () => { closeForm(); openRelance(true) },
    actionDelay: 450,
  },
  {
    id: 'prets-relance-coordonnees',
    title: `Coordonnées de l'adhérent`,
    description: `L'email, le téléphone et l'adresse postale de l'adhérent sont affichés ici pour vous permettre de le contacter par le moyen le plus adapté.`,
    action: () => { closeForm(); openRelance(true) },
    actionDelay: 450,
  },
  {
    id: 'prets-relance-jeux',
    title: `Jeux en retard`,
    description: `La liste des jeux non rendus par cet adhérent s'affiche ici avec leur numéro d'inventaire et la date de sortie. Utile pour mentionner précisément les jeux concernés lors du contact.`,
    action: () => { closeForm(); openRelance(true) },
    actionDelay: 450,
  },
  {
    id: 'prets-relance-email',
    title: `Envoyer une relance par email`,
    description: `Ce bouton ouvre un éditeur d'email pré-rédigé avec les jeux en retard listés dans le corps du message. Vous pouvez le modifier avant envoi.`,
    action: () => { closeForm(); openRelance(true) },
    actionDelay: 450,
  },
  {
    id: 'prets-relance-suivi',
    title: `Suivi des relances`,
    description: `Cet encart indique la date de la dernière relance envoyée. Le bouton "Marquer comme relancé aujourd'hui" enregistre la date du jour sans envoyer d'email — utile pour tracer un contact téléphonique ou postal.`,
    action: () => { closeForm(); openRelance(true) },
    actionDelay: 450,
  },
  {
    id: 'prets-historique',
    title: `Historique des prêts`,
    description: `Ce bouton donne accès à l'historique complet de tous les prêts passés, avec les dates de sortie et de retour de chaque jeu.`,
    action: () => { closeForm(); openRelance(false) },
  },
]



export default function Prets() {
  const { addToast } = useToast()
  // --- ÉTATS ---
  const [loans, setLoans] = useState([])
  const [members, setMembers] = useState([])
  const [games, setGames] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showFormModal, setShowFormModal] = useState(false)
  const [confirmAction, setConfirmAction] = useState(null)
  const [renewalAction, setRenewalAction] = useState(null) // loan cliqué
  const [composeModal, setComposeModal] = useState({ show: false, member: null, loans: [] })
  const [composeData, setComposeData] = useState({ subject: '', body: '' })
  const [sendingMail, setSendingMail] = useState(false)

  // --- QUOTAS DYNAMIQUES ---
  const [quotas, setQuotas] = useState({ quota_particulier: 3, quota_association: 5 })
  const [adhesionSettings, setAdhesionSettings] = useState({
    mode_adhesion_particulier: 'degressif',
    mode_adhesion_association: 'glissant',
  })

  // --- FORMULAIRE ---
  const [selectedMember, setSelectedMember] = useState(null)
  const [selectedGames, setSelectedGames] = useState([])
  const [memberSearch, setMemberSearch] = useState('')
  const [gameSearch, setGameSearch] = useState('')
  const [memberListVisible, setMemberListVisible] = useState(false)
  const [gameListVisible, setGameListVisible] = useState(false)
  const [loanDate, setLoanDate] = useState(new Date().toISOString().split('T')[0])
  const [quotaWarning, setQuotaWarning] = useState(null) // Message d'avertissement quota scan

  // --- SCANNER ---
  const [showScanner, setShowScanner] = useState(false)
  const [scannedGamesForLoan, setScannedGamesForLoan] = useState([])
  const [scanReturnConfirm, setScanReturnConfirm] = useState(null)
  const [iosWarning, setIosWarning] = useState(false)
  const [showTuto, setShowTuto] = useState(false)

  // Références pour le scanner hybride
  const videoRef = useRef(null)
  const codeReaderRef = useRef(null)
  const streamRef = useRef(null)
  const intervalRef = useRef(null)
  const isProcessingRef = useRef(false)
  const [scanFlash, setScanFlash] = useState(false)

  useEffect(() => {
    fetchInitialData()
    fetchQuotas()
  }, [])

  // --- DÉTECTION NAVIGATEUR ---
  const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent)
  const isSafari = () => /safari/i.test(navigator.userAgent) && !/chrome/i.test(navigator.userAgent)

  // --- LOGIQUE DU SCANNER HYBRIDE ---
  // • Android Chrome  → BarcodeDetector natif (ultra-rapide)
  // • iOS Safari + autres → @zxing/browser (compatible)
  useEffect(() => {
    if (!showScanner) return
    isProcessingRef.current = false

    if (isIOS() && !isSafari()) {
      setIosWarning(true)
    } else {
      setIosWarning(false)
    }

    const timeoutId = setTimeout(async () => {
      if (!videoRef.current) return

      if ('BarcodeDetector' in window) {
        // ── BRANCHE ANDROID : BarcodeDetector natif ──────────────────────
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: { ideal: 'environment' } }
          })
          streamRef.current = stream
          videoRef.current.srcObject = stream

          const detector = new (window as any).BarcodeDetector({
            formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'qr_code', 'code_128', 'code_39']
          })

          intervalRef.current = setInterval(async () => {
            if (!videoRef.current) { clearInterval(intervalRef.current); return }
            try {
              const barcodes = await detector.detect(videoRef.current)
              if (barcodes.length > 0) {
                if (isProcessingRef.current) return
                isProcessingRef.current = true
                clearInterval(intervalRef.current)
                const barcode = barcodes[0].rawValue
                setScanFlash(true)
                setTimeout(() => setScanFlash(false), 300)
                await handleSmartScan(barcode)
                stopCamera()
                setTimeout(() => { isProcessingRef.current = false }, 2000)
              }
            } catch (e) {
              // Frame vide ou erreur de détection silencieuse
            }
          }, 100)
        } catch (err) {
          console.error('BarcodeDetector – erreur caméra :', err)
        }

      } else {
        // ── BRANCHE iOS / AUTRES : zxing fallback ────────────────────────
        const { BrowserMultiFormatReader } = await import('@zxing/browser')
        const codeReader = new BrowserMultiFormatReader()
        codeReaderRef.current = codeReader

        codeReader.decodeFromConstraints(
          { video: { facingMode: { ideal: 'environment' } } },
          videoRef.current,
          async (result, error) => {
            if (result) {
              if (isProcessingRef.current) return
              isProcessingRef.current = true
              const barcode = result.getText()
              setScanFlash(true)
              setTimeout(() => setScanFlash(false), 300)
              await handleSmartScan(barcode)
              stopCamera()
              setTimeout(() => { isProcessingRef.current = false }, 2000)
            }
            // NotFoundException n'est plus exportée dans les versions récentes de @zxing/browser
            // On filtre les erreurs "pas de résultat" via le nom de l'erreur
            if (error && error?.name !== 'NotFoundException') {
              console.warn('zxing – erreur scanner :', error)
            }
          }
        ).catch(err => {
          console.error('zxing – impossible de démarrer la caméra :', err)
        })
      }
    }, 100)

    return () => {
      clearTimeout(timeoutId)
      stopScanner()
    }
  }, [showScanner])

  const stopCamera = () => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null }
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null }
    if (codeReaderRef.current) {
      try { import('@zxing/browser').then(({ BrowserMultiFormatReader: R }) => R.releaseAllStreams()) } catch (e) { /* silencieux */ }
      codeReaderRef.current = null
    }
  }

  const stopScanner = () => {
    stopCamera()
    setShowScanner(false)
  }

  // --- DONNÉES ---
  async function fetchQuotas() {
    try {
      const { data } = await supabase.from('settings').select('*')
      if (data) {
        const newQuotas = { ...quotas }
        const newAdhesion = { ...adhesionSettings }
        data.forEach(setting => {
          if (setting.id === 'quota_particulier') newQuotas.quota_particulier = parseInt(setting.value)
          if (setting.id === 'quota_association') newQuotas.quota_association = parseInt(setting.value)
          if (setting.id === 'mode_adhesion_particulier') newAdhesion.mode_adhesion_particulier = setting.value
          if (setting.id === 'mode_adhesion_association') newAdhesion.mode_adhesion_association = setting.value
        })
        setQuotas(newQuotas)
        setAdhesionSettings(newAdhesion)
      }
    } catch (err) {
      console.error("Erreur quotas:", err)
    }
  }

  async function fetchInitialData() {
    setLoading(true)
    try {
      if (navigator.onLine) {
        const { data: loansData } = await supabase
          .from('loans')
          .select('*, members(*), games(*)')
          .order('loan_date', { ascending: false })

        const { data: membersData } = await supabase.from('members').select('*').order('last_name')
        const { data: gamesData } = await supabase.from('games').select('*').order('name')

        setLoans(loansData || [])
        setMembers(membersData || [])
        setGames(gamesData || [])

        localStorage.setItem('cache_loans', JSON.stringify(loansData))
        localStorage.setItem('cache_members', JSON.stringify(membersData))
        localStorage.setItem('cache_games', JSON.stringify(gamesData))
      } else {
        setLoans(JSON.parse(localStorage.getItem('cache_loans') || '[]'))
        setMembers(JSON.parse(localStorage.getItem('cache_members') || '[]'))
        setGames(JSON.parse(localStorage.getItem('cache_games') || '[]'))
      }
    } catch (err) {
      console.error("Erreur de chargement:", err)
    } finally {
      setLoading(false)
    }
  }

  // --- VÉRIFICATION COTISATION ---
  const isSubscriptionUpToDate = (member) => {
    if (!member?.has_paid) return false
    const now = new Date()
    const currentYear = now.getFullYear()
    const dateAdhesion = new Date(member.membership_date)
    const isAsso = member.type === 'Association'
    const mode = isAsso ? adhesionSettings.mode_adhesion_association : adhesionSettings.mode_adhesion_particulier
    if (mode === 'degressif') {
      return dateAdhesion.getFullYear() >= currentYear
    } else {
      const expiryDate = new Date(dateAdhesion)
      expiryDate.setFullYear(expiryDate.getFullYear() + 1)
      return now <= expiryDate
    }
  }

  // --- QUOTA ---
  const getLoanLimit = (member) => member?.type === 'Association' ? quotas.quota_association : quotas.quota_particulier
  const getDatabaseLoansCount = (memberId) => loans.filter(l => l.member_id === memberId).length

  // Calcule combien de jeux supplémentaires l'adhérent peut encore emprunter
  const getRemainingSlots = (member) => {
    if (!member) return 0
    const alreadyBorrowed = getDatabaseLoansCount(member.id)
    return Math.max(0, getLoanLimit(member) - alreadyBorrowed)
  }

  // --- SÉLECTION ADHÉRENT AVEC TRONCATURE DU QUOTA ---
  // Appelée quand l'utilisateur choisit un adhérent dans le formulaire.
  // Si des jeux ont déjà été scannés et dépassent le quota restant,
  // on tronque la liste et on avertit l'utilisateur.
  const handleSelectMember = (member) => {
    setSelectedMember(member)
    const remaining = getRemainingSlots(member)
    setQuotaWarning(null)

    setSelectedGames(prev => {
      if (prev.length > remaining) {
        setQuotaWarning(
          `Quota dépassé : ${prev.length} jeux scannés mais cet adhérent ne peut en emprunter que ${remaining} de plus. ` +
          `La liste a été réduite automatiquement.`
        )
        return prev.slice(0, remaining)
      }
      return prev
    })
  }

  // --- SCAN INTELLIGENT ---
  async function handleSmartScan(barcode) {
    const { data: game } = await supabase.from('games').select('*').eq('barcode', barcode).single()

    if (!game) {
      addToast('Jeu non trouvé dans le catalogue', 'error')
      stopScanner()
      return
    }

    if (game.is_available) {
      setScannedGamesForLoan(prev => {
        if (prev.find(g => g.id === game.id)) return prev
        return [...prev, game]
      })
      // Ré-ouvrir le scanner pour en scanner un autre
      setShowScanner(true)
    } else {
      const { data: activeLoan } = await supabase
        .from('loans')
        .select('*, members(*), games(*)')
        .eq('game_id', game.id)
        .single()

      if (activeLoan) setScanReturnConfirm(activeLoan)
      stopScanner()
    }
  }

  async function confirmScanReturn() {
    if (!scanReturnConfirm) return
    const historyEntry = {
      member_id: scanReturnConfirm.member_id,
      game_id: scanReturnConfirm.game_id,
      loan_date: scanReturnConfirm.loan_date,
      return_date: new Date().toISOString().split('T')[0]
    }
    const { error } = await supabase.from('loan_history').insert([historyEntry])
    if (!error) {
      await supabase.from('loans').delete().eq('id', scanReturnConfirm.id)
      await supabase.from('games').update({ is_available: true }).eq('id', scanReturnConfirm.game_id)
      setScanReturnConfirm(null)
      fetchInitialData()
    }
  }

  const openComposeLoan = (loan) => {
    // Regrouper tous les prêts en retard du même adhérent
    const memberId = loan.members?.id || loan.member_id
    const memberLoans = loans.filter(l => {
      const lId = l.members?.id || l.member_id
      return lId === memberId && isOverdue(l.loan_date)
    })
    const member = loan.members
    const prenom = member?.first_name || member?.last_name || 'adhérent'
    const listeJeux = memberLoans.map(l =>
      `  - "${l.games?.name}" (emprunté le ${new Date(l.loan_date).toLocaleDateString('fr-FR')})`
    ).join('\n')

    const subject = `Relance : Retour de jeu${memberLoans.length > 1 ? 'x' : ''} - Ludothèque de Coligny`
    const body = `Bonjour ${prenom},

Sauf erreur de notre part, le${memberLoans.length > 1 ? 's jeux suivants sont' : ' jeu suivant est'} toujours en votre possession :

${listeJeux}

Nous vous remercions de bien vouloir nous le${memberLoans.length > 1 ? 's' : ''} rapporter lors de notre prochaine permanence.

À bientôt !

L'équipe de la Ludothèque de Coligny
www.ludothequedecoligny.fr`

    setComposeData({ subject, body })
    setComposeModal({ show: true, member, loans: memberLoans })
    setRenewalAction(null)
  }

  const handleSendLoanReminder = async () => {
    if (!composeModal.member?.email) { addToast("Email de l'adhérent introuvable.", 'error'); return }
    setSendingMail(true)
    try {
      const html = composeData.body
        .split('\n')
        .map(line => line.trim() === '' ? '<br/>' : `<p style="margin:0 0 6px 0;">${line}</p>`)
        .join('')
      const fullHtml = `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#1a1a1a;">
        <div style="background:#1a5f7a;padding:24px;border-radius:12px 12px 0 0;">
          <h1 style="color:white;margin:0;font-size:18px;">Ludothèque de Coligny</h1>
        </div>
        <div style="background:#fdfaf6;padding:32px;border-radius:0 0 12px 12px;border:1px solid #e2e8f0;">
          ${html}
        </div>
      </div>`
      await sendEmail({ to: composeModal.member.email, subject: composeData.subject, html: fullHtml })
      // Marquer tous les prêts concernés comme relancés
      const today = new Date().toISOString().split('T')[0]
      for (const l of composeModal.loans) {
        await supabase.from('loans').update({ last_reminder_date: today }).eq('id', l.id)
      }
      setLoans(prev => prev.map(l =>
        composeModal.loans.find(cl => cl.id === l.id) ? { ...l, last_reminder_date: today } : l
      ))
      setComposeModal({ show: false, member: null, loans: [] })
      addToast('Email de relance envoyé avec succès.', 'success')
    } catch (err) {
      console.error('Erreur envoi relance:', err)
      addToast("Erreur lors de l'envoi. Vérifiez la console.", 'error')
    } finally {
      setSendingMail(false)
    }
  }

  const isOverdue = (dateString) => {
    const diff = Math.ceil((new Date() - new Date(dateString)) / (1000 * 60 * 60 * 24))
    return diff > 30
  }

  const openNewLoan = () => {
    setSelectedMember(null)
    setSelectedGames([])
    setQuotaWarning(null)
    setLoanDate(new Date().toISOString().split('T')[0])
    setShowFormModal(true)
  }

  // totalCount = jeux déjà empruntés en base + jeux en cours de sélection
  const totalCount = (selectedMember ? getDatabaseLoansCount(selectedMember.id) : 0) + selectedGames.length

  async function handleSaveLoan() {
    if (!selectedMember || selectedGames.length === 0) return

    // ── VÉRIFICATION FINALE DU QUOTA ─────────────────────────────────────
    // Double sécurité : même si l'UI a tronqué, on vérifie côté logique
    // avant tout envoi vers la base de données.
    const alreadyBorrowed = getDatabaseLoansCount(selectedMember.id)
    const limit = getLoanLimit(selectedMember)
    if (alreadyBorrowed + selectedGames.length > limit) {
      addToast(
        `Quota dépassé. Cet adhérent a déjà ${alreadyBorrowed} jeu(x) en cours et son quota est de ${limit}. ` +
        `Veuillez retirer des jeux de la sélection.`,
        'warning'
      )
      return
    }
    // ─────────────────────────────────────────────────────────────────────

    const entries = selectedGames.map(game => ({
      member_id: selectedMember.id,
      game_id: game.id,
      loan_date: loanDate
    }))

    if (navigator.onLine) {
      const { error } = await supabase.from('loans').insert(entries)
      if (!error) {
        await supabase.from('games').update({ is_available: false }).in('id', selectedGames.map(g => g.id))
        setShowFormModal(false)
        setQuotaWarning(null)
        fetchInitialData()
        addToast('Prêt créé avec succès.', 'success')
      }
    } else {
      const queue = JSON.parse(localStorage.getItem('offline_sync_queue') || '[]')
      entries.forEach(entry => queue.push({ table: 'loans', data: entry, timestamp: Date.now() }))
      localStorage.setItem('offline_sync_queue', JSON.stringify(queue))
      addToast("⚠️ Mode hors-ligne : Prêt enregistré localement.", 'warning')
      setShowFormModal(false)
      setQuotaWarning(null)
      fetchInitialData()
    }
  }

  async function processConfirmAction() {
    const { type, loan } = confirmAction
    if (navigator.onLine) {
      if (type === 'return') {
        const historyEntry = {
          member_id: loan.member_id,
          game_id: loan.game_id,
          loan_date: loan.loan_date,
          return_date: new Date().toISOString().split('T')[0]
        }
        const { error: historyError } = await supabase.from('loan_history').insert([historyEntry])
        if (!historyError) {
          await supabase.from('loans').delete().eq('id', loan.id)
          await supabase.from('games').update({ is_available: true }).eq('id', loan.game_id)
        } else {
          addToast("Erreur lors de l'archivage du prêt.", 'error')
          return
        }
      } else if (type === 'extend') {
        const newDate = new Date(loan.loan_date)
        newDate.setDate(newDate.getDate() + 15)
        await supabase.from('loans').update({ loan_date: newDate.toISOString().split('T')[0] }).eq('id', loan.id)
      }
      setConfirmAction(null)
      fetchInitialData()
      addToast(type === 'return' ? 'Prêt retourné avec succès.' : 'Prêt prolongé avec succès.', 'success')
    } else {
      addToast("Action réseau requise pour cette opération.", 'warning')
      setConfirmAction(null)
    }
  }

  const filteredLoans = loans.filter(l =>
    `${l.members?.first_name} ${l.members?.last_name} ${l.games?.name}`.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const overdueLoansCount = loans.filter(l => isOverdue(l.loan_date)).length

  // ── Steps tutoriel stabilisés ──────────────────────────────────────────────
  // On garde un fake loan pour ouvrir la modale relance en démo tutoriel
  // Pour le tutoriel : on préfère un prêt en retard pour afficher l'icône de relance
  const fakeLoanForTuto = loans.find(l => {
    const d = new Date(l.loan_date)
    const diff = (Date.now() - d.getTime()) / (1000 * 60 * 60 * 24)
    return diff > 14
  }) ?? loans[0] ?? null

  const pretsSteps = useMemo(() => PRETS_TUTORIAL_STEPS(
    () => setShowFormModal(true),
    () => setShowFormModal(false),
    (open) => {
      if (open && fakeLoanForTuto) {
        setRenewalAction(fakeLoanForTuto)
      } else {
        setRenewalAction(null)
      }
    }
  ), [fakeLoanForTuto]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="p-4 md:p-10 bg-[#fdfaf6] min-h-screen font-sans text-slate-900">

      {/* HEADER */}
      <div className="mx-auto max-w-7xl" data-tutorial="prets-header">
        <AdminPageHeader icon="03.svg" title="Gestion des" accent="Prêts" eyebrow="Sorties et retours">
          <div className="flex flex-wrap gap-2.5">
            <button
              data-tutorial="prets-scanner-btn"
              onClick={() => { setScannedGamesForLoan([]); setShowScanner(true) }}
              className={BTN_INK}
            >
              <ScanLine size={16} /> Scan rapide
            </button>
            <button data-tutorial="prets-add-btn" onClick={openNewLoan} className={BTN_ORANGE}>
              <Plus size={16} /> Nouveau prêt
            </button>
          </div>
        </AdminPageHeader>
      </div>

      <main className="mx-auto max-w-7xl">

        {overdueLoansCount > 0 && (
          <AdminBanner tone="danger" pulse>
            Attention : {overdueLoansCount} prêt{overdueLoansCount > 1 ? 's' : ''} en retard !
          </AdminBanner>
        )}

        <SearchField
          data-tutorial="prets-search"
          className="mb-6"
          placeholder="Rechercher par adhérent ou jeu..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />

        {/* VERSION MOBILE — une carte par prêt */}
        <div className="space-y-4 md:hidden">
          {filteredLoans.map((l) => {
            const late = isOverdue(l.loan_date)
            return (
              <div
                key={l.id}
                className={`rounded-[28px] border-2 border-[#0f172a] p-5 ${
                  late ? 'bg-[#fff1f2] shadow-[5px_5px_0_#f43f5e]' : 'bg-white shadow-[5px_5px_0_#1a5f7a]'
                }`}
              >
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <span className="rounded-full border-2 border-[#0f172a] bg-[#f0f7f9] px-2.5 py-0.5 text-[10px] font-extrabold text-[#1a5f7a]">
                        #{l.games?.registration_number}
                      </span>
                      <span className={`text-[10px] font-extrabold uppercase tracking-[0.08em] ${late ? 'text-[#be123c]' : 'text-slate-400'}`}>
                        Sortie le {new Date(l.loan_date).toLocaleDateString()}
                      </span>
                    </div>
                    <h3 className="font-display text-[17px] font-extrabold leading-tight tracking-[-0.03em] text-[#0f172a]">
                      {l.games?.name}
                    </h3>
                    <p className="mt-1 text-[11px] font-bold text-slate-500">
                      Emprunteur : {l.members?.last_name} {l.members?.first_name}
                    </p>
                  </div>
                  {late && <AlertTriangle size={18} className="shrink-0 text-[#f43f5e]" />}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setConfirmAction({ type: 'return', loan: l })}
                    className={`flex flex-[2] items-center justify-center gap-2 rounded-[14px] border-2 border-[#0f172a] py-3.5 text-[9px] font-extrabold uppercase tracking-[0.12em] text-white shadow-[3px_3px_0_#0f172a] ${
                      late ? 'bg-[#f43f5e]' : 'bg-[#10b981]'
                    }`}
                  >
                    <CheckCircle size={14} /> Retour
                  </button>
                  <button
                    onClick={() => setConfirmAction({ type: 'extend', loan: l })}
                    title="Prolonger"
                    className="flex flex-1 items-center justify-center rounded-[14px] border-2 border-[#0f172a] bg-[#fffbeb] py-3.5 text-[#b45309]"
                  >
                    <Clock size={16} />
                  </button>
                  {late && (
                    <button
                      onClick={() => setRenewalAction(l)}
                      title="Relancer"
                      className="flex flex-1 items-center justify-center rounded-[14px] border-2 border-[#0f172a] bg-[#fff1f2] py-3.5 text-[#be123c]"
                    >
                      <Send size={16} />
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* VERSION ORDINATEUR */}
        <div className="hidden overflow-hidden rounded-[34px] border-2 border-[#0f172a] bg-white shadow-[6px_6px_0_#1a5f7a] md:block">
          <table className="w-full text-left">
            <thead className="border-b-2 border-[#0f172a] bg-[#fdfaf6] text-[9.5px] font-extrabold uppercase tracking-[0.18em] text-slate-400">
              <tr>
                <th className="px-6 py-[18px]">Date sortie</th>
                <th className="px-6 py-[18px]">Emprunteur</th>
                <th className="px-6 py-[18px]">Jeu emprunté</th>
                <th className="w-[268px] px-6 py-[18px] text-right">Gestion</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />) : filteredLoans.map((l, idx) => {
                const late = isOverdue(l.loan_date)
                return (
                  <tr key={l.id} {...(idx === 0 ? {"data-tutorial": "prets-list-row1"} : idx === 1 ? {"data-tutorial": "prets-list-row2"} : {})} className={late ? 'bg-[#fff1f2]' : ''}>
                    <td className={`px-6 py-5 font-display text-[15px] font-extrabold ${late ? 'text-[#be123c]' : 'text-[#1a5f7a]'}`}>
                      {new Date(l.loan_date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-5 text-[13px] font-extrabold uppercase tracking-[-0.01em] text-[#0f172a]">
                      {l.members?.last_name} {l.members?.first_name}
                    </td>
                    <td className="px-6 py-5 text-[13px] font-semibold text-slate-600">
                      <span className="mr-2 font-extrabold text-[#1a5f7a]">#{l.games?.registration_number}</span>
                      {l.games?.name}
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center justify-end gap-2">
                        {late && (
                          <IconButton
                            data-tutorial="prets-action-relance"
                            title="Relancer"
                            tone="danger"
                            onClick={() => setRenewalAction(l)}
                          >
                            <Send size={18} />
                          </IconButton>
                        )}
                        <IconButton
                          data-tutorial="prets-action-extend"
                          title="Prolonger"
                          tone="warn"
                          onClick={() => setConfirmAction({ type: 'extend', loan: l })}
                        >
                          <Clock size={18} />
                        </IconButton>
                        <button
                          data-tutorial="prets-action-return"
                          onClick={() => setConfirmAction({ type: 'return', loan: l })}
                          className={`whitespace-nowrap rounded-[14px] border-2 border-[#0f172a] px-4 py-2.5 text-[9px] font-extrabold uppercase tracking-[0.12em] text-white shadow-[3px_3px_0_#0f172a] transition-[transform,box-shadow] duration-200 hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[1px_1px_0_#0f172a] ${
                            late ? 'bg-[#f43f5e]' : 'bg-[#10b981]'
                          }`}
                        >
                          Valider retour
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <div className="flex justify-center pt-6 md:justify-end">
          <button
            data-tutorial="prets-historique"
            onClick={() => window.location.href = '/admin/historique-prets'}
            className={BTN_INK}
          >
            <Clock size={16} /> Consulter l'historique complet
          </button>
        </div>
      </main>

      {/* MODALE SCANNER HYBRIDE */}
      {showScanner && (
        <div className="fixed inset-0 z-[250] flex flex-col items-center justify-center p-5 backdrop-blur-md" style={{ background: 'rgba(15,23,42,.9)' }}>
          <div className="anim-modal-in relative w-full max-w-md rounded-[34px] border-2 border-[#0f172a] bg-white p-7 shadow-[10px_10px_0_#1a5f7a]">
            <button
              onClick={stopScanner}
              className="absolute right-5 top-5 flex h-10 w-10 items-center justify-center rounded-[13px] border-2 border-[#0f172a] bg-white text-[#0f172a] transition-colors hover:bg-[#fff1f2] hover:text-[#f43f5e]"
            >
              <X size={18} />
            </button>
            <h3 className="mb-5 pr-12 font-display text-xl font-extrabold tracking-[-0.03em] text-[#0f172a]">
              Scan rapide <span className="text-[#1a5f7a]">(prêt / retour)</span>
            </h3>

            {iosWarning && (
              <div className="mb-4 rounded-[18px] border-2 border-[#f59e0b] bg-[#fffbeb] p-4 text-center text-[10px] font-extrabold uppercase leading-tight tracking-[0.08em] text-[#b45309]">
                Sur iPhone, le scan nécessite Safari. Veuillez ouvrir cette page dans Safari.
              </div>
            )}

            <video
              ref={videoRef}
              className={`mb-5 w-full overflow-hidden rounded-[20px] border-2 bg-[#0f172a] transition-colors ${scanFlash ? 'border-[#10b981]' : 'border-[#0f172a]'}`}
              autoPlay
              muted
              playsInline
            />

            {scannedGamesForLoan.length > 0 && (
              <div className="anim-modal-in mb-5 space-y-3">
                <p className="text-[10px] font-extrabold uppercase tracking-[0.1em] text-[#1a5f7a]">
                  Jeux scannés ({scannedGamesForLoan.length})
                </p>
                <div className="max-h-32 space-y-2 overflow-y-auto">
                  {scannedGamesForLoan.map(g => (
                    <div key={g.id} className="flex items-center justify-between gap-3 rounded-[14px] border-2 border-[#0f172a] bg-[#fdfaf6] p-3 text-[11px] font-bold text-[#0f172a]">
                      <span className="truncate">#{g.registration_number} — {g.name}</span>
                      <X size={15} className="shrink-0 cursor-pointer text-[#f43f5e]" onClick={() => setScannedGamesForLoan(scannedGamesForLoan.filter(sg => sg.id !== g.id))} />
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => { setSelectedGames(scannedGamesForLoan); stopScanner(); setShowFormModal(true) }}
                  className="w-full rounded-[18px] border-2 border-[#0f172a] bg-[#1a5f7a] py-4 text-[10px] font-extrabold uppercase tracking-[0.14em] text-white shadow-[4px_4px_0_#0f172a] transition-[transform,box-shadow] duration-200 hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_#0f172a]"
                >
                  Valider pour un adhérent
                </button>
              </div>
            )}

            <p className="text-center text-[11px] font-medium leading-[1.6] text-slate-500">
              Scannez un jeu libre pour le prêter, ou un jeu déjà prêté pour le rendre.
            </p>
          </div>
        </div>
      )}

      {/* MODALE CONFIRMATION RETOUR SCAN */}
      {scanReturnConfirm && (
        <ConfirmModal
          open
          onClose={() => setScanReturnConfirm(null)}
          onConfirm={confirmScanReturn}
          tone="success"
          icon={<CheckCircle size={32} />}
          title="Confirmer le retour ?"
          message={`« ${scanReturnConfirm.games?.name} » ramené par ${scanReturnConfirm.members?.first_name} ${scanReturnConfirm.members?.last_name}`}
          confirmLabel="Valider le retour"
        >
          <ObservationsPanel game={scanReturnConfirm.games} />
        </ConfirmModal>
      )}

      {/* MODALE 1 : COORDONNÉES + SUIVI RELANCE */}
      {renewalAction && !composeModal.show && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-3 backdrop-blur-[6px] sm:p-[22px]" style={{ background: 'rgba(26,95,122,.82)' }}>
          <div data-tutorial="prets-relance-modal" className="anim-modal-in flex max-h-[92vh] w-full max-w-lg flex-col overflow-y-auto rounded-[36px] border-2 border-[#0f172a] bg-white p-7 shadow-[12px_12px_0_#f59e0b] md:p-9">

            <div className="mb-5 flex items-start justify-between gap-4">
              <div className="flex h-[62px] w-[62px] items-center justify-center rounded-[20px] border-2 border-[#0f172a] bg-[#fffbeb] text-[#b45309] shadow-[4px_4px_0_#f59e0b]">
                <Share2 size={28} />
              </div>
              <button
                onClick={() => setRenewalAction(null)}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px] border-2 border-[#0f172a] bg-white text-[#0f172a] transition-colors hover:bg-[#fdfaf6]"
              >
                <X size={18} />
              </button>
            </div>

            <h2 className="mb-1.5 font-display text-[26px] font-extrabold uppercase leading-none tracking-[-0.04em] text-[#0f172a]">
              Relance prêt en retard
            </h2>
            <p className="mb-6 text-sm font-medium text-slate-500">
              Adhérent : <strong className="text-[#0f172a]">{renewalAction.members?.first_name} {renewalAction.members?.last_name}</strong>
            </p>

            {/* Coordonnées */}
            <div data-tutorial="prets-relance-coordonnees" className="mb-6 space-y-2.5">
              <div className="flex items-center gap-4 rounded-[18px] border-2 border-[#0f172a] bg-[#fdfaf6] p-4">
                <Mail size={18} className="shrink-0 text-[#1a5f7a]" />
                <span className="truncate text-sm font-bold text-[#0f172a]">{renewalAction.members?.email || 'Email non renseigné'}</span>
              </div>
              <div className="flex items-center gap-4 rounded-[18px] border-2 border-[#0f172a] bg-[#fdfaf6] p-4">
                <Phone size={18} className="shrink-0 text-[#1a5f7a]" />
                <span className="text-sm font-bold text-[#0f172a]">{renewalAction.members?.phone || 'Téléphone non renseigné'}</span>
              </div>
              <div className="flex items-start gap-4 rounded-[18px] border-2 border-[#0f172a] bg-[#fdfaf6] p-4">
                <MapPin size={18} className="mt-0.5 shrink-0 text-[#1a5f7a]" />
                <span className="text-sm font-bold leading-relaxed text-[#0f172a]">{renewalAction.members?.address || 'Adresse non renseignée'}</span>
              </div>
            </div>

            {/* Jeux en retard */}
            <div data-tutorial="prets-relance-jeux" className="mb-6">
              <FieldLabel>Jeux en retard</FieldLabel>
              <div className="space-y-2">
                {loans.filter(l => {
                  const memberId = renewalAction.members?.id || renewalAction.member_id
                  const lId = l.members?.id || l.member_id
                  return lId === memberId && isOverdue(l.loan_date)
                }).map(l => (
                  <div key={l.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-[16px] border-2 border-[#f43f5e] bg-[#fff1f2] p-3">
                    <span className="text-[10px] font-extrabold uppercase text-[#f43f5e]">#{l.games?.registration_number}</span>
                    <span className="flex-1 text-sm font-bold text-[#be123c]">{l.games?.name}</span>
                    <span className="text-[10px] font-semibold text-[#f43f5e]">depuis le {new Date(l.loan_date).toLocaleDateString('fr-FR')}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Bouton email */}
            <button
              data-tutorial="prets-relance-email"
              onClick={() => openComposeLoan(renewalAction)}
              className="mb-5 flex w-full items-center justify-center gap-3 rounded-[18px] border-2 border-[#0f172a] bg-[#1a5f7a] py-5 text-[10px] font-extrabold uppercase tracking-[0.14em] text-white shadow-[4px_4px_0_#0f172a] transition-[transform,box-shadow] duration-200 hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_#0f172a]"
            >
              <Mail size={18} /> Envoyer une relance par mail
            </button>

            {/* Suivi des relances */}
            <div data-tutorial="prets-relance-suivi" className="rounded-[24px] border-2 border-[#f59e0b] bg-[#fffbeb] p-5">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <span className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.1em] text-[#b45309]">
                  <Calendar size={14} /> Suivi des relances
                </span>
                {renewalAction.last_reminder_date ? (
                  <span className="rounded-full border-2 border-[#0f172a] bg-[#f59e0b] px-3 py-1 text-[9px] font-extrabold uppercase text-white">
                    Relancé le {new Date(renewalAction.last_reminder_date).toLocaleDateString()}
                  </span>
                ) : (
                  <span className="text-[10px] font-bold text-[#b45309]/60">Aucun rappel noté</span>
                )}
              </div>
              <button
                onClick={async () => {
                  const today = new Date().toISOString().split('T')[0]
                  const memberId = renewalAction.members?.id || renewalAction.member_id
                  const memberLoans = loans.filter(l => {
                    const lId = l.members?.id || l.member_id
                    return lId === memberId && isOverdue(l.loan_date)
                  })
                  for (const l of memberLoans) {
                    await supabase.from('loans').update({ last_reminder_date: today }).eq('id', l.id)
                  }
                  setLoans(prev => prev.map(l =>
                    memberLoans.find(ml => ml.id === l.id) ? { ...l, last_reminder_date: today } : l
                  ))
                  setRenewalAction({ ...renewalAction, last_reminder_date: today })
                }}
                className="flex w-full items-center justify-center gap-2 rounded-[16px] border-2 border-[#0f172a] bg-white py-3.5 text-[9px] font-extrabold uppercase tracking-[0.14em] text-[#b45309] transition-colors hover:bg-[#f59e0b] hover:text-white"
              >
                Marquer comme relancé aujourd'hui
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODALE 2 : COMPOSITION EMAIL */}
      {composeModal.show && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-3 backdrop-blur-[6px] sm:p-[22px]" style={{ background: 'rgba(15,23,42,.7)' }}>
          <div className="anim-modal-in flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-[36px] border-2 border-[#0f172a] bg-white shadow-[12px_12px_0_#f59e0b]">

            <div className="flex shrink-0 items-center justify-between gap-4 border-b-2 border-[#0f172a] px-6 py-5">
              <div className="min-w-0">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px] border-2 border-[#0f172a] bg-[#fffbeb] text-[#b45309]"><Mail size={18} /></div>
                  <h3 className="truncate font-display text-lg font-extrabold tracking-[-0.03em] text-[#0f172a]">
                    Relance — {composeModal.member?.first_name} {composeModal.member?.last_name}
                  </h3>
                </div>
                <p className="ml-[52px] mt-1 truncate text-[11px] font-semibold text-slate-400">
                  {composeModal.loans.length} jeu{composeModal.loans.length > 1 ? 'x' : ''} en retard · {composeModal.member?.email}
                </p>
              </div>
              <button
                onClick={() => setComposeModal({ show: false, member: null, loans: [] })}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px] border-2 border-[#0f172a] bg-white text-[#0f172a] transition-colors hover:bg-[#fdfaf6]"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 space-y-6 overflow-y-auto p-6">
              <div>
                <FieldLabel>Jeux concernés</FieldLabel>
                <div className="space-y-2">
                  {composeModal.loans.map(l => (
                    <div key={l.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-[16px] border-2 border-[#f43f5e] bg-[#fff1f2] p-3">
                      <span className="text-[10px] font-extrabold uppercase text-[#f43f5e]">#{l.games?.registration_number}</span>
                      <span className="flex-1 text-sm font-bold text-[#be123c]">{l.games?.name}</span>
                      <span className="text-[10px] font-semibold text-[#f43f5e]">depuis le {new Date(l.loan_date).toLocaleDateString('fr-FR')}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <FieldLabel>Objet</FieldLabel>
                <input
                  className={FIELD}
                  value={composeData.subject}
                  onChange={e => setComposeData(prev => ({ ...prev, subject: e.target.value }))}
                />
              </div>

              <div>
                <FieldLabel>Message</FieldLabel>
                <textarea
                  rows={10}
                  className={`${FIELD} resize-y font-medium`}
                  value={composeData.body}
                  onChange={e => setComposeData(prev => ({ ...prev, body: e.target.value }))}
                />
              </div>
            </div>

            <div className="flex shrink-0 gap-3 border-t-2 border-[#0f172a] bg-white p-6">
              <button
                onClick={() => setComposeModal({ show: false, member: null, loans: [] })}
                className="flex-1 rounded-[16px] border-2 border-[#0f172a] bg-white py-4 text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#0f172a] transition-colors hover:bg-[#fdfaf6]"
              >
                Annuler
              </button>
              <button
                onClick={handleSendLoanReminder}
                disabled={sendingMail}
                className={`flex flex-1 items-center justify-center gap-2 rounded-[16px] border-2 border-[#0f172a] py-4 text-[10px] font-extrabold uppercase tracking-[0.14em] transition-all ${
                  sendingMail
                    ? 'cursor-not-allowed bg-[#fdfaf6] text-slate-300'
                    : 'bg-[#1a5f7a] text-white shadow-[4px_4px_0_#0f172a] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_#0f172a]'
                }`}
              >
                {sendingMail ? <><Loader2 size={14} className="animate-spin" /> Envoi…</> : <><Send size={14} /> Envoyer la relance</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* OVERLAY ENVOI EN COURS */}
      {sendingMail && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-5 backdrop-blur-[6px]" style={{ background: 'rgba(15,23,42,.7)' }}>
          <div className="anim-modal-in w-full max-w-sm rounded-[34px] border-2 border-[#0f172a] bg-white p-9 text-center shadow-[10px_10px_0_#1a5f7a]">
            <Loader2 className="mx-auto mb-5 animate-spin text-[#1a5f7a]" size={40} />
            <h3 className="font-display text-xl font-extrabold uppercase tracking-[-0.03em] text-[#0f172a]">Envoi en cours…</h3>
          </div>
        </div>
      )}


      {/* MODALES CONFIRMATION */}
      {confirmAction && (
        <ConfirmModal
          open
          onClose={() => setConfirmAction(null)}
          onConfirm={processConfirmAction}
          tone={confirmAction.type === 'return' ? 'success' : 'neutral'}
          icon={confirmAction.type === 'return' ? <CheckCircle size={32} /> : <Clock size={32} />}
          title={confirmAction.type === 'return' ? 'Confirmer le retour de ce jeu' : "Prolonger l'emprunt de 14 jours"}
          message="Voulez-vous valider cette action ?"
        >
          {confirmAction.type === 'return' && <ObservationsPanel game={confirmAction.loan.games} />}
        </ConfirmModal>
      )}

      {/* MODALE FORMULAIRE NOUVEAU PRÊT */}
      {showFormModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 backdrop-blur-[6px] sm:p-[22px]" style={{ background: "rgba(15,23,42,.7)" }}>
          <div data-tutorial="prets-form-modal" className="anim-modal-in flex max-h-[92vh] w-full max-w-xl flex-col overflow-hidden rounded-[36px] border-2 border-[#0f172a] bg-white shadow-[12px_12px_0_#e38154]">
            <div className="flex shrink-0 items-center justify-between gap-4 border-b-2 border-[#0f172a] px-6 py-5">
              <h2 className="font-display text-lg font-extrabold tracking-[-0.03em] text-[#0f172a]">Enregistrer un <span className="text-[#1a5f7a]">prêt</span></h2>
              <button onClick={() => { setShowFormModal(false); setQuotaWarning(null) }} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px] border-2 border-[#0f172a] bg-white text-[#0f172a] transition-colors hover:bg-[#fff1f2] hover:text-[#f43f5e]">
                <X size={24} />
              </button>
            </div>
            <div className="flex-1 space-y-7 overflow-y-auto p-6">

              {/* ÉTAPE 1 : ADHÉRENT */}
              <div data-tutorial="prets-form-adherent" className="space-y-3">
                <label className="mb-3 block text-[10px] font-extrabold uppercase tracking-[0.1em] text-[#1a5f7a]">1. Sélection de l'adhérent</label>
                {!selectedMember ? (
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Nom ou prénom..."
                      className="w-full rounded-[18px] border-2 border-[#0f172a] bg-[#fdfaf6] px-5 py-4 text-[13px] font-bold text-[#0f172a] outline-none placeholder:font-semibold placeholder:text-slate-300 focus:bg-white"
                      value={memberSearch}
                      onFocus={() => setMemberListVisible(true)}
                      onBlur={() => setTimeout(() => setMemberListVisible(false), 200)}
                      onChange={(e) => setMemberSearch(e.target.value)}
                    />
                    {memberListVisible && (
                      <div className="absolute top-full z-[110] mt-2 max-h-48 w-full overflow-y-auto rounded-[18px] border-2 border-[#0f172a] bg-white p-2 shadow-[4px_4px_0_#1a5f7a]">
                        {members
                          .filter(m => `${m.first_name} ${m.last_name}`.toLowerCase().includes(memberSearch.toLowerCase()))
                          .map(m => (
                            <div
                              key={m.id}
                              onMouseDown={() => handleSelectMember(m)}
                              className="cursor-pointer rounded-[12px] p-3 transition-colors hover:bg-[#fdfaf6]"
                            >
                              <span className="text-xs font-extrabold uppercase text-[#0f172a]">{m.last_name} {m.first_name}</span>
                            </div>
                          ))
                        }
                      </div>
                    )}
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between gap-4 rounded-[20px] border-2 border-[#0f172a] bg-[#f0f7f9] p-5">
                      <div>
                        <p className="text-sm font-extrabold uppercase text-[#1a5f7a]">{selectedMember.last_name} {selectedMember.first_name}</p>
                        <p className="mt-0.5 text-[10.5px] font-bold uppercase text-[#1a5f7a]/70">
                          Emprunts : {totalCount} / {getLoanLimit(selectedMember)}
                          {getRemainingSlots(selectedMember) === 0 && (
                            <span className="ml-2 text-rose-500">— Quota atteint</span>
                          )}
                        </p>
                      </div>
                      <button
                        onClick={() => { setSelectedMember(null); setSelectedGames([]); setQuotaWarning(null) }}
                        className="shrink-0 rounded-[12px] border-2 border-[#0f172a] bg-white px-3 py-2 text-[9px] font-extrabold uppercase tracking-[0.1em] text-slate-500 transition-colors hover:bg-[#fdfaf6]"
                      >
                        Changer
                      </button>
                    </div>

                    {/* Avertissement cotisation expirée */}
                    {!isSubscriptionUpToDate(selectedMember) && (
                      <div className="anim-modal-in mt-3 flex items-center gap-3 rounded-[18px] border-2 border-[#f59e0b] bg-[#fffbeb] p-4 text-[#b45309]">
                        <AlertTriangle size={18} className="shrink-0 text-amber-500 animate-pulse" />
                        <p className="text-[10px] font-extrabold uppercase leading-tight tracking-[0.08em]">
                          Attention : La cotisation de cet adhérent n'est plus à jour !
                        </p>
                      </div>
                    )}

                    {/* Avertissement troncature quota après scan */}
                    {quotaWarning && (
                      <div className="anim-modal-in mt-3 flex items-start gap-3 rounded-[18px] border-2 border-[#f43f5e] bg-[#fff1f2] p-4 text-[#be123c]">
                        <AlertTriangle size={18} className="shrink-0 text-rose-500 mt-0.5" />
                        <p className="text-[10px] font-extrabold uppercase leading-tight tracking-[0.08em]">{quotaWarning}</p>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* ÉTAPE 2 : JEUX */}
              <div data-tutorial="prets-form-jeux" className="space-y-3">
                <label className="mb-3 block text-[10px] font-extrabold uppercase tracking-[0.1em] text-[#1a5f7a]">2. Jeux à ajouter</label>
                {selectedMember ? (
                  <>
                    {/* Barre de recherche manuelle — masquée si quota atteint */}
                    {getRemainingSlots(selectedMember) - selectedGames.length > 0 ? (
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="Rechercher un jeu..."
                          className="w-full rounded-[18px] border-2 border-[#0f172a] bg-[#fdfaf6] px-5 py-4 text-[13px] font-bold text-[#0f172a] outline-none placeholder:font-semibold placeholder:text-slate-300 focus:bg-white"
                          value={gameSearch}
                          onFocus={() => setGameListVisible(true)}
                          onBlur={() => setTimeout(() => setGameListVisible(false), 200)}
                          onChange={(e) => setGameSearch(e.target.value)}
                        />
                        {gameListVisible && (
                          <div className="absolute top-full z-[110] mt-2 max-h-48 w-full overflow-y-auto rounded-[18px] border-2 border-[#0f172a] bg-white p-2 shadow-[4px_4px_0_#1a5f7a]">
                            {games
                              .filter(g =>
                                g.is_available &&
                                g.name.toLowerCase().includes(gameSearch.toLowerCase()) &&
                                !selectedGames.find(sg => sg.id === g.id)
                              )
                              .map(g => (
                                <div
                                  key={g.id}
                                  onMouseDown={() => { setSelectedGames([...selectedGames, g]); setGameSearch('') }}
                                  className="cursor-pointer rounded-[12px] p-3 transition-colors hover:bg-[#fdfaf6]"
                                >
                                  <p className="text-xs font-extrabold uppercase tracking-tight text-[#0f172a]">#{g.registration_number} - {g.name}</p>
                                </div>
                              ))
                            }
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="rounded-[18px] border-2 border-[#f43f5e] bg-[#fff1f2] p-5 text-center text-[10px] font-extrabold uppercase tracking-[0.08em] text-[#be123c]">
                        Quota maximum atteint — {getLoanLimit(selectedMember)} jeu(x) autorisé(s)
                      </div>
                    )}

                    {/* Liste des jeux sélectionnés */}
                    <div className="space-y-2">
                      {selectedGames.map(g => (
                        <div key={g.id} className="flex items-center justify-between gap-3 rounded-[16px] border-2 border-[#0f172a] bg-white p-4">
                          <span className="text-[11px] font-extrabold uppercase text-[#0f172a]">#{g.registration_number} - {g.name}</span>
                          <button onClick={() => setSelectedGames(selectedGames.filter(sg => sg.id !== g.id))} className="shrink-0 text-[#f43f5e]">
                            <X size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="rounded-[18px] border-2 border-dashed border-slate-300 bg-[#fdfaf6] p-5 text-center text-[10px] font-extrabold uppercase tracking-[0.08em] text-slate-400">
                    Veuillez d'abord choisir l'adhérent
                  </div>
                )}
              </div>

              {/* ÉTAPE 3 : DATE + VALIDATION */}
              <div data-tutorial="prets-form-date-submit" className="space-y-4 border-t-2 border-[#0f172a] pt-6">
                <input
                  type="date"
                  className="w-full rounded-[18px] border-2 border-[#0f172a] bg-[#fdfaf6] px-5 py-4 text-[13px] font-bold text-[#0f172a] outline-none placeholder:font-semibold placeholder:text-slate-300 focus:bg-white"
                  value={loanDate}
                  onChange={e => setLoanDate(e.target.value)}
                />
                <button
                  onClick={handleSaveLoan}
                  disabled={!selectedMember || selectedGames.length === 0}
                  className="w-full rounded-[18px] border-2 border-[#0f172a] bg-[#1a5f7a] py-5 text-[11px] font-extrabold uppercase tracking-[0.16em] text-white shadow-[5px_5px_0_#0f172a] transition-[transform,box-shadow] duration-200 hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-[2px_2px_0_#0f172a] disabled:pointer-events-none disabled:opacity-30"
                >
                  Valider le prêt
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* ── TUTORIEL ─────────────────────────────────────────────────────── */}
      <TutorialButton onClick={() => setShowTuto(true)} />
      <TutorialOverlay
        steps={pretsSteps}
        open={showTuto}
        onClose={() => { setShowTuto(false); setShowFormModal(false); setRenewalAction(null) }}
      />
    </div>
  )
}