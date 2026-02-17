import { useState, useEffect } from 'react'
import { supabase } from '../services/supabaseClient'
import { 
  CheckCircle, 
  Clock, 
  User, 
  Send, 
  Heart,
  Loader2,
  Users,
  XCircle,
  Check,
  Calendar as CalendarIcon
} from 'lucide-react'

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
        const isFull = (shift.volunteers?.length || 0) >= 4

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
    <div className="min-h-screen bg-[#fdfaf6] flex flex-col items-center justify-center gap-4 text-[#1a5f7a]">
      <Loader2 className="animate-spin" size={40} />
      <span className="font-black uppercase text-[10px] tracking-widest">Ouverture du planning...</span>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#fdfaf6] flex items-center justify-center p-4 font-sans text-slate-900">
      <div className="max-w-md w-full">
        
        {/* HEADER */}
        <div className="text-center mb-10">
          <div className="w-20 h-20 bg-[#1a5f7a] rounded-[2rem] flex items-center justify-center text-white mx-auto mb-6 shadow-xl rotate-3">
            <Heart size={32} fill="currentColor" />
          </div>
          <h1 className="text-3xl font-black text-slate-900 uppercase leading-none tracking-tighter">
            Espace <br/><span className="text-[#e38154]">Bénévoles</span>
          </h1>
          <p className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.2em] mt-4">
            Ludothèque du Village
          </p>
        </div>

        {success ? (
          <div className="bg-white p-10 rounded-[3rem] text-center animate-in zoom-in duration-500 shadow-xl border border-emerald-100">
            <div className="w-20 h-20 bg-emerald-500 text-white rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle size={40} />
            </div>
            <h2 className="text-2xl font-black text-slate-900 uppercase mb-2">Merci !</h2>
            <p className="text-slate-500 font-medium mb-8">Tes présences ont été bien enregistrées.</p>
            <button onClick={() => setSuccess(false)} className="px-8 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest">Retour au planning</button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="bg-white p-8 rounded-[2.5rem] shadow-2xl shadow-slate-200/50 border border-slate-50">
            <div className="space-y-8">
              
              {/* INPUT NOM & PRÉNOM */}
              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase text-[#1a5f7a] ml-2 tracking-widest italic">1. Ton Prénom et Nom</label>
                <div className="relative">
                  <User className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
                  <input required placeholder="Camille Martin" className="w-full pl-14 pr-6 py-5 bg-slate-50 rounded-2xl outline-none font-bold text-slate-900 border-2 border-transparent focus:border-[#1a5f7a]/20 transition-all" value={name} onChange={e => setName(e.target.value)} />
                </div>
              </div>

              {/* LISTE DES DATES */}
              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase text-[#1a5f7a] ml-2 tracking-widest italic">2. Choisir tes dates de permanence</label>
                <div className="space-y-8 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar pt-2">
                  {shifts.length > 0 ? shifts.map(shift => {
                    const isFull = (shift.volunteers?.length || 0) >= 4;
                    const isSelected = selectedShifts.includes(shift.id);

                    return (
                      <div key={shift.id} className="relative">
                        <div 
                          onClick={() => toggleShift(shift.id, isFull)}
                          className={`relative z-10 flex items-center justify-between p-6 rounded-[1.8rem] border-[3px] transition-all cursor-pointer ${
                            isSelected 
                            ? 'border-[#1a5f7a] bg-white shadow-xl -translate-y-1' 
                            : isFull 
                              ? 'border-slate-50 bg-slate-50/50 opacity-50 grayscale cursor-not-allowed'
                              : 'border-slate-100 bg-white hover:border-slate-200 shadow-sm'
                          }`}
                        >
                          <div className="flex items-center gap-5">
                            <div className={`w-14 h-14 rounded-2xl flex flex-col items-center justify-center transition-all ${isSelected ? 'bg-[#1a5f7a] text-white scale-110 shadow-lg' : 'bg-slate-100 text-slate-500'}`}>
                              <span className="text-[9px] font-black uppercase">{new Date(shift.date).toLocaleDateString('fr-FR', { month: 'short' })}</span>
                              <span className="text-xl font-black leading-none">{new Date(shift.date).getDate()}</span>
                            </div>
                            <div className="flex flex-col">
                              <span className="font-black text-sm uppercase text-slate-900 tracking-tight">
                                {new Date(shift.date).toLocaleDateString('fr-FR', { weekday: 'long' })}
                              </span>
                              <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#1a5f7a] bg-cyan-50 px-2 py-0.5 rounded-md mt-1 w-fit">
                                <Clock size={12}/> {shift.start_time} — {shift.end_time}
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center justify-center">
                            {isSelected ? (
                              <div className="w-8 h-8 bg-[#1a5f7a] rounded-full flex items-center justify-center text-white shadow-lg animate-in zoom-in">
                                <Check size={20} strokeWidth={4} />
                              </div>
                            ) : isFull ? (
                              <XCircle size={24} className="text-slate-300" />
                            ) : (
                              <div className="text-center">
                                <div className="text-[14px] font-black text-slate-900">{shift.volunteers?.length || 0}<span className="text-slate-300 mx-0.5">/</span>4</div>
                                <div className="text-[8px] font-black uppercase text-slate-400 tracking-tighter">Places</div>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Noms des bénévoles - Plus discret mais clair */}
                        {shift.volunteers?.length > 0 && (
                          <div className="mt-3 px-2">
                            <div className="flex items-center gap-2 mb-2">
                                <div className="h-[1px] bg-slate-100 flex-grow"></div>
                                <span className="text-[9px] font-black uppercase text-slate-300 tracking-widest whitespace-nowrap">Bénévoles présents</span>
                                <div className="h-[1px] bg-slate-100 flex-grow"></div>
                            </div>
                            <div className="flex flex-wrap gap-1.5 justify-center">
                              {shift.volunteers.map((v, i) => (
                                <span key={i} className="px-2.5 py-1 bg-slate-50 text-slate-500 rounded-lg text-[10px] font-bold border border-slate-100 italic">
                                  {v.name}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  }) : (
                    <div className="p-10 text-center bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Aucune date prévue</p>
                    </div>
                  )}
                </div>
              </div>

              <button 
                type="submit" 
                disabled={selectedShifts.length === 0 || !name.trim() || isSubmitting}
                className="w-full py-6 bg-[#1a5f7a] disabled:bg-slate-100 disabled:text-slate-300 text-white rounded-[1.8rem] font-black uppercase text-[11px] tracking-[0.2em] shadow-xl active:scale-95 transition-all flex items-center justify-center gap-4"
              >
                {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : <>Valider mes {selectedShifts.length} présences <Send size={18} /></>}
              </button>
            </div>
          </form>
        )}
        
        <p className="text-center mt-10 text-[9px] font-black text-slate-300 uppercase tracking-widest leading-relaxed">
          Association PACTES — Ludothèque du Village
        </p>
      </div>
    </div>
  )
}