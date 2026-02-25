import { useState, useEffect } from 'react'
import { 
  Search, 
  ArrowLeft, 
  Clock // <-- L'IMPORT MANQUANT ÉTAIT ICI
} from 'lucide-react'
import { supabase } from '../../services/supabaseClient'

export default function HistoriquePrets() {
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    fetchHistory()
  }, [])

  async function fetchHistory() {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('loan_history') 
        .select(`
          *,
          members (first_name, last_name),
          games (name, registration_number)
        `)
        .order('return_date', { ascending: false })
      
      if (error) throw error
      setHistory(data || [])
    } catch (err) {
      console.error("Erreur historique:", err)
    } finally {
      setLoading(false)
    }
  }

  const filteredHistory = history.filter(h => {
    const memberName = `${h.members?.first_name || ''} ${h.members?.last_name || ''}`.toLowerCase()
    const gameName = (h.games?.name || '').toLowerCase()
    const search = searchTerm.toLowerCase()
    return memberName.includes(search) || gameName.includes(search)
  })

  if (loading) return (
    <div className="flex items-center justify-center h-screen bg-[#fdfaf6] text-[#1a5f7a] font-black uppercase text-xs tracking-widest animate-pulse">
      Chargement de l'historique...
    </div>
  )

  return (
    <div className="p-4 md:p-10 bg-[#fdfaf6] min-h-screen font-sans text-slate-900">
      
      <div className="max-w-7xl mx-auto mb-6 md:mb-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => window.history.back()} 
            className="p-3 bg-white rounded-xl shadow-sm text-slate-400 hover:text-[#1a5f7a] transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-xl md:text-4xl font-black text-slate-900 flex items-center gap-3">
            <div className="p-2.5 bg-slate-800 rounded-xl shadow-lg text-white">
                <Clock size={24} />
            </div>
            <span>Historique des <span className="text-[#1a5f7a]">Prêts</span></span>
          </h1>
        </div>
      </div>

      <main className="max-w-7xl mx-auto space-y-6">
        
        <div className="relative group">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
          <input 
            type="text" 
            placeholder="Rechercher un adhérent ou un jeu..." 
            className="w-full bg-white border border-slate-100 p-4 pl-14 rounded-2xl font-bold text-slate-700 outline-none shadow-sm focus:ring-2 focus:ring-[#1a5f7a]/10 transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {history.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-[3rem] border-2 border-dashed border-slate-100">
            <p className="text-slate-400 font-bold uppercase text-xs tracking-widest">Aucun prêt archivé pour le moment.</p>
          </div>
        ) : (
          <>
            {/* MOBILE */}
            <div className="md:hidden space-y-4">
              {filteredHistory.map((h) => (
                <div key={h.id} className="bg-white p-5 rounded-[2rem] border border-slate-50 shadow-sm">
                  <div className="flex justify-between items-start mb-3">
                    <span className="text-[9px] font-black uppercase px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full">
                      Retourné le {new Date(h.return_date).toLocaleDateString()}
                    </span>
                    <span className="text-[10px] font-black text-[#1a5f7a] bg-cyan-50 px-2 py-0.5 rounded-md">
                        #{h.games?.registration_number || '?'}
                    </span>
                  </div>
                  <h3 className="font-black text-slate-900 uppercase text-xs mb-1">
                    {h.games?.name || 'Jeu inconnu'}
                  </h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">
                    Par : {h.members?.first_name} {h.members?.last_name}
                  </p>
                </div>
              ))}
            </div>

            {/* DESKTOP */}
            <div className="hidden md:block bg-white rounded-[2.5rem] shadow-sm border border-slate-50 overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-[10px] uppercase text-slate-400 font-black">
                  <tr>
                    <th className="p-8">Jeu</th>
                    <th className="p-8">Emprunteur</th>
                    <th className="p-8">Date Sortie</th>
                    <th className="p-8">Date Retour</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-sm font-bold">
                  {filteredHistory.map((h) => (
                    <tr key={h.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-8">
                        <div className="flex items-center gap-3">
                          <span className="text-[#1a5f7a] font-black text-xs">
                            #{h.games?.registration_number || '?'}
                          </span>
                          <span className="uppercase text-slate-800">
                            {h.games?.name || 'Jeu supprimé'}
                          </span>
                        </div>
                      </td>
                      <td className="p-8 uppercase text-slate-600">
                        {h.members ? `${h.members.first_name} ${h.members.last_name}` : 'Adhérent inconnu'}
                      </td>
                      <td className="p-8 text-slate-400 font-medium">
                        {new Date(h.loan_date).toLocaleDateString()}
                      </td>
                      <td className="p-8">
                        <span className="text-emerald-600 font-black">
                          {new Date(h.return_date).toLocaleDateString()}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </main>
    </div>
  )
}