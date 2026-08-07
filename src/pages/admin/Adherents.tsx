import TutorialOverlay, { TutorialButton } from '../../components/TutorialOverlay'
import { useState, useEffect, useMemo } from 'react'
import { 
  Users, Trash2, Edit2, X, Plus, CreditCard, 
  Phone, Mail, Search, MapPin, Eye, User, Send, AlertTriangle, 
  Building2, ExternalLink, Calendar, ShieldCheck, ShieldOff, CheckCircle2, ChevronRight, Info,
  RefreshCw, Loader2
} from 'lucide-react'
import { supabase } from '../../services/supabaseClient'
import { sendEmail } from '../../services/emailService'
import { useToast } from '../../components/ToastContext'
import AdminPageHeader from '../../components/admin/AdminPageHeader'
import SearchField from '../../components/admin/SearchField'
import IconButton from '../../components/admin/IconButton'
import ConfirmModal from '../../components/admin/ConfirmModal'
import FormModal from '../../components/admin/FormModal'
import { DataCard, DataHeader, DataRow, DataEmpty } from '../../components/admin/DataCard'
import { BTN_ORANGE, BTN_TEAL, BTN_INK } from '../../components/admin/buttons'

// Colonnes du tableau des adhérents : n°, adhérent, statut, caution, actions
const MEMBERS_COLS = '62px minmax(0, 1.3fr) minmax(0, 1.1fr) minmax(0, .95fr) 236px'

// Styles des champs, repris de la maquette
const A_SECTION = 'mb-3 text-[9.5px] font-extrabold uppercase tracking-[0.18em]'
const A_INPUT = 'w-full rounded-[16px] border-2 border-[#0f172a] bg-[#fdfaf6] px-[18px] py-[15px] text-[13px] font-bold text-[#0f172a] outline-none placeholder:font-semibold placeholder:text-slate-300 focus:bg-white'
const A_CHECK = 'flex cursor-pointer items-center gap-2.5 rounded-[16px] border-2 border-[#0f172a] bg-[#fdfaf6] px-4 py-3.5 text-[10.5px] font-extrabold uppercase tracking-[0.1em] text-slate-600'
const A_INFO_ROW = 'flex items-center gap-3.5 rounded-[20px] border-2 border-slate-200 bg-[#fdfaf6] px-5 py-4 text-[13.5px] font-bold text-slate-600'


const ADHERENTS_TUTORIAL_STEPS = (openForm, closeForm, openRelance, openRenewal) => [
  {
    id: 'adherents-header',
    noSpotlight: true,
    title: `Bienvenue sur la page Adhérents`,
    description: `Cette page centralise tous les membres de l'association. Vous pouvez gérer les inscriptions, renouvellements, envoyer des relances et consulter les fiches détaillées.`,
    action: () => { closeForm(); openRelance(false); openRenewal(false) },
  },
  {
    id: 'adherents-add-btn',
    title: `Ajouter un nouvel adhérent`,
    description: `Ce bouton ouvre le formulaire d'inscription. Nous allons le parcourir ensemble.`,
    action: () => { closeForm(); openRelance(false); openRenewal(false) },
  },
  {
    id: 'adherents-form',
    title: `Formulaire d'inscription`,
    description: `Ce formulaire est divisé en trois colonnes : Type & Identité, Coordonnées, et Cotisation. Vous pouvez inscrire un particulier ou une association.`,
    action: () => { openForm(); openRelance(false); openRenewal(false) },
    actionDelay: 400,
  },
  {
    id: 'adherents-form-type',
    title: `Type et identité`,
    description: `Choisissez "Particulier" ou "Association". Ce choix détermine le calcul de la cotisation et la durée de validité. Renseignez ensuite le numéro d'adhérent, le prénom, le nom et la date d'adhésion.`,
    action: () => { openForm(); openRelance(false); openRenewal(false) },
    actionDelay: 400,
  },
  {
    id: 'adherents-form-contact',
    title: `Coordonnées`,
    description: `Saisissez l'email, le téléphone et l'adresse. Pour un particulier, vous pouvez aussi ajouter les membres du foyer qui bénéficient de l'adhésion.`,
    action: () => { openForm(); openRelance(false); openRenewal(false) },
    actionDelay: 400,
  },
  {
    id: 'adherents-form-cotisation',
    title: `Cotisation`,
    description: `Le montant est calculé automatiquement selon la date d'adhésion et le mode configuré (dégressif ou fixe). Cochez "Réglée" dès réception du paiement. Si une caution est requise, un encart supplémentaire apparaît.`,
    action: () => { openForm(); openRelance(false); openRenewal(false) },
    actionDelay: 400,
  },
  {
    id: 'adherents-payment-info-btn',
    title: `Modalités de paiement`,
    description: `Ce bouton affiche les moyens de paiement acceptés par l'association (CB, espèces, chèque, virement) avec, le cas échéant, les coordonnées bancaires complètes — pratique à montrer à l'adhérent au moment de l'inscription.`,
    action: () => { openForm(); openRelance(false); openRenewal(false) },
    actionDelay: 400,
    tip: `Les moyens de paiement affichés se configurent dans la page Paramètres.`,
  },
  {
    id: 'adherents-form-submit',
    title: `Enregistrer l'adhérent`,
    description: `Ce bouton enregistre le nouvel adhérent. Si un email est renseigné, vous pouvez cocher l'option pour lui envoyer automatiquement un email de bienvenue.`,
    action: () => { openForm(); openRelance(false); openRenewal(false) },
    actionDelay: 400,
  },
  {
    id: 'adherents-search',
    title: `Rechercher un adhérent`,
    description: `Filtrez la liste par nom, prénom ou numéro d'adhérent. La recherche est instantanée.`,
    action: () => { closeForm(); openRelance(false); openRenewal(false) },
  },
  {
    id: 'adherents-list-row1',
    id2: 'adherents-list-row2',
    title: `Liste des adhérents`,
    description: `Chaque ligne affiche le numéro, le nom, le statut (à jour / expiré) avec le montant de cotisation, et le statut de la caution.`,
    tip: `Un particulier est "à jour" pour l'année civile en cours. Une association bénéficie d'un an glissant à partir de sa date d'inscription.`,
    action: () => { closeForm(); openRelance(false); openRenewal(false) },
  },
  {
    id: 'adherents-action-view',
    title: `Voir la fiche complète`,
    description: `L'icône œil ouvre la fiche détaillée de l'adhérent : coordonnées complètes et membres du foyer pour les particuliers.`,
    action: () => { closeForm(); openRelance(false); openRenewal(false) },
  },
  {
    id: 'adherents-action-edit',
    title: `Modifier un adhérent`,
    description: `L'icône crayon ouvre le formulaire en mode édition avec toutes les informations pré-remplies. Modifiez puis enregistrez pour mettre à jour la fiche.`,
    action: () => { closeForm(); openRelance(false); openRenewal(false) },
  },
  {
    id: 'adherents-action-delete',
    title: `Supprimer un adhérent`,
    description: `L'icône poubelle supprime définitivement la fiche de l'adhérent après confirmation. Cette action est irréversible.`,
    action: () => { closeForm(); openRelance(false); openRenewal(false) },
  },
  {
    id: 'adherents-action-renew',
    title: `Renouveler une adhésion`,
    description: `Ce bouton apparaît uniquement sur les adhérents expirés. Cliquez dessus pour ouvrir la fenêtre de renouvellement — nous allons l'explorer ensemble à l'étape suivante.`,
    action: () => { closeForm(); openRelance(false); openRenewal(false) },
    tip: `Si aucun adhérent n'est expiré en ce moment, ce bouton n'est pas visible dans le tableau.`,
  },
  {
    id: 'adherents-renewal-modal',
    title: `Fenêtre de renouvellement`,
    description: `Cette fenêtre permet de renouveler l'adhésion : choisissez la date, vérifiez le montant recalculé automatiquement, cochez si la cotisation est réglée, et optionnellement envoyez un email de confirmation à l'adhérent.`,
    action: () => { closeForm(); openRelance(false); openRenewal(true) },
    actionDelay: 450,
  },
  {
    id: 'adherents-action-relance',
    title: `Envoyer une relance`,
    description: `Cette icône apparaît uniquement sur les adhérents expirés. Elle ouvre une fenêtre de relance — nous allons l'explorer ensemble à l'étape suivante.`,
    action: () => { closeForm(); openRenewal(false); openRelance(false) },
    tip: `Si aucun adhérent n'est expiré en ce moment, cette icône n'est pas visible dans le tableau.`,
  },
  {
    id: 'adherents-relance-modal',
    title: `Fenêtre de relance`,
    description: `Cette fenêtre affiche les coordonnées de l'adhérent expiré (email, téléphone, adresse) et permet d'envoyer un email de relance de cotisation pré-rédigé, ou simplement de marquer la relance comme effectuée sans envoyer d'email.`,
    action: () => { closeForm(); openRenewal(false); openRelance(true) },
    actionDelay: 450,
  },
]


