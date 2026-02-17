import { useState, useEffect } from 'react'
import { supabase } from '../../services/supabaseClient'
import { History, Search, Calendar, User, Gamepad2, Hash, ArrowRight, Clock } from 'lucide-react'

export default function Historique() {
  const [loans, setLoans] = useState([])
  const [games, setGames] = useState([])
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    setLoading(true)
    try {
      // 1. On récupère les jeux, membres et TOUS les prêts rendus
      const [gRes, mRes, lRes] = await Promise.all([
        supabase.from('games').select('*'),
        supabase.from('members').select('*'),
        supabase.from('loans').select('*').eq('status', 'rendu').order('return_date', { ascending: false })
      ])

      setGames(gRes.data || [])
      setMembers(mRes.data || [])
      setLoans(lRes.data || [])
    } catch (err) {
      console.error("Erreur historique:", err)
    } finally {
      setLoading(false)
    }
  }

  // Utilitaires de correspondance
  const getGame = (id) => games.find(g => g.id == id) || {}
  const getMember = (id) => members.find(m => m.id == id) || {}

  // Calcul de la durée du prêt en jours
  const getDuration = (start, end) => {
    const days = Math.ceil((new Date(end) - new Date(start)) / (1000 * 60 * 60 * 24))
    return days === 0 ? "Moins d'un jour" : `${days} jours`
  }

  // Filtrage des résultats
  const filteredLoans = loans.filter(loan => {
    const gameName = getGame(loan.game_id).name?.toLowerCase() || ""
    const memberName = getMember(loan.member_id).last_name?.toLowerCase() || ""
    return gameName.includes(searchTerm.toLowerCase()) || memberName.includes(searchTerm.toLowerCase())
  })

  return (
    <div className="p-8 max-w-7xl mx-auto min-h-screen bg-gray-50">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 flex items-center gap-3">
            <History className="text-blue-600" size={36} /> 
            Historique des Prêts
          </h1>
          <p className="text-gray-500 mt-1">Archives de tous les jeux retournés.</p>
        </div>

        {/* BARRE DE RECHERCHE */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text"
            placeholder="Rechercher un jeu ou un membre..."
            className="pl-10 pr-4 py-2 border-2 border-gray-200 rounded-2xl w-full md:w-80 focus:border-blue-500 outline-none transition-all shadow-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 text-[10px] uppercase text-gray-400 font-extrabold border-b">
              <tr>
                <th className="p-5">Dates (Sortie → Retour)</th>
                <th className="p-5">Adhérent</th>
                <th className="p-5">Jeu & N°</th>
                <th className="p-5">Durée du prêt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan="4" className="p-10 text-center text-gray-400 italic">Chargement des archives...</td></tr>
              ) : filteredLoans.length === 0 ? (
                <tr><td colSpan="4" className="p-20 text-center text-gray-400 italic">Aucun prêt archivé pour le moment.</td></tr>
              ) : filteredLoans.map(loan => {
                const game = getGame(loan.game_id)
                const member = getMember(loan.member_id)
                return (
                  <tr key={loan.id} className="hover:bg-blue-50/50 transition-colors">
                    <td className="p-5 text-xs text-gray-600">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{new Date(loan.loan_date).toLocaleDateString('fr-FR')}</span>
                        <ArrowRight size={12} className="text-gray-300" />
                        <span className="font-bold text-blue-600">{new Date(loan.return_date).toLocaleDateString('fr-FR')}</span>
                      </div>
                    </td>
                    <td className="p-5">
                      <div className="flex items-center gap-2 font-bold text-gray-800">
                        <User size={14} className="text-gray-400" />
                        {member.last_name?.toUpperCase()} {member.first_name}
                      </div>
                    </td>
                    <td className="p-5">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-gray-700">{game.name}</span>
                        <span className="text-[10px] text-gray-400 flex items-center gap-1 uppercase">
                          <Hash size={10} /> {game.registration_number}
                        </span>
                      </div>
                    </td>
                    <td className="p-5">
                      <span className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-bold">
                        <Clock size={12} /> {getDuration(loan.loan_date, loan.return_date)}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}