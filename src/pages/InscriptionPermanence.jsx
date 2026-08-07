import { useState, useEffect } from 'react'
import { supabase } from '../services/supabaseClient'
import { Send, Loader2, XCircle, Check } from 'lucide-react'
import PublicLayout from '../components/site/PublicLayout'
import MaskIcon from '../components/site/MaskIcon'
import Reveal from '../components/site/Reveal'
import SuccessModal from '../components/site/SuccessModal'
import { BTN_PRIMARY, INPUT } from '../components/site/styles'

const MAX_VOLUNTEERS = 4

export default function InscriptionPermanence() {
  const [shifts, setShifts] = useState([])
  const [loading, setLoading] = useState(true)
  const [name, setName] = useState('')
  const [selectedShifts, setSelectedShifts] = useState([])
  const [success, setSuccess] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    async function fetchActiveShifts() {
      setLoading(true)
      const { data, error } = await supabase
        .from('shifts')
        .select('*')
        .gte('date', new Date().toISOString().split('T')[0])
        .order('date', { ascending: true })

      if (!error) setShifts(data || [])
      setLoading(false)
    }
    fetchActiveShifts()
  }, [])

  // Formate "HH:MM:SS" ou "HH:MM" → "HHhMM"
  const fmt = (time) => time ? time.slice(0, 5).replace(':', 'h') : ''

  const toggleShift = (id, isFull) => {
    if (isFull) return;
    if (selectedShifts.includes(id)) {
      setSelectedShifts(selectedShifts.filter(sId => sId !== id))
    } else {
      setSelectedShifts([...selectedShifts, id])
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (selectedShifts.length === 0 || !name.trim() || isSubmitting) return

    setIsSubmitting(true)
    let hasError = false

    try {
      for (const shiftId of selectedShifts) {
        const shift = shifts.find(s => s.id === shiftId)
        const isAlreadyIn = shift.volunteers?.some(v => v.name.toLowerCase() === name.trim().toLowerCase())
        const isFull = (shift.volunteers?.length || 0) >= MAX_VOLUNTEERS

        if (!isAlreadyIn && !isFull) {
          const updatedVolunteers = [...(shift.volunteers || []), {
            name: name.trim(),
            date_reg: new Date().toISOString()
          }]
          const { error } = await supabase
            .from('shifts')
            .update({ volunteers: updatedVolunteers })
            .eq('id', shiftId)
          if (error) hasError = true
        }
      }

      if (!hasError) {
        setSuccess(true)
        setName('')
        setSelectedShifts([])
        const { data } = await supabase.from('shifts').select('*').gte('date', new Date().toISOString().split('T')[0]).order('date', { ascending: true })
        setShifts(data || [])
      }
    } catch (err) {
      console.error(err)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loading) return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#fdfaf6] font-body text-[#1a5f7a]">
      <Loader2 className="animate-spin" size={40} />
      <span className="text-[10px] font-extrabold uppercase tracking-[0.2em]">Ouverture du planning...</span>
    </div>
  )

  return (
    <PublicLayout>
      <main className="px-4 pb-16 pt-9 md:px-10 md:pb-24 md:pt-14">
        <div className="mx-auto max-w-[560px]">
          <div className="mb-9 text-center">
            <div className="anim-soft-in mx-auto mb-5 flex h-[78px] w-[78px] rotate-3 items-center justify-center rounded-[26px] border-2 border-[#0f172a] bg-[#1a5f7a] shadow-[5px_5px_0_#e38154]">
              <MaskIcon file="05.svg" size={34} color="#ffffff" />
            </div>
            <h1
              className="anim-soft-in font-display text-[25px] font-extrabold uppercase leading-none tracking-[-0.045em] sm:text-[30px] md:text-[44px]"
              style={{ animationDelay: '0.12s' }}
            >
              Inscription aux<br /><span className="text-[#e38154]">permanences</span>
            </h1>
            <div className="mt-4 text-[10px] font-extrabold uppercase tracking-[0.2em] text-slate-400">
              Ludothèque de Coligny
            </div>
          </div>

          <Reveal
            variant="scale"
            className="rounded-[34px] border-2 border-[#0f172a] bg-white p-6 shadow-[8px_8px_0_#1a5f7a] md:p-8"
          >
            <form onSubmit={handleSubmit}>
              <label
                htmlFor="benevole-nom"
                className="mb-3 block text-[10px] font-extrabold uppercase italic tracking-[0.16em] text-[#1a5f7a]"
              >
                1. Ton prénom et nom
              </label>
              <input
                id="benevole-nom"
                required
                placeholder="Camille Martin"
                className={`${INPUT} mb-7`}
                value={name}
                onChange={e => setName(e.target.value)}
              />

              <div className="mb-4 text-[10px] font-extrabold uppercase italic tracking-[0.16em] text-[#1a5f7a]">
                2. Choisir tes dates de permanence
              </div>

              <div className="flex flex-col gap-4">
                {shifts.length > 0 ? shifts.map(shift => {
                  const volunteers = shift.volunteers || []
                  const isFull = volunteers.length >= MAX_VOLUNTEERS
                  const isSelected = selectedShifts.includes(shift.id)
                  const day = new Date(shift.date)

                  return (
                    <div key={shift.id}>
                      <button
                        type="button"
                        onClick={() => toggleShift(shift.id, isFull)}
                        disabled={isFull}
                        aria-pressed={isSelected}
                        className={`flex w-full items-center justify-between gap-3.5 rounded-[26px] border-2 border-[#0f172a] bg-white p-4 text-left transition-[transform,box-shadow] duration-200 ${
                          isFull
                            ? 'cursor-not-allowed opacity-50 grayscale shadow-[2px_2px_0_#cbd5e1]'
                            : isSelected
                              ? 'translate-x-[2px] translate-y-[2px] shadow-[2px_2px_0_#1a5f7a]'
                              : 'shadow-[4px_4px_0_#e38154] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_#1a5f7a]'
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          <div
                            className={`flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-[18px] border-2 border-[#0f172a] ${
                              isSelected ? 'bg-[#1a5f7a] text-white' : 'bg-slate-100 text-slate-500'
                            }`}
                          >
                            <span className="text-[9px] font-extrabold uppercase tracking-[0.1em]">
                              {day.toLocaleDateString('fr-FR', { month: 'short' })}
                            </span>
                            <span className="font-display text-[21px] font-extrabold leading-none">
                              {day.getDate()}
                            </span>
                          </div>
                          <div>
                            <div className="font-display text-[16px] font-extrabold uppercase tracking-[-0.02em]">
                              {day.toLocaleDateString('fr-FR', { weekday: 'long' })}
                            </div>
                            <div className="mt-1.5 inline-block rounded-lg bg-[#f0f7f9] px-2.5 py-1 text-[11px] font-bold text-[#1a5f7a]">
                              {fmt(shift.start_time)} — {fmt(shift.end_time)}
                            </div>
                          </div>
                        </div>

                        <div className="shrink-0 text-center">
                          {isSelected ? (
                            <div className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-[#0f172a] bg-[#1a5f7a] text-white">
                              <Check size={18} strokeWidth={4} />
                            </div>
                          ) : isFull ? (
                            <XCircle size={24} className="text-slate-300" />
                          ) : (
                            <>
                              <div className="font-display text-[17px] font-extrabold text-[#0f172a]">
                                {volunteers.length}<span className="text-slate-300">/</span>{MAX_VOLUNTEERS}
                              </div>
                              <div className="text-[8px] font-extrabold uppercase tracking-[0.1em] text-slate-400">
                                Places
                              </div>
                            </>
                          )}
                        </div>
                      </button>

                      {volunteers.length > 0 && (
                        <div className="mt-3 flex flex-wrap justify-center gap-1.5">
                          {volunteers.map((v, i) => (
                            <span
                              key={i}
                              className="rounded-[10px] border border-slate-200 bg-[#fdfaf6] px-2.5 py-1.5 text-[10px] font-bold italic text-slate-500"
                            >
                              {v.name}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                }) : (
                  <div className="rounded-[26px] border-2 border-dashed border-slate-200 bg-[#fdfaf6] p-10 text-center">
                    <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-slate-400">
                      Aucune date prévue
                    </p>
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={selectedShifts.length === 0 || !name.trim() || isSubmitting}
                className={`${BTN_PRIMARY} mt-7 w-full`}
              >
                {isSubmitting ? (
                  <Loader2 className="animate-spin" size={18} />
                ) : (
                  <>
                    {selectedShifts.length > 0
                      ? `Valider mes ${selectedShifts.length} présences`
                      : 'Valider mes présences'}
                    <Send size={16} />
                  </>
                )}
              </button>
            </form>
          </Reveal>

          <p className="mt-8 text-center text-[9px] font-extrabold uppercase tracking-[0.3em] text-slate-300">
            Association PACTES — Ludothèque de Coligny
          </p>
        </div>
      </main>

      <SuccessModal
        open={success}
        onClose={() => setSuccess(false)}
        message="Tes présences ont été bien enregistrées."
        actionLabel="Retour au planning"
      />
    </PublicLayout>
  )
}
