import { useState, useEffect } from 'react'
import { supabase } from '../services/supabaseClient'
import { 
  CheckCircle, 
  Clock, 
  Calendar, 
  User, 
  Send, 
  Heart,
  Loader2,
  ChevronRight
} from 'lucide-react'

export default function InscriptionPermanence() {
  const [shifts, setShifts] = useState([])
  const [loading, setLoading] = useState(true)
  const [name, setName] = useState('')
  const [selectedShift, setSelectedShift] = useState(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    async function fetchActiveShifts() {
      setLoading(true)
      const { data, error } = await supabase
        .from('shifts')
        .select('*')
        // On ne montre que les dates à venir ou d'aujourd'hui
        .gte('date', new Date().toISOString().split('T')[0])
        .order('date', { ascending: true })
      
      if (!error) setShifts(data || [])
      setLoading(false)
    }
    fetchActiveShifts()
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!selectedShift || !name.trim()) return

    const shift = shifts.find(s => s.id === selectedShift)
    
    // On vérifie si le bénévole n'est pas déjà inscrit pour éviter les doublons
    const isAlreadyIn = shift.volunteers?.some(v => v.name.toLowerCase() === name.trim().toLowerCase())
    if (isAlreadyIn) {
      alert("Tu es déjà inscrit(e) pour cette date ! 😉")
      return
    }

    const updatedVolunteers = [...(shift.volunteers || []), { 
      name: name.trim(), 
      date_reg: new Date().toISOString() 
    }]

    const { error } = await supabase
      .from('shifts')
      .update({ volunteers: updatedVolunteers })
      .eq('id', selectedShift)

    if (!error) {
      setSuccess(true)
      setName('')
      setSelectedShift(null)
      // On rafraîchit la liste pour montrer le nom ajouté
      const newShifts = shifts.map(s => s.id === selectedShift ? {...s, volunteers: updatedVolunteers} : s)
      setShifts(newShifts)
    }
  }

  if (loading) return (
    <div className="min-h-screen bg-[#fdfaf6] flex flex-col items-center justify-center gap-4 text-[#1a5f7a]">
      <Loader2 className="animate-spin" size={40} />
      <span className="font-black uppercase text-[10px] tracking-widest">Ouverture du planning...</span>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#fdfaf6] flex items-center justify-center p-4 font-sans">
      <div className="max-w-md w-full">
        
        {/* HEADER */}
        <div className="text-center mb-10">
          <div className="w-24 h-24 bg-[#1a5f7a] rounded-[2.5rem] flex items-center justify-center text-white mx-auto mb-6 shadow-2xl shadow-cyan-900/20 rotate-3">
            <Heart size={40} fill="currentColor" />
          </div>
          <h1 className="text-3xl md:text-4xl font-black text-slate-900 uppercase leading-none tracking-tighter">
            Espace <br/><span className="text-[#e38154]">Bénévoles</span>
          </h1>
          <p className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.2em] mt-4">
            Inscriptions aux permanences
          </p>
        </div>

        {success ? (
          <div className="bg-white p-10 rounded-[3rem] text-center animate-in zoom-in duration-500 shadow-xl border border-emerald-100">
            <div className="w-20 h-20 bg-emerald-500 text-white rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle size={40} />
            </div>
            <h2 className="text-2xl font-black text-slate-900 uppercase mb-2">C'est noté !</h2>
            <p className="text-slate-500 font-medium mb-8">Merci pour ton aide, on se voit à la ludothèque.</p>
            <button 
              onClick={() => setSuccess(false)}
              className="px-8 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-[#1a5f7a] transition-colors"
            >
              Inscrire une autre personne
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="bg-white p-8 md:p-10 rounded-[3rem] shadow-2xl shadow-slate-200/50 border border-slate-50">
            <div className="space-y-8">
              
              {/* INPUT NOM */}
              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase text-[#1a5f7a] ml-2 tracking-widest">Ton Prénom & Nom</label>
                <div className="relative">
                  <User className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
                  <input 
                    required
                    placeholder="Ex: Jean Dupont"
                    className="w-full pl-14 pr-6 py-5 bg-slate-50 rounded-2xl outline-none font-bold text-slate-900 border-2 border-transparent focus:border-[#1a5f7a]/10 transition-all"
                    value={name}
                    onChange={e => setName(e.target.value)}
                  />
                </div>
              </div>

              {/* LISTE DES DATES */}
              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase text-[#1a5f7a] ml-2 tracking-widest">Dates disponibles</label>
                <div className="space-y-3 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
                  {shifts.length > 0 ? shifts.map(shift => (
                    <label 
                      key={shift.id} 
                      className={`relative flex items-center justify-between p-5 rounded-[1.5rem] border-2 transition-all cursor-pointer group ${
                        selectedShift === shift.id 
                        ? 'border-[#1a5f7a] bg-cyan-50 shadow-md shadow-cyan-900/5' 
                        : 'border-slate-50 bg-slate-50 hover:border-slate-200'
                      }`}
                    >
                      <input 
                        type="radio" 
                        name="shift" 
                        className="hidden" 
                        onChange={() => setSelectedShift(shift.id)}
                      />
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center transition-colors ${selectedShift === shift.id ? 'bg-[#1a5f7a] text-white' : 'bg-white text-slate-400 group-hover:text-[#1a5f7a]'}`}>
                          <span className="text-[8px] font-black uppercase">{new Date(shift.date).toLocaleDateString('fr-FR', { month: 'short' })}</span>
                          <span className="text-lg font-black leading-none">{new Date(shift.date).getDate()}</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="font-black text-xs uppercase text-slate-800">
                            {new Date(shift.date).toLocaleDateString('fr-FR', { weekday: 'long' })}
                          </span>
                          <span className="text-[10px] font-bold text-slate-400">
                            {shift.start_time} — {shift.end_time}
                          </span>
                        </div>
                      </div>
                      
                      {/* Pastille indiquant le nombre de personnes déjà présentes */}
                      <div className="flex flex-col items-end gap-1">
                        {selectedShift === shift.id ? (
                          <CheckCircle size={20} className="text-[#1a5f7a]" />
                        ) : (
                          <div className="text-[9px] font-black text-[#e38154] bg-orange-50 px-2 py-1 rounded-lg">
                            {shift.volunteers?.length || 0} présent(s)
                          </div>
                        )}
                      </div>
                    </label>
                  )) : (
                    <div className="p-10 text-center bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Aucune date prévue</p>
                    </div>
                  )}
                </div>
              </div>

              <button 
                type="submit" 
                disabled={!selectedShift || !name.trim()}
                className="w-full py-6 bg-[#1a5f7a] disabled:bg-slate-100 disabled:text-slate-300 text-white rounded-[1.5rem] font-black uppercase text-[11px] tracking-[0.2em] shadow-xl shadow-cyan-900/20 active:scale-95 transition-all flex items-center justify-center gap-4"
              >
                Confirmer ma présence <Send size={18} />
              </button>
            </div>
          </form>
        )}
        
        <p className="text-center mt-10 text-[9px] font-black text-slate-300 uppercase tracking-widest">
          Association PACTES — Ludothèque
        </p>
      </div>
    </div>
  )
}