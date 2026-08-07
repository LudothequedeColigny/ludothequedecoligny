import { useState, useEffect } from 'react'
import * as XLSX from 'xlsx'
import { supabase } from '../../services/supabaseClient'
import { useToast } from '../../components/ToastContext'
import AdminPageHeader from '../../components/admin/AdminPageHeader'
import IconButton from '../../components/admin/IconButton'
import ConfirmModal from '../../components/admin/ConfirmModal'
import FormModal, { FieldLabel, FIELD } from '../../components/admin/FormModal'
import { BTN_TEAL, BTN_ORANGE } from '../../components/admin/buttons'
import { useRef, useState as useStateRef } from 'react'
import { 
  Settings, UserPlus, Save, Loader2, UserCheck, Ban, Euro, 
  ShieldCheck, X, ChevronRight, Users, CreditCard, Info, Mail, Lock, ShieldAlert, CheckCircle2, User, Hash, Trash2, Phone, Wallet, Clock, MapPin, Image, Plus, Edit2, Target, Eye, Download, CheckCircle
} from 'lucide-react'

export default function Parametres() {
  const { addToast } = useToast()
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
    color: '#000000', layout: 'famille', text_align: 'center',
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

  // Redessiner le canvas à chaque changement de templateForm ou previewImg
  useEffect(() => {
    if (previewCanvasRef.current && previewImg) {
      drawPreviewCanvas(previewCanvasRef.current, templateForm, previewImg)
    }
  }, [
    templateForm.font_family, templateForm.font_size, templateForm.color, templateForm.text_align,
    templateForm.font_family2, templateForm.font_size2, templateForm.color2, templateForm.text_align2,
    templateForm.x1, templateForm.y1, templateForm.w1, templateForm.h1,
    templateForm.x2, templateForm.y2, templateForm.w2, templateForm.h2,
    previewImg
  ])

  const [confirmModal, setConfirmModal] = useState({ show: false, title: '', message: '' })
  const [deleteConfirm, setDeleteConfirm] = useState({ show: false, id: null })
  const [exportLoading, setExportLoading] = useState(false)
  const [exportProgress, setExportProgress] = useState({ current: 0, total: 0, label: '' })
  const [showExportModal, setShowExportModal] = useState(false)
  const [exportSelection, setExportSelection] = useState({
    members: true,
    games: true,
    loans: true,
    loan_history: true,
    financial_transactions: true,
    events: true,
    collectivites: true,
    profiles: true,
    settings: false,
    affiche_templates: false,
  })

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
    const { data, error } = await supabase.from('affiche_templates').select('*').order('created_at')
    if (error) console.error('fetchAffichesTemplates error:', error)
    setAffichesTemplates(data || [])
    return data || []
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
      font_family: t.font_family || 'PersonaAura', font_size: t.font_size || 38.7,
      color: t.color || '#000000', layout: t.layout || 'famille', text_align: t.text_align || 'center',
      x2: t.x2 || null, y2: t.y2 || null, w2: t.w2 || null, h2: t.h2 || null,
      font_family2: t.font_family2 || 'PersonaAura',
      font_size2: t.font_size2 || 28,
      color2: t.color2 || '#000000', text_align2: t.text_align2 || 'center'
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
      addToast('Erreur upload : ' + e.message, 'error')
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

  const drawZoneRect = (ctx, x, y, w, h, color, label, textColor, font, fontSize, sampleText, textAlign = 'center') => {
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
    // Texte exemple dans la zone — taille réelle avec alignement
    ctx.fillStyle = textColor || '#000000'
    ctx.textAlign = textAlign
    ctx.textBaseline = 'middle'
    const fs = parseFloat(fontSize) || 38
    ctx.font = `${fs}px ${font || 'sans-serif'}`
    // Ancrage X selon alignement
    const anchorX = textAlign === 'left' ? x + 10 : textAlign === 'right' ? x + w - 10 : x + w / 2
    // Wrapping simple pour l'aperçu
    const words = sampleText.split(' ')
    const lh = fs * 1.3
    let line = ''
    const wrappedLines = []
    for (const word of words) {
      const test = line ? line + ' ' + word : word
      if (ctx.measureText(test).width > w - 10 && line) {
        wrappedLines.push(line); line = word
      } else { line = test }
    }
    if (line) wrappedLines.push(line)
    const totalH = (wrappedLines.length - 1) * lh
    const startY = y + h / 2 - totalH / 2
    wrappedLines.forEach((l, i) => ctx.fillText(l, anchorX, startY + i * lh))
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
        drawZoneRect(ctx, tf.x1, tf.y1, tf.w1, tf.h1, '#e38154', '1', tf.color, tf.font_family, tf.font_size, 'Samedi 14 juin 2025', tf.text_align || 'center')
      if (tf.x2 != null && tf.w2 > 0)
        drawZoneRect(ctx, tf.x2, tf.y2, tf.w2, tf.h2, '#1a5f7a', '2', tf.color2, tf.font_family2, tf.font_size2, 'Salle des fêtes de Coligny', tf.text_align2 || 'center')
    }
    img.src = imgUrl
  }

  const saveTemplate = async () => {
    if (!templateForm.label || !templateForm.url) { addToast('Label et image requis.', 'warning'); return }
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
        text_align: templateForm.text_align || 'center',
        x2: templateForm.x2 != null ? parseFloat(templateForm.x2) : null,
        y2: templateForm.y2 != null ? parseFloat(templateForm.y2) : null,
        w2: templateForm.w2 != null ? parseFloat(templateForm.w2) : null,
        h2: templateForm.h2 != null ? parseFloat(templateForm.h2) : null,
        font_family2: templateForm.font_family2 || 'PersonaAura',
        font_size2: parseFloat(templateForm.font_size2) || 28,
        color2: templateForm.color2 || '#000000',
        text_align2: templateForm.text_align2 || 'center',
      }
      const wasEditing = !!editingTemplate
      if (editingTemplate) {
        const { error: updateError } = await supabase.from('affiche_templates').update(payload).eq('id', editingTemplate.id)
        if (updateError) { console.error('UPDATE error:', updateError); addToast('Erreur update: ' + JSON.stringify(updateError), 'error'); return }
      } else {
        const { error: insertError } = await supabase.from('affiche_templates').insert(payload)
        if (insertError) { console.error('INSERT error:', insertError); addToast('Erreur insert: ' + JSON.stringify(insertError), 'error'); return }
      }
      const updated = await fetchAffichesTemplates()
      console.log('Templates après save:', updated?.length, updated?.map(t => t.label))
      setEditingTemplate(null)
      setTemplateForm({ label: '', url: '', x1: null, y1: null, w1: null, h1: null, font_family: 'PersonaAura', font_size: 38.7, color: '#000000', layout: 'famille', text_align: 'center', x2: null, y2: null, w2: null, h2: null, font_family2: 'PersonaAura', font_size2: 28, color2: '#000000', text_align2: 'center' })
      setPreviewImg(null)
      addToast(wasEditing ? 'Template modifié avec succès.' : 'Template ajouté avec succès.', 'success')
    } catch (e) {
      addToast('Erreur sauvegarde : ' + e.message, 'error')
    } finally {
      setSavingTemplate(false)
    }
  }

  const deleteTemplate = async (id) => {
    setDeletingTemplate(id)
    await supabase.from('affiche_templates').delete().eq('id', id)
    fetchAffichesTemplates()
    setDeletingTemplate(null)
    addToast('Template supprimé avec succès.', 'success')
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
      addToast('Paramètres sauvegardés avec succès.', 'success')
    } catch (err) {
      console.error('Erreur sauvegarde settings:', err)
      addToast('Erreur lors de la sauvegarde : ' + err.message, 'error')
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
    } else { addToast("Erreur : " + error.message, 'error') }
    setLoading(false)
  }

  const handleRemoveVolunteer = async () => {
    if (deleteConfirm.id) {
      const { error } = await supabase.from('profiles').delete().eq('id', deleteConfirm.id)
      if (!error) { fetchVolunteers(); setDeleteConfirm({ show: false, id: null }) }
    }
  }

  const EXCEL_MAX_CHARS = 32767

  const sanitizeCell = (v) => {
    if (v === null || v === undefined) return ''
    if (typeof v === 'object') v = JSON.stringify(v)
    if (typeof v === 'string' && v.length > EXCEL_MAX_CHARS) return v.slice(0, EXCEL_MAX_CHARS - 3) + '...'
    return v
  }

  const handleExportExcel = async (selection) => {
    setShowExportModal(false)
    setExportLoading(true)

    const allTables = [
      { name: 'Adhérents', table: 'members', key: 'members' },
      { name: 'Jeux', table: 'games', key: 'games' },
      { name: 'Prêts en cours', table: 'loans', key: 'loans' },
      { name: 'Historique prêts', table: 'loan_history', key: 'loan_history' },
      { name: 'Transactions', table: 'financial_transactions', key: 'financial_transactions' },
      { name: 'Événements', table: 'events', key: 'events' },
      { name: 'Collectivités', table: 'collectivites', key: 'collectivites' },
      { name: 'Bénévoles', table: 'profiles', key: 'profiles' },
      { name: 'Paramètres', table: 'settings', key: 'settings' },
      { name: 'Modèles affiches', table: 'affiche_templates', key: 'affiche_templates' },
    ]

    const tables = allTables.filter(t => selection[t.key])

    try {
      const wb = XLSX.utils.book_new()
      const dateExport = new Date().toLocaleString('fr-FR')
      const summaryData = [
        ['EXPORT SAUVEGARDE — LUDOTHÈQUE'],
        [`Généré le : ${dateExport}`],
        [],
        ['Table', 'Nombre de lignes'],
      ]
      const counts = []

      for (let i = 0; i < tables.length; i++) {
        const { name, table } = tables[i]
        setExportProgress({ current: i + 1, total: tables.length, label: name })

        const { data, error } = await supabase.from(table).select('*')
        if (error) { console.warn(`Erreur table ${table}:`, error); counts.push([name, 'Erreur']); continue }

        const rows = data || []
        counts.push([name, rows.length])

        if (rows.length === 0) {
          const ws = XLSX.utils.aoa_to_sheet([['Aucune donnée']])
          XLSX.utils.book_append_sheet(wb, ws, name)
          continue
        }

        const flatRows = rows.map(row => {
          const flat = {}
          for (const [k, v] of Object.entries(row)) {
            flat[k] = sanitizeCell(v)
          }
          return flat
        })

        const ws = XLSX.utils.json_to_sheet(flatRows)
        const cols = Object.keys(flatRows[0])
        ws['!cols'] = cols.map(c => ({ wch: Math.max(c.length + 2, 14) }))
        XLSX.utils.book_append_sheet(wb, ws, name)
      }

      summaryData.push(...counts)
      const wsSummary = XLSX.utils.aoa_to_sheet(summaryData)
      wsSummary['!cols'] = [{ wch: 25 }, { wch: 18 }]
      XLSX.utils.book_append_sheet(wb, wsSummary, 'Résumé')
      wb.SheetNames = ['Résumé', ...wb.SheetNames.filter(s => s !== 'Résumé')]

      const dateStr = new Date().toISOString().slice(0, 10)
      XLSX.writeFile(wb, `sauvegarde-ludotheque-${dateStr}.xlsx`)

      setConfirmModal({
        show: true,
        title: 'Export réussi !',
        message: `Le fichier sauvegarde-ludotheque-${dateStr}.xlsx a été téléchargé avec ${tables.length} onglet(s).`
      })
    } catch (err) {
      console.error('Erreur export:', err)
      addToast("Erreur lors de l'export : " + err.message, 'error')
    } finally {
      setExportLoading(false)
      setExportProgress({ current: 0, total: 0, label: '' })
    }
  }

  const HelpBox = ({ text, color = "blue" }) => (
    <div className={`flex gap-3 rounded-[18px] border-2 p-4 text-[10px] font-bold leading-tight ${color === "blue" ? 'border-[#3b82f6] bg-[#eff6ff] text-[#1e40af]' : 'border-[#e38154] bg-[#fdf1ea] text-[#b45309]'}`}>
      <span className="shrink-0"><Info size={16} /></span>
      <p className="uppercase tracking-tight">{text}</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#fdfaf6] p-5 font-body text-[#0f172a] md:p-11">
      <div className="mx-auto max-w-[1080px]">

      <AdminPageHeader icon="ludo-parametres.svg" title="Paramètres" accent="Système" />

      {/* GRILLE PRINCIPALE */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[
          { onClick: () => setShowFinanceModal(true),   icon: <CreditCard size={21} />, color: '#e38154', tint: '#fdf1ea', title: 'Finances',  desc: 'Tarifs & cautions',            cta: 'Configurer' },
          { onClick: () => setShowPaymentModal(true),   icon: <Wallet size={21} />,     color: '#10b981', tint: '#ecfdf5', title: 'Paiements', desc: 'Modes acceptés & RIB',         cta: 'Paramétrer' },
          { onClick: () => setShowQuotaModal(true),     icon: <Hash size={21} />,       color: '#059669', tint: '#ecfdf5', title: 'Limites',   desc: "Quotas d'emprunt",             cta: 'Définir' },
          { onClick: () => setShowContactModal(true),   icon: <User size={21} />,       color: '#3b82f6', tint: '#eff6ff', title: 'Contact',   desc: 'Référent public',              cta: 'Modifier' },
          { onClick: () => setShowVolunteerModal(true), icon: <Users size={21} />,      color: '#1a5f7a', tint: '#f0f7f9', title: 'Équipe',    desc: 'Gestion des accès',            cta: 'Gérer' },
          { onClick: () => setShowHorairesModal(true),  icon: <Clock size={21} />,      color: '#f59e0b', tint: '#fffbeb', title: 'Horaires',  desc: "Jours & heures d'ouverture",   cta: 'Modifier' },
          { onClick: () => setShowAdresseModal(true),   icon: <MapPin size={21} />,     color: '#f43f5e', tint: '#fff1f2', title: 'Adresse',   desc: 'Localisation de la ludothèque', cta: 'Modifier' },
          { onClick: openAffichesModal,                 icon: <Image size={21} />,      color: '#a855f7', tint: '#faf5ff', title: 'Affiches',  desc: 'Modèles du générateur',        cta: 'Gérer' },
        ].map(card => (
          <button
            key={card.title}
            onClick={card.onClick}
            className="rounded-[34px] border-2 border-[#0f172a] bg-white p-6 text-left transition-[transform,box-shadow] duration-200 hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-[2px_2px_0_#0f172a] md:p-7"
            style={{ boxShadow: `5px 5px 0 ${card.color}` }}
          >
            <div
              className="mb-5 flex h-12 w-12 items-center justify-center rounded-[16px] border-2 border-[#0f172a]"
              style={{ background: card.tint, color: card.color }}
            >
              {card.icon}
            </div>
            <div className="font-display text-[19px] font-extrabold uppercase tracking-[-0.035em]">{card.title}</div>
            <div className="mt-2 text-[10px] font-extrabold uppercase tracking-[0.05em] text-slate-400">{card.desc}</div>
            <div className="mt-6 flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.16em]" style={{ color: card.color }}>
              {card.cta} <ChevronRight size={14} />
            </div>
          </button>
        ))}

        {/* SAUVEGARDE — carte à part : elle affiche une progression pendant l'export */}
        <button
          onClick={() => setShowExportModal(true)}
          disabled={exportLoading}
          className="rounded-[34px] border-2 border-[#0f172a] bg-white p-6 text-left shadow-[5px_5px_0_#0d9488] transition-[transform,box-shadow] duration-200 hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-[2px_2px_0_#0f172a] disabled:pointer-events-none disabled:opacity-60 md:p-7"
        >
          <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-[16px] border-2 border-[#0f172a] bg-[#f0fdfa] text-[#0d9488]">
            {exportLoading ? <Loader2 size={21} className="animate-spin" /> : <Download size={21} />}
          </div>
          <div className="font-display text-[19px] font-extrabold uppercase tracking-[-0.035em]">Sauvegarde</div>
          <div className="mt-2 text-[10px] font-extrabold uppercase tracking-[0.05em] text-slate-400">Export Excel complet</div>

          {exportLoading && exportProgress.total > 0 ? (
            <div className="mt-6 space-y-2">
              <div className="h-2.5 w-full overflow-hidden rounded-full border-2 border-[#0f172a] bg-slate-100">
                <div
                  className="h-full bg-[#0d9488] transition-all duration-300"
                  style={{ width: `${(exportProgress.current / exportProgress.total) * 100}%` }}
                />
              </div>
              <p className="truncate text-[9px] font-extrabold uppercase tracking-[0.14em] text-[#0d9488]">
                {exportProgress.label}… ({exportProgress.current}/{exportProgress.total})
              </p>
            </div>
          ) : (
            <div className="mt-6 flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#0d9488]">
              Choisir &amp; exporter <ChevronRight size={14} />
            </div>
          )}
        </button>
      </div>

      {/* MODALE EXPORT EXCEL */}
      {showExportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 backdrop-blur-[6px] sm:p-[22px]" style={{ background: 'rgba(15,23,42,.7)' }}>
          <div className="anim-modal-in flex max-h-[88vh] w-full max-w-md flex-col overflow-hidden rounded-[36px] border-2 border-[#0f172a] bg-white shadow-[12px_12px_0_#1a5f7a]">
            <div className="flex shrink-0 items-center justify-between gap-4 border-b-2 border-[#0f172a] px-6 py-5">
              <div className="flex items-center gap-3">
                <div className="flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-[16px] border-2 border-[#0f172a] text-white bg-teal-600"><Download size={20}/></div>
                <div>
                  <h3 className="font-display text-[21px] font-extrabold uppercase tracking-[-0.04em]">Export Excel</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Sélectionnez les données à exporter</p>
                </div>
              </div>
              <button onClick={() => setShowExportModal(false)} className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-[14px] border-2 border-[#0f172a] bg-[#fdfaf6] text-[#1a5f7a] transition-colors hover:bg-[#e38154] hover:text-white"><X size={24} /></button>
            </div>
            <div className="p-8 overflow-y-auto space-y-3">
              <HelpBox text="Chaque table sélectionnée sera exportée dans un onglet séparé du fichier Excel." color="blue" />
              <div className="pt-2 space-y-2">
                {[
                  { key: 'members', label: 'Adhérents', desc: 'Fiches, contacts, cotisations' },
                  { key: 'games', label: 'Jeux', desc: 'Catalogue complet' },
                  { key: 'loans', label: 'Prêts en cours', desc: 'Emprunts actifs' },
                  { key: 'loan_history', label: 'Historique des prêts', desc: 'Tous les prêts passés' },
                  { key: 'financial_transactions', label: 'Transactions', desc: 'Suivi financier' },
                  { key: 'events', label: 'Événements', desc: 'Agenda et sorties' },
                  { key: 'collectivites', label: 'Collectivités', desc: 'Structures partenaires' },
                  { key: 'profiles', label: 'Bénévoles', desc: 'Comptes et accès' },
                  { key: 'settings', label: 'Paramètres', desc: 'Configuration du site' },
                  { key: 'affiche_templates', label: 'Modèles affiches', desc: 'Templates du générateur' },
                ].map(({ key, label, desc }) => (
                  <label key={key} className="group flex cursor-pointer items-center justify-between rounded-[18px] border-2 border-slate-200 bg-[#fdfaf6] p-4 transition-colors hover:border-[#0f172a]">
                    <div>
                      <p className="font-black text-slate-800 text-sm uppercase tracking-tight">{label}</p>
                      <p className="text-[10px] font-bold text-slate-400">{desc}</p>
                    </div>
                    <input
                      type="checkbox"
                      className="w-6 h-6 accent-teal-600 rounded-lg shrink-0"
                      checked={exportSelection[key]}
                      onChange={e => setExportSelection(prev => ({ ...prev, [key]: e.target.checked }))}
                    />
                  </label>
                ))}
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setExportSelection(Object.fromEntries(Object.keys(exportSelection).map(k => [k, true])))}
                  className="flex-1 rounded-[16px] border-2 border-[#0f172a] bg-white py-3 text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-600 transition-colors hover:bg-slate-100"
                >Tout cocher</button>
                <button
                  onClick={() => setExportSelection(Object.fromEntries(Object.keys(exportSelection).map(k => [k, false])))}
                  className="flex-1 rounded-[16px] border-2 border-[#0f172a] bg-white py-3 text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-600 transition-colors hover:bg-slate-100"
                >Tout décocher</button>
              </div>
              <button
                onClick={() => handleExportExcel(exportSelection)}
                disabled={!Object.values(exportSelection).some(Boolean)}
                className="w-full py-5 bg-teal-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Download size={18} /> Lancer l'export
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODALE MOYENS DE PAIEMENT */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 backdrop-blur-[6px] sm:p-[22px]" style={{ background: 'rgba(15,23,42,.7)' }}>
          <div className="anim-modal-in flex max-h-[88vh] w-full max-w-md flex-col overflow-hidden rounded-[36px] border-2 border-[#0f172a] bg-white shadow-[12px_12px_0_#1a5f7a]">
            <div className="flex shrink-0 items-center justify-between gap-4 border-b-2 border-[#0f172a] px-6 py-5">
              <div className="flex items-center gap-3">
                <div className="flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-[16px] border-2 border-[#0f172a] text-white bg-emerald-600"><Wallet size={20}/></div>
                <h3 className="font-display text-[21px] font-extrabold uppercase tracking-[-0.04em]">Modes de paiement</h3>
              </div>
              <button onClick={() => setShowPaymentModal(false)} className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-[14px] border-2 border-[#0f172a] bg-[#fdfaf6] text-[#1a5f7a] transition-colors hover:bg-[#e38154] hover:text-white"><X size={24} /></button>
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
                  <label key={mode.id} className="flex cursor-pointer items-center justify-between rounded-[18px] border-2 border-slate-200 bg-[#fdfaf6] p-4 transition-colors hover:border-[#0f172a]">
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
                    <input type="text" className="w-full rounded-[16px] border-2 border-[#0f172a] bg-[#fdfaf6] px-[18px] py-[15px] text-[13.5px] font-bold text-[#0f172a] outline-none focus:bg-white" value={prices.nom_compte} onChange={e => setPrices({...prices, nom_compte: e.target.value})} />
                  </div>
                  <div>
                    <label className="text-[9px] font-black text-slate-400 uppercase ml-2 mb-1 block">IBAN</label>
                    <input type="text" className="w-full rounded-[16px] border-2 border-[#0f172a] bg-[#fdfaf6] px-[18px] py-[15px] text-[13.5px] font-bold text-[#0f172a] outline-none focus:bg-white" value={prices.iban} onChange={e => setPrices({...prices, iban: e.target.value})} />
                  </div>
                  <div>
                    <label className="text-[9px] font-black text-slate-400 uppercase ml-2 mb-1 block">Code BIC</label>
                    <input type="text" className="w-full rounded-[16px] border-2 border-[#0f172a] bg-[#fdfaf6] px-[18px] py-[15px] text-[13.5px] font-bold text-[#0f172a] outline-none focus:bg-white" value={prices.bic} onChange={e => setPrices({...prices, bic: e.target.value})} />
                  </div>
                </div>
              )}

              <button type="submit" disabled={saveLoading} className="flex w-full items-center justify-center gap-2.5 rounded-[18px] border-2 border-[#0f172a] py-5 text-[11px] font-extrabold uppercase tracking-[0.16em] text-white shadow-[5px_5px_0_#0f172a] transition-[transform,box-shadow] duration-200 hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-[2px_2px_0_#0f172a]" style={{ background: '#059669' }}>
                {saveLoading ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />} Enregistrer les modes
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODALE CONTACT */}
      {showContactModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 backdrop-blur-[6px] sm:p-[22px]" style={{ background: 'rgba(15,23,42,.7)' }}>
          <div className="anim-modal-in flex max-h-[88vh] w-full max-w-md flex-col overflow-hidden rounded-[36px] border-2 border-[#0f172a] bg-white shadow-[12px_12px_0_#1a5f7a]">
            <div className="flex shrink-0 items-center justify-between gap-4 border-b-2 border-[#0f172a] px-6 py-5">
              <div className="flex items-center gap-3">
                <div className="flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-[16px] border-2 border-[#0f172a] text-white bg-blue-500"><User size={20}/></div>
                <h3 className="font-display text-[21px] font-extrabold uppercase tracking-[-0.04em]">Contact Référent</h3>
              </div>
              <button onClick={() => setShowContactModal(false)} className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-[14px] border-2 border-[#0f172a] bg-[#fdfaf6] text-[#1a5f7a] transition-colors hover:bg-[#e38154] hover:text-white"><X size={24} /></button>
            </div>
            <form onSubmit={handleUpdatePrice} className="p-8 space-y-6 overflow-y-auto">
              <HelpBox text="Ces informations sont affichées sur la page d'accueil pour les visiteurs." color="blue" />
              <div>
                <label className="mb-2 block text-[9px] font-extrabold uppercase tracking-[0.14em] text-slate-400">Nom complet</label>
                <input type="text" className="w-full rounded-[16px] border-2 border-[#0f172a] bg-[#fdfaf6] px-[18px] py-[15px] text-[13.5px] font-bold text-[#0f172a] outline-none focus:bg-white" value={prices.contact_nom} onChange={e => setPrices({...prices, contact_nom: e.target.value})} />
              </div>
              <div>
                <label className="mb-2 block text-[9px] font-extrabold uppercase tracking-[0.14em] text-slate-400">Téléphone</label>
                <input type="text" className="w-full rounded-[16px] border-2 border-[#0f172a] bg-[#fdfaf6] px-[18px] py-[15px] text-[13.5px] font-bold text-[#0f172a] outline-none focus:bg-white" value={prices.contact_tel} onChange={e => setPrices({...prices, contact_tel: e.target.value})} />
              </div>
              <div>
                <label className="mb-2 block text-[9px] font-extrabold uppercase tracking-[0.14em] text-slate-400">Email</label>
                <input type="email" className="w-full rounded-[16px] border-2 border-[#0f172a] bg-[#fdfaf6] px-[18px] py-[15px] text-[13.5px] font-bold text-[#0f172a] outline-none focus:bg-white" value={prices.contact_email} onChange={e => setPrices({...prices, contact_email: e.target.value})} />
              </div>
              <button type="submit" disabled={saveLoading} className="flex w-full items-center justify-center gap-2.5 rounded-[18px] border-2 border-[#0f172a] py-5 text-[11px] font-extrabold uppercase tracking-[0.16em] text-white shadow-[5px_5px_0_#0f172a] transition-[transform,box-shadow] duration-200 hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-[2px_2px_0_#0f172a]" style={{ background: '#3b82f6' }}>
                {saveLoading ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />} Enregistrer le contact
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODALE QUOTAS */}
      {showQuotaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 backdrop-blur-[6px] sm:p-[22px]" style={{ background: 'rgba(15,23,42,.7)' }}>
          <div className="anim-modal-in flex max-h-[88vh] w-full max-w-md flex-col overflow-hidden rounded-[36px] border-2 border-[#0f172a] bg-white shadow-[12px_12px_0_#1a5f7a]">
            <div className="flex shrink-0 items-center justify-between gap-4 border-b-2 border-[#0f172a] px-6 py-5">
              <div className="flex items-center gap-3">
                <div className="flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-[16px] border-2 border-[#0f172a] text-white bg-emerald-500"><Hash size={20}/></div>
                <h3 className="font-display text-[21px] font-extrabold uppercase tracking-[-0.04em]">Quotas d'emprunt</h3>
              </div>
              <button onClick={() => setShowQuotaModal(false)} className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-[14px] border-2 border-[#0f172a] bg-[#fdfaf6] text-[#1a5f7a] transition-colors hover:bg-[#e38154] hover:text-white"><X size={24} /></button>
            </div>
            <form onSubmit={handleUpdatePrice} className="p-8 space-y-8 overflow-y-auto">
              <HelpBox text="Déterminez le nombre maximum de jeux qu'un adhérent peut emprunter simultanément." color="blue" />
              <div className="space-y-6">
                <div>
                  <label className="mb-2 block text-[9px] font-extrabold uppercase tracking-[0.14em] text-slate-400">Particuliers (Jeux max)</label>
                  <input type="number" className="w-full rounded-[16px] border-2 border-[#0f172a] bg-[#fdfaf6] p-4 text-lg font-extrabold text-[#0f172a] outline-none focus:bg-white" value={prices.quota_particulier} onChange={e => setPrices({...prices, quota_particulier: e.target.value})} />
                </div>
                <div>
                  <label className="mb-2 block text-[9px] font-extrabold uppercase tracking-[0.14em] text-slate-400">Associations (Jeux max)</label>
                  <input type="number" className="w-full rounded-[16px] border-2 border-[#0f172a] bg-[#fdfaf6] p-4 text-lg font-extrabold text-[#0f172a] outline-none focus:bg-white" value={prices.quota_association} onChange={e => setPrices({...prices, quota_association: e.target.value})} />
                </div>
              </div>
              <button type="submit" disabled={saveLoading} className="flex w-full items-center justify-center gap-2.5 rounded-[18px] border-2 border-[#0f172a] py-5 text-[11px] font-extrabold uppercase tracking-[0.16em] text-white shadow-[5px_5px_0_#0f172a] transition-[transform,box-shadow] duration-200 hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-[2px_2px_0_#0f172a]" style={{ background: '#10b981' }}>
                {saveLoading ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />} Enregistrer les quotas
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODALE FINANCE */}
      {showFinanceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 backdrop-blur-[6px] sm:p-[22px]" style={{ background: 'rgba(15,23,42,.7)' }}>
          <div className="anim-modal-in flex max-h-[88vh] w-full flex-col overflow-hidden rounded-[36px] border-2 border-[#0f172a] bg-white shadow-[12px_12px_0_#1a5f7a] max-w-2xl">
            <div className="flex shrink-0 items-center justify-between gap-4 border-b-2 border-[#0f172a] px-6 py-5">
              <h3 className="font-display text-[21px] font-extrabold uppercase tracking-[-0.04em]">Finance & Règles</h3>
              <button onClick={() => setShowFinanceModal(false)} className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-[14px] border-2 border-[#0f172a] bg-[#fdfaf6] text-[#1a5f7a] transition-colors hover:bg-[#e38154] hover:text-white"><X size={24} /></button>
            </div>
            <form onSubmit={handleUpdatePrice} className="p-8 overflow-y-auto space-y-10">
              {/* PARTIE PARTICULIERS */}
              <div className="space-y-6">
                <div className="flex items-center gap-2 text-[#1a5f7a] font-black text-[11px] uppercase tracking-widest"><Euro size={18}/> Particuliers</div>
                <div className="grid grid-cols-2 gap-2 rounded-[18px] border-2 border-[#0f172a] bg-slate-100 p-1.5">
                  <button type="button" onClick={() => setPrices({...prices, mode_adhesion_particulier: 'degressif'})} className={`py-3 rounded-xl text-[10px] font-black uppercase transition-all ${prices.mode_adhesion_particulier === 'degressif' ? 'bg-white shadow-md text-[#1a5f7a]' : 'text-slate-400'}`}>Dégressif</button>
                  <button type="button" onClick={() => setPrices({...prices, mode_adhesion_particulier: 'glissant'})} className={`py-3 rounded-xl text-[10px] font-black uppercase transition-all ${prices.mode_adhesion_particulier === 'glissant' ? 'bg-white shadow-md text-[#1a5f7a]' : 'text-slate-400'}`}>Année Glissante</button>
                </div>
                <HelpBox text={prices.mode_adhesion_particulier === 'degressif' ? "Le mode dégressif réduit le prix chaque mois automatiquement. L'adhésion s'arrête toujours au 31 décembre de l'année en cours." : "L'année glissante applique un tarif fixe. L'adhésion est valable 12 mois à partir de la date de paiement."} />
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div><label className="text-[9px] font-black text-slate-400 uppercase ml-2 mb-1 block">Prix Base</label><input type="number" className="w-full rounded-[16px] border-2 border-[#0f172a] bg-[#fdfaf6] p-4 font-extrabold outline-none focus:bg-white" value={prices.prix_particulier} onChange={e => setPrices({...prices, prix_particulier: e.target.value})} /></div>
                  {prices.mode_adhesion_particulier === 'degressif' && (
                    <>
                      <div><label className="text-[9px] font-black text-slate-400 uppercase ml-2 mb-1 block">Baisse/Mois</label><input type="number" className="w-full rounded-[16px] border-2 border-[#0f172a] bg-[#fdfaf6] p-4 font-extrabold outline-none focus:bg-white" value={prices.degressivite_mensuelle} onChange={e => setPrices({...prices, degressivite_mensuelle: e.target.value})} /></div>
                      <div><label className="text-[9px] font-black text-slate-400 uppercase ml-2 mb-1 block">Prix Min</label><input type="number" className="w-full rounded-[16px] border-2 border-[#0f172a] bg-[#fdfaf6] p-4 font-extrabold outline-none focus:bg-white" value={prices.prix_minimum} onChange={e => setPrices({...prices, prix_minimum: e.target.value})} /></div>
                    </>
                  )}
                </div>
                <div className={`rounded-[22px] border-2 border-[#0f172a] p-6 transition-colors ${prices.active_caution_particulier === "true" ? 'bg-orange-50 border-orange-100' : 'bg-slate-50 border-transparent'}`}>
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
                <div className="grid grid-cols-2 gap-2 rounded-[18px] border-2 border-[#0f172a] bg-slate-100 p-1.5">
                  <button type="button" onClick={() => setPrices({...prices, mode_adhesion_association: 'degressif'})} className={`py-3 rounded-xl text-[10px] font-black uppercase transition-all ${prices.mode_adhesion_association === 'degressif' ? 'bg-white shadow-md text-[#e38154]' : 'text-slate-400'}`}>Dégressif</button>
                  <button type="button" onClick={() => setPrices({...prices, mode_adhesion_association: 'glissant'})} className={`py-3 rounded-xl text-[10px] font-black uppercase transition-all ${prices.mode_adhesion_association === 'glissant' ? 'bg-white shadow-md text-[#e38154]' : 'text-slate-400'}`}>Année Glissante</button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div><label className="text-[9px] font-black text-slate-400 uppercase ml-2 mb-1 block">Prix Base</label><input type="number" className="w-full rounded-[16px] border-2 border-[#0f172a] bg-[#fdfaf6] p-4 font-extrabold outline-none focus:bg-white" value={prices.prix_association} onChange={e => setPrices({...prices, prix_association: e.target.value})} /></div>
                  {prices.mode_adhesion_association === 'degressif' && (
                    <>
                      <div><label className="text-[9px] font-black text-slate-400 uppercase ml-2 mb-1 block">Baisse/Mois</label><input type="number" className="w-full rounded-[16px] border-2 border-[#0f172a] bg-[#fdfaf6] p-4 font-extrabold outline-none focus:bg-white" value={prices.degressivite_association} onChange={e => setPrices({...prices, degressivite_association: e.target.value})} /></div>
                      <div><label className="text-[9px] font-black text-slate-400 uppercase ml-2 mb-1 block">Prix Min</label><input type="number" className="w-full rounded-[16px] border-2 border-[#0f172a] bg-[#fdfaf6] p-4 font-extrabold outline-none focus:bg-white" value={prices.prix_minimum_asso} onChange={e => setPrices({...prices, prix_minimum_asso: e.target.value})} /></div>
                    </>
                  )}
                </div>
                <div className={`rounded-[22px] border-2 border-[#0f172a] p-6 transition-colors ${prices.active_caution_association === "true" ? 'bg-emerald-50 border-emerald-100' : 'bg-slate-50 border-transparent'}`}>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 backdrop-blur-[6px] sm:p-[22px]" style={{ background: 'rgba(15,23,42,.7)' }}>
          <div className="anim-modal-in flex max-h-[88vh] w-full flex-col overflow-hidden rounded-[36px] border-2 border-[#0f172a] bg-white shadow-[12px_12px_0_#1a5f7a] max-w-2xl">
            <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-white sticky top-0 z-10">
              <h3 className="font-display text-[21px] font-extrabold uppercase tracking-[-0.04em]">Équipe & Accès</h3>
              <button onClick={() => setShowVolunteerModal(false)} className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-[14px] border-2 border-[#0f172a] bg-[#fdfaf6] text-[#1a5f7a] transition-colors hover:bg-[#e38154] hover:text-white"><X size={24} /></button>
            </div>
            
            <div className="p-8 overflow-y-auto space-y-10">
              <form onSubmit={handleAddVolunteer} className="space-y-6 rounded-[26px] border-2 border-[#0f172a] bg-[#fdfaf6] p-6">
                <div className="grid grid-cols-2 gap-4">
                  <input type="text" placeholder="Prénom" className="w-full p-4 rounded-2xl bg-white font-bold outline-none" value={firstName} onChange={e => setFirstName(e.target.value)} required />
                  <input type="text" placeholder="Nom" className="w-full p-4 rounded-2xl bg-white font-bold outline-none" value={lastName} onChange={e => setLastName(e.target.value)} required />
                </div>
                <input type="email" placeholder="Email" className="w-full p-4 rounded-2xl bg-white font-bold outline-none" value={newEmail} onChange={e => setNewEmail(e.target.value)} required />
                <input type="password" placeholder="Mot de passe" className="w-full p-4 rounded-2xl bg-white font-bold outline-none" value={newPassword} onChange={e => setNewPassword(e.target.value)} required />
                <button type="submit" disabled={loading} className="flex w-full items-center justify-center gap-2.5 rounded-[18px] border-2 border-[#0f172a] py-5 text-[11px] font-extrabold uppercase tracking-[0.16em] text-white shadow-[5px_5px_0_#0f172a] transition-[transform,box-shadow] duration-200 hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-[2px_2px_0_#0f172a]" style={{ background: '#1a5f7a' }}>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 backdrop-blur-[6px] sm:p-[22px]" style={{ background: 'rgba(15,23,42,.7)' }}>
          <div className="anim-modal-in flex max-h-[88vh] w-full max-w-lg flex-col overflow-hidden rounded-[36px] border-2 border-[#0f172a] bg-white shadow-[12px_12px_0_#1a5f7a]">
            <div className="flex shrink-0 items-center justify-between gap-4 border-b-2 border-[#0f172a] px-6 py-5">
              <div className="flex items-center gap-3">
                <div className="flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-[16px] border-2 border-[#0f172a] text-white bg-amber-500"><Clock size={20}/></div>
                <h3 className="font-display text-[21px] font-extrabold uppercase tracking-[-0.04em]">Horaires d'ouverture</h3>
              </div>
              <button onClick={() => setShowHorairesModal(false)} className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-[14px] border-2 border-[#0f172a] bg-[#fdfaf6] text-[#1a5f7a] transition-colors hover:bg-[#e38154] hover:text-white"><X size={24} /></button>
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
                      className="w-full rounded-[16px] border-2 border-[#0f172a] bg-[#fdfaf6] px-[18px] py-[15px] text-[13.5px] font-bold text-[#0f172a] outline-none focus:bg-white cursor-pointer"
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
                      className="w-full rounded-[16px] border-2 border-[#0f172a] bg-[#fdfaf6] px-[18px] py-[15px] text-[13.5px] font-bold text-[#0f172a] outline-none focus:bg-white cursor-pointer"
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
                    <input type="time" className="w-full rounded-[16px] border-2 border-[#0f172a] bg-[#fdfaf6] px-[18px] py-[15px] text-[13.5px] font-bold text-[#0f172a] outline-none focus:bg-white" value={prices.horaire_1_debut} onChange={e => setPrices({...prices, horaire_1_debut: e.target.value})} />
                  </div>
                  <div>
                    <label className="text-[9px] font-black text-slate-400 uppercase ml-2 mb-2 block">Heure de fermeture</label>
                    <input type="time" className="w-full rounded-[16px] border-2 border-[#0f172a] bg-[#fdfaf6] px-[18px] py-[15px] text-[13.5px] font-bold text-[#0f172a] outline-none focus:bg-white" value={prices.horaire_1_fin} onChange={e => setPrices({...prices, horaire_1_fin: e.target.value})} />
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
                          className="w-full rounded-[16px] border-2 border-[#0f172a] bg-[#fdfaf6] px-[18px] py-[15px] text-[13.5px] font-bold text-[#0f172a] outline-none focus:bg-white cursor-pointer"
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
                          className="w-full rounded-[16px] border-2 border-[#0f172a] bg-[#fdfaf6] px-[18px] py-[15px] text-[13.5px] font-bold text-[#0f172a] outline-none focus:bg-white cursor-pointer"
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
                        <input type="time" className="w-full rounded-[16px] border-2 border-[#0f172a] bg-[#fdfaf6] px-[18px] py-[15px] text-[13.5px] font-bold text-[#0f172a] outline-none focus:bg-white" value={prices.horaire_2_debut} onChange={e => setPrices({...prices, horaire_2_debut: e.target.value})} />
                      </div>
                      <div>
                        <label className="text-[9px] font-black text-slate-400 uppercase ml-2 mb-2 block">Heure de fermeture</label>
                        <input type="time" className="w-full rounded-[16px] border-2 border-[#0f172a] bg-[#fdfaf6] px-[18px] py-[15px] text-[13.5px] font-bold text-[#0f172a] outline-none focus:bg-white" value={prices.horaire_2_fin} onChange={e => setPrices({...prices, horaire_2_fin: e.target.value})} />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <button type="submit" disabled={saveLoading} className="flex w-full items-center justify-center gap-2.5 rounded-[18px] border-2 border-[#0f172a] py-5 text-[11px] font-extrabold uppercase tracking-[0.16em] text-white shadow-[5px_5px_0_#0f172a] transition-[transform,box-shadow] duration-200 hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-[2px_2px_0_#0f172a]" style={{ background: '#f59e0b' }}>
                {saveLoading ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />} Enregistrer les horaires
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODALE ADRESSE */}
      {showAdresseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 backdrop-blur-[6px] sm:p-[22px]" style={{ background: 'rgba(15,23,42,.7)' }}>
          <div className="anim-modal-in flex max-h-[88vh] w-full max-w-md flex-col overflow-hidden rounded-[36px] border-2 border-[#0f172a] bg-white shadow-[12px_12px_0_#1a5f7a]">
            <div className="flex shrink-0 items-center justify-between gap-4 border-b-2 border-[#0f172a] px-6 py-5">
              <div className="flex items-center gap-3">
                <div className="flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-[16px] border-2 border-[#0f172a] text-white bg-rose-500"><MapPin size={20}/></div>
                <h3 className="font-display text-[21px] font-extrabold uppercase tracking-[-0.04em]">Adresse</h3>
              </div>
              <button onClick={() => setShowAdresseModal(false)} className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-[14px] border-2 border-[#0f172a] bg-[#fdfaf6] text-[#1a5f7a] transition-colors hover:bg-[#e38154] hover:text-white"><X size={24} /></button>
            </div>
            <form onSubmit={handleUpdatePrice} className="p-8 space-y-6 overflow-y-auto">
              <HelpBox text="Cette adresse est affichée sur la page d'accueil et utilisée pour le lien Google Maps." color="blue" />
              <div>
                <label className="mb-2 block text-[9px] font-extrabold uppercase tracking-[0.14em] text-slate-400">Rue / Numéro</label>
                <input type="text" placeholder="ex: 419 Grande Rue" className="w-full rounded-[16px] border-2 border-[#0f172a] bg-[#fdfaf6] px-[18px] py-[15px] text-[13.5px] font-bold text-[#0f172a] outline-none focus:bg-white" value={prices.adresse_rue} onChange={e => setPrices({...prices, adresse_rue: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase ml-2 mb-2 block">Code postal</label>
                  <input type="text" placeholder="01270" className="w-full rounded-[16px] border-2 border-[#0f172a] bg-[#fdfaf6] px-[18px] py-[15px] text-[13.5px] font-bold text-[#0f172a] outline-none focus:bg-white" value={prices.adresse_code_postal} onChange={e => setPrices({...prices, adresse_code_postal: e.target.value})} />
                </div>
                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase ml-2 mb-2 block">Ville</label>
                  <input type="text" placeholder="Coligny" className="w-full rounded-[16px] border-2 border-[#0f172a] bg-[#fdfaf6] px-[18px] py-[15px] text-[13.5px] font-bold text-[#0f172a] outline-none focus:bg-white" value={prices.adresse_ville} onChange={e => setPrices({...prices, adresse_ville: e.target.value})} />
                </div>
              </div>
              <div className="flex items-center gap-2 rounded-[18px] border-2 border-slate-200 bg-[#fdfaf6] p-4 text-[10px] font-bold text-slate-500">
                <MapPin size={14} className="text-rose-400 shrink-0" />
                Aperçu lien Maps : <span className="text-[#1a5f7a] ml-1">{prices.adresse_rue}, {prices.adresse_code_postal} {prices.adresse_ville}</span>
              </div>
              <button type="submit" disabled={saveLoading} className="flex w-full items-center justify-center gap-2.5 rounded-[18px] border-2 border-[#0f172a] py-5 text-[11px] font-extrabold uppercase tracking-[0.16em] text-white shadow-[5px_5px_0_#0f172a] transition-[transform,box-shadow] duration-200 hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-[2px_2px_0_#0f172a]" style={{ background: '#f43f5e' }}>
                {saveLoading ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />} Enregistrer l'adresse
              </button>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRMATION */}
      {confirmModal.show && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 backdrop-blur-[6px] sm:p-[22px]" style={{ background: 'rgba(15,23,42,.7)' }}>
          <div className="anim-modal-in w-full max-w-[430px] rounded-[34px] border-2 border-[#0f172a] bg-white p-8 text-center shadow-[12px_12px_0_#10b981] md:p-9">
            <div className="mx-auto w-20 h-20 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mb-6"><CheckCircle2 size={40} /></div>
            <h3 className="text-2xl font-black uppercase text-slate-900 mb-2">{confirmModal.title}</h3>
            <p className="text-[11px] font-bold text-slate-500 mb-8 italic leading-relaxed">{confirmModal.message}</p>
            <button onClick={() => setConfirmModal({ ...confirmModal, show: false })} className="flex w-full items-center justify-center gap-2.5 rounded-[18px] border-2 border-[#0f172a] py-5 text-[11px] font-extrabold uppercase tracking-[0.16em] text-white shadow-[5px_5px_0_#0f172a] transition-[transform,box-shadow] duration-200 hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-[2px_2px_0_#0f172a]" style={{ background: '#1a5f7a' }}>Continuer</button>
          </div>
        </div>
      )}

      {/* SUPPRESSION */}
      {deleteConfirm.show && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-3 backdrop-blur-[6px] sm:p-[22px]" style={{ background: 'rgba(15,23,42,.7)' }}>
          <div className="anim-modal-in w-full max-w-[430px] rounded-[34px] border-2 border-[#0f172a] bg-white p-8 text-center shadow-[12px_12px_0_#f43f5e] md:p-9">
             <div className="mx-auto w-20 h-20 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mb-6 shadow-inner"><ShieldAlert size={40} /></div>
             <h3 className="text-2xl font-black uppercase text-slate-900 mb-2 tracking-tighter">Révoquer ?</h3>
             <p className="text-[11px] font-bold text-slate-500 mb-8 italic leading-relaxed px-2">Attention, ce bénévole n'aura plus aucun accès à l'administration.</p>
             <div className="flex flex-col gap-3">
                <button onClick={handleRemoveVolunteer} className="flex w-full items-center justify-center gap-2.5 rounded-[18px] border-2 border-[#0f172a] py-5 text-[11px] font-extrabold uppercase tracking-[0.16em] text-white shadow-[5px_5px_0_#0f172a] transition-[transform,box-shadow] duration-200 hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-[2px_2px_0_#0f172a]" style={{ background: '#f43f5e' }}>Confirmer</button>
                <button onClick={() => setDeleteConfirm({ show: false, id: null })} className="w-full py-5 bg-slate-50 text-slate-400 rounded-2xl font-black uppercase text-[10px] tracking-widest active:scale-95 transition-all">Annuler</button>
             </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════
          MODALE GESTION DES MODÈLES D'AFFICHES
      ═══════════════════════════════════════════════════════ */}
      {showAffichesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 backdrop-blur-[6px] sm:p-[22px]" style={{ background: 'rgba(15,23,42,.7)' }}>
          <div className="anim-modal-in flex max-h-[88vh] w-full flex-col overflow-hidden rounded-[36px] border-2 border-[#0f172a] bg-white shadow-[12px_12px_0_#1a5f7a] max-h-[92vh] max-w-4xl">

            {/* Header */}
            <div className="p-8 pb-4 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-purple-50 text-purple-500 rounded-xl"><Image size={20} /></div>
                <div>
                  <h3 className="font-display text-[21px] font-extrabold uppercase tracking-[-0.04em]">Modèles d'affiches</h3>
                  <p className="text-[10px] text-slate-400">{affichesTemplates.length} modèle{affichesTemplates.length > 1 ? 's' : ''} enregistré{affichesTemplates.length > 1 ? 's' : ''}</p>
                </div>
              </div>
              <button onClick={() => setShowAffichesModal(false)} className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-[14px] border-2 border-[#0f172a] bg-[#fdfaf6] text-[#1a5f7a] transition-colors hover:bg-[#e38154] hover:text-white"><X size={20} /></button>
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
                    <input className="w-full rounded-[16px] border-2 border-[#0f172a] bg-[#fdfaf6] p-3 text-sm font-bold outline-none focus:bg-white"
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
                      <input className="mt-2 w-full rounded-[16px] border-2 border-[#0f172a] bg-[#fdfaf6] p-3 text-xs font-bold outline-none focus:bg-white"
                        placeholder="ou coller une URL directement"
                        value={templateForm.url}
                        onChange={e => { setTemplateForm(prev => ({ ...prev, url: e.target.value })); setPreviewImg(e.target.value) }} />
                    )}
                  </div>

                  {/* Format du texte */}
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Format du texte (repère ①)</label>
                    <select className="w-full rounded-[16px] border-2 border-[#0f172a] bg-[#fdfaf6] p-3 text-sm font-bold outline-none focus:bg-white"
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
                    <div className="flex w-fit gap-1.5 rounded-[18px] border-2 border-[#0f172a] bg-slate-100 p-1.5">
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
                            <select className="mt-1.5 w-full rounded-[12px] border-2 border-[#0f172a] bg-[#fdfaf6] p-2 text-xs font-bold outline-none focus:bg-white"
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
                              className="mt-1.5 w-full rounded-[12px] border-2 border-[#0f172a] bg-[#fdfaf6] p-2 text-xs font-bold outline-none focus:bg-white"
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
                        <div>
                          <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Alignement</label>
                          <div className="flex gap-1 mt-1">
                            {['left', 'center', 'right'].map(a => (
                              <button key={a} onClick={() => setTemplateForm(prev => ({ ...prev, text_align: a }))}
                                className={'flex-1 py-1.5 rounded-lg text-[8px] font-black uppercase transition-all ' +
                                  (templateForm.text_align === a ? 'bg-[#e38154] text-white' : 'bg-white text-slate-400 border border-slate-200')}>
                                {a === 'left' ? '⬅' : a === 'center' ? '⬛' : '➡'}
                              </button>
                            ))}
                          </div>
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
                            <select className="mt-1.5 w-full rounded-[12px] border-2 border-[#0f172a] bg-[#fdfaf6] p-2 text-xs font-bold outline-none focus:bg-white"
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
                              className="mt-1.5 w-full rounded-[12px] border-2 border-[#0f172a] bg-[#fdfaf6] p-2 text-xs font-bold outline-none focus:bg-white"
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
                        <div>
                          <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Alignement</label>
                          <div className="flex gap-1 mt-1">
                            {['left', 'center', 'right'].map(a => (
                              <button key={a} onClick={() => setTemplateForm(prev => ({ ...prev, text_align2: a }))}
                                className={'flex-1 py-1.5 rounded-lg text-[8px] font-black uppercase transition-all ' +
                                  (templateForm.text_align2 === a ? 'bg-[#1a5f7a] text-white' : 'bg-white text-slate-400 border border-slate-200')}>
                                {a === 'left' ? '⬅' : a === 'center' ? '⬛' : '➡'}
                              </button>
                            ))}
                          </div>
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
                        className="rounded-[16px] border-2 border-[#0f172a] bg-white px-4 py-4 text-[9px] font-extrabold uppercase tracking-[0.12em] text-slate-500 transition-colors hover:bg-slate-100">
                        Annuler
                      </button>
                    )}
                  </div>
                </div>

                {/* Colonne droite : aperçu interactif */}
                <div className="space-y-3">
                  <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                    <Eye size={10} /> Aperçu interactif
                  </h4>
                  {previewImg ? (
                    <div className="space-y-2">
                      <div className="rounded-2xl border-2 border-slate-100 shadow-lg" style={{ maxHeight: '65vh', overflowY: 'auto' }}>
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
                      </div>
                      <p className="text-center text-[9px] font-black text-slate-400 uppercase tracking-widest">
                        ↑ Cliquez-glissez pour définir la zone ① ou ②
                      </p>
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
    </div>
  )
}