export default function Adherents() {
  const { addToast } = useToast()
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [viewMember, setViewMember] = useState(null)
  const [renewalAction, setRenewalAction] = useState(null)
  const [composeModal, setComposeModal] = useState({ show: false, member: null })
  const [composeData, setComposeData] = useState({ subject: '', body: '' })
  const [sendingMail, setSendingMail] = useState(false)
  const [showPaymentInfoModal, setShowPaymentInfoModal] = useState(false)
  const [showTuto, setShowTuto] = useState(false)

  // ── MODALE RENOUVELLEMENT ADHÉSION ────────────────────────────────────────
  const [renewalModal, setRenewalModal] = useState({ show: false, member: null })
  const [renewalForm, setRenewalForm] = useState({ membership_date: '', fee_amount: 0, has_paid: true, sendEmail: true })
  const [savingRenewal, setSavingRenewal] = useState(false)

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
    // Nouveaux réglages paiements
    pay_cb: "false",
    pay_especes: "false",
    pay_cheque: "false",
    pay_virement: "false",
    iban: '',
    bic: '',
    nom_compte: ''
  })

  const now = new Date();
  const currentYear = now.getFullYear();
  const todayStr = now.toISOString().split('T')[0];

  const initialFormState = {
    member_number: '', 
    first_name: '', 
    last_name: '', 
    email: '', 
    phone: '',
    address: '', 
    type: 'Particulier', 
    has_paid: true, 
    caution_received: false,
    family_members: [], 
    membership_date: todayStr,
    fee_amount: 0,
    last_reminder_date: null
  }

  const [newMember, setNewMember] = useState(initialFormState)
  const [tempFamilyMember, setTempFamilyMember] = useState('')

  const calculateFee = (type, date, settings) => {
    const isAsso = type === 'Association';
    const base = Number(isAsso ? settings.prix_association : settings.prix_particulier) || 0;
    const deg = Number(isAsso ? settings.degressivite_association : settings.degressivite_mensuelle) || 0;
    const min = Number(isAsso ? settings.prix_minimum_asso : settings.prix_minimum) || 0;
    const mode = isAsso ? settings.mode_adhesion_association : settings.mode_adhesion_particulier;

    if (mode === 'degressif') {
      const monthIndex = new Date(date).getMonth();
      const calculated = base - (monthIndex * deg);
      return Math.max(calculated, min);
    }
    return base;
  }

  useEffect(() => { 
    fetchMembers() 
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

  useEffect(() => {
    setNewMember(prev => ({
      ...prev,
      fee_amount: calculateFee(prev.type, prev.membership_date, appSettings)
    }));
  }, [appSettings, newMember.type, newMember.membership_date]);

  // FONCTION POUR TROUVER LE PROCHAIN NUMÉRO DISPONIBLE
  const getNextAvailableNumber = (currentMembers) => {
    if (!currentMembers || currentMembers.length === 0) return '001';
    const numbers = currentMembers
      .map(m => parseInt(m.member_number))
      .filter(n => !isNaN(n));
    const max = numbers.length > 0 ? Math.max(...numbers) : 0;
    return (max + 1).toString().padStart(3, '0');
  }

  const handleOpenForm = () => {
    setEditingId(null);
    setNewMember({
      ...initialFormState,
      member_number: getNextAvailableNumber(members), // Numérotation auto
      fee_amount: calculateFee('Particulier', todayStr, appSettings)
    });
    setShowForm(true);
  };

  const getExpirationStatus = (member) => {
    if (!member.has_paid) return { expired: true, message: "Non réglé" };
    const dateAdhesion = new Date(member.membership_date);
    const isAsso = member.type === 'Association';
    const mode = isAsso ? appSettings.mode_adhesion_association : appSettings.mode_adhesion_particulier;

    if (mode === 'degressif') {
      if (dateAdhesion.getFullYear() < currentYear) return { expired: true, message: "Année expirée" };
    } else {
      const expiryDate = new Date(dateAdhesion);
      expiryDate.setFullYear(expiryDate.getFullYear() + 1);
      if (now > expiryDate) return { expired: true, message: "Contrat expiré" };
    }
    return { expired: false, message: "À jour" };
  }

  async function fetchMembers() {
    setLoading(true)
    // TRIÉ PAR NUMÉRO D'ADHÉRENT
    const { data } = await supabase.from('members').select('*').order('member_number', { ascending: true })
    setMembers(data || [])
    setLoading(false)
  }

  // ── HELPER : construire un email HTML ─────────────────────────────────────
  const buildEmailHtml = (bodyText) => {
    const html = bodyText
      .split('\n')
      .map(line => line.trim() === '' ? '<br/>' : `<p style="margin:0 0 6px 0;">${line}</p>`)
      .join('')
    return `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#1a1a1a;">
      <div style="background:#1a5f7a;padding:24px;border-radius:12px 12px 0 0;">
        <h1 style="color:white;margin:0;font-size:18px;">Ludothèque de Coligny</h1>
      </div>
      <div style="background:#fdfaf6;padding:32px;border-radius:0 0 12px 12px;border:1px solid #e2e8f0;">
        ${html}
      </div>
    </div>`
  }

  // ── OUVRIR LA MODALE DE RENOUVELLEMENT D'ADHÉSION ─────────────────────────
  const openRenewalModal = (member) => {
    const newDate = todayStr
    const fee = calculateFee(member.type, newDate, appSettings)
    setRenewalForm({ membership_date: newDate, fee_amount: fee, has_paid: true, sendEmail: !!member.email })
    setRenewalModal({ show: true, member })
    setRenewalAction(null)
  }

  // ── ENREGISTRER LE RENOUVELLEMENT ─────────────────────────────────────────
  const handleSaveRenewal = async () => {
    const { member } = renewalModal
    if (!member) return
    setSavingRenewal(true)
    try {
      // 1. Mettre à jour la fiche adhérent
      await supabase.from('members').update({
        membership_date: renewalForm.membership_date,
        fee_amount: renewalForm.fee_amount,
        has_paid: renewalForm.has_paid,
      }).eq('id', member.id)

      // 2. Enregistrer la transaction financière si payé
      if (renewalForm.has_paid) {
        const memberName = member.type === 'Association' ? member.last_name : `${member.first_name} ${member.last_name}`
        await supabase.from('financial_transactions').insert({
          label: `Cotisation – ${memberName} (N°${member.member_number})`,
          amount: Number(renewalForm.fee_amount) || 0,
          type: 'entree',
          category: 'Cotisation',
          date: renewalForm.membership_date,
        })
      }

      // 3. Envoyer l'email de confirmation si demandé
      if (renewalForm.sendEmail && member.email) {
        const name = member.type === 'Association' ? member.last_name : member.first_name
        const dateFormatted = new Date(renewalForm.membership_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
        const subject = `Confirmation de renouvellement d'adhésion - Ludothèque de Coligny`
        const body = `Bonjour ${name},

Nous avons bien enregistré le renouvellement de votre adhésion à la Ludothèque de Coligny.

Votre adhésion est à jour depuis le ${dateFormatted}${renewalForm.has_paid ? ` pour un montant de ${renewalForm.fee_amount}€` : ''}.

Merci de votre fidélité ! Nous sommes ravis de vous compter parmi nos adhérents pour cette nouvelle année.

À très bientôt à la ludothèque !

L'équipe de la Ludothèque de Coligny
www.ludothequedecoligny.fr`
        await sendEmail({ to: member.email, subject, html: buildEmailHtml(body) })
      }

      fetchMembers()
      setRenewalModal({ show: false, member: null })
      addToast(renewalForm.sendEmail && member.email ? 'Adhésion renouvelée et email de confirmation envoyé !' : 'Adhésion renouvelée avec succès !', 'success')
    } catch (err) {
      console.error('Erreur renouvellement:', err)
      addToast("Erreur lors du renouvellement. Vérifiez la console.", 'error')
    } finally {
      setSavingRenewal(false)
    }
  }

  const openComposeMember = (member) => {
    const name = member.type === 'Association' ? member.last_name : member.first_name
    const subject = `Renouvellement de votre adhésion - Ludothèque de Coligny`
    const body = `Bonjour ${name},

Sauf erreur de notre part, votre adhésion à la ludothèque est arrivée à son terme.

Nous serions ravis de vous compter à nouveau parmi nos adhérents ! Nous vous invitons à venir renouveler votre adhésion lors de notre prochaine permanence.

Ce sera l'occasion de découvrir les nouveautés et de partager un moment convivial.

À très bientôt !

L'équipe de la Ludothèque de Coligny
www.ludothequedecoligny.fr`
    setComposeData({ subject, body })
    setComposeModal({ show: true, member })
    setRenewalAction(null)
  }

  const handleSendRenewal = async () => {
    if (!composeModal.member?.email) { addToast("Email de l'adhérent introuvable.", 'error'); return }
    setSendingMail(true)
    try {
      await sendEmail({ to: composeModal.member.email, subject: composeData.subject, html: buildEmailHtml(composeData.body) })
      const today = new Date().toISOString().split('T')[0]
      await supabase.from('members').update({ last_reminder_date: today }).eq('id', composeModal.member.id)
      fetchMembers()
      setComposeModal({ show: false, member: null })
      addToast('Email de relance envoyé avec succès.', 'success')
    } catch (err) {
      console.error('Erreur envoi relance:', err)
      addToast("Erreur lors de l'envoi. Vérifiez la console.", 'error')
    } finally {
      setSendingMail(false)
    }
  }

  const [sendWelcomeEmail, setSendWelcomeEmail] = useState(true)

  async function handleSubmit(e) {
    e.preventDefault();

    // Snapshot uniquement pour les adhésions d'aujourd'hui ou futures
    const today = new Date().toISOString().split('T')[0]
    const isNewAdhesion = newMember.membership_date >= today

    if (editingId) {
      // ── MODIFICATION ──────────────────────────────────────────────────────
      const { data: before } = await supabase
        .from('members')
        .select('has_paid, fee_amount, membership_date')
        .eq('id', editingId)
        .single()

      const { error } = await supabase.from('members').update(newMember).eq('id', editingId)

      if (!error) {
        const wasNotPaid = before && !before.has_paid
        const dateChanged = before && before.membership_date !== newMember.membership_date
        const nowPaid = newMember.has_paid

        if (nowPaid && isNewAdhesion && (wasNotPaid || dateChanged)) {
          const memberName = newMember.type === 'Association'
            ? newMember.last_name
            : `${newMember.first_name} ${newMember.last_name}`
          await supabase.from('financial_transactions').insert({
            label: `Cotisation – ${memberName} (N°${newMember.member_number})`,
            amount: Number(newMember.fee_amount) || 0,
            type: 'entree',
            category: 'Cotisation',
            date: newMember.membership_date,
          })
        }

        setShowForm(false); setNewMember(initialFormState); fetchMembers(); setEditingId(null)
        addToast('Adhérent modifié avec succès.', 'success')
      }
    } else {
      // ── CRÉATION ──────────────────────────────────────────────────────────
      const { data: inserted, error } = await supabase.from('members').insert([newMember]).select().single()

      if (!error) {
        if (newMember.has_paid && isNewAdhesion) {
          const memberName = newMember.type === 'Association'
            ? newMember.last_name
            : `${newMember.first_name} ${newMember.last_name}`
          await supabase.from('financial_transactions').insert({
            label: `Cotisation – ${memberName} (N°${newMember.member_number})`,
            amount: Number(newMember.fee_amount) || 0,
            type: 'entree',
            category: 'Cotisation',
            date: newMember.membership_date,
          })
        }

        // ── EMAIL DE BIENVENUE ─────────────────────────────────────────────
        if (sendWelcomeEmail && newMember.email) {
          const name = newMember.type === 'Association' ? newMember.last_name : newMember.first_name
          const dateFormatted = new Date(newMember.membership_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
          const subject = `Bienvenue à la Ludothèque de Coligny !`
          const body = `Bonjour ${name},

Nous sommes ravis de vous accueillir parmi les adhérents de la Ludothèque de Coligny !

Votre adhésion a bien été enregistrée le ${dateFormatted}.

Vous pouvez dès maintenant emprunter des jeux lors de nos permanences. N'hésitez pas à consulter notre catalogue en ligne et à nous contacter si vous avez des questions.

À très bientôt !

L'équipe de la Ludothèque de Coligny
www.ludothequedecoligny.fr`
          try {
            await sendEmail({ to: newMember.email, subject, html: buildEmailHtml(body) })
          } catch (mailErr) {
            console.error('Erreur envoi email bienvenue:', mailErr)
          }
        }

        setShowForm(false); setNewMember(initialFormState); fetchMembers(); setEditingId(null)
        addToast('Adhérent ajouté avec succès.', 'success')
      }
    }
  }

  const filteredMembers = members.filter(m => 
    `${m.first_name} ${m.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) || 
    m.member_number?.toString().includes(searchTerm)
  );

  // ── Membres expirés pour le tutoriel (pour ouvrir les modales de démo) ──────
  const fakeExpiredMember = members.find(m => {
    const s = getExpirationStatus(m)
    return s.expired
  }) ?? members[0] ?? null

  const adherentsSteps = useMemo(() => ADHERENTS_TUTORIAL_STEPS(
    () => { setEditingId(null); setNewMember(initialFormState); setShowForm(true) },
    () => setShowForm(false),
    (open) => {
      if (open && fakeExpiredMember) setRenewalAction(fakeExpiredMember)
      else setRenewalAction(null)
    },
    (open) => {
      if (open && fakeExpiredMember) openRenewalModal(fakeExpiredMember)
      else setRenewalModal({ show: false, member: null })
    }
  ), [fakeExpiredMember]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-screen bg-[#fdfaf6] p-5 font-body text-[#0f172a] md:p-11">
      <div className="mx-auto max-w-[1240px]">

      <div data-tutorial="adherents-header">
        <AdminPageHeader
          icon="ludo-adherents.svg" title="Gestion des" accent="adhérents"
          tileBg="#e38154" tileShadow="#1a5f7a" accentColor="#e38154"
        >
          <button
            data-tutorial="adherents-add-btn"
            onClick={() => showForm ? setShowForm(false) : handleOpenForm()}
            className={`${showForm ? BTN_INK : BTN_TEAL} w-full md:w-auto`}
          >
            {showForm ? <><X size={16} strokeWidth={3} /> Fermer</> : <><Plus size={16} strokeWidth={3} /> Nouvel adhérent</>}
          </button>
        </AdminPageHeader>
      </div>

      <main>
        <SearchField
          data-tutorial="adherents-search"
          className="mb-6"
          placeholder="Rechercher un adhérent..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />

        {/* LISTE — tableau sur ordinateur, cartes sur téléphone */}
        <DataCard shadow="#e38154" className="hidden md:block">
          <DataHeader columns={MEMBERS_COLS}>
            <div>N°</div><div>Adhérent</div><div>Statut</div><div>Caution</div>
            <div className="text-right">Gestion</div>
          </DataHeader>

          {loading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <DataRow key={i} columns={MEMBERS_COLS} className="animate-pulse">
                <div className="h-4 w-8 rounded-full bg-slate-100" />
                <div className="h-4 w-32 rounded-full bg-slate-100" />
                <div className="h-6 w-24 rounded-full bg-slate-100" />
                <div className="h-4 w-16 rounded-full bg-slate-100" />
                <div />
              </DataRow>
            ))
          ) : filteredMembers.length === 0 ? (
            <DataEmpty icon={<Users size={36} className="text-slate-200" />}>
              Aucun adhérent ne correspond à cette recherche.
            </DataEmpty>
          ) : filteredMembers.map((m, idx) => {
            const status = getExpirationStatus(m);
            const isCautionActive = (m.type === 'Particulier' && appSettings.active_caution_particulier === "true") || (m.type === 'Association' && appSettings.active_caution_association === "true");
            return (
              <DataRow
                key={m.id}
                columns={MEMBERS_COLS}
                style={status.expired ? { background: '#fff5f6' } : undefined}
                {...(idx === 0 ? { 'data-tutorial': 'adherents-list-row1' } : idx === 1 ? { 'data-tutorial': 'adherents-list-row2' } : {})}
              >
                <div className="font-display text-[16px] font-extrabold text-[#1a5f7a]">{m.member_number}</div>

                <div className="min-w-0">
                  <div className="flex items-center gap-2 truncate text-[13px] font-extrabold uppercase">
                    {m.type === 'Association' && <Building2 size={13} className="shrink-0 text-slate-400" />}
                    {m.last_name} {m.type !== 'Association' ? m.first_name : ''}
                  </div>
                  <div className="mt-1.5 text-[9.5px] font-extrabold uppercase tracking-[0.12em] text-slate-400">
                    {m.type}
                  </div>
                </div>

                <div>
                  <span
                    className="inline-block rounded-full border-2 border-[#0f172a] px-3.5 py-1.5 text-[9px] font-extrabold uppercase tracking-[0.1em]"
                    style={status.expired ? { background: '#ffe4e6', color: '#be123c' } : { background: '#ecfdf5', color: '#047857' }}
                  >
                    {status.message} ({m.fee_amount}€)
                  </span>
                </div>

                <div className="text-[10px] font-extrabold uppercase tracking-[0.1em]">
                  {!isCautionActive
                    ? <span className="italic text-slate-300">N/A</span>
                    : m.caution_received
                      ? <span className="flex items-center gap-2 text-orange-600"><ShieldCheck size={15} /> OK</span>
                      : <span className="flex items-center gap-2 text-rose-400"><ShieldOff size={15} /> Manquante</span>}
                </div>

                <div className="flex flex-wrap justify-end gap-2">
                  {status.expired && (
                    <IconButton data-tutorial="adherents-action-renew" tone="success" title="Renouveler l'adhésion" onClick={() => openRenewalModal(m)}>
                      <RefreshCw size={17} />
                    </IconButton>
                  )}
                  {status.expired && (
                    <IconButton data-tutorial="adherents-action-relance" tone="warn" title="Envoyer une relance" onClick={() => setRenewalAction(m)}>
                      <Send size={17} />
                    </IconButton>
                  )}
                  <IconButton data-tutorial="adherents-action-view" title="Voir la fiche" onClick={() => setViewMember(m)}>
                    <Eye size={17} />
                  </IconButton>
                  <IconButton
                    data-tutorial="adherents-action-edit" title="Modifier"
                    className="bg-[#fdfaf6] text-[#0f172a] hover:bg-[#0f172a] hover:text-white"
                    onClick={() => { setNewMember({ ...m, family_members: m.family_members || [] }); setEditingId(m.id); setShowForm(true); }}
                  >
                    <Edit2 size={17} />
                  </IconButton>
                  <IconButton data-tutorial="adherents-action-delete" tone="danger" title="Supprimer" onClick={() => setDeleteConfirm(m)}>
                    <Trash2 size={17} />
                  </IconButton>
                </div>
              </DataRow>
            )
          })}
        </DataCard>

        <div className="space-y-4 md:hidden">
          {!loading && filteredMembers.length === 0 && (
            <DataCard shadow="#e38154">
              <DataEmpty icon={<Users size={36} className="text-slate-200" />}>
                Aucun adhérent ne correspond à cette recherche.
              </DataEmpty>
            </DataCard>
          )}
          {filteredMembers.map((m) => {
            const status = getExpirationStatus(m);
            return (
              <div
                key={m.id}
                className="rounded-[26px] border-2 border-[#0f172a] bg-white p-4 shadow-[4px_4px_0_#e38154]"
                style={status.expired ? { background: '#fff5f6' } : undefined}
              >
                <div className="mb-3.5 flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] border-2 border-[#0f172a] bg-[#f0f7f9] font-display text-[13px] font-extrabold text-[#1a5f7a]">
                      {m.member_number}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-display text-[15px] font-extrabold uppercase leading-tight">
                        {m.last_name} {m.type !== 'Association' ? m.first_name : ''}
                      </p>
                      <p className="mt-1 flex items-center gap-1 text-[9.5px] font-extrabold uppercase tracking-[0.12em] text-slate-400">
                        {m.type === 'Association' ? <><Building2 size={10} /> Association</> : <><User size={10} /> Particulier</>}
                      </p>
                    </div>
                  </div>
                  <span
                    className="shrink-0 rounded-full border-2 border-[#0f172a] px-2.5 py-1 text-[8px] font-extrabold uppercase tracking-[0.1em]"
                    style={status.expired ? { background: '#ffe4e6', color: '#be123c' } : { background: '#ecfdf5', color: '#047857' }}
                  >
                    {status.message}
                  </span>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 border-t-2 border-slate-100 pt-3.5">
                  <div className="flex gap-2">
                    <IconButton title="Voir la fiche" onClick={() => setViewMember(m)}><Eye size={17} /></IconButton>
                    <IconButton
                      title="Modifier"
                      className="bg-[#fdfaf6] text-[#0f172a] hover:bg-[#0f172a] hover:text-white"
                      onClick={() => { setNewMember({ ...m, family_members: m.family_members || [] }); setEditingId(m.id); setShowForm(true); }}
                    >
                      <Edit2 size={17} />
                    </IconButton>
                    <IconButton tone="danger" title="Supprimer" onClick={() => setDeleteConfirm(m)}><Trash2 size={17} /></IconButton>
                  </div>
                  {status.expired && (
                    <div className="flex gap-2">
                      <IconButton tone="success" title="Renouveler" onClick={() => openRenewalModal(m)}><RefreshCw size={17} /></IconButton>
                      <IconButton tone="warn" title="Relancer" onClick={() => setRenewalAction(m)}><Send size={17} /></IconButton>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </main>
      </div>

      {/* ---------- FICHE ADHÉRENT (création / modification) ---------- */}
      {showForm && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-3 sm:p-[22px]">
          <div className="anim-fade-in absolute inset-0 backdrop-blur-[6px]" style={{ background: 'rgba(15,23,42,.7)' }} onClick={() => setShowForm(false)} />
          <form
            data-tutorial="adherents-form"
            onSubmit={handleSubmit}
            className="anim-modal-in relative max-h-[88vh] w-full max-w-[820px] overflow-y-auto rounded-[36px] border-2 border-[#0f172a] bg-white p-6 shadow-[12px_12px_0_#e38154] md:p-9"
          >
            <button
              type="button" onClick={() => setShowForm(false)} aria-label="Fermer"
              className="absolute right-4 top-4 z-10 flex h-[42px] w-[42px] items-center justify-center rounded-[14px] border-2 border-[#0f172a] bg-[#fdfaf6] text-[15px] font-extrabold text-[#1a5f7a] transition-colors hover:bg-[#e38154] hover:text-white"
            >
              ✕
            </button>

            <h2 className="mb-6 pr-14 font-display text-[24px] font-extrabold uppercase tracking-[-0.04em] md:text-[27px]">
              Fiche <span className="text-[#e38154]">adhérent</span>
            </h2>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div>
                <div data-tutorial="adherents-form-type">
                  <div className={`${A_SECTION} text-[#1a5f7a]`}>Type &amp; identité</div>
                  <div className="mb-3 flex gap-2">
                    {['Particulier', 'Association'].map((t) => (
                      <button
                        key={t} type="button"
                        onClick={() => setNewMember({ ...newMember, type: t, first_name: t === 'Association' ? 'Association' : '' })}
                        className={`flex-1 rounded-[14px] border-2 border-[#0f172a] py-3 text-[10px] font-extrabold uppercase tracking-[0.1em] transition-colors ${
                          newMember.type === t ? 'bg-[#1a5f7a] text-white' : 'bg-[#fdfaf6] text-slate-500'
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                  <input required placeholder="N° adhérent" className={`${A_INPUT} mb-3`} value={newMember.member_number} onChange={e => setNewMember({ ...newMember, member_number: e.target.value })} />
                  <div className="mb-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                    {newMember.type !== 'Association' && (
                      <input required placeholder="Prénom" className={A_INPUT} value={newMember.first_name} onChange={e => setNewMember({ ...newMember, first_name: e.target.value })} />
                    )}
                    <input required placeholder={newMember.type === 'Association' ? "Nom de l'asso" : "Nom"} className={A_INPUT} value={newMember.last_name} onChange={e => setNewMember({ ...newMember, last_name: e.target.value })} />
                  </div>
                  <input type="date" required className={A_INPUT} value={newMember.membership_date} onChange={e => setNewMember({ ...newMember, membership_date: e.target.value })} />
                </div>

                <div data-tutorial="adherents-form-contact">
                  <div className={`${A_SECTION} mt-5 text-[#e38154]`}>Coordonnées</div>
                  <input type="email" placeholder="Email" className={`${A_INPUT} mb-3`} value={newMember.email} onChange={e => setNewMember({ ...newMember, email: e.target.value })} />
                  <input type="tel" placeholder="Téléphone" className={`${A_INPUT} mb-3`} value={newMember.phone} onChange={e => setNewMember({ ...newMember, phone: e.target.value })} />
                  <textarea
                    placeholder="Adresse complète" rows={2}
                    className="w-full resize-none rounded-[18px] border-2 border-[#0f172a] bg-[#fdfaf6] px-[18px] py-4 text-[13px] font-semibold text-[#0f172a] outline-none placeholder:text-slate-300 focus:bg-white"
                    value={newMember.address} onChange={e => setNewMember({ ...newMember, address: e.target.value })}
                  />
                </div>
              </div>

              <div>
                {newMember.type === 'Particulier' && (
                  <>
                    <div className={`${A_SECTION} text-[#1a5f7a]`}>Membres du foyer</div>
                    <div className="mb-3 flex gap-2.5">
                      <input
                        placeholder="Membre foyer..." className={`${A_INPUT} min-w-0 flex-1`}
                        value={tempFamilyMember} onChange={e => setTempFamilyMember(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); if (tempFamilyMember.trim()) { setNewMember({ ...newMember, family_members: [...newMember.family_members, tempFamilyMember.trim()] }); setTempFamilyMember('') } } }}
                      />
                      <button
                        type="button" aria-label="Ajouter au foyer"
                        onClick={() => { if (tempFamilyMember.trim()) { setNewMember({ ...newMember, family_members: [...newMember.family_members, tempFamilyMember.trim()] }); setTempFamilyMember('') } }}
                        className="flex w-14 shrink-0 items-center justify-center rounded-[16px] border-2 border-[#0f172a] bg-[#0f172a] text-white transition-transform active:scale-95"
                      >
                        <Plus size={19} strokeWidth={3} />
                      </button>
                    </div>
                    <div className="mb-5 flex flex-wrap gap-[7px]">
                      {newMember.family_members.map((name, i) => (
                        <span key={i} className="flex items-center gap-2 rounded-[12px] border-2 border-slate-200 bg-[#fdfaf6] px-3.5 py-2 text-[11.5px] font-bold text-slate-600">
                          {name}
                          <X size={13} className="cursor-pointer text-rose-500" onClick={() => setNewMember({ ...newMember, family_members: newMember.family_members.filter((_, idx) => idx !== i) })} />
                        </span>
                      ))}
                    </div>
                  </>
                )}

                <div data-tutorial="adherents-form-cotisation">
                  <div className={`${A_SECTION} text-[#1a5f7a]`}>Cotisation</div>
                  <div
                    className="mb-3 rounded-[20px] border-2 border-[#0f172a] p-5 text-center"
                    style={{ background: newMember.has_paid ? '#ecfdf5' : '#fff1f2' }}
                  >
                    <span className="mb-3 block font-display text-[32px] font-extrabold leading-none tracking-[-0.04em]">{newMember.fee_amount}€</span>
                    <button
                      data-tutorial="adherents-payment-info-btn" type="button" onClick={() => setShowPaymentInfoModal(true)}
                      className="mx-auto mb-4 flex items-center gap-2 rounded-[12px] border-2 border-[#0f172a] bg-white px-4 py-2 text-[9px] font-extrabold uppercase tracking-[0.1em] text-[#1a5f7a] transition-colors hover:bg-[#1a5f7a] hover:text-white"
                    >
                      <Info size={13} /> Modalités de paiement
                    </button>
                    <label className="flex cursor-pointer items-center justify-center gap-3">
                      <input type="checkbox" className="h-5 w-5 accent-emerald-500" checked={newMember.has_paid} onChange={(e) => setNewMember({ ...newMember, has_paid: e.target.checked })} />
                      <span className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-600">Cotisation réglée</span>
                    </label>
                  </div>

                  {((newMember.type === 'Particulier' && appSettings.active_caution_particulier === "true") ||
                    (newMember.type === 'Association' && appSettings.active_caution_association === "true")) && (
                    <div
                      className="mb-3 rounded-[20px] border-2 border-[#0f172a] p-5 text-center"
                      style={{ background: newMember.caution_received ? '#fff7ed' : '#fdfaf6' }}
                    >
                      <span className="mb-2 block font-display text-[22px] font-extrabold">
                        {newMember.type === 'Particulier' ? appSettings.montant_caution_particulier : appSettings.montant_caution_association}€
                      </span>
                      <label className="flex cursor-pointer items-center justify-center gap-3">
                        <input type="checkbox" className="h-5 w-5 accent-orange-500" checked={newMember.caution_received} onChange={(e) => setNewMember({ ...newMember, caution_received: e.target.checked })} />
                        <span className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-600">Caution reçue</span>
                      </label>
                    </div>
                  )}

                  {!editingId && newMember.email && (
                    <label className={`${A_CHECK} mb-3`}>
                      <input type="checkbox" className="h-[18px] w-[18px] accent-[#1a5f7a]" checked={sendWelcomeEmail} onChange={e => setSendWelcomeEmail(e.target.checked)} />
                      <Mail size={13} /> Envoyer un email de bienvenue
                    </label>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-2.5">
              <button
                data-tutorial="adherents-form-submit" type="submit"
                className="flex-1 basis-[200px] rounded-[18px] border-2 border-[#0f172a] bg-[#1a5f7a] py-5 text-[11px] font-extrabold uppercase tracking-[0.16em] text-white shadow-[5px_5px_0_#0f172a] transition-[transform,box-shadow] duration-200 hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-[2px_2px_0_#0f172a]"
              >
                {editingId ? "Mettre à jour" : "Enregistrer"}
              </button>
              <button
                type="button" onClick={() => setShowForm(false)}
                className="basis-[150px] rounded-[18px] border-2 border-[#0f172a] bg-[#fdfaf6] py-5 text-[11px] font-extrabold uppercase tracking-[0.16em] text-slate-500 transition-colors hover:bg-slate-100"
              >
                Annuler
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ---------- MODALITÉS DE PAIEMENT ---------- */}
      <FormModal
        open={showPaymentInfoModal}
        onClose={() => setShowPaymentInfoModal(false)}
        title="Moyens de" titleAccent="paiement"
        subtitle="Acceptés par l'association"
        accent="#10b981"
        maxWidth={560}
        footer={
          <button onClick={() => setShowPaymentInfoModal(false)} className={`${BTN_INK} w-full`}>Fermer</button>
        }
      >
        <div className="flex flex-col gap-3">
          {appSettings.pay_cb === "true" && (
            <div className={A_INFO_ROW}><CheckCircle2 size={18} className="shrink-0 text-emerald-500" /> Carte bancaire (CB)</div>
          )}
          {appSettings.pay_especes === "true" && (
            <div className={A_INFO_ROW}><CheckCircle2 size={18} className="shrink-0 text-emerald-500" /> Espèces</div>
          )}
          {appSettings.pay_cheque === "true" && (
            <div className={A_INFO_ROW}><CheckCircle2 size={18} className="shrink-0 text-emerald-500" /> Chèque</div>
          )}
          {appSettings.pay_virement === "true" && (
            <div className="rounded-[22px] border-2 border-[#1a5f7a] bg-[#f0f7f9] p-5">
              <div className="mb-4 flex items-center gap-2.5 text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#1a5f7a]">
                <Send size={15} /> Virement bancaire
              </div>
              <p className="mb-1.5 text-[9px] font-extrabold uppercase tracking-[0.14em] text-slate-400">Titulaire</p>
              <p className="mb-3 rounded-[14px] border-2 border-slate-200 bg-white p-3 text-sm font-bold text-slate-700">{appSettings.nom_compte || 'Non renseigné'}</p>
              <p className="mb-1.5 text-[9px] font-extrabold uppercase tracking-[0.14em] text-slate-400">IBAN</p>
              <p className="mb-3 break-all rounded-[14px] border-2 border-slate-200 bg-white p-3 font-mono text-sm font-bold text-slate-700">{appSettings.iban || 'Non renseigné'}</p>
              <p className="mb-1.5 text-[9px] font-extrabold uppercase tracking-[0.14em] text-slate-400">Code BIC</p>
              <p className="rounded-[14px] border-2 border-slate-200 bg-white p-3 font-mono text-sm font-bold text-slate-700">{appSettings.bic || 'Non renseigné'}</p>
            </div>
          )}
          {appSettings.pay_cb !== "true" && appSettings.pay_especes !== "true" && appSettings.pay_cheque !== "true" && appSettings.pay_virement !== "true" && (
            <p className="py-4 text-center text-sm italic text-slate-400">Aucun moyen de paiement configuré dans les paramètres.</p>
          )}
        </div>
      </FormModal>

      {/* ---------- RENOUVELLEMENT ---------- */}
      {renewalModal.show && renewalModal.member && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-3 sm:p-[22px]">
          <div className="anim-fade-in absolute inset-0 backdrop-blur-[6px]" style={{ background: 'rgba(15,23,42,.7)' }} onClick={() => setRenewalModal({ show: false, member: null })} />
          <div data-tutorial="adherents-renewal-modal" className="anim-modal-in relative max-h-[90vh] w-full max-w-[480px] overflow-y-auto rounded-[34px] border-2 border-[#0f172a] bg-white p-7 shadow-[12px_12px_0_#10b981] md:p-9">
            <button
              onClick={() => setRenewalModal({ show: false, member: null })} aria-label="Fermer"
              className="absolute right-4 top-4 flex h-[42px] w-[42px] items-center justify-center rounded-[14px] border-2 border-[#0f172a] bg-[#fdfaf6] text-[15px] font-extrabold text-[#1a5f7a] transition-colors hover:bg-[#e38154] hover:text-white"
            >
              ✕
            </button>

            <div className="mb-6 flex items-center gap-3.5 pr-12">
              <div className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-[18px] border-2 border-[#0f172a] bg-[#ecfdf5] text-[#047857] shadow-[3px_3px_0_#10b981]">
                <RefreshCw size={22} />
              </div>
              <div className="min-w-0">
                <h2 className="font-display text-[20px] font-extrabold uppercase leading-[1.05] tracking-[-0.04em]">Renouveler l'adhésion</h2>
                <p className="mt-1.5 truncate text-[10px] font-extrabold uppercase tracking-[0.16em] text-slate-400">
                  {renewalModal.member.type === 'Association' ? renewalModal.member.last_name : `${renewalModal.member.first_name} ${renewalModal.member.last_name}`} — N°{renewalModal.member.member_number}
                </p>
              </div>
            </div>

            <div className={`${A_SECTION} text-[#1a5f7a]`}>Date de renouvellement</div>
            <input
              type="date" className={`${A_INPUT} mb-4`}
              value={renewalForm.membership_date}
              onChange={e => {
                const newDate = e.target.value
                const newFee = calculateFee(renewalModal.member.type, newDate, appSettings)
                setRenewalForm(f => ({ ...f, membership_date: newDate, fee_amount: newFee }))
              }}
            />

            <div className={`${A_SECTION} text-[#1a5f7a]`}>Montant de la cotisation</div>
            <div className="mb-4 flex items-center gap-3">
              <input
                type="number" min="0" step="0.5" className={`${A_INPUT} min-w-0 flex-1`}
                value={renewalForm.fee_amount}
                onChange={e => setRenewalForm(f => ({ ...f, fee_amount: parseFloat(e.target.value) || 0 }))}
              />
              <span className="font-display text-[22px] font-extrabold text-slate-400">€</span>
            </div>

            <div
              className="mb-3.5 rounded-[20px] border-2 p-4"
              style={renewalForm.has_paid ? { background: '#ecfdf5', borderColor: '#10b981' } : { background: '#fff1f2', borderColor: '#f43f5e' }}
            >
              <label className="flex cursor-pointer items-center gap-2.5">
                <input type="checkbox" className="h-[18px] w-[18px] accent-emerald-500" checked={renewalForm.has_paid} onChange={e => setRenewalForm(f => ({ ...f, has_paid: e.target.checked }))} />
                <span className="text-[10.5px] font-extrabold uppercase tracking-[0.14em] text-slate-600">Cotisation réglée</span>
              </label>
              {renewalForm.has_paid && (
                <p className="ml-7 mt-2.5 text-[10.5px] font-bold text-[#047857]">Une entrée de {renewalForm.fee_amount}€ sera enregistrée dans le suivi financier.</p>
              )}
            </div>

            {renewalModal.member.email ? (
              <label className={`${A_CHECK} mb-5`}>
                <input type="checkbox" className="h-[18px] w-[18px] accent-[#1a5f7a]" checked={renewalForm.sendEmail} onChange={e => setRenewalForm(f => ({ ...f, sendEmail: e.target.checked }))} />
                <Mail size={13} /> Envoyer un email de confirmation
              </label>
            ) : (
              <p className="mb-5 flex items-center gap-2 text-[10px] italic text-slate-400"><Mail size={12} /> Aucun email renseigné — confirmation impossible.</p>
            )}

            <div className="flex flex-col gap-2.5">
              <button
                onClick={handleSaveRenewal} disabled={savingRenewal}
                className={`flex items-center justify-center gap-2.5 rounded-[18px] border-2 border-[#0f172a] py-4 text-[11px] font-extrabold uppercase tracking-[0.16em] transition-[transform,box-shadow] duration-200 ${
                  savingRenewal ? 'cursor-not-allowed bg-slate-100 text-slate-300' : 'bg-[#10b981] text-white shadow-[5px_5px_0_#0f172a] hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-[2px_2px_0_#0f172a]'
                }`}
              >
                {savingRenewal ? <><Loader2 size={16} className="animate-spin" /> Enregistrement...</> : <><CheckCircle2 size={16} /> Confirmer le renouvellement</>}
              </button>
              <button onClick={() => setRenewalModal({ show: false, member: null })} className="rounded-[18px] border-2 border-[#0f172a] bg-[#fdfaf6] py-4 text-[11px] font-extrabold uppercase tracking-[0.16em] text-slate-500 transition-colors hover:bg-slate-100">
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------- RELANCE ---------- */}
      {renewalAction && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-3 sm:p-[22px]">
          <div className="anim-fade-in absolute inset-0 backdrop-blur-[6px]" style={{ background: 'rgba(15,23,42,.7)' }} onClick={() => setRenewalAction(null)} />
          <div data-tutorial="adherents-relance-modal" className="anim-modal-in relative max-h-[88vh] w-full max-w-[600px] overflow-y-auto rounded-[36px] border-2 border-[#0f172a] bg-white p-7 shadow-[12px_12px_0_#f59e0b] md:p-9">
            <button
              onClick={() => setRenewalAction(null)} aria-label="Fermer"
              className="absolute right-4 top-4 flex h-[42px] w-[42px] items-center justify-center rounded-[14px] border-2 border-[#0f172a] bg-[#fdfaf6] text-[15px] font-extrabold text-[#1a5f7a] transition-colors hover:bg-[#e38154] hover:text-white"
            >
              ✕
            </button>

            <h2 className="mb-5 pr-12 font-display text-[24px] font-extrabold uppercase tracking-[-0.04em]">Relancer l'adhérent</h2>

            <div className="mb-6 flex flex-col gap-2.5">
              <div className={A_INFO_ROW}><Mail size={18} className="shrink-0 text-[#1a5f7a]" /> <span className="truncate">{renewalAction.email || 'N/A'}</span></div>
              <div className={A_INFO_ROW}><Phone size={18} className="shrink-0 text-[#1a5f7a]" /> {renewalAction.phone || 'N/A'}</div>
              <div className={`${A_INFO_ROW} items-start`}><MapPin size={18} className="mt-0.5 shrink-0 text-[#1a5f7a]" /> <span className="leading-[1.5]">{renewalAction.address || 'N/A'}</span></div>
            </div>

            <button onClick={() => openComposeMember(renewalAction)} className={`${BTN_TEAL} mb-3 w-full py-5`}>
              <Mail size={16} /> Envoyer une relance par mail
            </button>
            <button
              onClick={async () => {
                const today = new Date().toISOString().split('T')[0];
                await supabase.from('members').update({ last_reminder_date: today }).eq('id', renewalAction.id);
                fetchMembers(); setRenewalAction(null);
                addToast('Relance marquée comme effectuée.', 'success')
              }}
              className="mb-2 w-full rounded-[16px] border-2 border-[#f59e0b] bg-[#fffbeb] py-3.5 text-[9.5px] font-extrabold uppercase tracking-[0.14em] text-[#b45309] transition-colors hover:bg-[#f59e0b] hover:text-white"
            >
              Marquer comme relancé aujourd'hui
            </button>
            <button onClick={() => setRenewalAction(null)} className="w-full py-3.5 text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-400 transition-colors hover:text-[#0f172a]">
              Annuler
            </button>
          </div>
        </div>
      )}

      {/* ---------- FICHE DÉTAILLÉE ---------- */}
      {viewMember && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-3 sm:p-[22px]">
          <div className="anim-fade-in absolute inset-0 backdrop-blur-[6px]" style={{ background: 'rgba(15,23,42,.7)' }} onClick={() => setViewMember(null)} />
          <div className="anim-modal-in relative max-h-[88vh] w-full max-w-[620px] overflow-y-auto rounded-[36px] border-2 border-[#0f172a] bg-white p-7 shadow-[12px_12px_0_#e38154] md:p-9">
            <button
              onClick={() => setViewMember(null)} aria-label="Fermer"
              className="absolute right-4 top-4 flex h-[42px] w-[42px] items-center justify-center rounded-[14px] border-2 border-[#0f172a] bg-[#fdfaf6] text-[15px] font-extrabold text-[#1a5f7a] transition-colors hover:bg-[#e38154] hover:text-white"
            >
              ✕
            </button>

            <div className="mb-6 flex items-center gap-4 pr-12">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[18px] border-2 border-[#0f172a] bg-[#f0f7f9] font-display text-[17px] font-extrabold text-[#1a5f7a]">
                {viewMember.member_number}
              </div>
              <div className="min-w-0">
                <h3 className="font-display text-[22px] font-extrabold uppercase leading-none tracking-[-0.04em] md:text-[26px]">
                  {viewMember.last_name} {viewMember.first_name !== 'Association' ? viewMember.first_name : ''}
                </h3>
                <p className="mt-1.5 text-[10px] font-extrabold uppercase tracking-[0.16em] text-slate-400">
                  {viewMember.type} · {getExpirationStatus(viewMember).message}
                </p>
              </div>
            </div>

            <div className="mb-6 flex flex-col gap-2.5">
              <div className={A_INFO_ROW}><Mail size={19} className="shrink-0 text-[#1a5f7a]" /> <span className="truncate">{viewMember.email || 'N/A'}</span></div>
              <div className={A_INFO_ROW}><Phone size={19} className="shrink-0 text-[#1a5f7a]" /> {viewMember.phone || 'N/A'}</div>
              <div className={`${A_INFO_ROW} items-start`}><MapPin size={19} className="mt-0.5 shrink-0 text-[#1a5f7a]" /> <span className="leading-[1.55]">{viewMember.address || 'N/A'}</span></div>
              <div className="flex items-center gap-3.5 rounded-[20px] border-2 border-slate-200 bg-[#f0f7f9] px-5 py-4 text-[13.5px] font-bold text-[#1a5f7a]">
                <CreditCard size={19} className="shrink-0" /> Cotisation {viewMember.fee_amount}€
              </div>
            </div>

            {viewMember.type === 'Particulier' && (
              <>
                <div className="mb-3.5 flex items-center gap-2.5 border-t-2 border-slate-100 pt-5 text-[10px] font-extrabold uppercase tracking-[0.2em] text-slate-400">
                  <Users size={15} /> Membres du foyer
                </div>
                {viewMember.family_members?.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {viewMember.family_members.map((name, i) => (
                      <span key={i} className="rounded-[12px] border-2 border-[#10b981] bg-[#ecfdf5] px-3.5 py-2 text-[11px] font-extrabold uppercase tracking-[0.06em] text-[#047857]">
                        {name}
                      </span>
                    ))}
                  </div>
                ) : <p className="text-[11px] italic text-slate-300">Seul membre</p>}
              </>
            )}
          </div>
        </div>
      )}

      {/* ---------- SUPPRESSION ---------- */}
      <ConfirmModal
        open={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={async () => { await supabase.from('members').delete().eq('id', deleteConfirm.id); setDeleteConfirm(null); fetchMembers(); addToast('Adhérent supprimé avec succès.', 'success') }}
        title="Supprimer ?"
        message={deleteConfirm ? `« ${deleteConfirm.last_name} ${deleteConfirm.first_name} » sera définitivement retiré du fichier des adhérents.` : ''}
        confirmLabel="Oui, supprimer"
        cancelLabel="Conserver"
        tone="danger"
        icon={<Trash2 size={26} />}
      />

      {/* ---------- RÉDACTION DE LA RELANCE ---------- */}
      <FormModal
        open={composeModal.show}
        onClose={() => setComposeModal({ show: false, member: null })}
        title="Relance" titleAccent="cotisation"
        subtitle={composeModal.member?.email}
        accent="#f59e0b"
        maxWidth={680}
        footer={
          <div className="flex flex-wrap gap-2.5">
            <button onClick={() => setComposeModal({ show: false, member: null })} className="flex-1 basis-[140px] rounded-[18px] border-2 border-[#0f172a] bg-[#fdfaf6] py-4 text-[11px] font-extrabold uppercase tracking-[0.16em] text-slate-500 transition-colors hover:bg-slate-100">
              Annuler
            </button>
            <button
              onClick={handleSendRenewal} disabled={sendingMail}
              className={`flex flex-1 basis-[180px] items-center justify-center gap-2 rounded-[18px] border-2 border-[#0f172a] py-4 text-[11px] font-extrabold uppercase tracking-[0.16em] transition-[transform,box-shadow] duration-200 ${
                sendingMail ? 'cursor-not-allowed bg-slate-100 text-slate-300' : 'bg-[#1a5f7a] text-white shadow-[5px_5px_0_#0f172a] hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-[2px_2px_0_#0f172a]'
              }`}
            >
              {sendingMail ? <><Loader2 size={14} className="animate-spin" /> Envoi...</> : <><Send size={14} /> Envoyer</>}
            </button>
          </div>
        }
      >
        <div className={`${A_SECTION} text-[#1a5f7a]`}>Objet</div>
        <input className={`${A_INPUT} mb-4`} value={composeData.subject} onChange={e => setComposeData(prev => ({ ...prev, subject: e.target.value }))} />
        <div className={`${A_SECTION} text-[#1a5f7a]`}>Message</div>
        <textarea
          rows={10}
          className="w-full resize-y rounded-[18px] border-2 border-[#0f172a] bg-[#fdfaf6] p-4 text-[13px] font-medium text-[#0f172a] outline-none focus:bg-white"
          value={composeData.body} onChange={e => setComposeData(prev => ({ ...prev, body: e.target.value }))}
        />
      </FormModal>

      {sendingMail && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-6 backdrop-blur-[6px]" style={{ background: 'rgba(15,23,42,.7)' }}>
          <div className="anim-modal-in flex flex-col items-center gap-4 rounded-[34px] border-2 border-[#0f172a] bg-white px-10 py-9 shadow-[12px_12px_0_#1a5f7a]">
            <Loader2 className="animate-spin text-[#1a5f7a]" size={38} />
            <h3 className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-slate-500">Envoi en cours...</h3>
          </div>
        </div>
      )}

      {/* ── TUTORIEL ─────────────────────────────────────────────────────── */}
      <TutorialButton onClick={() => setShowTuto(true)} />
      <TutorialOverlay
        steps={adherentsSteps}
        open={showTuto}
        onClose={() => { setShowTuto(false); setShowForm(false); setRenewalAction(null); setRenewalModal({ show: false, member: null }) }}
      />
    </div>
  )
}