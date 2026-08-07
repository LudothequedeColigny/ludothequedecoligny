import { useState, useEffect } from 'react'
import { Loader2, AlertTriangle, Phone, User } from 'lucide-react'
import { supabase } from '../services/supabaseClient'
import { sendEmail } from '../services/emailService'
import Modal from './site/Modal'
import SuccessModal from './site/SuccessModal'

const FIELD = 'w-full rounded-[18px] border-2 border-[#0f172a] bg-[#fdfaf6] px-[18px] py-4 text-sm font-bold text-[#0f172a] outline-none placeholder:text-slate-400 focus:bg-white'

export default function ContactModal({ open, onClose }) {
  const [contact, setContact] = useState({ nom: '', tel: '', email: '' })
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
        setContact({ nom: obj.contact_nom || '', tel: obj.contact_tel || '', email: obj.contact_email || '' })
      }
    }
    loadContact()
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!nom.trim() || !email.trim() || !message.trim()) return
    setStatus('loading')
    try {
      const recipients = ['ludothequedecoligny@outlook.fr']
      if (contact.email && contact.email !== 'ludothequedecoligny@outlook.fr') {
        recipients.push(contact.email)
      }
      await sendEmail({
        to: recipients,
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

  if (status === 'success') {
    return (
      <SuccessModal
        open={open}
        onClose={handleClose}
        title="Message envoyé !"
        message="Nous vous répondrons dès que possible."
        actionLabel="Fermer"
      />
    )
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Nous contacter"
      maxWidth={520}
      closeTone="cream"
      panelClassName="p-7 md:p-10"
    >
      <h2 className="mb-1.5 font-display text-[28px] font-extrabold uppercase tracking-[-0.04em]">
        Nous contacter
      </h2>
      <p className="mb-5 text-[13px] text-slate-500">
        Une question sur un jeu, une adhésion, un événement ? Écrivez-nous.
      </p>

      {/* Coordonnées de la personne référente — lecture seule */}
      {(contact.nom || contact.tel) && (
        <div className="mb-5 flex flex-wrap items-center gap-x-5 gap-y-2 rounded-[18px] border-2 border-dashed border-slate-200 px-4 py-3">
          {contact.nom && (
            <span className="flex items-center gap-2 text-[13px] font-bold text-slate-600">
              <User size={15} className="text-slate-400" /> {contact.nom}
            </span>
          )}
          {contact.tel && (
            <a
              href={`tel:${contact.tel.replace(/\s/g, '')}`}
              className="flex items-center gap-2 text-[13px] font-medium text-slate-500 transition-colors hover:text-[#1a5f7a]"
            >
              <Phone size={15} className="text-slate-400" /> {contact.tel}
            </a>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <input
          required
          placeholder="Votre nom"
          value={nom}
          onChange={e => setNom(e.target.value)}
          className={`${FIELD} mb-3`}
        />
        <input
          required
          type="email"
          placeholder="Votre email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          className={`${FIELD} mb-3`}
        />
        <textarea
          required
          rows={4}
          placeholder="Votre message"
          value={message}
          onChange={e => setMessage(e.target.value)}
          className="mb-5 w-full resize-none rounded-[20px] border-2 border-[#0f172a] bg-[#fdfaf6] px-[18px] py-4 text-sm font-medium text-[#0f172a] outline-none placeholder:text-slate-400 focus:bg-white"
        />

        {status === 'error' && (
          <div className="mb-4 flex items-center gap-2 rounded-[18px] border-2 border-rose-200 bg-rose-50 p-4 text-xs font-bold text-rose-600">
            <AlertTriangle size={16} className="shrink-0" /> Une erreur est survenue. Réessayez.
          </div>
        )}

        <button
          type="submit"
          disabled={status === 'loading'}
          className="flex w-full items-center justify-center gap-2.5 rounded-[18px] border-2 border-[#0f172a] bg-[#e38154] py-5 text-[11px] font-extrabold uppercase tracking-[0.16em] text-white shadow-[5px_5px_0_#0f172a] transition-[transform,box-shadow] duration-200 hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-[2px_2px_0_#0f172a] disabled:pointer-events-none disabled:opacity-50"
        >
          {status === 'loading' ? <><Loader2 size={16} className="animate-spin" /> Envoi...</> : 'Envoyer le message'}
        </button>
      </form>
    </Modal>
  )
}
