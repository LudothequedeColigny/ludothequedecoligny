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
import { SkeletonRow } from '../../components/Skeleton'


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
    <div className="p-4 md:p-10 bg-[#fdfaf6] min-h-screen font-sans text-slate-900">
      
      {/* HEADER */}
      <div className="max-w-7xl mx-auto mb-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 data-tutorial="adherents-header" className="text-xl md:text-4xl font-black text-slate-900 flex items-center gap-3">
          <div className="p-2.5 bg-[#1a5f7a] rounded-xl shadow-lg text-white"><Users size={24} /></div>
          <span>Gestion des <span className="text-[#1a5f7a]">Adhérents</span></span>
        </h1>
        <button data-tutorial="adherents-add-btn" onClick={() => showForm ? setShowForm(false) : handleOpenForm()} className={`w-full md:w-auto px-6 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all shadow-xl ${showForm ? 'bg-slate-800 text-white' : 'bg-[#e38154] text-white'}`}>
          {showForm ? "Fermer" : "Nouvel Adhérent"}
        </button>
      </div>

      <main className="max-w-7xl mx-auto space-y-6">
        {!showForm && (
          <div data-tutorial="adherents-search" className="relative group">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
            <input type="text" placeholder="Rechercher..." className="w-full bg-white border border-slate-100 p-4 pl-14 rounded-2xl font-bold text-slate-700 outline-none shadow-sm focus:ring-2 focus:ring-[#1a5f7a]/10 transition-all" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
        )}

        {showForm && (
          <form data-tutorial="adherents-form" onSubmit={handleSubmit} className="bg-white p-6 md:p-12 rounded-[2.5rem] shadow-xl border border-slate-50 mb-8 animate-in zoom-in-95">
             <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                {/* IDENTITÉ */}
                <div data-tutorial="adherents-form-type" className="space-y-4">
                  <h3 className="text-[10px] font-black text-[#1a5f7a] uppercase tracking-widest flex items-center gap-2"><User size={14}/> Type & Identité</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {['Particulier', 'Association'].map((t) => (
                      <button key={t} type="button" onClick={() => setNewMember({...newMember, type: t, first_name: t === 'Association' ? 'Association' : ''})} className={`py-3 rounded-xl font-bold text-[10px] border transition-all ${newMember.type === t ? 'bg-[#1a5f7a] text-white border-[#1a5f7a] shadow-md' : 'bg-slate-50 text-slate-400 border-slate-100'}`}>{t}</button>
                    ))}
                  </div>
                  <input required placeholder="N° Adhérent" className="w-full p-4 rounded-xl bg-slate-50 font-bold text-sm border-2 border-transparent focus:border-[#1a5f7a] outline-none" value={newMember.member_number} onChange={e => setNewMember({...newMember, member_number: e.target.value})} />
                  <div className="grid grid-cols-1 gap-2">
                    {newMember.type !== 'Association' && (
                       <input required placeholder="Prénom" className="w-full p-4 rounded-xl bg-slate-50 font-bold text-sm border-2 border-transparent focus:border-[#1a5f7a] outline-none" value={newMember.first_name} onChange={e => setNewMember({...newMember, first_name: e.target.value})} />
                    )}
                    <input required placeholder={newMember.type === 'Association' ? "Nom de l'Asso" : "Nom"} className="w-full p-4 rounded-xl bg-slate-50 font-bold text-sm border-2 border-transparent focus:border-[#1a5f7a] outline-none" value={newMember.last_name} onChange={e => setNewMember({...newMember, last_name: e.target.value})} />
                  </div>
                  <input type="date" required className="w-full p-4 rounded-xl bg-slate-50 font-bold text-sm outline-none" value={newMember.membership_date} onChange={e => setNewMember({...newMember, membership_date: e.target.value})} />
                </div>

                {/* CONTACT */}
                <div data-tutorial="adherents-form-contact" className="space-y-4">
                  <h3 className="text-[10px] font-black text-[#e38154] uppercase tracking-widest flex items-center gap-2"><Mail size={14}/> Coordonnées</h3>
                  <input type="email" placeholder="Email" className="w-full p-4 rounded-xl bg-slate-50 font-bold text-sm" value={newMember.email} onChange={e => setNewMember({...newMember, email: e.target.value})} />
                  <input type="tel" placeholder="Téléphone" className="w-full p-4 rounded-xl bg-slate-50 font-bold text-sm" value={newMember.phone} onChange={e => setNewMember({...newMember, phone: e.target.value})} />
                  <textarea placeholder="Adresse complète" rows="2" className="w-full p-4 rounded-xl bg-slate-50 font-bold text-sm outline-none resize-none" value={newMember.address} onChange={e => setNewMember({...newMember, address: e.target.value})} />
                  
                  {newMember.type === 'Particulier' && (
                    <div className="pt-2">
                      <div className="flex gap-2 mb-2">
                        <input placeholder="Membre foyer..." className="flex-1 p-4 rounded-xl bg-slate-50 font-bold text-sm outline-none" value={tempFamilyMember} onChange={e => setTempFamilyMember(e.target.value)} />
                        <button type="button" onClick={() => { if(tempFamilyMember.trim()){ setNewMember({...newMember, family_members: [...newMember.family_members, tempFamilyMember.trim()]}); setTempFamilyMember(''); }}} className="bg-[#1a5f7a] text-white p-4 rounded-xl shadow-md"><Plus size={20}/></button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {newMember.family_members.map((name, i) => (
                          <span key={i} className="flex items-center gap-2 bg-[#fdfaf6] px-3 py-1.5 rounded-lg text-[10px] font-black uppercase border border-slate-100">
                            {name} <X size={12} className="text-rose-500 cursor-pointer" onClick={() => setNewMember({...newMember, family_members: newMember.family_members.filter((_, idx) => idx !== i)})} />
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* PAIEMENT */}
                <div data-tutorial="adherents-form-cotisation" className="space-y-4">
                  <h3 className="text-[10px] font-black text-[#1a5f7a] uppercase tracking-widest flex items-center gap-2"><CreditCard size={14}/> Cotisation</h3>
                  <div className={`p-6 rounded-[2rem] border-2 text-center transition-all ${newMember.has_paid ? 'bg-emerald-50 border-emerald-100' : 'bg-rose-50 border-rose-100'}`}>
                    <span className="text-3xl font-black text-slate-900 block mb-3">{newMember.fee_amount}€</span>
                    
                    {/* BOUTON MODALITÉS DE PAIEMENT */}
                    <button data-tutorial="adherents-payment-info-btn" type="button" onClick={() => setShowPaymentInfoModal(true)} className="mb-4 flex items-center gap-2 mx-auto px-4 py-2 bg-white rounded-xl border border-slate-100 text-[9px] font-black uppercase text-[#1a5f7a] hover:bg-slate-50 transition-all">
                      <Info size={14} /> Modalités de paiement
                    </button>

                    <label className="flex items-center justify-center gap-3 cursor-pointer">
                      <input type="checkbox" className="w-5 h-5 accent-emerald-500" checked={newMember.has_paid} onChange={(e) => setNewMember({...newMember, has_paid: e.target.checked})} />
                      <span className="text-[10px] font-black uppercase text-slate-600 tracking-widest">Réglée</span>
                    </label>
                  </div>

                  {((newMember.type === 'Particulier' && appSettings.active_caution_particulier === "true") || 
                    (newMember.type === 'Association' && appSettings.active_caution_association === "true")) && (
                    <div className={`p-6 rounded-[2rem] border-2 text-center transition-all ${newMember.caution_received ? 'bg-orange-50 border-orange-100' : 'bg-slate-50 border-slate-100'}`}>
                      <span className="text-xl font-black text-slate-700 block mb-2">
                        {newMember.type === 'Particulier' ? appSettings.montant_caution_particulier : appSettings.montant_caution_association}€
                      </span>
                      <label className="flex items-center justify-center gap-3 cursor-pointer">
                        <input type="checkbox" className="w-5 h-5 accent-orange-500" checked={newMember.caution_received} onChange={(e) => setNewMember({...newMember, caution_received: e.target.checked})} />
                        <span className="text-[10px] font-black uppercase text-slate-600 tracking-widest">Caution reçue</span>
                      </label>
                    </div>
                  )}

                  <button data-tutorial="adherents-form-submit" type="submit" className="w-full py-5 bg-[#1a5f7a] text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg transition-all active:scale-95">
                    {editingId ? "Mettre à jour" : "Enregistrer"}
                  </button>
                  {!editingId && newMember.email && (
                    <label className="flex items-center gap-3 cursor-pointer px-2">
                      <input type="checkbox" className="w-5 h-5 accent-[#1a5f7a]" checked={sendWelcomeEmail} onChange={e => setSendWelcomeEmail(e.target.checked)} />
                      <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest flex items-center gap-2"><Mail size={12}/> Envoyer un email de bienvenue</span>
                    </label>
                  )}
                </div>
             </div>
          </form>
        )}

        {/* LISTE - TABLEAU (DESKTOP) & CARDS (MOBILE) */}
        {!showForm && (
          <div className="space-y-4">
            {/* VUE TABLEAU (VISIBLE UNIQUEMENT SUR DESKTOP) */}
            <div className="hidden md:block bg-white rounded-[2.5rem] shadow-sm border border-slate-50 overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-[10px] uppercase text-slate-400 font-black">
                  <tr>
                    <th className="p-8">N°</th>
                    <th className="p-8">Adhérent</th>
                    <th className="p-8">Status</th>
                    <th className="p-8">Caution</th>
                    <th className="p-8 text-right pr-12">Gestion</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {loading ? Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />) : filteredMembers.map((m, idx) => {
                    const status = getExpirationStatus(m);
                    const isCautionActive = (m.type === 'Particulier' && appSettings.active_caution_particulier === "true") || (m.type === 'Association' && appSettings.active_caution_association === "true");
                    return (
                      <tr key={m.id} {...(idx === 0 ? {"data-tutorial": "adherents-list-row1"} : idx === 1 ? {"data-tutorial": "adherents-list-row2"} : {})} className={`transition-colors ${status.expired ? 'bg-rose-50/40 hover:bg-rose-50/60' : 'hover:bg-slate-50/50'}`}>
                        <td className="p-8 font-black text-[#1a5f7a]">{m.member_number}</td>
                        <td className="p-8 font-black uppercase text-sm">
                          {m.type === 'Association' && <Building2 size={14} className="inline mr-2 text-slate-400"/>}
                          {m.last_name} {m.type !== 'Association' ? m.first_name : ''}
                        </td>
                        <td className="p-8">
                          <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase border flex items-center gap-2 w-fit ${status.expired ? 'bg-rose-100 text-rose-600 border-rose-200' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>
                            {status.message} ({m.fee_amount}€)
                          </span>
                        </td>
                        <td className="p-8 text-[10px] font-black uppercase">
                          {!isCautionActive ? <span className="text-slate-300 italic">N/A</span> : m.caution_received ? <span className="text-orange-600 flex items-center gap-2"><ShieldCheck size={16}/> OK</span> : <span className="text-rose-400 flex items-center gap-2"><ShieldOff size={16}/> Manquante</span>}
                        </td>
                        <td className="p-8 text-right pr-12 space-x-2">
                          {status.expired && (
                            <button
                              data-tutorial="adherents-action-renew"
                              onClick={() => openRenewalModal(m)}
                              title="Renouveler l'adhésion"
                              className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-emerald-100 transition-all"
                            >
                              <RefreshCw size={14} /> Renouveler
                            </button>
                          )}
                          {status.expired && <button data-tutorial="adherents-action-relance" onClick={() => setRenewalAction(m)} title="Envoyer une relance" className="p-3 bg-amber-50 text-amber-600 rounded-xl hover:bg-amber-100 transition-all"><Send size={18} /></button>}
                          <button data-tutorial="adherents-action-view" onClick={() => setViewMember(m)} className="p-3 text-slate-400 hover:text-[#1a5f7a]"><Eye size={18} /></button>
                          <button data-tutorial="adherents-action-edit" onClick={() => { setNewMember({...m, family_members: m.family_members || []}); setEditingId(m.id); setShowForm(true); }} className="p-3 text-slate-400 hover:text-amber-500"><Edit2 size={18} /></button>
                          <button data-tutorial="adherents-action-delete" onClick={() => setDeleteConfirm(m)} className="p-3 text-slate-400 hover:text-rose-500"><Trash2 size={18} /></button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* VUE CARDS (VISIBLE UNIQUEMENT SUR MOBILE) */}
            <div className="md:hidden grid grid-cols-1 gap-4">
              {filteredMembers.map((m) => {
                const status = getExpirationStatus(m);
                return (
                  <div key={m.id} className={`bg-white p-6 rounded-[2rem] shadow-sm border border-slate-50 space-y-4 ${status.expired ? 'bg-rose-50/30' : ''}`}>
                    <div className="flex justify-between items-start">
                      <div className="flex gap-3 items-center">
                        <div className="w-10 h-10 bg-[#1a5f7a]/10 rounded-xl flex items-center justify-center text-[#1a5f7a] font-black text-xs">{m.member_number}</div>
                        <div>
                          <p className="font-black uppercase text-sm leading-tight">{m.last_name} {m.type !== 'Association' ? m.first_name : ''}</p>
                          <p className="text-[10px] text-slate-400 font-bold flex items-center gap-1 uppercase tracking-wider">
                            {m.type === 'Association' ? <><Building2 size={10}/> Association</> : <><User size={10}/> Particulier</>}
                          </p>
                        </div>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase border ${status.expired ? 'bg-rose-100 text-rose-600 border-rose-200' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>
                        {status.message}
                      </span>
                    </div>
                    
                    <div className="flex items-center flex-wrap gap-2 justify-between pt-2 border-t border-slate-50">
                       <div className="flex gap-2">
                        <button onClick={() => setViewMember(m)} className="min-h-11 min-w-11 flex items-center justify-center bg-slate-50 text-slate-400 rounded-xl"><Eye size={18}/></button>
                        <button onClick={() => { setNewMember({...m, family_members: m.family_members || []}); setEditingId(m.id); setShowForm(true); }} className="min-h-11 min-w-11 flex items-center justify-center bg-slate-50 text-slate-400 rounded-xl"><Edit2 size={18}/></button>
                        <button onClick={() => setDeleteConfirm(m)} className="min-h-11 min-w-11 flex items-center justify-center bg-rose-50 text-rose-400 rounded-xl"><Trash2 size={18}/></button>
                       </div>
                       {status.expired && (
                         <div className="flex gap-2 flex-wrap">
                           <button onClick={() => openRenewalModal(m)} className="min-h-11 px-4 py-3 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl font-black text-[9px] uppercase tracking-widest flex items-center gap-2"><RefreshCw size={14}/> Renouveler</button>
                           <button onClick={() => setRenewalAction(m)} className="min-h-11 min-w-11 flex items-center justify-center bg-amber-50 text-amber-600 rounded-xl"><Send size={16}/></button>
                         </div>
                       )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </main>

      {/* MODALE MODALITÉS DE PAIEMENT */}
      {showPaymentInfoModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-[2.5rem] p-10 max-w-lg w-full shadow-2xl animate-in zoom-in-95">
             <h3 className="font-black text-slate-900 uppercase text-xl mb-6 flex items-center gap-3">
               <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg"><CreditCard size={20}/></div>
               Moyens de paiement acceptés
             </h3>
             <div className="space-y-4 mb-8">
                {appSettings.pay_cb === "true" && (
                  <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl font-bold text-sm text-slate-700 border border-slate-100">
                    <CheckCircle2 size={18} className="text-emerald-500" /> Carte Bancaire (CB)
                  </div>
                )}
                {appSettings.pay_especes === "true" && (
                  <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl font-bold text-sm text-slate-700 border border-slate-100">
                    <CheckCircle2 size={18} className="text-emerald-500" /> Espèces
                  </div>
                )}
                {appSettings.pay_cheque === "true" && (
                  <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl font-bold text-sm text-slate-700 border border-slate-100">
                    <CheckCircle2 size={18} className="text-emerald-500" /> Chèque
                  </div>
                )}
                {appSettings.pay_virement === "true" && (
                  <div className="p-6 bg-blue-50/50 rounded-3xl border border-blue-100 space-y-4">
                    <div className="flex items-center gap-3 font-black text-[10px] uppercase text-blue-600 tracking-widest">
                      <Send size={16} /> Virement Bancaire
                    </div>
                    <div className="space-y-2">
                       <p className="text-[9px] font-black text-slate-400 uppercase">Titulaire</p>
                       <p className="text-sm font-bold text-slate-700 bg-white p-3 rounded-xl border border-blue-50">{appSettings.nom_compte || 'Non renseigné'}</p>
                       <p className="text-[9px] font-black text-slate-400 uppercase mt-2">IBAN</p>
                       <p className="text-sm font-mono font-bold text-slate-700 bg-white p-3 rounded-xl border border-blue-50 break-all">{appSettings.iban || 'Non renseigné'}</p>
                       <p className="text-[9px] font-black text-slate-400 uppercase mt-2">Code BIC</p>
                       <p className="text-sm font-mono font-bold text-slate-700 bg-white p-3 rounded-xl border border-blue-50">{appSettings.bic || 'Non renseigné'}</p>
                    </div>
                  </div>
                )}
                {appSettings.pay_cb !== "true" && appSettings.pay_especes !== "true" && appSettings.pay_cheque !== "true" && appSettings.pay_virement !== "true" && (
                  <p className="text-center italic text-slate-400 text-sm py-4">Aucun moyen de paiement configuré dans les paramètres.</p>
                )}
             </div>
             <button onClick={() => setShowPaymentInfoModal(false)} className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg active:scale-95 transition-all">Fermer</button>
          </div>
        </div>
      )}

      {/* MODALE RENOUVELLEMENT ADHÉSION */}
      {renewalModal.show && renewalModal.member && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-6 bg-[#1a5f7a]/80 backdrop-blur-md">
          <div data-tutorial="adherents-renewal-modal" className="bg-white rounded-[3rem] p-10 max-w-md w-full shadow-2xl border-b-8 border-emerald-500 animate-in zoom-in-95">
            <div className="flex items-center gap-4 mb-8">
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl"><RefreshCw size={24}/></div>
              <div>
                <h2 className="text-xl font-black text-slate-900 uppercase leading-tight">Renouveler l'adhésion</h2>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">
                  {renewalModal.member.type === 'Association' ? renewalModal.member.last_name : `${renewalModal.member.first_name} ${renewalModal.member.last_name}`} — N°{renewalModal.member.member_number}
                </p>
              </div>
            </div>

            <div className="space-y-5">
              {/* Date d'adhésion */}
              <div className="space-y-2">
                <label className="text-[9px] font-black text-[#1a5f7a] uppercase tracking-widest flex items-center gap-2"><Calendar size={12}/> Date de renouvellement</label>
                <input
                  type="date"
                  className="w-full p-4 rounded-2xl bg-slate-50 font-bold text-sm outline-none border-2 border-transparent focus:border-[#1a5f7a]"
                  value={renewalForm.membership_date}
                  onChange={e => {
                    const newDate = e.target.value
                    const newFee = calculateFee(renewalModal.member.type, newDate, appSettings)
                    setRenewalForm(f => ({ ...f, membership_date: newDate, fee_amount: newFee }))
                  }}
                />
              </div>

              {/* Montant cotisation */}
              <div className="space-y-2">
                <label className="text-[9px] font-black text-[#1a5f7a] uppercase tracking-widest flex items-center gap-2"><CreditCard size={12}/> Montant de la cotisation</label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    className="flex-1 p-4 rounded-2xl bg-slate-50 font-bold text-sm outline-none border-2 border-transparent focus:border-[#1a5f7a]"
                    value={renewalForm.fee_amount}
                    onChange={e => setRenewalForm(f => ({ ...f, fee_amount: parseFloat(e.target.value) || 0 }))}
                  />
                  <span className="text-xl font-black text-slate-400">€</span>
                </div>
              </div>

              {/* Cotisation réglée */}
              <div className={`p-5 rounded-2xl border-2 transition-all ${renewalForm.has_paid ? 'bg-emerald-50 border-emerald-100' : 'bg-rose-50 border-rose-100'}`}>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" className="w-5 h-5 accent-emerald-500" checked={renewalForm.has_paid} onChange={e => setRenewalForm(f => ({ ...f, has_paid: e.target.checked }))} />
                  <span className="text-[10px] font-black uppercase text-slate-600 tracking-widest">Cotisation réglée</span>
                </label>
                {renewalForm.has_paid && (
                  <p className="text-[9px] text-emerald-600 font-bold mt-2 ml-8">Une entrée de {renewalForm.fee_amount}€ sera enregistrée dans le suivi financier.</p>
                )}
              </div>

              {/* Email de confirmation */}
              {renewalModal.member.email ? (
                <label className="flex items-center gap-3 cursor-pointer px-1">
                  <input type="checkbox" className="w-5 h-5 accent-[#1a5f7a]" checked={renewalForm.sendEmail} onChange={e => setRenewalForm(f => ({ ...f, sendEmail: e.target.checked }))} />
                  <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest flex items-center gap-2"><Mail size={12}/> Envoyer un email de confirmation</span>
                </label>
              ) : (
                <p className="text-[9px] text-slate-400 italic px-1 flex items-center gap-2"><Mail size={12}/> Aucun email renseigné — confirmation impossible.</p>
              )}
            </div>

            <div className="flex flex-col gap-3 mt-8">
              <button
                onClick={handleSaveRenewal}
                disabled={savingRenewal}
                className={`w-full py-5 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg flex items-center justify-center gap-3 transition-all active:scale-95 ${savingRenewal ? 'bg-slate-100 text-slate-300 cursor-not-allowed' : 'bg-emerald-600 text-white hover:bg-emerald-700'}`}
              >
                {savingRenewal ? <><Loader2 size={16} className="animate-spin"/> Enregistrement...</> : <><CheckCircle2 size={16}/> Confirmer le renouvellement</>}
              </button>
              <button onClick={() => setRenewalModal({ show: false, member: null })} className="w-full py-3 text-slate-400 font-bold text-[10px] uppercase">Annuler</button>
            </div>
          </div>
        </div>
      )}

      {/* MODALE DE RELANCE */}
      {renewalAction && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-6 bg-[#1a5f7a]/80 backdrop-blur-md">
          <div data-tutorial="adherents-relance-modal" className="bg-white rounded-[3rem] p-10 max-w-lg w-full shadow-2xl border-b-8 border-amber-500 animate-in zoom-in-95">
            <h2 className="text-2xl font-black text-slate-900 uppercase mb-6">Relancer l'adhérent</h2>
            <div className="space-y-4 mb-8">
                <div className="bg-slate-50 p-4 rounded-xl flex gap-3 text-sm font-bold text-slate-600 truncate"><Mail size={18} className="text-[#1a5f7a] shrink-0"/> {renewalAction.email || 'N/A'}</div>
                <div className="bg-slate-50 p-4 rounded-xl flex gap-3 text-sm font-bold text-slate-600"><Phone size={18} className="text-[#1a5f7a] shrink-0"/> {renewalAction.phone || 'N/A'}</div>
                <div className="bg-slate-50 p-4 rounded-xl flex gap-3 text-sm font-bold text-slate-600"><MapPin size={18} className="text-[#1a5f7a] shrink-0"/> {renewalAction.address || 'N/A'}</div>
            </div>
            <button onClick={() => openComposeMember(renewalAction)} className="w-full p-5 bg-[#1a5f7a] text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl flex items-center justify-center gap-3 transition-all active:scale-95"><Mail size={18} /> Envoyer une relance par mail</button>
            <button onClick={async () => {
                const today = new Date().toISOString().split('T')[0];
                await supabase.from('members').update({ last_reminder_date: today }).eq('id', renewalAction.id);
                fetchMembers(); setRenewalAction(null);
                addToast('Relance marquée comme effectuée.', 'success')
            }} className="w-full mt-4 py-3 bg-amber-50 text-amber-600 rounded-xl font-black uppercase text-[9px] tracking-widest">Marquer comme relancé aujourd'hui</button>
            <button onClick={() => setRenewalAction(null)} className="w-full mt-2 py-3 text-slate-400 font-bold text-[10px] uppercase">Annuler</button>
          </div>
        </div>
      )}

      {/* MODALE VUE DÉTAILLÉE (AVEC FOYER) */}
      {viewMember && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm">
          <div className="relative bg-white rounded-[2.5rem] p-8 md:p-12 max-w-lg w-full shadow-2xl animate-in fade-in zoom-in-95 overflow-y-auto max-h-[90vh]">
            <h3 className="font-black text-slate-900 uppercase text-2xl mb-8 flex items-center gap-4">
              <div className="p-3 bg-[#1a5f7a]/10 rounded-2xl text-[#1a5f7a]"><User size={24}/></div>
              <span>{viewMember.first_name !== 'Association' ? viewMember.first_name : ''} {viewMember.last_name}</span>
            </h3>
            
            <div className="space-y-4 mb-8 text-sm font-bold text-slate-600">
              <div className="bg-slate-50 p-5 rounded-2xl flex items-center gap-4 border border-slate-100"><Mail size={20} className="text-[#1a5f7a] shrink-0"/> <span className="truncate">{viewMember.email || 'N/A'}</span></div>
              <div className="bg-slate-50 p-5 rounded-2xl flex items-center gap-4 border border-slate-100"><Phone size={20} className="text-[#1a5f7a] shrink-0"/> <span>{viewMember.phone || 'N/A'}</span></div>
              <div className="bg-slate-50 p-5 rounded-2xl flex items-start gap-4 border border-slate-100"><MapPin size={20} className="text-[#1a5f7a] shrink-0 mt-0.5"/> <span className="leading-relaxed">{viewMember.address || 'N/A'}</span></div>

              {viewMember.type === 'Particulier' && (
                <div className="mt-8 pt-6 border-t border-slate-100">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2"><Users size={14}/> Membres du foyer</h4>
                  {viewMember.family_members?.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {viewMember.family_members.map((name, i) => (
                        <div key={i} className="px-4 py-2 bg-emerald-50 text-emerald-700 rounded-xl text-[11px] font-black uppercase border border-emerald-100 shadow-sm">{name}</div>
                      ))}
                    </div>
                  ) : <p className="text-[11px] text-slate-300 italic">Seul membre</p>}
                </div>
              )}
            </div>
            <button onClick={() => setViewMember(null)} className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg">Fermer</button>
          </div>
        </div>
      )}

      {/* MODALE SUPPRESSION */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-6 bg-[#1a5f7a]/80 backdrop-blur-md">
          <div className="bg-white rounded-[3rem] p-10 max-w-sm w-full text-center shadow-2xl border-b-8 border-rose-500 animate-in slide-in-from-bottom-4">
             <div className="mx-auto w-16 h-16 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mb-6"><Trash2 size={28} /></div>
             <h3 className="text-xl font-black uppercase text-slate-900 mb-2">Supprimer ?</h3>
             <p className="text-xs text-slate-500 mb-8 italic">"{deleteConfirm.last_name} {deleteConfirm.first_name}"</p>
             <div className="flex flex-col gap-3">
               <button onClick={async () => { await supabase.from('members').delete().eq('id', deleteConfirm.id); setDeleteConfirm(null); fetchMembers(); addToast('Adhérent supprimé avec succès.', 'success') }} className="w-full py-5 bg-rose-500 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg">Confirmer</button>
               <button onClick={() => setDeleteConfirm(null)} className="w-full py-5 bg-slate-100 text-slate-400 rounded-2xl font-black uppercase text-[10px]">Annuler</button>
             </div>
          </div>
        </div>
      )}

      {composeModal.show && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm">
          <div className="bg-white rounded-[2.5rem] w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col">
            <div className="sticky top-0 bg-white rounded-t-[2.5rem] p-8 pb-4 border-b border-slate-100 flex items-center justify-between z-10">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-amber-50 text-amber-500 rounded-xl"><Mail size={20} /></div>
                <div>
                  <h3 className="text-base font-black uppercase text-slate-900">Relance cotisation</h3>
                  <p className="text-[10px] text-slate-400">{composeModal.member?.email}</p>
                </div>
              </div>
              <button onClick={() => setComposeModal({ show: false, member: null })} className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-all"><X size={20} /></button>
            </div>
            <div className="p-8 space-y-6 flex-1">
              <div className="space-y-2">
                <label className="text-[9px] font-black text-[#1a5f7a] uppercase tracking-widest">Objet</label>
                <input className="w-full p-4 rounded-2xl bg-slate-50 font-bold text-sm outline-none border-2 border-transparent focus:border-[#1a5f7a]"
                  value={composeData.subject} onChange={e => setComposeData(prev => ({ ...prev, subject: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-black text-[#1a5f7a] uppercase tracking-widest">Message</label>
                <textarea rows={10} className="w-full p-4 rounded-2xl bg-slate-50 font-medium text-sm outline-none border-2 border-transparent focus:border-[#1a5f7a] resize-y"
                  value={composeData.body} onChange={e => setComposeData(prev => ({ ...prev, body: e.target.value }))} />
              </div>
            </div>
            <div className="sticky bottom-0 bg-white rounded-b-[2.5rem] p-8 pt-4 border-t border-slate-100 flex gap-3">
              <button onClick={() => setComposeModal({ show: false, member: null })}
                className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-2xl font-black uppercase text-[10px] tracking-widest">Annuler</button>
              <button onClick={handleSendRenewal} disabled={sendingMail}
                className={'flex-1 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 ' +
                  (sendingMail ? 'bg-slate-100 text-slate-300 cursor-not-allowed' : 'bg-[#1a5f7a] text-white hover:bg-[#134a5e]')}>
                {sendingMail ? <><Loader2 size={14} className="animate-spin" /> Envoi...</> : <><Send size={14} /> Envoyer</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {sendingMail && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-[3rem] p-10 max-w-sm w-full text-center shadow-2xl">
            <Loader2 className="animate-spin mx-auto text-[#1a5f7a] mb-6" size={40} />
            <h3 className="text-lg font-black uppercase text-slate-900">Envoi en cours...</h3>
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