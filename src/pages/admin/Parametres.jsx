import { useState, useEffect } from 'react'
import { supabase } from '../../services/supabaseClient'
import { useRef, useState as useStateRef } from 'react'
import { 
  Settings, UserPlus, Save, Loader2, UserCheck, Ban, Euro, 
  ShieldCheck, X, ChevronRight, Users, CreditCard, Info, Mail, Lock, ShieldAlert, CheckCircle2, User, Hash, Trash2, Phone, Wallet, Clock, MapPin, Image, Plus, Edit2, Target, Eye
} from 'lucide-react'

export default function Parametres() {
  const [loading, setLoading] = useState(false)
  const [saveLoading, setSaveLoading] = useState(false)
  const [volunteers, setVolunteers] = useState([])
  
  const [newEmail, setNewEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  
  const [showFinanceModal, setShowFinanceModal] = useState(false)
  const [showVolunteerModal, setShowVolunteerModal] = useState(false)
  const [showQuotaModal, setShowQuotaModal] = useState(false)
  const [showContactModal, setShowContactModal] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false) // MODALE PAIEMENTS
  const [showHorairesModal, setShowHorairesModal] = useState(false) // MODALE HORAIRES
  const [showAdresseModal, setShowAdresseModal] = useState(false) // MODALE ADRESSE
  const [showAffichesModal, setShowAffichesModal] = useState(false) // MODALE AFFICHES
  const [affichesTemplates, setAffichesTemplates] = useState([])
  const [editingTemplate, setEditingTemplate] = useState(null) // null = nouveau, sinon l'objet
  const [templateForm, setTemplateForm] = useState({
    label: '', url: '',
    x1: null, y1: null, w1: null, h1: null,
    font_family: 'PersonaAura', font_size: 38.7,
    color: '#000000', layout: 'famille',
    x2: null, y2: null, w2: null, h2: null,
    font_family2: 'PersonaAura', font_size2: 28,
    color2: '#000000'
  })
  const [activeZone, setActiveZone] = useState(1) // 1 = date, 2 = lieu
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState(null)
  const [dragCurrent, setDragCurrent] = useState(null)
  const [uploadingFont, setUploadingFont] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [previewImg, setPreviewImg] = useState(null)
  const [savingTemplate, setSavingTemplate] = useState(false)
  const [deletingTemplate, setDeletingTemplate] = useState(null)
  const previewCanvasRef = useRef(null)
  const fileInputRef = useRef(null)

  const [confirmModal, setConfirmModal] = useState({ show: false, title: '', message: '' })
  const [deleteConfirm, setDeleteConfirm] = useState({ show: false, id: null })

  const [prices, setPrices] = useState({
    prix_particulier: 24,
    degressivite_mensuelle: 2,
    prix_minimum: 10,
    prix_association: 50,
    degressivite_association: 5,
    prix_minimum_asso: 20,
    active_caution_particulier: "false",
    montant_caution_particulier: 50,
    active_caution_association: "false",
    montant_caution_association: 100,
    mode_adhesion_particulier: "degressif",
    mode_adhesion_association: "glissant",
    quota_particulier: 3,
    quota_association: 5,
    contact_nom: 'Victor Guyon',
    contact_tel: '06 71 41 56 96',
    contact_email: 'victor.guyon@hotmail.fr',
    // NOUVELLES VALEURS PAIEMENT
    pay_cb: "false",
    pay_especes: "false",
    pay_cheque: "false",
    pay_virement: "false",
    iban: '',
    bic: '',
    nom_compte: '',
    // HORAIRES
    horaire_1_jour: 'Samedi',
    horaire_1_rang: '1',
    horaire_1_debut: '10:00',
    horaire_1_fin: '12:00',
    horaire_2_actif: 'true',
    horaire_2_jour: 'Samedi',
    horaire_2_rang: '3',
    horaire_2_debut: '14:00',
    horaire_2_fin: '16:00',
    // ADRESSE
    adresse_rue: '419 Grande Rue',
    adresse_ville: 'Coligny',
    adresse_code_postal: '01270'
  })

  useEffect(() => {
    fetchVolunteers()
    fetchSettings()
  }, [])

  async function fetchVolunteers() {
    const { data } = await supabase.from('profiles').select('*')
    setVolunteers(data || [])
  }

  async function fetchSettings() {
    const { data } = await supabase.from('settings').select('*')
    if (data) {
      const obj = {}
      data.forEach(s => obj[s.id] = s.value)
      setPrices(prev => ({ ...prev, ...obj }))
    }
  }

  const fetchAffichesTemplates = async () => {
    const { data } = await supabase.from('affiche_templates').select('*').order('created_at')
    setAffichesTemplates(data || [])
  }

  const openAffichesModal = () => {
    fetchAffichesTemplates()
    setEditingTemplate(null)
    setTemplateForm({ label: '', url: '', cx: 0, cy: 0, font_family: 'PersonaAura', font_size: 38.7, color: '#000000', layout: 'famille' })
    setPreviewImg(null)
    setShowAffichesModal(true)
  }

  const startEditTemplate = (t) => {
    setEditingTemplate(t)
    setTemplateForm({
      label: t.label, url: t.url,
      x1: t.x1 || null, y1: t.y1 || null, w1: t.w1 || null, h1: t.h1 || null,
      font_family: t.font_family, font_size: t.font_size,
      color: t.color, layout: t.layout,
      x2: t.x2 || null, y2: t.y2 || null, w2: t.w2 || null, h2: t.h2 || null,
      font_family2: t.font_family2 || 'PersonaAura',
      font_size2: t.font_size2 || 28,
      color2: t.color2 || '#000000'
    })
    setPreviewImg(t.url)
  }

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingImage(true)
    try {
      const ext = file.name.split('.').pop()
      const fileName = 'fond-' + Date.now() + '.' + ext
      const { error } = await supabase.storage.from('event-font').upload(fileName, file, { contentType: file.type })
      if (error) throw error
      const { data } = supabase.storage.from('event-font').getPublicUrl(fileName)
      setTemplateForm(prev => ({ ...prev, url: data.publicUrl }))
      setPreviewImg(data.publicUrl)
    } catch (e) {
      alert('Erreur upload : ' + e.message)
    } finally {
      setUploadingImage(false)
    }
  }

  const getCanvasCoords = (e, canvas) => {
    const rect = canvas.getBoundingClientRect()
    return {
      x: Math.round((e.clientX - rect.left) * (794 / rect.width)),
      y: Math.round((e.clientY - rect.top) * (1123 / rect.height)),
    }
  }

  const handleCanvasMouseDown = (e) => {
    const coords = getCanvasCoords(e, e.currentTarget)
    setIsDragging(true)
    setDragStart(coords)
    setDragCurrent(coords)
  }

  const handleCanvasMouseMove = (e) => {
    if (!isDragging) return
    const coords = getCanvasCoords(e, e.currentTarget)
    setDragCurrent(coords)
    // Redessiner en temps réel
    const tf = templateForm
    const zone1 = activeZone === 1 && dragStart
      ? { x1: Math.min(dragStart.x, coords.x), y1: Math.min(dragStart.y, coords.y), w1: Math.abs(coords.x - dragStart.x), h1: Math.abs(coords.y - dragStart.y) }
      : { x1: tf.x1, y1: tf.y1, w1: tf.w1, h1: tf.h1 }
    const zone2 = activeZone === 2 && dragStart
      ? { x2: Math.min(dragStart.x, coords.x), y2: Math.min(dragStart.y, coords.y), w2: Math.abs(coords.x - dragStart.x), h2: Math.abs(coords.y - dragStart.y) }
      : { x2: tf.x2, y2: tf.y2, w2: tf.w2, h2: tf.h2 }
    drawPreviewCanvas(e.currentTarget, { ...tf, ...zone1, ...zone2 }, previewImg)
  }

  const handleCanvasMouseUp = (e) => {
    if (!isDragging || !dragStart) return
    setIsDragging(false)
    const coords = getCanvasCoords(e, e.currentTarget)
    const x = Math.min(dragStart.x, coords.x)
    const y = Math.min(dragStart.y, coords.y)
    const w = Math.abs(coords.x - dragStart.x)
    const h = Math.abs(coords.y - dragStart.y)
    if (w < 10 || h < 10) { setDragStart(null); setDragCurrent(null); return } // trop petit
    if (activeZone === 1) {
      setTemplateForm(prev => ({ ...prev, x1: x, y1: y, w1: w, h1: h }))
    } else {
      setTemplateForm(prev => ({ ...prev, x2: x, y2: y, w2: w, h2: h }))
    }
    setDragStart(null); setDragCurrent(null)
  }

  const drawZoneRect = (ctx, x, y, w, h, color, label, textColor, font, fontSize, sampleText) => {
    // Rectangle semi-transparent
    ctx.fillStyle = color + '22'
    ctx.fillRect(x, y, w, h)
    // Bordure en tirets
    ctx.strokeStyle = color
    ctx.lineWidth = 2
    ctx.setLineDash([8, 4])
    ctx.strokeRect(x, y, w, h)
    ctx.setLineDash([])
    // Badge numéro
    ctx.fillStyle = color
    ctx.beginPath(); ctx.arc(x + 14, y + 14, 14, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = 'white'
    ctx.font = 'bold 14px sans-serif'
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.fillText(label, x + 14, y + 14)
    // Texte exemple dans la zone
    ctx.fillStyle = textColor || '#000000'
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    const fs = Math.min(parseFloat(fontSize) || 38, h * 0.35)
    ctx.font = `${fs}px ${font || 'sans-serif'}`
    ctx.fillText(sampleText, x + w / 2, y + h / 2)
  }

  const drawPreviewCanvas = (canvas, tf, imgUrl) => {
    if (!canvas || !imgUrl) return
    const ctx = canvas.getContext('2d')
    const img = new window.Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      ctx.clearRect(0, 0, 794, 1123)
      ctx.drawImage(img, 0, 0, 794, 1123)
      if (tf.x1 != null && tf.w1 > 0)
        drawZoneRect(ctx, tf.x1, tf.y1, tf.w1, tf.h1, '#e38154', '1', tf.color, tf.font_family, tf.font_size, 'Samedi 14 juin 2025')
      if (tf.x2 != null && tf.w2 > 0)
        drawZoneRect(ctx, tf.x2, tf.y2, tf.w2, tf.h2, '#1a5f7a', '2', tf.color2, tf.font_family2, tf.font_size2, 'Salle des fêtes de Coligny')
    }
    img.src = imgUrl
  }

  const saveTemplate = async () => {
    if (!templateForm.label || !templateForm.url) { alert('Label et image requis.'); return }
    setSavingTemplate(true)
    try {
      const payload = {
        label: templateForm.label,
        url: templateForm.url,
        x1: templateForm.x1 != null ? parseFloat(templateForm.x1) : null,
        y1: templateForm.y1 != null ? parseFloat(templateForm.y1) : null,
        w1: templateForm.w1 != null ? parseFloat(templateForm.w1) : null,
        h1: templateForm.h1 != null ? parseFloat(templateForm.h1) : null,
        font_family: templateForm.font_family,
        font_size: parseFloat(templateForm.font_size) || 38.7,
        color: templateForm.color,
        layout: templateForm.layout,
        x2: templateForm.x2 != null ? parseFloat(templateForm.x2) : null,
        y2: templateForm.y2 != null ? parseFloat(templateForm.y2) : null,
        w2: templateForm.w2 != null ? parseFloat(templateForm.w2) : null,
        h2: templateForm.h2 != null ? parseFloat(templateForm.h2) : null,
        font_family2: templateForm.font_family2 || 'PersonaAura',
        font_size2: parseFloat(templateForm.font_size2) || 28,
        color2: templateForm.color2 || '#000000',
      }
      if (editingTemplate) {
        await supabase.from('affiche_templates').update(payload).eq('id', editingTemplate.id)
      } else {
        await supabase.from('affiche_templates').insert(payload)
      }
      fetchAffichesTemplates()
      setEditingTemplate(null)
      setTemplateForm({ label: '', url: '', x1: null, y1: null, w1: null, h1: null, font_family: 'PersonaAura', font_size: 38.7, color: '#000000', layout: 'famille', x2: null, y2: null, w2: null, h2: null, font_family2: 'PersonaAura', font_size2: 28, color2: '#000000' })
      setPreviewImg(null)
    } catch (e) {
      alert('Erreur sauvegarde : ' + e.message)
    } finally {
      setSavingTemplate(false)
    }
  }

  const deleteTemplate = async (id) => {
    setDeletingTemplate(id)
    await supabase.from('affiche_templates').delete().eq('id', id)
    fetchAffichesTemplates()
    setDeletingTemplate(null)
  }

  const handleUpdatePrice = async (e) => {
    if (e) e.preventDefault()
    setSaveLoading(true)
    try {
      // Récupère les clés déjà existantes en base
      const { data: existingRows, error: fetchError } = await supabase.from('settings').select('id')
      if (fetchError) throw fetchError

      const existingIds = new Set((existingRows || []).map(r => r.id))
      const allEntries = Object.entries(prices).map(([id, value]) => ({ id, value: String(value ?? '') }))

      const toUpdate = allEntries.filter(e => existingIds.has(e.id))
      const toInsert = allEntries.filter(e => !existingIds.has(e.id))

      // UPDATE des clés existantes
      if (toUpdate.length > 0) {
        const { error: updateError } = await supabase.from('settings').upsert(toUpdate, { onConflict: 'id' })
        if (updateError) throw updateError
      }

      // INSERT des nouvelles clés
      if (toInsert.length > 0) {
        const { error: insertError } = await supabase.from('settings').insert(toInsert)
        if (insertError) throw insertError
      }

      setConfirmModal({
        show: true,
        title: "Configuration enregistrée",
        message: "Les paramètres ont été mis à jour avec succès."
      })
      setShowFinanceModal(false)
      setShowQuotaModal(false)
      setShowContactModal(false)
      setShowPaymentModal(false)
      setShowHorairesModal(false)
      setShowAdresseModal(false)
    } catch (err) {
      console.error('Erreur sauvegarde settings:', err)
      alert('Erreur lors de la sauvegarde : ' + err.message)
    }
    setSaveLoading(false)
  }

  const handleAddVolunteer = async (e) => {
    e.preventDefault()
    setLoading(true)
    const { error } = await supabase.rpc('create_volunteer_manually', {
      user_email: newEmail,
      user_password: newPassword,
      first_name: firstName,
      last_name: lastName
    })
    if (!error) {
      setConfirmModal({ show: true, title: "Bénévole ajouté", message: `Le compte de ${firstName} ${lastName} est opérationnel.` })
      setNewEmail(''); setNewPassword(''); setFirstName(''); setLastName('');
      fetchVolunteers()
    } else { alert("Erreur : " + error.message) }
    setLoading(false)
  }

  const handleRemoveVolunteer = async () => {
    if (deleteConfirm.id) {
      const { error } = await supabase.from('profiles').delete().eq('id', deleteConfirm.id)
      if (!error) { fetchVolunteers(); setDeleteConfirm({ show: false, id: null }) }
    }
  }

  const HelpBox = ({ text, color = "blue" }) => (
    <div className={`flex gap-3 p-4 rounded-[1.5rem] text-[10px] font-bold leading-tight ${color === "blue" ? 'bg-blue-50 text-blue-700' : 'bg-orange-50 text-orange-700'}`}>
      <span className="shrink-0"><Info size={16} /></span>
      <p className="uppercase tracking-tight">{text}</p>
    </div>
  )

  return (
    <div className="p-4 md:p-10 max-w-5xl mx-auto font-sans pb-20 md:pb-10">
      {/* HEADER */}
      <div className="max-w-7xl mx-auto mb-8 md:mb-10 text-center md:text-left">
        <h1 className="text-2xl md:text-4xl font-black text-slate-900 flex flex-col md:flex-row items-center gap-3">
          <div className="p-2.5 bg-[#1a5f7a] rounded-xl shadow-lg text-white mb-2 md:mb-0"><Settings size={24} /></div>
          <span>Paramètres <span className="text-[#1a5f7a]">Système</span></span>
        </h1>
      </div>

      {/* GRILLE PRINCIPALE */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        <button onClick={() => setShowFinanceModal(true)} className="group relative p-6 md:p-8 bg-white border border-slate-50 rounded-[2.5rem] md:rounded-[3rem] shadow-xl shadow-slate-200/40 hover:translate-y-[-4px] transition-all text-left overflow-hidden">
          <div className="w-12 h-12 bg-orange-50 rounded-2xl flex items-center justify-center text-[#e38154] mb-6 group-hover:bg-[#e38154] group-hover:text-white transition-all"><CreditCard size={24} /></div>
          <h3 className="font-black text-lg text-slate-900 mb-1 uppercase tracking-tighter">Finances</h3>
          <p className="text-slate-400 font-bold text-[11px] mb-6 uppercase tracking-tight">Tarifs & Cautions</p>
          <div className="flex items-center gap-2 text-[#e38154] font-black text-[10px] uppercase tracking-widest">Configurer <ChevronRight size={14} /></div>
        </button>

        {/* NOUVEAU BOUTON MOYENS DE PAIEMENT */}
        <button onClick={() => setShowPaymentModal(true)} className="group relative p-6 md:p-8 bg-white border border-slate-50 rounded-[2.5rem] md:rounded-[3rem] shadow-xl shadow-slate-200/40 hover:translate-y-[-4px] transition-all text-left overflow-hidden">
          <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 mb-6 group-hover:bg-emerald-600 group-hover:text-white transition-all"><Wallet size={24} /></div>
          <h3 className="font-black text-lg text-slate-900 mb-1 uppercase tracking-tighter">Paiements</h3>
          <p className="text-slate-400 font-bold text-[11px] mb-6 uppercase tracking-tight">Modes acceptés & RIB</p>
          <div className="flex items-center gap-2 text-emerald-600 font-black text-[10px] uppercase tracking-widest">Paramétrer <ChevronRight size={14} /></div>
        </button>

        <button onClick={() => setShowQuotaModal(true)} className="group relative p-6 md:p-8 bg-white border border-slate-50 rounded-[2.5rem] md:rounded-[3rem] shadow-xl shadow-slate-200/40 hover:translate-y-[-4px] transition-all text-left overflow-hidden">
          <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-500 mb-6 group-hover:bg-emerald-500 group-hover:text-white transition-all"><Hash size={24} /></div>
          <h3 className="font-black text-lg text-slate-900 mb-1 uppercase tracking-tighter">Limites</h3>
          <p className="text-slate-400 font-bold text-[11px] mb-6 uppercase tracking-tight">Quotas d'emprunt</p>
          <div className="flex items-center gap-2 text-emerald-500 font-black text-[10px] uppercase tracking-widest">Définir <ChevronRight size={14} /></div>
        </button>

        <button onClick={() => setShowContactModal(true)} className="group relative p-6 md:p-8 bg-white border border-slate-50 rounded-[2.5rem] md:rounded-[3rem] shadow-xl shadow-slate-200/40 hover:translate-y-[-4px] transition-all text-left overflow-hidden">
          <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-500 mb-6 group-hover:bg-blue-500 group-hover:text-white transition-all"><User size={24} /></div>
          <h3 className="font-black text-lg text-slate-900 mb-1 uppercase tracking-tighter">Contact</h3>
          <p className="text-slate-400 font-bold text-[11px] mb-6 uppercase tracking-tight">Référent Public</p>
          <div className="flex items-center gap-2 text-blue-500 font-black text-[10px] uppercase tracking-widest">Modifier <ChevronRight size={14} /></div>
        </button>

        <button onClick={() => setShowVolunteerModal(true)} className="group relative p-6 md:p-8 bg-white border border-slate-50 rounded-[2.5rem] md:rounded-[3rem] shadow-xl shadow-slate-200/40 hover:translate-y-[-4px] transition-all text-left overflow-hidden">
          <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-[#1a5f7a] mb-6 group-hover:bg-[#1a5f7a] group-hover:text-white transition-all"><Users size={24} /></div>
          <h3 className="font-black text-lg text-slate-900 mb-1 uppercase tracking-tighter">Équipe</h3>
          <p className="text-slate-400 font-bold text-[11px] mb-6 uppercase tracking-tight">Gestion des accès</p>
          <div className="flex items-center gap-2 text-[#1a5f7a] font-black text-[10px] uppercase tracking-widest">Gérer <ChevronRight size={14} /></div>
        </button>

        <button onClick={() => setShowHorairesModal(true)} className="group relative p-6 md:p-8 bg-white border border-slate-50 rounded-[2.5rem] md:rounded-[3rem] shadow-xl shadow-slate-200/40 hover:translate-y-[-4px] transition-all text-left overflow-hidden">
          <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-500 mb-6 group-hover:bg-amber-500 group-hover:text-white transition-all"><Clock size={24} /></div>
          <h3 className="font-black text-lg text-slate-900 mb-1 uppercase tracking-tighter">Horaires</h3>
          <p className="text-slate-400 font-bold text-[11px] mb-6 uppercase tracking-tight">Jours & Heures d'ouverture</p>
          <div className="flex items-center gap-2 text-amber-500 font-black text-[10px] uppercase tracking-widest">Modifier <ChevronRight size={14} /></div>
        </button>

        <button onClick={() => setShowAdresseModal(true)} className="group relative p-6 md:p-8 bg-white border border-slate-50 rounded-[2.5rem] md:rounded-[3rem] shadow-xl shadow-slate-200/40 hover:translate-y-[-4px] transition-all text-left overflow-hidden">
          <div className="w-12 h-12 bg-rose-50 rounded-2xl flex items-center justify-center text-rose-500 mb-6 group-hover:bg-rose-500 group-hover:text-white transition-all"><MapPin size={24} /></div>
          <h3 className="font-black text-lg text-slate-900 mb-1 uppercase tracking-tighter">Adresse</h3>
          <p className="text-slate-400 font-bold text-[11px] mb-6 uppercase tracking-tight">Localisation de la ludothèque</p>
          <div className="flex items-center gap-2 text-rose-500 font-black text-[10px] uppercase tracking-widest">Modifier <ChevronRight size={14} /></div>
        </button>

        <button onClick={openAffichesModal} className="group relative p-6 md:p-8 bg-white border border-slate-50 rounded-[2.5rem] md:rounded-[3rem] shadow-xl shadow-slate-200/40 hover:translate-y-[-4px] transition-all text-left overflow-hidden">
          <div className="w-12 h-12 bg-purple-50 rounded-2xl flex items-center justify-center text-purple-500 mb-6 group-hover:bg-purple-500 group-hover:text-white transition-all"><Image size={24} /></div>
          <h3 className="font-black text-lg text-slate-900 mb-1 uppercase tracking-tighter">Affiches</h3>
          <p className="text-slate-400 font-bold text-[11px] mb-6 uppercase tracking-tight">Modèles du générateur</p>
          <div className="flex items-center gap-2 text-purple-500 font-black text-[10px] uppercase tracking-widest">Gérer <ChevronRight size={14} /></div>
        </button>
      </div>

      {/* MODALE MOYENS DE PAIEMENT */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-20 md:pt-4 md:items-center bg-[#1a5f7a]/60 backdrop-blur-md">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] md:rounded-[3.5rem] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 max-h-[85vh]">
            <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-emerald-50/30 sticky top-0 bg-white z-10">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-emerald-600 text-white rounded-2xl"><Wallet size={20}/></div>
                <h3 className="font-black text-xl text-slate-900 uppercase tracking-tighter">Modes de paiement</h3>
              </div>
              <button onClick={() => setShowPaymentModal(false)} className="p-3 hover:bg-white rounded-2xl transition-all text-slate-400"><X size={24} /></button>
            </div>
            <form onSubmit={handleUpdatePrice} className="p-8 space-y-6 overflow-y-auto">
              <HelpBox text="Sélectionnez les moyens de paiement que vous acceptez à la Ludothèque." color="blue" />
              
              <div className="space-y-3">
                {[
                  { id: 'pay_cb', label: 'Carte Bancaire (CB)' },
                  { id: 'pay_especes', label: 'Espèces' },
                  { id: 'pay_cheque', label: 'Chèque' },
                  { id: 'pay_virement', label: 'Virement Bancaire' }
                ].map((mode) => (
                  <label key={mode.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl cursor-pointer hover:bg-slate-100 transition-all">
                    <span className="font-bold text-slate-700 text-sm">{mode.label}</span>
                    <input 
                      type="checkbox" 
                      className="w-6 h-6 accent-emerald-600 rounded-lg"
                      checked={prices[mode.id] === "true"}
                      onChange={e => setPrices({...prices, [mode.id]: e.target.checked ? "true" : "false"})}
                    />
                  </label>
                ))}
              </div>

              {prices.pay_virement === "true" && (
                <div className="pt-4 border-t border-slate-100 space-y-4 animate-in slide-in-from-top-4">
                  <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Informations de virement (RIB)</p>
                  <div>
                    <label className="text-[9px] font-black text-slate-400 uppercase ml-2 mb-1 block">Titulaire du compte</label>
                    <input type="text" className="w-full p-4 bg-slate-50 rounded-2xl font-bold outline-none" value={prices.nom_compte} onChange={e => setPrices({...prices, nom_compte: e.target.value})} />
                  </div>
                  <div>
                    <label className="text-[9px] font-black text-slate-400 uppercase ml-2 mb-1 block">IBAN</label>
                    <input type="text" className="w-full p-4 bg-slate-50 rounded-2xl font-bold outline-none" value={prices.iban} onChange={e => setPrices({...prices, iban: e.target.value})} />
                  </div>
                  <div>
                    <label className="text-[9px] font-black text-slate-400 uppercase ml-2 mb-1 block">Code BIC</label>
                    <input type="text" className="w-full p-4 bg-slate-50 rounded-2xl font-bold outline-none" value={prices.bic} onChange={e => setPrices({...prices, bic: e.target.value})} />
                  </div>
                </div>
              )}

              <button type="submit" disabled={saveLoading} className="w-full py-5 bg-emerald-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl active:scale-95 transition-all flex items-center justify-center gap-3">
                {saveLoading ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />} Enregistrer les modes
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODALE CONTACT */}
      {showContactModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-20 md:pt-4 md:items-center bg-[#1a5f7a]/60 backdrop-blur-md">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] md:rounded-[3.5rem] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 max-h-[85vh]">
            <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-blue-50/30 sticky top-0 bg-white z-10">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-500 text-white rounded-2xl"><User size={20}/></div>
                <h3 className="font-black text-xl text-slate-900 uppercase tracking-tighter">Contact Référent</h3>
              </div>
              <button onClick={() => setShowContactModal(false)} className="p-3 hover:bg-white rounded-2xl transition-all text-slate-400"><X size={24} /></button>
            </div>
            <form onSubmit={handleUpdatePrice} className="p-8 space-y-6 overflow-y-auto">
              <HelpBox text="Ces informations sont affichées sur la page d'accueil pour les visiteurs." color="blue" />
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase ml-2 mb-2 block">Nom complet</label>
                <input type="text" className="w-full p-4 bg-slate-50 rounded-2xl font-bold outline-none focus:ring-2 ring-blue-100" value={prices.contact_nom} onChange={e => setPrices({...prices, contact_nom: e.target.value})} />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase ml-2 mb-2 block">Téléphone</label>
                <input type="text" className="w-full p-4 bg-slate-50 rounded-2xl font-bold outline-none focus:ring-2 ring-blue-100" value={prices.contact_tel} onChange={e => setPrices({...prices, contact_tel: e.target.value})} />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase ml-2 mb-2 block">Email</label>
                <input type="email" className="w-full p-4 bg-slate-50 rounded-2xl font-bold outline-none focus:ring-2 ring-blue-100" value={prices.contact_email} onChange={e => setPrices({...prices, contact_email: e.target.value})} />
              </div>
              <button type="submit" disabled={saveLoading} className="w-full py-5 bg-blue-500 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl active:scale-95 transition-all flex items-center justify-center gap-3">
                {saveLoading ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />} Enregistrer le contact
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODALE QUOTAS */}
      {showQuotaModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-20 md:pt-4 md:items-center bg-[#1a5f7a]/60 backdrop-blur-md">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] md:rounded-[3.5rem] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 max-h-[85vh]">
            <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-emerald-50/30 sticky top-0 bg-white z-10">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-emerald-500 text-white rounded-2xl"><Hash size={20}/></div>
                <h3 className="font-black text-xl text-slate-900 uppercase tracking-tighter">Quotas d'emprunt</h3>
              </div>
              <button onClick={() => setShowQuotaModal(false)} className="p-3 hover:bg-white rounded-2xl transition-all text-slate-400"><X size={24} /></button>
            </div>
            <form onSubmit={handleUpdatePrice} className="p-8 space-y-8 overflow-y-auto">
              <HelpBox text="Déterminez le nombre maximum de jeux qu'un adhérent peut emprunter simultanément." color="blue" />
              <div className="space-y-6">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-2 mb-2 block">Particuliers (Jeux max)</label>
                  <input type="number" className="w-full p-5 bg-slate-50 rounded-2xl font-black text-lg outline-none focus:ring-2 ring-emerald-100" value={prices.quota_particulier} onChange={e => setPrices({...prices, quota_particulier: e.target.value})} />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-2 mb-2 block">Associations (Jeux max)</label>
                  <input type="number" className="w-full p-5 bg-slate-50 rounded-2xl font-black text-lg outline-none focus:ring-2 ring-emerald-100" value={prices.quota_association} onChange={e => setPrices({...prices, quota_association: e.target.value})} />
                </div>
              </div>
              <button type="submit" disabled={saveLoading} className="w-full py-5 bg-emerald-500 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl active:scale-95 transition-all flex items-center justify-center gap-3">
                {saveLoading ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />} Enregistrer les quotas
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODALE FINANCE */}
      {showFinanceModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-20 md:pt-4 md:items-center bg-[#1a5f7a]/60 backdrop-blur-md">
          <div className="bg-white w-full max-w-2xl rounded-[2.5rem] md:rounded-[3.5rem] shadow-2xl overflow-hidden max-h-[85vh] flex flex-col">
            <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/50 sticky top-0 bg-white z-10">
              <h3 className="font-black text-2xl text-slate-900 uppercase tracking-tighter">Finance & Règles</h3>
              <button onClick={() => setShowFinanceModal(false)} className="p-3 hover:bg-white rounded-2xl transition-all text-slate-400"><X size={24} /></button>
            </div>
            <form onSubmit={handleUpdatePrice} className="p-8 overflow-y-auto space-y-10">
              {/* PARTIE PARTICULIERS */}
              <div className="space-y-6">
                <div className="flex items-center gap-2 text-[#1a5f7a] font-black text-[11px] uppercase tracking-widest"><Euro size={18}/> Particuliers</div>
                <div className="grid grid-cols-2 gap-2 bg-slate-100 p-2 rounded-2xl">
                  <button type="button" onClick={() => setPrices({...prices, mode_adhesion_particulier: 'degressif'})} className={`py-3 rounded-xl text-[10px] font-black uppercase transition-all ${prices.mode_adhesion_particulier === 'degressif' ? 'bg-white shadow-md text-[#1a5f7a]' : 'text-slate-400'}`}>Dégressif</button>
                  <button type="button" onClick={() => setPrices({...prices, mode_adhesion_particulier: 'glissant'})} className={`py-3 rounded-xl text-[10px] font-black uppercase transition-all ${prices.mode_adhesion_particulier === 'glissant' ? 'bg-white shadow-md text-[#1a5f7a]' : 'text-slate-400'}`}>Année Glissante</button>
                </div>
                <HelpBox text={prices.mode_adhesion_particulier === 'degressif' ? "Le mode dégressif réduit le prix chaque mois automatiquement. L'adhésion s'arrête toujours au 31 décembre de l'année en cours." : "L'année glissante applique un tarif fixe. L'adhésion est valable 12 mois à partir de la date de paiement."} />
                <div className="grid grid-cols-3 gap-4">
                  <div><label className="text-[9px] font-black text-slate-400 uppercase ml-2 mb-1 block">Prix Base</label><input type="number" className="w-full p-4 bg-slate-50 rounded-2xl font-black outline-none border-none" value={prices.prix_particulier} onChange={e => setPrices({...prices, prix_particulier: e.target.value})} /></div>
                  {prices.mode_adhesion_particulier === 'degressif' && (
                    <>
                      <div><label className="text-[9px] font-black text-slate-400 uppercase ml-2 mb-1 block">Baisse/Mois</label><input type="number" className="w-full p-4 bg-slate-50 rounded-2xl font-black outline-none border-none" value={prices.degressivite_mensuelle} onChange={e => setPrices({...prices, degressivite_mensuelle: e.target.value})} /></div>
                      <div><label className="text-[9px] font-black text-slate-400 uppercase ml-2 mb-1 block">Prix Min</label><input type="number" className="w-full p-4 bg-slate-50 rounded-2xl font-black outline-none border-none" value={prices.prix_minimum} onChange={e => setPrices({...prices, prix_minimum: e.target.value})} /></div>
                    </>
                  )}
                </div>
                <div className={`p-6 rounded-[2.5rem] border-2 transition-all ${prices.active_caution_particulier === "true" ? 'bg-orange-50 border-orange-100' : 'bg-slate-50 border-transparent'}`}>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-[10px] font-black uppercase text-orange-800 tracking-widest flex items-center gap-2"><ShieldCheck size={16}/> Caution Particulier</span>
                    <input type="checkbox" className="w-6 h-6 accent-[#e38154] rounded-lg cursor-pointer" checked={prices.active_caution_particulier === "true"} onChange={e => setPrices({...prices, active_caution_particulier: e.target.checked ? "true" : "false"})} />
                  </div>
                  {prices.active_caution_particulier === "true" && (
                    <div className="space-y-4">
                      <input type="number" placeholder="Montant de la caution (€)" className="w-full p-4 rounded-2xl bg-white shadow-sm font-black outline-none" value={prices.montant_caution_particulier} onChange={e => setPrices({...prices, montant_caution_particulier: e.target.value})} />
                      <HelpBox color="orange" text="Si activé, une case 'Caution reçue' sera obligatoire lors de la création d'une fiche adhérent particulier." />
                    </div>
                  )}
                </div>
              </div>

              {/* PARTIE ASSOCIATIONS */}
              <div className="space-y-6 pt-10 border-t border-slate-100">
                <div className="flex items-center gap-2 text-[#e38154] font-black text-[11px] uppercase tracking-widest"><Users size={18}/> Associations</div>
                <div className="grid grid-cols-2 gap-2 bg-slate-100 p-2 rounded-2xl">
                  <button type="button" onClick={() => setPrices({...prices, mode_adhesion_association: 'degressif'})} className={`py-3 rounded-xl text-[10px] font-black uppercase transition-all ${prices.mode_adhesion_association === 'degressif' ? 'bg-white shadow-md text-[#e38154]' : 'text-slate-400'}`}>Dégressif</button>
                  <button type="button" onClick={() => setPrices({...prices, mode_adhesion_association: 'glissant'})} className={`py-3 rounded-xl text-[10px] font-black uppercase transition-all ${prices.mode_adhesion_association === 'glissant' ? 'bg-white shadow-md text-[#e38154]' : 'text-slate-400'}`}>Année Glissante</button>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div><label className="text-[9px] font-black text-slate-400 uppercase ml-2 mb-1 block">Prix Base</label><input type="number" className="w-full p-4 bg-slate-50 rounded-2xl font-black outline-none border-none" value={prices.prix_association} onChange={e => setPrices({...prices, prix_association: e.target.value})} /></div>
                  {prices.mode_adhesion_association === 'degressif' && (
                    <>
                      <div><label className="text-[9px] font-black text-slate-400 uppercase ml-2 mb-1 block">Baisse/Mois</label><input type="number" className="w-full p-4 bg-slate-50 rounded-2xl font-black outline-none border-none" value={prices.degressivite_association} onChange={e => setPrices({...prices, degressivite_association: e.target.value})} /></div>
                      <div><label className="text-[9px] font-black text-slate-400 uppercase ml-2 mb-1 block">Prix Min</label><input type="number" className="w-full p-4 bg-slate-50 rounded-2xl font-black outline-none border-none" value={prices.prix_minimum_asso} onChange={e => setPrices({...prices, prix_minimum_asso: e.target.value})} /></div>
                    </>
                  )}
                </div>
                <div className={`p-6 rounded-[2.5rem] border-2 transition-all ${prices.active_caution_association === "true" ? 'bg-emerald-50 border-emerald-100' : 'bg-slate-50 border-transparent'}`}>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-[10px] font-black uppercase text-emerald-800 tracking-widest flex items-center gap-2"><ShieldCheck size={16}/> Caution Association</span>
                    <input type="checkbox" className="w-6 h-6 accent-emerald-500 rounded-lg cursor-pointer" checked={prices.active_caution_association === "true"} onChange={e => setPrices({...prices, active_caution_association: e.target.checked ? "true" : "false"})} />
                  </div>
                  {prices.active_caution_association === "true" && (
                    <div className="space-y-4">
                      <input type="number" placeholder="Montant de la caution (€)" className="w-full p-4 rounded-2xl bg-white shadow-sm font-black outline-none" value={prices.montant_caution_association} onChange={e => setPrices({...prices, montant_caution_association: e.target.value})} />
                    </div>
                  )}
                </div>
              </div>

              <button type="submit" disabled={saveLoading} className="w-full py-6 bg-[#e38154] text-white rounded-[2rem] font-black uppercase text-xs tracking-widest shadow-xl active:scale-95 transition-all flex items-center justify-center gap-3">
                {saveLoading ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />} Enregistrer la configuration
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODALE BÉNÉVOLES */}
      {showVolunteerModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-20 md:pt-4 md:items-center bg-[#1a5f7a]/60 backdrop-blur-md">
          <div className="bg-white w-full max-w-2xl rounded-[2.5rem] md:rounded-[3.5rem] shadow-2xl overflow-hidden max-h-[85vh] flex flex-col animate-in slide-in-from-bottom-8">
            <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-white sticky top-0 z-10">
              <h3 className="font-black text-2xl text-slate-900 uppercase tracking-tighter">Équipe & Accès</h3>
              <button onClick={() => setShowVolunteerModal(false)} className="p-3 hover:bg-slate-50 rounded-2xl transition-all text-slate-400"><X size={24} /></button>
            </div>
            
            <div className="p-8 overflow-y-auto space-y-10">
              <form onSubmit={handleAddVolunteer} className="space-y-6 bg-slate-50 p-8 rounded-[2.5rem]">
                <div className="grid grid-cols-2 gap-4">
                  <input type="text" placeholder="Prénom" className="w-full p-4 rounded-2xl bg-white font-bold outline-none" value={firstName} onChange={e => setFirstName(e.target.value)} required />
                  <input type="text" placeholder="Nom" className="w-full p-4 rounded-2xl bg-white font-bold outline-none" value={lastName} onChange={e => setLastName(e.target.value)} required />
                </div>
                <input type="email" placeholder="Email" className="w-full p-4 rounded-2xl bg-white font-bold outline-none" value={newEmail} onChange={e => setNewEmail(e.target.value)} required />
                <input type="password" placeholder="Mot de passe" className="w-full p-4 rounded-2xl bg-white font-bold outline-none" value={newPassword} onChange={e => setNewPassword(e.target.value)} required />
                <button type="submit" disabled={loading} className="w-full py-4 bg-[#1a5f7a] text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2">
                   {loading ? <Loader2 className="animate-spin" size={16} /> : <UserPlus size={16} />} Ajouter au système
                </button>
              </form>

              <div className="space-y-4">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Accès Actifs ({volunteers.length})</h4>
                <div className="grid grid-cols-1 gap-3">
                  {volunteers.map(v => (
                    <div key={v.id} className="flex items-center justify-between p-5 bg-white border border-slate-100 rounded-3xl shadow-sm">
                      <div className="flex items-center gap-4 truncate">
                        <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 font-black text-xs uppercase shrink-0">{v.first_name?.[0]}{v.last_name?.[0]}</div>
                        <div className="truncate">
                          <p className="font-black text-slate-900 text-sm uppercase tracking-tight truncate">{v.first_name} {v.last_name}</p>
                          <p className="text-[10px] font-bold text-slate-400 truncate">{v.email}</p>
                        </div>
                      </div>
                      <button onClick={() => setDeleteConfirm({ show: true, id: v.id })} className="p-3 text-rose-500 hover:bg-rose-50 rounded-xl transition-all shrink-0"><Trash2 size={18} /></button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODALE HORAIRES */}
      {showHorairesModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-20 md:pt-4 md:items-center bg-[#1a5f7a]/60 backdrop-blur-md">
          <div className="bg-white w-full max-w-lg rounded-[2.5rem] md:rounded-[3.5rem] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 max-h-[85vh]">
            <div className="p-8 border-b border-slate-50 flex justify-between items-center sticky top-0 bg-white z-10">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-amber-500 text-white rounded-2xl"><Clock size={20}/></div>
                <h3 className="font-black text-xl text-slate-900 uppercase tracking-tighter">Horaires d'ouverture</h3>
              </div>
              <button onClick={() => setShowHorairesModal(false)} className="p-3 hover:bg-slate-50 rounded-2xl transition-all text-slate-400"><X size={24} /></button>
            </div>
            <form onSubmit={handleUpdatePrice} className="p-8 space-y-8 overflow-y-auto">
              <HelpBox text="Ces horaires sont affichés sur la page d'accueil. La 2e plage horaire est optionnelle." color="blue" />

              {/* Plage 1 */}
              <div className="space-y-4">
                <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest flex items-center gap-2"><Clock size={14}/> 1re plage horaire</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[9px] font-black text-slate-400 uppercase ml-2 mb-2 block">Jour de la semaine</label>
                    <select
                      className="w-full p-4 bg-slate-50 rounded-2xl font-bold outline-none focus:ring-2 ring-amber-100 cursor-pointer"
                      value={prices.horaire_1_jour}
                      onChange={e => setPrices({...prices, horaire_1_jour: e.target.value})}
                    >
                      {['Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi','Dimanche'].map(j => (
                        <option key={j} value={j}>{j}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[9px] font-black text-slate-400 uppercase ml-2 mb-2 block">Quel {prices.horaire_1_jour || 'jour'} du mois ?</label>
                    <select
                      className="w-full p-4 bg-slate-50 rounded-2xl font-bold outline-none focus:ring-2 ring-amber-100 cursor-pointer"
                      value={prices.horaire_1_rang}
                      onChange={e => setPrices({...prices, horaire_1_rang: e.target.value})}
                    >
                      <option value="1">1er</option>
                      <option value="2">2e</option>
                      <option value="3">3e</option>
                      <option value="4">4e</option>
                      <option value="5">Dernier</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[9px] font-black text-slate-400 uppercase ml-2 mb-2 block">Heure d'ouverture</label>
                    <input type="time" className="w-full p-4 bg-slate-50 rounded-2xl font-bold outline-none focus:ring-2 ring-amber-100" value={prices.horaire_1_debut} onChange={e => setPrices({...prices, horaire_1_debut: e.target.value})} />
                  </div>
                  <div>
                    <label className="text-[9px] font-black text-slate-400 uppercase ml-2 mb-2 block">Heure de fermeture</label>
                    <input type="time" className="w-full p-4 bg-slate-50 rounded-2xl font-bold outline-none focus:ring-2 ring-amber-100" value={prices.horaire_1_fin} onChange={e => setPrices({...prices, horaire_1_fin: e.target.value})} />
                  </div>
                </div>
              </div>

              {/* Plage 2 */}
              <div className={`space-y-4 p-6 rounded-[2rem] border-2 transition-all ${prices.horaire_2_actif === 'true' ? 'border-amber-100 bg-amber-50/40' : 'border-transparent bg-slate-50'}`}>
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest flex items-center gap-2"><Clock size={14}/> 2e plage horaire</p>
                  <input
                    type="checkbox"
                    className="w-6 h-6 accent-amber-500 rounded-lg cursor-pointer"
                    checked={prices.horaire_2_actif === 'true'}
                    onChange={e => setPrices({...prices, horaire_2_actif: e.target.checked ? 'true' : 'false'})}
                  />
                </div>
                {prices.horaire_2_actif === 'true' && (
                  <div className="space-y-4 animate-in slide-in-from-top-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[9px] font-black text-slate-400 uppercase ml-2 mb-2 block">Jour de la semaine</label>
                        <select
                          className="w-full p-4 bg-white rounded-2xl font-bold outline-none focus:ring-2 ring-amber-100 cursor-pointer"
                          value={prices.horaire_2_jour}
                          onChange={e => setPrices({...prices, horaire_2_jour: e.target.value})}
                        >
                          {['Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi','Dimanche'].map(j => (
                            <option key={j} value={j}>{j}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-[9px] font-black text-slate-400 uppercase ml-2 mb-2 block">Quel {prices.horaire_2_jour || 'jour'} du mois ?</label>
                        <select
                          className="w-full p-4 bg-white rounded-2xl font-bold outline-none focus:ring-2 ring-amber-100 cursor-pointer"
                          value={prices.horaire_2_rang}
                          onChange={e => setPrices({...prices, horaire_2_rang: e.target.value})}
                        >
                          <option value="1">1er</option>
                          <option value="2">2e</option>
                          <option value="3">3e</option>
                          <option value="4">4e</option>
                          <option value="5">Dernier</option>
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[9px] font-black text-slate-400 uppercase ml-2 mb-2 block">Heure d'ouverture</label>
                        <input type="time" className="w-full p-4 bg-white rounded-2xl font-bold outline-none focus:ring-2 ring-amber-100" value={prices.horaire_2_debut} onChange={e => setPrices({...prices, horaire_2_debut: e.target.value})} />
                      </div>
                      <div>
                        <label className="text-[9px] font-black text-slate-400 uppercase ml-2 mb-2 block">Heure de fermeture</label>
                        <input type="time" className="w-full p-4 bg-white rounded-2xl font-bold outline-none focus:ring-2 ring-amber-100" value={prices.horaire_2_fin} onChange={e => setPrices({...prices, horaire_2_fin: e.target.value})} />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <button type="submit" disabled={saveLoading} className="w-full py-5 bg-amber-500 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl active:scale-95 transition-all flex items-center justify-center gap-3">
                {saveLoading ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />} Enregistrer les horaires
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODALE ADRESSE */}
      {showAdresseModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-20 md:pt-4 md:items-center bg-[#1a5f7a]/60 backdrop-blur-md">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] md:rounded-[3.5rem] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 max-h-[85vh]">
            <div className="p-8 border-b border-slate-50 flex justify-between items-center sticky top-0 bg-white z-10">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-rose-500 text-white rounded-2xl"><MapPin size={20}/></div>
                <h3 className="font-black text-xl text-slate-900 uppercase tracking-tighter">Adresse</h3>
              </div>
              <button onClick={() => setShowAdresseModal(false)} className="p-3 hover:bg-slate-50 rounded-2xl transition-all text-slate-400"><X size={24} /></button>
            </div>
            <form onSubmit={handleUpdatePrice} className="p-8 space-y-6 overflow-y-auto">
              <HelpBox text="Cette adresse est affichée sur la page d'accueil et utilisée pour le lien Google Maps." color="blue" />
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase ml-2 mb-2 block">Rue / Numéro</label>
                <input type="text" placeholder="ex: 419 Grande Rue" className="w-full p-4 bg-slate-50 rounded-2xl font-bold outline-none focus:ring-2 ring-rose-100" value={prices.adresse_rue} onChange={e => setPrices({...prices, adresse_rue: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase ml-2 mb-2 block">Code postal</label>
                  <input type="text" placeholder="01270" className="w-full p-4 bg-slate-50 rounded-2xl font-bold outline-none focus:ring-2 ring-rose-100" value={prices.adresse_code_postal} onChange={e => setPrices({...prices, adresse_code_postal: e.target.value})} />
                </div>
                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase ml-2 mb-2 block">Ville</label>
                  <input type="text" placeholder="Coligny" className="w-full p-4 bg-slate-50 rounded-2xl font-bold outline-none focus:ring-2 ring-rose-100" value={prices.adresse_ville} onChange={e => setPrices({...prices, adresse_ville: e.target.value})} />
                </div>
              </div>
              <div className="p-4 bg-slate-50 rounded-2xl text-[10px] font-bold text-slate-500 flex items-center gap-2">
                <MapPin size={14} className="text-rose-400 shrink-0" />
                Aperçu lien Maps : <span className="text-[#1a5f7a] ml-1">{prices.adresse_rue}, {prices.adresse_code_postal} {prices.adresse_ville}</span>
              </div>
              <button type="submit" disabled={saveLoading} className="w-full py-5 bg-rose-500 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl active:scale-95 transition-all flex items-center justify-center gap-3">
                {saveLoading ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />} Enregistrer l'adresse
              </button>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRMATION */}
      {confirmModal.show && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-[#1a5f7a]/80 backdrop-blur-md">
          <div className="bg-white rounded-[3rem] p-10 max-w-sm w-full text-center shadow-2xl border-b-8 border-emerald-500 animate-in zoom-in-95">
            <div className="mx-auto w-20 h-20 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mb-6"><CheckCircle2 size={40} /></div>
            <h3 className="text-2xl font-black uppercase text-slate-900 mb-2">{confirmModal.title}</h3>
            <p className="text-[11px] font-bold text-slate-500 mb-8 italic leading-relaxed">{confirmModal.message}</p>
            <button onClick={() => setConfirmModal({ ...confirmModal, show: false })} className="w-full py-5 bg-[#1a5f7a] text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg active:scale-95 transition-all">Continuer</button>
          </div>
        </div>
      )}

      {/* SUPPRESSION */}
      {deleteConfirm.show && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-[#1a5f7a]/80 backdrop-blur-md">
          <div className="bg-white rounded-[3rem] p-10 max-w-sm w-full text-center shadow-2xl border-b-8 border-rose-500 animate-in zoom-in-95">
             <div className="mx-auto w-20 h-20 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mb-6 shadow-inner"><ShieldAlert size={40} /></div>
             <h3 className="text-2xl font-black uppercase text-slate-900 mb-2 tracking-tighter">Révoquer ?</h3>
             <p className="text-[11px] font-bold text-slate-500 mb-8 italic leading-relaxed px-2">Attention, ce bénévole n'aura plus aucun accès à l'administration.</p>
             <div className="flex flex-col gap-3">
                <button onClick={handleRemoveVolunteer} className="w-full py-5 bg-rose-500 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg active:scale-95 transition-all">Confirmer</button>
                <button onClick={() => setDeleteConfirm({ show: false, id: null })} className="w-full py-5 bg-slate-50 text-slate-400 rounded-2xl font-black uppercase text-[10px] tracking-widest active:scale-95 transition-all">Annuler</button>
             </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════
          MODALE GESTION DES MODÈLES D'AFFICHES
      ═══════════════════════════════════════════════════════ */}
      {showAffichesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1a5f7a]/60 backdrop-blur-md">
          <div className="bg-white w-full max-w-4xl rounded-[2.5rem] shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">

            {/* Header */}
            <div className="p-8 pb-4 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-purple-50 text-purple-500 rounded-xl"><Image size={20} /></div>
                <div>
                  <h3 className="font-black text-lg text-slate-900 uppercase tracking-tighter">Modèles d'affiches</h3>
                  <p className="text-[10px] text-slate-400">{affichesTemplates.length} modèle{affichesTemplates.length > 1 ? 's' : ''} enregistré{affichesTemplates.length > 1 ? 's' : ''}</p>
                </div>
              </div>
              <button onClick={() => setShowAffichesModal(false)} className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100"><X size={20} /></button>
            </div>

            <div className="overflow-y-auto flex-1">
              <div className="p-8 grid grid-cols-1 lg:grid-cols-2 gap-8">

                {/* Colonne gauche : formulaire */}
                <div className="space-y-5">
                  <h4 className="text-[9px] font-black text-[#1a5f7a] uppercase tracking-widest">
                    {editingTemplate ? '✏️ Modifier le modèle' : '＋ Nouveau modèle'}
                  </h4>

                  {/* Label */}
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Nom du modèle</label>
                    <input className="w-full p-3 rounded-2xl bg-slate-50 font-bold text-sm outline-none border-2 border-transparent focus:border-[#1a5f7a]"
                      placeholder="ex: Soirée jeux adultes"
                      value={templateForm.label}
                      onChange={e => setTemplateForm(prev => ({ ...prev, label: e.target.value }))} />
                  </div>

                  {/* Upload image */}
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Fond d'affiche (PNG/JPG)</label>
                    <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                    <button onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingImage}
                      className="w-full p-3 rounded-2xl bg-slate-50 border-2 border-dashed border-slate-200 hover:border-purple-300 transition-colors font-bold text-sm text-slate-500 flex items-center justify-center gap-2">
                      {uploadingImage ? <><Loader2 size={16} className="animate-spin" /> Envoi...</> : <><Plus size={16} /> {previewImg ? "Changer l'image" : "Choisir une image"}</>}
                    </button>
                    {templateForm.url && !previewImg && (
                      <input className="w-full p-3 rounded-2xl bg-slate-50 font-bold text-xs outline-none border-2 border-transparent focus:border-[#1a5f7a] mt-2"
                        placeholder="ou coller une URL directement"
                        value={templateForm.url}
                        onChange={e => { setTemplateForm(prev => ({ ...prev, url: e.target.value })); setPreviewImg(e.target.value) }} />
                    )}
                  </div>

                  {/* Format du texte */}
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Format du texte (repère ①)</label>
                    <select className="w-full p-3 rounded-2xl bg-slate-50 font-bold text-sm outline-none border-2 border-transparent focus:border-[#1a5f7a]"
                      value={templateForm.layout}
                      onChange={e => setTemplateForm(prev => ({ ...prev, layout: e.target.value }))}>
                      <option value="famille">Jour / Date / Heure</option>
                      <option value="soirees">Date longue + Heure</option>
                    </select>
                  </div>

                  {/* Repères de positionnement */}
                  <div className="space-y-3">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                      <Target size={10} /> Positionnement (cliquez sur l'aperçu)
                    </label>

                    {/* Sélecteur de repère actif */}
                    <div className="flex bg-slate-100 rounded-2xl p-1 gap-1 w-fit">
                      <button onClick={() => setActiveZone(1)}
                        className={'px-4 py-2 rounded-xl font-black uppercase text-[9px] tracking-widest transition-all flex items-center gap-1.5 ' +
                          (activeZone === 1 ? 'bg-[#e38154] text-white shadow-sm' : 'text-slate-400 hover:text-slate-600')}>
                        <span className="w-4 h-4 rounded-full bg-current opacity-80 flex items-center justify-center text-[8px] text-white font-black">1</span>
                        Date
                      </button>
                      <button onClick={() => setActiveZone(2)}
                        className={'px-4 py-2 rounded-xl font-black uppercase text-[9px] tracking-widest transition-all flex items-center gap-1.5 ' +
                          (activeZone === 2 ? 'bg-[#1a5f7a] text-white shadow-sm' : 'text-slate-400 hover:text-slate-600')}>
                        <span className="w-4 h-4 rounded-full bg-current opacity-80 flex items-center justify-center text-[8px] text-white font-black">2</span>
                        Lieu
                      </button>
                    </div>

                    {/* Zone 1 — Date */}
                    {activeZone === 1 && (
                      <div className="space-y-2 p-3 bg-[#e38154]/5 rounded-2xl border border-[#e38154]/20">
                        <div className="flex items-center justify-between">
                          <p className="text-[8px] font-black text-[#e38154] uppercase tracking-widest">① Zone Date</p>
                          {templateForm.x1 != null && (
                            <span className="text-[8px] text-slate-400">{Math.round(templateForm.w1)}×{Math.round(templateForm.h1)}px</span>
                          )}
                        </div>
                        {templateForm.x1 == null
                          ? <p className="text-[8px] text-slate-400 italic">Cliquez-glissez sur l'aperçu pour définir la zone</p>
                          : <div className="flex items-center gap-2 text-[8px] text-emerald-600 font-bold">✓ Zone définie — redessinez pour modifier</div>
                        }
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Police</label>
                            <select className="w-full mt-1 p-2 rounded-xl bg-white text-xs font-bold outline-none border border-transparent focus:border-[#e38154]"
                              value={templateForm.font_family}
                              onChange={e => setTemplateForm(prev => ({ ...prev, font_family: e.target.value }))}>
                              <option value="PersonaAura">Persona Aura</option>
                              <option value="Roboto">Roboto</option>
                              <option value="Arial">Arial</option>
                              <option value="Georgia">Georgia</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Taille (pt)</label>
                            <input type="number" min="8" max="120"
                              className="w-full mt-1 p-2 rounded-xl bg-white text-xs font-bold outline-none border border-transparent focus:border-[#e38154]"
                              value={templateForm.font_size}
                              onChange={e => setTemplateForm(prev => ({ ...prev, font_size: e.target.value }))} />
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Couleur</label>
                          <input type="color" className="w-8 h-8 rounded-lg border border-slate-100 cursor-pointer p-0.5"
                            value={templateForm.color}
                            onChange={e => setTemplateForm(prev => ({ ...prev, color: e.target.value }))} />
                          <span className="text-xs font-bold text-slate-500">{templateForm.color}</span>
                        </div>
                      </div>
                    )}

                    {/* Zone 2 — Lieu */}
                    {activeZone === 2 && (
                      <div className="space-y-2 p-3 bg-[#1a5f7a]/5 rounded-2xl border border-[#1a5f7a]/20">
                        <div className="flex items-center justify-between">
                          <p className="text-[8px] font-black text-[#1a5f7a] uppercase tracking-widest">② Zone Lieu</p>
                          {templateForm.x2 != null && (
                            <button onClick={() => setTemplateForm(prev => ({ ...prev, x2: null, y2: null, w2: null, h2: null }))}
                              className="text-[8px] text-rose-400 font-black uppercase hover:underline">
                              Supprimer
                            </button>
                          )}
                        </div>
                        {templateForm.x2 == null
                          ? <p className="text-[8px] text-slate-400 italic">Cliquez-glissez sur l'aperçu pour définir la zone (optionnel)</p>
                          : <div className="flex items-center gap-2 text-[8px] text-emerald-600 font-bold">✓ Zone définie — {Math.round(templateForm.w2)}×{Math.round(templateForm.h2)}px</div>
                        }
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Police</label>
                            <select className="w-full mt-1 p-2 rounded-xl bg-white text-xs font-bold outline-none border border-transparent focus:border-[#1a5f7a]"
                              value={templateForm.font_family2}
                              onChange={e => setTemplateForm(prev => ({ ...prev, font_family2: e.target.value }))}>
                              <option value="PersonaAura">Persona Aura</option>
                              <option value="Roboto">Roboto</option>
                              <option value="Arial">Arial</option>
                              <option value="Georgia">Georgia</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Taille (pt)</label>
                            <input type="number" min="8" max="120"
                              className="w-full mt-1 p-2 rounded-xl bg-white text-xs font-bold outline-none border border-transparent focus:border-[#1a5f7a]"
                              value={templateForm.font_size2}
                              onChange={e => setTemplateForm(prev => ({ ...prev, font_size2: e.target.value }))} />
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Couleur</label>
                          <input type="color" className="w-8 h-8 rounded-lg border border-slate-100 cursor-pointer p-0.5"
                            value={templateForm.color2}
                            onChange={e => setTemplateForm(prev => ({ ...prev, color2: e.target.value }))} />
                          <span className="text-xs font-bold text-slate-500">{templateForm.color2}</span>
                        </div>
                      </div>
                    )}
                    <p className="text-[8px] text-slate-300 italic ml-1">La zone ① (Date) est obligatoire. La zone ② (Lieu) est optionnelle.</p>
                  </div>

                  {/* Boutons */}
                  <div className="flex gap-2 pt-2">
                    <button onClick={saveTemplate} disabled={savingTemplate || !templateForm.label || !templateForm.url}
                      className={'flex-1 py-4 rounded-2xl font-black uppercase text-[9px] tracking-widest flex items-center justify-center gap-2 transition-all ' +
                        (savingTemplate || !templateForm.label || !templateForm.url
                          ? 'bg-slate-100 text-slate-300 cursor-not-allowed'
                          : 'bg-[#1a5f7a] text-white hover:bg-[#134a5e]')}>
                      {savingTemplate ? <><Loader2 size={14} className="animate-spin" /> Sauvegarde...</> : <><Save size={14} /> {editingTemplate ? 'Enregistrer' : 'Ajouter le modèle'}</>}
                    </button>
                    {editingTemplate && (
                      <button onClick={() => { setEditingTemplate(null); setTemplateForm({ label: '', url: '', cx: 0, cy: 0, font_family: 'PersonaAura', font_size: 38.7, color: '#000000', layout: 'famille' }); setPreviewImg(null) }}
                        className="px-4 py-4 rounded-2xl font-black uppercase text-[9px] bg-slate-100 text-slate-500 hover:bg-slate-200">
                        Annuler
                      </button>
                    )}
                  </div>
                </div>

                {/* Colonne droite : aperçu interactif */}
                <div className="space-y-3">
                  <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                    <Eye size={10} /> Aperçu — cliquez pour positionner le texte
                  </h4>
                  {previewImg ? (
                    <div className="relative rounded-2xl overflow-hidden border-2 border-slate-100 shadow-lg" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
                      <canvas
                        width={794} height={1123}
                        style={{ width: '100%', height: 'auto', display: 'block', cursor: 'crosshair', userSelect: 'none' }}
                        onMouseDown={handleCanvasMouseDown}
                        onMouseMove={handleCanvasMouseMove}
                        onMouseUp={handleCanvasMouseUp}
                        onMouseLeave={handleCanvasMouseUp}
                        ref={el => {
                          if (el) {
                            previewCanvasRef.current = el
                            drawPreviewCanvas(el, templateForm, previewImg)
                          }
                        }}
                      />
                      <div className="absolute bottom-2 left-2 right-2 bg-black/50 rounded-xl p-2 text-center">
                        <p className="text-white text-[8px] font-black uppercase">Cliquez-glissez pour définir la zone ① ou ②</p>
                      </div>
                    </div>
                  ) : (
                    <div className="aspect-[794/1123] rounded-2xl bg-slate-50 border-2 border-dashed border-slate-200 flex flex-col items-center justify-center gap-3 text-slate-300">
                      <Image size={40} />
                      <p className="text-xs font-bold">Chargez un fond d'affiche pour voir l'aperçu</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Liste des modèles existants */}
              {affichesTemplates.length > 0 && (
                <div className="px-8 pb-8">
                  <div className="border-t border-slate-100 pt-6">
                    <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4">Modèles enregistrés</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {affichesTemplates.map(t => (
                        <div key={t.id} className="relative group rounded-2xl overflow-hidden border border-slate-100 shadow-sm aspect-[3/4]">
                          <img src={t.url} alt={t.label} className="absolute inset-0 w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/40 flex flex-col justify-between p-3">
                            <div className="flex justify-end gap-1">
                              <button onClick={() => startEditTemplate(t)}
                                className="p-2 bg-white/90 rounded-lg text-[#1a5f7a] hover:bg-white transition-all shadow-sm">
                                <Edit2 size={12} />
                              </button>
                              <button onClick={() => deleteTemplate(t.id)} disabled={deletingTemplate === t.id}
                                className="p-2 bg-white/90 rounded-lg text-rose-400 hover:bg-white transition-all shadow-sm">
                                {deletingTemplate === t.id ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                              </button>
                            </div>
                            <div>
                              <p className="text-white text-[10px] font-black uppercase leading-tight drop-shadow-md">{t.label}</p>
                              <p className="text-white/60 text-[8px] font-medium mt-0.5">{t.font_family} · {t.font_size}pt · {t.layout === 'famille' ? 'Jour/Date/Heure' : 'Date+Heure+Lieu'}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  )
}