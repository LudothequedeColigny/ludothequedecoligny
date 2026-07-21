import { useState, useEffect } from 'react'
import { X, Mail, User, Phone, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react'
import { supabase } from '../services/supabaseClient'
import { sendEmail } from '../services/emailService'

export default function ContactModal({ open, onClose }) {
  const [contact, setContact] = useState({ nom: '', tel: '' })
  const [nom, setNom] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [status, setStatus] = useState('idle') // idle | loading | success | error

  useEffect(() => {
    async function loadContact() {
      const { data } = await supabase.from('settings').select('*')
      if (data) {
        const obj = {}
        data.forEach(s => { obj[s.id] = s.value })
        setContact({ nom: obj.contact_nom || '', tel: obj.contact_tel || '' })
      }
    }
    loadContact()
  }, [])

  if (!open) return null

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!nom.trim() || !email.trim() || !message.trim()) return
    setStatus('loading')
    try {
      await sendEmail({
        to: ['ludothequedecoligny@outlook.fr'],
        subject: `Message de ${nom} via le site`,
        html: `
          <p><strong>De :</strong> ${nom} (${email})</p>
          <p><strong>Message :</strong></p>
          <p>${message.replace(/\n/g, '<br>')}</p>
        `,
      })
      setStatus('success')
      setNom('')
      setEmail('')
      setMessage('')
    } catch (err) {
      console.error('Erreur envoi message de contact:', err)
      setStatus('error')
    }
  }

  const handleClose = () => {
    setStatus('idle')
    onClose()
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" onClick={handleClose}>
      <div className="bg-white max-w-lg w-full rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
        {/* En-tête */}
        <div className="p-8 pb-6 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#1a5f7a]/10 text-[#1a5f7a] rounded-xl"><Mail size={20} /></div>
            <h3 className="text-lg font-black uppercase tracking-tight text-slate-900">Nous contacter</h3>
          </div>
          <button onClick={handleClose} className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-all">
            <X size={20} />
          </button>
        </div>

        <div className="p-8 space-y-6">
          {/* Coordonnées — lecture seule */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex items-center gap-3 flex-1">
              <div className="w-9 h-9 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 shrink-0"><User size={16} /></div>
              <span className="text-sm font-bold text-slate-600">{contact.nom || '—'}</span>
            </div>
            <a href={`tel:${(contact.tel || '').replace(/\s/g, '')}`} className="flex items-center gap-3 flex-1 hover:text-[#1a5f7a] transition-colors">
              <div className="w-9 h-9 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 shrink-0"><Phone size={16} /></div>
              <span className="text-sm font-medium text-slate-500">{contact.tel || '—'}</span>
            </a>
          </div>

          <div className="h-px bg-slate-100" />

          {status === 'success' ? (
            <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-100 rounded-2xl p-5">
              <CheckCircle2 className="text-emerald-500 shrink-0" size={22} />
              <p className="font-black text-emerald-700 uppercase text-xs tracking-tight">Message envoyé !</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <input
                required
                placeholder="Votre nom"
                value={nom}
                onChange={e => setNom(e.target.value)}
                className="w-full p-4 bg-slate-50 rounded-2xl font-bold text-sm outline-none border-2 border-transparent focus:border-[#1a5f7a]/30 transition-all"
              />
              <input
                required
                type="email"
                placeholder="Votre email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full p-4 bg-slate-50 rounded-2xl font-bold text-sm outline-none border-2 border-transparent focus:border-[#1a5f7a]/30 transition-all"
              />
              <textarea
                required
                rows={5}
                placeholder="Votre message"
                value={message}
                onChange={e => setMessage(e.target.value)}
                className="w-full p-4 bg-slate-50 rounded-2xl font-medium text-sm outline-none border-2 border-transparent focus:border-[#1a5f7a]/30 resize-none transition-all"
              />

              {status === 'error' && (
                <div className="flex items-center gap-2 bg-rose-50 border border-rose-100 rounded-2xl p-4 text-rose-600 text-xs font-bold">
                  <AlertTriangle size={16} className="shrink-0" /> Une erreur est survenue. Réessayez.
                </div>
              )}

              <button
                type="submit"
                disabled={status === 'loading'}
                className="w-full py-4 bg-[#1a5f7a] text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg hover:bg-[#154f67] active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {status === 'loading' ? <><Loader2 size={16} className="animate-spin" /> Envoi...</> : 'Envoyer'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
