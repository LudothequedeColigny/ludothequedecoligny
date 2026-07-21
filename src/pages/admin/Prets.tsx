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
  const [successModal, setSuccessModal] = useState(false)

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
                clearInterval(intervalRef.current)
                const barcode = barcodes[0].rawValue
                stopCamera()
                await handleSmartScan(barcode)
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
              const barcode = result.getText()
              stopCamera()
              await handleSmartScan(barcode)
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
    if (!composeModal.member?.email) { alert("Email de l'adhérent introuvable."); return }
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
      setSuccessModal(true)
    } catch (err) {
      console.error('Erreur envoi relance:', err)
      alert("Erreur lors de l'envoi. Vérifiez la console.")
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
      alert(
        `Quota dépassé. Cet adhérent a déjà ${alreadyBorrowed} jeu(x) en cours et son quota est de ${limit}. ` +
        `Veuillez retirer des jeux de la sélection.`
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
      }
    } else {
      const queue = JSON.parse(localStorage.getItem('offline_sync_queue') || '[]')
      entries.forEach(entry => queue.push({ table: 'loans', data: entry, timestamp: Date.now() }))
      localStorage.setItem('offline_sync_queue', JSON.stringify(queue))
      alert("⚠️ Mode hors-ligne : Prêt enregistré localement.")
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
          alert("Erreur lors de l'archivage du prêt.")
          return
        }
      } else if (type === 'extend') {
        const newDate = new Date(loan.loan_date)
        newDate.setDate(newDate.getDate() + 15)
        await supabase.from('loans').update({ loan_date: newDate.toISOString().split('T')[0] }).eq('id', loan.id)
      }
      setConfirmAction(null)
      fetchInitialData()
    } else {
      alert("Action réseau requise pour cette opération.")
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

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-screen bg-[#fdfaf6] text-[#1a5f7a] gap-4">
      <Loader2 className="animate-spin" size={40} />
      <span className="font-black uppercase text-xs tracking-widest animate-pulse">Chargement des prêts...</span>
    </div>
  )

  return (
    <div className="p-4 md:p-10 bg-[#fdfaf6] min-h-screen font-sans text-slate-900">

      {/* HEADER */}
      <div className="max-w-7xl mx-auto mb-6 md:mb-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 data-tutorial="prets-header" className="text-xl md:text-4xl font-black text-slate-900 flex items-center gap-3">
          <div className="p-2.5 bg-[#1a5f7a] rounded-xl shadow-lg text-white">
            <Share2 size={24} />
          </div>
          <span>Gestion des <span className="text-[#1a5f7a]">Prêts</span></span>
        </h1>

        <div className="flex gap-2">
          <button
            data-tutorial="prets-scanner-btn"
            onClick={() => { setScannedGamesForLoan([]); setShowScanner(true) }}
            className="px-6 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all shadow-xl flex items-center gap-2"
          >
            <ScanLine size={16} /> Scan Rapide
          </button>
          <button
            data-tutorial="prets-add-btn"
            onClick={openNewLoan}
            className="px-6 py-4 bg-[#e38154] text-white rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all shadow-xl"
          >
            Nouveau Prêt
          </button>
        </div>
      </div>

      <main className="max-w-7xl mx-auto space-y-6">

        {overdueLoansCount > 0 && (
          <div className="flex items-center gap-3 bg-rose-50 border border-rose-100 p-4 rounded-2xl text-rose-800 animate-in fade-in slide-in-from-top-2">
            <AlertTriangle className="text-rose-500 shrink-0 animate-bounce" size={20} />
            <p className="text-[10px] md:text-xs font-black uppercase tracking-wider">
              Attention : {overdueLoansCount} prêt(s) en retard !
            </p>
          </div>
        )}

        <div data-tutorial="prets-search" className="relative group">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
          <input
            type="text"
            placeholder="Rechercher par adhérent ou jeu..."
            className="w-full bg-white border border-slate-100 p-4 pl-14 rounded-2xl font-bold text-slate-700 outline-none shadow-sm focus:ring-2 focus:ring-[#1a5f7a]/10 transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* VERSION MOBILE */}
        <div className="md:hidden space-y-4">
          {filteredLoans.map((l) => {
            const late = isOverdue(l.loan_date)
            return (
              <div key={l.id} className={`bg-white p-5 rounded-[2rem] shadow-sm border ${late ? 'border-rose-200 bg-rose-50/20' : 'border-slate-50'}`}>
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-black text-[#1a5f7a] bg-cyan-50 px-2 py-0.5 rounded-md">#{l.games?.registration_number}</span>
                      <span className={`text-[10px] font-black uppercase ${late ? 'text-rose-600' : 'text-slate-400'}`}>
                        Sortie le {new Date(l.loan_date).toLocaleDateString()}
                      </span>
                    </div>
                    <h3 className="font-black text-slate-900 uppercase text-xs leading-tight mb-1">{l.games?.name}</h3>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">
                      Emprunteur : {l.members?.last_name} {l.members?.first_name}
                    </p>
                  </div>
                  {late && <AlertTriangle size={18} className="text-rose-500 animate-pulse shrink-0" />}
                </div>
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => setConfirmAction({ type: 'return', loan: l })}
                    className={`flex-[2] py-4 rounded-xl text-[9px] font-black uppercase text-white shadow-md flex items-center justify-center gap-2 ${late ? 'bg-rose-500' : 'bg-emerald-500'}`}
                  >
                    <CheckCircle size={14} /> Retour
                  </button>
                  <button
                    onClick={() => setConfirmAction({ type: 'extend', loan: l })}
                    className="flex-1 py-4 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center shadow-sm"
                  >
                    <Clock size={16} />
                  </button>
                  {late && (
                    <button
                      onClick={() => setRenewalAction(l)}
                      className="flex-1 py-4 bg-[#1a5f7a] text-white rounded-xl flex items-center justify-center shadow-md"
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
        <div className="hidden md:block bg-white rounded-[2.5rem] shadow-sm border border-slate-50 overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-[10px] uppercase text-slate-400 font-black">
              <tr>
                <th className="p-8">Date Sortie</th>
                <th className="p-8">Emprunteur</th>
                <th className="p-8">Jeu emprunté</th>
                <th className="p-8 text-right pr-12">Gestion</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredLoans.map((l, idx) => {
                const late = isOverdue(l.loan_date)
                return (
                  <tr key={l.id} {...(idx === 0 ? {"data-tutorial": "prets-list-row1"} : idx === 1 ? {"data-tutorial": "prets-list-row2"} : {})} className={`transition-colors ${late ? 'bg-rose-50/40 hover:bg-rose-50/60' : 'hover:bg-slate-50/50'}`}>
                    <td className={`p-8 font-black ${late ? 'text-rose-600' : 'text-[#1a5f7a]'}`}>
                      {new Date(l.loan_date).toLocaleDateString()}
                    </td>
                    <td className="p-8">
                      <div className={`font-black uppercase text-sm ${late ? 'text-rose-900' : 'text-slate-900'}`}>
                        {l.members?.last_name} {l.members?.first_name}
                      </div>
                    </td>
                    <td className="p-8">
                      <div className="text-sm font-bold text-slate-700">
                        <span className="text-[#1a5f7a] mr-2 font-black">#{l.games?.registration_number}</span>
                        {l.games?.name}
                      </div>
                    </td>
                    <td className="p-8 text-right pr-12 space-x-2">
                      {late && (
                        <button
                          data-tutorial="prets-action-relance"
                          title="Relancer"
                          onClick={() => setRenewalAction(l)}
                          className="p-3 bg-amber-50 text-amber-600 rounded-xl border border-amber-100 hover:bg-amber-100 transition-all shadow-sm"
                        >
                          <Send size={18} />
                        </button>
                      )}
                      <button
                        data-tutorial="prets-action-extend"
                        title="Prolonger"
                        onClick={() => setConfirmAction({ type: 'extend', loan: l })}
                        className="p-3 text-slate-400 bg-white rounded-xl shadow-sm hover:text-amber-500 transition-all"
                      >
                        <Clock size={18} />
                      </button>
                      <button
                        data-tutorial="prets-action-return"
                        onClick={() => setConfirmAction({ type: 'return', loan: l })}
                        className={`px-4 py-2.5 rounded-xl text-[9px] font-black uppercase text-white shadow-md transition-all active:scale-95 ${late ? 'bg-rose-500' : 'bg-emerald-500'}`}
                      >
                        Valider Retour
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <div className="flex justify-center md:justify-end pt-6">
          <button
            data-tutorial="prets-historique"
            onClick={() => window.location.href = '/admin/historique-prets'}
            className="flex items-center gap-2 px-8 py-4 bg-slate-800 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all shadow-lg hover:bg-slate-700 active:scale-95"
          >
            <Clock size={16} /> Consulter l'historique complet
          </button>
        </div>
      </main>

      {/* MODALE SCANNER HYBRIDE */}
      {showScanner && (
        <div className="fixed inset-0 z-[250] flex flex-col items-center justify-center p-6 bg-slate-900/95 backdrop-blur-md">
          <div className="w-full max-w-md bg-white rounded-[2.5rem] p-8 shadow-2xl relative">
            <button onClick={stopScanner} className="absolute top-6 right-6 p-2 bg-slate-100 rounded-full hover:bg-rose-50 hover:text-rose-500 transition-colors">
              <X size={16} />
            </button>
            <h3 className="text-center font-black uppercase text-xs tracking-widest mb-4">Scan Rapide (Prêt / Retour)</h3>

            {iosWarning && (
              <div className="mb-4 p-4 bg-amber-50 border border-amber-100 rounded-2xl text-amber-700 text-[10px] font-black uppercase text-center">
                ⚠️ Sur iPhone, le scan nécessite Safari. Veuillez ouvrir cette page dans Safari.
              </div>
            )}

            <video
              ref={videoRef}
              className="w-full rounded-2xl overflow-hidden shadow-inner bg-slate-900 mb-6"
              autoPlay
              muted
              playsInline
            />

            {scannedGamesForLoan.length > 0 && (
              <div className="space-y-3 mb-6 animate-in slide-in-from-bottom-2">
                <p className="text-[9px] font-black text-[#1a5f7a] uppercase tracking-widest">Jeux scannés ({scannedGamesForLoan.length})</p>
                <div className="max-h-32 overflow-y-auto space-y-2">
                  {scannedGamesForLoan.map(g => (
                    <div key={g.id} className="flex justify-between p-3 bg-slate-50 rounded-xl text-[10px] font-bold border border-slate-100">
                      <span className="truncate">#{g.registration_number} - {g.name}</span>
                      <X size={14} className="text-rose-400 cursor-pointer hover:text-rose-600 shrink-0" onClick={() => setScannedGamesForLoan(scannedGamesForLoan.filter(sg => sg.id !== g.id))} />
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => { setSelectedGames(scannedGamesForLoan); stopScanner(); setShowFormModal(true) }}
                  className="w-full py-4 bg-[#1a5f7a] text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg active:scale-95 transition-all"
                >
                  Valider pour un adhérent
                </button>
              </div>
            )}

            <p className="text-center text-[10px] text-slate-400 italic">
              Scannez un jeu libre pour le prêter, ou un jeu déjà prêté pour le rendre.
            </p>
          </div>
        </div>
      )}

      {/* MODALE CONFIRMATION RETOUR SCAN */}
      {scanReturnConfirm && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-6 bg-slate-900/80 backdrop-blur-md">
          <div className="bg-white rounded-[3rem] p-10 max-w-sm w-full text-center shadow-2xl">
            <CheckCircle className="mx-auto text-emerald-500 mb-6" size={40} />
            <h3 className="text-lg font-black uppercase mb-2">Confirmer le retour ?</h3>
            <p className="text-xs text-slate-500 mb-4 italic">
              "{scanReturnConfirm.games?.name}" ramené par {scanReturnConfirm.members?.first_name} {scanReturnConfirm.members?.last_name}
            </p>

            {/* Alerte observations si le jeu en avait au moment du prêt */}
            {scanReturnConfirm.games?.observations ? (
              <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-2xl text-left">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle size={14} className="text-amber-500 shrink-0" />
                  <span className="text-[9px] font-black uppercase text-amber-600 tracking-widest">Observations avant prêt</span>
                </div>
                <p className="text-xs font-medium text-amber-800 leading-relaxed">{scanReturnConfirm.games.observations}</p>
              </div>
            ) : (
              <div className="mb-6 p-4 bg-emerald-50 border border-emerald-100 rounded-2xl text-left">
                <div className="flex items-center gap-2">
                  <CheckCircle size={14} className="text-emerald-500 shrink-0" />
                  <span className="text-[9px] font-black uppercase text-emerald-600 tracking-widest">Aucune observation enregistrée</span>
                </div>
                <p className="text-[10px] text-emerald-700 mt-1">Le jeu était en bon état au départ — tout composant manquant est imputable à l'emprunteur.</p>
              </div>
            )}

            <div className="flex flex-col gap-3">
              <button onClick={confirmScanReturn} className="w-full py-5 bg-emerald-500 text-white rounded-2xl font-black uppercase text-[10px] shadow-lg">Valider le retour</button>
              <button onClick={() => setScanReturnConfirm(null)} className="w-full py-5 bg-slate-100 text-slate-400 rounded-2xl font-black uppercase text-[10px]">Annuler</button>
            </div>
          </div>
        </div>
      )}

      {/* MODALE 1 : COORDONNÉES + SUIVI RELANCE */}
      {renewalAction && !composeModal.show && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-6 bg-[#1a5f7a]/80 backdrop-blur-md">
          <div data-tutorial="prets-relance-modal" className="bg-white rounded-[3rem] p-10 max-w-lg w-full shadow-2xl border-b-8 border-amber-500">
            
            <div className="flex justify-between items-start mb-6">
              <div className="w-16 h-16 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center">
                <Share2 size={28} />
              </div>
              <button onClick={() => setRenewalAction(null)} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400">
                <X size={24} />
              </button>
            </div>

            <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight mb-1">Relance prêt en retard</h2>
            <p className="text-sm text-slate-500 mb-6">
              Adhérent : <strong>{renewalAction.members?.first_name} {renewalAction.members?.last_name}</strong>
            </p>

            {/* Coordonnées */}
            <div data-tutorial="prets-relance-coordonnees" className="space-y-3 mb-6">
              <div className="flex items-center gap-4 text-slate-600 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <Mail size={18} className="text-[#1a5f7a] shrink-0" />
                <span className="text-sm font-bold truncate">{renewalAction.members?.email || 'Email non renseigné'}</span>
              </div>
              <div className="flex items-center gap-4 text-slate-600 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <Phone size={18} className="text-[#1a5f7a] shrink-0" />
                <span className="text-sm font-bold">{renewalAction.members?.phone || 'Téléphone non renseigné'}</span>
              </div>
              <div className="flex items-start gap-4 text-slate-600 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <MapPin size={18} className="text-[#1a5f7a] mt-1 shrink-0" />
                <span className="text-sm font-bold leading-relaxed">{renewalAction.members?.address || 'Adresse non renseignée'}</span>
              </div>
            </div>

            {/* Jeux en retard */}
            <div data-tutorial="prets-relance-jeux" className="mb-6">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Jeux en retard</p>
              <div className="space-y-2">
                {loans.filter(l => {
                  const memberId = renewalAction.members?.id || renewalAction.member_id
                  const lId = l.members?.id || l.member_id
                  return lId === memberId && isOverdue(l.loan_date)
                }).map(l => (
                  <div key={l.id} className="flex items-center gap-3 p-3 bg-rose-50 rounded-xl border border-rose-100">
                    <span className="text-[9px] font-black text-rose-400 uppercase">#{l.games?.registration_number}</span>
                    <span className="text-sm font-bold text-rose-800 flex-1">{l.games?.name}</span>
                    <span className="text-[9px] text-rose-400">depuis le {new Date(l.loan_date).toLocaleDateString('fr-FR')}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Bouton email */}
            <button
              data-tutorial="prets-relance-email"
              onClick={() => openComposeLoan(renewalAction)}
              className="w-full p-5 bg-[#1a5f7a] text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl flex items-center justify-center gap-3 transition-all active:scale-95 mb-4"
            >
              <Mail size={18} /> Envoyer une relance par mail
            </button>

            {/* Suivi des relances */}
            <div data-tutorial="prets-relance-suivi" className="bg-amber-50/50 rounded-[2rem] p-6 border border-amber-100">
              <div className="flex items-center justify-between mb-4">
                <span className="text-[10px] font-black uppercase text-amber-600 flex items-center gap-2">
                  <Calendar size={14} /> Suivi des relances
                </span>
                {renewalAction.last_reminder_date ? (
                  <span className="px-3 py-1 bg-amber-100 text-amber-700 text-[9px] font-black rounded-full uppercase">
                    Relancé le {new Date(renewalAction.last_reminder_date).toLocaleDateString()}
                  </span>
                ) : (
                  <span className="text-[9px] font-bold text-amber-400 italic">Aucun rappel noté</span>
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
                className="w-full py-3 bg-white border border-amber-200 text-amber-600 rounded-xl font-black uppercase text-[9px] tracking-widest hover:bg-amber-500 hover:text-white transition-all shadow-sm flex items-center justify-center gap-2"
              >
                Marquer comme relancé aujourd'hui
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODALE 2 : COMPOSITION EMAIL */}
      {composeModal.show && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm">
          <div className="bg-white rounded-[2.5rem] w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col">

            <div className="sticky top-0 bg-white rounded-t-[2.5rem] p-8 pb-4 border-b border-slate-100 flex items-center justify-between z-10">
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <div className="p-2.5 bg-amber-50 text-amber-500 rounded-xl"><Mail size={20} /></div>
                  <h3 className="text-base font-black uppercase text-slate-900">Relance — {composeModal.member?.first_name} {composeModal.member?.last_name}</h3>
                </div>
                <p className="text-[10px] text-slate-400 ml-12">
                  {composeModal.loans.length} jeu{composeModal.loans.length > 1 ? 'x' : ''} en retard · {composeModal.member?.email}
                </p>
              </div>
              <button onClick={() => setComposeModal({ show: false, member: null, loans: [] })} className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-all"><X size={20} /></button>
            </div>

            <div className="p-8 space-y-6 flex-1">
              <div className="space-y-2">
                <label className="text-[9px] font-black text-[#1a5f7a] uppercase tracking-widest">Jeux concernés</label>
                <div className="space-y-2">
                  {composeModal.loans.map(l => (
                    <div key={l.id} className="flex items-center gap-3 p-3 bg-rose-50 rounded-xl border border-rose-100">
                      <span className="text-[9px] font-black text-rose-400 uppercase">#{l.games?.registration_number}</span>
                      <span className="text-sm font-bold text-rose-800 flex-1">{l.games?.name}</span>
                      <span className="text-[9px] text-rose-400">depuis le {new Date(l.loan_date).toLocaleDateString('fr-FR')}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[9px] font-black text-[#1a5f7a] uppercase tracking-widest">Objet</label>
                <input
                  className="w-full p-4 rounded-2xl bg-slate-50 font-bold text-sm outline-none border-2 border-transparent focus:border-[#1a5f7a]"
                  value={composeData.subject}
                  onChange={e => setComposeData(prev => ({ ...prev, subject: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <label className="text-[9px] font-black text-[#1a5f7a] uppercase tracking-widest">Message</label>
                <textarea
                  rows={10}
                  className="w-full p-4 rounded-2xl bg-slate-50 font-medium text-sm outline-none border-2 border-transparent focus:border-[#1a5f7a] resize-y"
                  value={composeData.body}
                  onChange={e => setComposeData(prev => ({ ...prev, body: e.target.value }))}
                />
              </div>
            </div>

            <div className="sticky bottom-0 bg-white rounded-b-[2.5rem] p-8 pt-4 border-t border-slate-100 flex gap-3">
              <button onClick={() => setComposeModal({ show: false, member: null, loans: [] })}
                className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-2xl font-black uppercase text-[10px] tracking-widest">
                Annuler
              </button>
              <button onClick={handleSendLoanReminder} disabled={sendingMail}
                className={'flex-1 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 ' +
                  (sendingMail ? 'bg-slate-100 text-slate-300 cursor-not-allowed' : 'bg-[#1a5f7a] text-white hover:bg-[#134a5e]')}>
                {sendingMail ? <><Loader2 size={14} className="animate-spin" /> Envoi...</> : <><Send size={14} /> Envoyer la relance</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* OVERLAY ENVOI EN COURS */}
      {sendingMail && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-[3rem] p-10 max-w-sm w-full text-center shadow-2xl">
            <Loader2 className="animate-spin mx-auto text-[#1a5f7a] mb-6" size={40} />
            <h3 className="text-lg font-black uppercase text-slate-900">Envoi en cours...</h3>
          </div>
        </div>
      )}

      {/* MODALE SUCCÈS */}
      {successModal && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-[3rem] p-10 max-w-md w-full text-center shadow-2xl">
            <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle size={40} />
            </div>
            <h3 className="text-xl font-black uppercase mb-4 text-slate-900">Relance envoyée !</h3>
            <p className="text-[11px] font-medium text-slate-500 mb-8">L'email a été envoyé avec succès.</p>
            <button onClick={() => setSuccessModal(false)}
              className="w-full py-5 bg-[#1a5f7a] text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg">
              Fermer
            </button>
          </div>
        </div>
      )}

      {/* MODALES CONFIRMATION */}
      {confirmAction && (
        <div className="fixed inset-0 z-[120] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-sm p-10 text-center shadow-2xl animate-in zoom-in-95">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 ${confirmAction.type === 'return' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
              {confirmAction.type === 'return' ? <CheckCircle size={32} /> : <Clock size={32} />}
            </div>
            <h3 className="text-xl font-black uppercase mb-2">
              {confirmAction.type === 'return' ? 'Confirmer le retour de ce jeu' : "Autoriser l'allongement du délai d'emprunt de 14 jours"}
            </h3>
            <p className="text-[10px] font-black uppercase text-slate-500 mb-4">Voulez-vous valider cette action ?</p>

            {/* Alerte observations uniquement sur les retours */}
            {confirmAction.type === 'return' && (
              confirmAction.loan.games?.observations ? (
                <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-2xl text-left">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle size={14} className="text-amber-500 shrink-0" />
                    <span className="text-[9px] font-black uppercase text-amber-600 tracking-widest">Observations avant prêt</span>
                  </div>
                  <p className="text-xs font-medium text-amber-800 leading-relaxed">{confirmAction.loan.games.observations}</p>
                </div>
              ) : (
                <div className="mb-6 p-4 bg-emerald-50 border border-emerald-100 rounded-2xl text-left">
                  <div className="flex items-center gap-2">
                    <CheckCircle size={14} className="text-emerald-500 shrink-0" />
                    <span className="text-[9px] font-black uppercase text-emerald-600 tracking-widest">Aucune observation enregistrée</span>
                  </div>
                  <p className="text-[10px] text-emerald-700 mt-1">Le jeu était en bon état au départ — tout composant manquant est imputable à l'emprunteur.</p>
                </div>
              )
            )}

            <div className="flex flex-col gap-3">
              <button
                onClick={processConfirmAction}
                className={`w-full py-5 text-white rounded-2xl font-black uppercase text-xs shadow-lg ${confirmAction.type === 'return' ? 'bg-emerald-600' : 'bg-amber-600'}`}
              >
                Confirmer
              </button>
              <button onClick={() => setConfirmAction(null)} className="w-full py-4 bg-slate-50 text-slate-400 rounded-2xl font-black uppercase text-[10px]">
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODALE FORMULAIRE NOUVEAU PRÊT */}
      {showFormModal && (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div data-tutorial="prets-form-modal" className="bg-white rounded-[2.5rem] w-full max-w-xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
            <div className="p-8 border-b border-slate-50 flex justify-between items-center shrink-0">
              <h2 className="text-xl font-black uppercase">Enregistrer un <span className="text-[#1a5f7a]">Prêt</span></h2>
              <button onClick={() => { setShowFormModal(false); setQuotaWarning(null) }} className="p-2 bg-slate-50 rounded-full text-slate-400 hover:text-rose-500">
                <X size={24} />
              </button>
            </div>
            <div className="p-8 space-y-8 overflow-y-auto">

              {/* ÉTAPE 1 : ADHÉRENT */}
              <div data-tutorial="prets-form-adherent" className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-tighter text-[#1a5f7a]">1. Sélection de l'adhérent</label>
                {!selectedMember ? (
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Nom ou prénom..."
                      className="w-full p-5 bg-slate-50 rounded-2xl font-bold text-sm outline-none border-2 border-transparent focus:border-[#1a5f7a]"
                      value={memberSearch}
                      onFocus={() => setMemberListVisible(true)}
                      onBlur={() => setTimeout(() => setMemberListVisible(false), 200)}
                      onChange={(e) => setMemberSearch(e.target.value)}
                    />
                    {memberListVisible && (
                      <div className="absolute top-full w-full bg-white border border-slate-100 rounded-2xl mt-2 shadow-2xl max-h-48 overflow-y-auto z-[110] p-2 divide-y divide-slate-50">
                        {members
                          .filter(m => `${m.first_name} ${m.last_name}`.toLowerCase().includes(memberSearch.toLowerCase()))
                          .map(m => (
                            <div
                              key={m.id}
                              onMouseDown={() => handleSelectMember(m)}
                              className="p-4 hover:bg-slate-50 rounded-xl cursor-pointer"
                            >
                              <span className="uppercase font-black text-xs">{m.last_name} {m.first_name}</span>
                            </div>
                          ))
                        }
                      </div>
                    )}
                  </div>
                ) : (
                  <>
                    <div className="bg-cyan-50 p-5 rounded-2xl flex justify-between items-center border border-cyan-100">
                      <div>
                        <p className="font-black text-[#1a5f7a] text-sm uppercase">{selectedMember.last_name} {selectedMember.first_name}</p>
                        <p className="text-[10px] font-bold text-cyan-600 uppercase">
                          Emprunts : {totalCount} / {getLoanLimit(selectedMember)}
                          {getRemainingSlots(selectedMember) === 0 && (
                            <span className="ml-2 text-rose-500">— Quota atteint</span>
                          )}
                        </p>
                      </div>
                      <button
                        onClick={() => { setSelectedMember(null); setSelectedGames([]); setQuotaWarning(null) }}
                        className="text-[9px] font-black uppercase text-slate-400 underline"
                      >
                        Changer
                      </button>
                    </div>

                    {/* Avertissement cotisation expirée */}
                    {!isSubscriptionUpToDate(selectedMember) && (
                      <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl flex items-center gap-3 text-amber-700 animate-in fade-in zoom-in-95">
                        <AlertTriangle size={18} className="shrink-0 text-amber-500 animate-pulse" />
                        <p className="text-[9px] font-black uppercase tracking-wider leading-tight">
                          Attention : La cotisation de cet adhérent n'est plus à jour !
                        </p>
                      </div>
                    )}

                    {/* Avertissement troncature quota après scan */}
                    {quotaWarning && (
                      <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-start gap-3 text-rose-700 animate-in fade-in zoom-in-95">
                        <AlertTriangle size={18} className="shrink-0 text-rose-500 mt-0.5" />
                        <p className="text-[9px] font-black uppercase tracking-wider leading-tight">{quotaWarning}</p>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* ÉTAPE 2 : JEUX */}
              <div data-tutorial="prets-form-jeux" className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-tighter text-[#1a5f7a]">2. Jeux à ajouter</label>
                {selectedMember ? (
                  <>
                    {/* Barre de recherche manuelle — masquée si quota atteint */}
                    {getRemainingSlots(selectedMember) - selectedGames.length > 0 ? (
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="Rechercher un jeu..."
                          className="w-full p-5 bg-slate-50 rounded-2xl font-bold text-sm outline-none border-2 border-transparent focus:border-[#1a5f7a]"
                          value={gameSearch}
                          onFocus={() => setGameListVisible(true)}
                          onBlur={() => setTimeout(() => setGameListVisible(false), 200)}
                          onChange={(e) => setGameSearch(e.target.value)}
                        />
                        {gameListVisible && (
                          <div className="absolute top-full w-full bg-white border border-slate-100 rounded-2xl mt-2 shadow-2xl max-h-48 overflow-y-auto z-[110] p-2 divide-y divide-slate-50">
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
                                  className="p-4 hover:bg-slate-50 rounded-xl cursor-pointer"
                                >
                                  <p className="font-black text-xs uppercase tracking-tight">#{g.registration_number} - {g.name}</p>
                                </div>
                              ))
                            }
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="p-5 bg-rose-50 text-rose-500 rounded-2xl text-[10px] font-black uppercase text-center border border-rose-100">
                        Quota maximum atteint — {getLoanLimit(selectedMember)} jeu(x) autorisé(s)
                      </div>
                    )}

                    {/* Liste des jeux sélectionnés */}
                    <div className="space-y-2">
                      {selectedGames.map(g => (
                        <div key={g.id} className="bg-white border border-slate-100 p-4 rounded-xl flex justify-between items-center shadow-sm">
                          <span className="text-[10px] font-black uppercase text-slate-700">#{g.registration_number} - {g.name}</span>
                          <button onClick={() => setSelectedGames(selectedGames.filter(sg => sg.id !== g.id))} className="text-rose-500">
                            <X size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="p-5 bg-slate-50 text-slate-400 rounded-2xl text-[10px] font-bold uppercase text-center border-dashed border-2">
                    Veuillez d'abord choisir l'adhérent
                  </div>
                )}
              </div>

              {/* ÉTAPE 3 : DATE + VALIDATION */}
              <div data-tutorial="prets-form-date-submit" className="pt-6 border-t border-slate-50 space-y-4">
                <input
                  type="date"
                  className="w-full p-5 bg-slate-50 rounded-2xl font-black text-sm outline-none"
                  value={loanDate}
                  onChange={e => setLoanDate(e.target.value)}
                />
                <button
                  onClick={handleSaveLoan}
                  disabled={!selectedMember || selectedGames.length === 0}
                  className="w-full py-6 bg-[#1a5f7a] text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl disabled:opacity-30 transition-all active:scale-95"
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