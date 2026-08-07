import { useState, useEffect } from 'react'
import { ArrowLeft } from 'lucide-react'
import { supabase } from '../../services/supabaseClient'
import AdminPageHeader from '../../components/admin/AdminPageHeader'
import SearchField from '../../components/admin/SearchField'

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
    <div className="flex h-screen animate-pulse items-center justify-center bg-[#fdfaf6] text-xs font-extrabold uppercase tracking-[0.14em] text-[#1a5f7a]">
      Chargement de l'historique…
    </div>
  )

  return (
    <div className="p-4 md:p-10 bg-[#fdfaf6] min-h-screen font-sans text-slate-900">
      
      <div className="mx-auto max-w-7xl">
        <AdminPageHeader
          icon="ludo-pret.svg"
          title="Historique des"
          accent="Prêts"
          eyebrow="Prêts déjà rendus"
          tileBg="#0f172a"
          tileShadow="#1a5f7a"
        >
          <button
            onClick={() => window.history.back()}
            className="inline-flex items-center gap-2 rounded-[18px] border-2 border-[#0f172a] bg-white px-5 py-4 text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#1a5f7a] shadow-[4px_4px_0_#1a5f7a] transition-colors hover:bg-[#1a5f7a] hover:text-white"
          >
            <ArrowLeft size={16} /> Retour aux prêts
          </button>
        </AdminPageHeader>
      </div>

      <main className="mx-auto max-w-7xl">

        <SearchField
          className="mb-6"
          placeholder="Rechercher un adhérent ou un jeu..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />

        {history.length === 0 ? (
          <div className="rounded-[34px] border-2 border-dashed border-slate-300 bg-white py-20 text-center">
            <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-slate-400">Aucun prêt archivé pour le moment.</p>
          </div>
        ) : (
          <>
            {/* MOBILE — une carte par prêt rendu */}
            <div className="space-y-4 md:hidden">
              {filteredHistory.map((h) => (
                <div key={h.id} className="rounded-[28px] border-2 border-[#0f172a] bg-white p-5 shadow-[5px_5px_0_#1a5f7a]">
                  <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                    <span className="rounded-full border-2 border-[#0f172a] bg-[#ecfdf5] px-3 py-1 text-[9px] font-extrabold uppercase tracking-[0.08em] text-[#047857]">
                      Retourné le {new Date(h.return_date).toLocaleDateString()}
                    </span>
                    <span className="rounded-full border-2 border-[#0f172a] bg-[#f0f7f9] px-2.5 py-0.5 text-[10px] font-extrabold text-[#1a5f7a]">
                      #{h.games?.registration_number || '?'}
                    </span>
                  </div>
                  <h3 className="font-display text-[17px] font-extrabold leading-tight tracking-[-0.03em] text-[#0f172a]">
                    {h.games?.name || 'Jeu inconnu'}
                  </h3>
                  <p className="mt-1 text-[11px] font-bold text-slate-500">
                    Emprunté par : {h.members?.first_name} {h.members?.last_name}
                  </p>
                  <p className="mt-0.5 text-[11px] font-semibold text-slate-400">
                    Sorti le {new Date(h.loan_date).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>

            {/* ORDINATEUR */}
            <div className="hidden overflow-hidden rounded-[34px] border-2 border-[#0f172a] bg-white shadow-[6px_6px_0_#1a5f7a] md:block">
              <table className="w-full text-left">
                <thead className="border-b-2 border-[#0f172a] bg-[#fdfaf6] text-[9.5px] font-extrabold uppercase tracking-[0.18em] text-slate-400">
                  <tr>
                    <th className="px-6 py-[18px]">Jeu</th>
                    <th className="px-6 py-[18px]">Emprunteur</th>
                    <th className="px-6 py-[18px]">Date sortie</th>
                    <th className="px-6 py-[18px]">Date retour</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredHistory.map((h) => (
                    <tr key={h.id}>
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          <span className="text-[13px] font-extrabold text-[#1a5f7a]">
                            #{h.games?.registration_number || '?'}
                          </span>
                          <span className="text-[13px] font-semibold text-slate-600">
                            {h.games?.name || 'Jeu supprimé'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-5 text-[13px] font-extrabold uppercase tracking-[-0.01em] text-[#0f172a]">
                        {h.members ? `${h.members.first_name} ${h.members.last_name}` : 'Adhérent inconnu'}
                      </td>
                      <td className="px-6 py-5 text-[13px] font-semibold text-slate-400">
                        {new Date(h.loan_date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-5 font-display text-[15px] font-extrabold text-[#047857]">
                        {new Date(h.return_date).toLocaleDateString()}
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