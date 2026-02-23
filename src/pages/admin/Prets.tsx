import { useState, useEffect } from 'react'
import { 
  Share2, Trash2, Edit2, X, Plus, Hash, CreditCard, 
  Phone, Mail, Search, MapPin, Eye, User, Send, AlertTriangle, 
  Building2, Home, ChevronRight, ExternalLink, Calendar, Clock, CheckCircle
} from 'lucide-react'
import { supabase } from '../../services/supabaseClient'

export default function Prets() {
  // --- ÉTATS ---
  const [loans, setLoans] = useState([])
  const [members, setMembers] = useState([])
  const [games, setGames] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showFormModal, setShowFormModal] = useState(false)
  const [confirmAction, setConfirmAction] = useState(null)
  const [renewalAction, setRenewalAction] = useState(null)
  const [showCodeStep, setShowCodeStep] = useState(false)

  // --- ÉTATS FORMULAIRE ---
  const [selectedMember, setSelectedMember] = useState(null)
  const [selectedGames, setSelectedGames] = useState([])
  const [memberSearch, setMemberSearch] = useState('')
  const [gameSearch, setGameSearch] = useState('')
  const [memberListVisible, setMemberListVisible] = useState(false)
  const [gameListVisible, setGameListVisible] = useState(false)
  const [loanDate, setLoanDate] = useState(new Date().toISOString().split('T')[0])

  useEffect(() => { fetchInitialData() }, [])

  async function fetchInitialData() {
    setLoading(true)
    try {
      if (navigator.onLine) {
        const { data: loansData } = await supabase.from('loans').select('*, members(*), games(*)').order('loan_date', { ascending: false })
        const { data: membersData } = await supabase.from('members').select('*').order('last_name')
        const { data: gamesData } = await supabase.from('games').select('*').order('name')
        
        setLoans(loansData || [])
        setMembers(membersData || [])
        setGames(gamesData || [])

        localStorage.setItem('cache_loans', JSON.stringify(loansData))
        localStorage.setItem('cache_members', JSON.stringify(membersData))
        localStorage.setItem('cache_games', JSON.stringify(gamesData))
      } else {
        setLoans(JSON.parse(localStorage.getItem('cache_loans') || '[]'))
        setMembers(JSON.parse(localStorage.getItem('cache_members') || '[]'))
        setGames(JSON.parse(localStorage.getItem('cache_games') || '[]'))
      }
    } catch (err) {
      console.error("Erreur de chargement:", err)
    } finally {
      setLoading(false)
    }
  }

  const triggerOutlook = (loan) => {
    const subject = encodeURIComponent(`Relance : Retour de jeu - Ludothèque de Coligny`);
    const body = encodeURIComponent(
      `Bonjour ${loan.members?.first_name || loan.members?.last_name},\n\n` +
      `Sauf erreur de notre part, le jeu "${loan.games?.name}" est toujours en votre possession depuis le ${new Date(loan.loan_date).toLocaleDateString()}.\n\n` +
      `Nous vous remercions de bien vouloir nous le rapporter lors de notre prochaine permanence.\n\nÀ bientôt !\n\nL'équipe de la Ludothèque`
    );
    const outlookUrl = `https://outlook.live.com/mail/0/deeplink/compose?to=${loan.members?.email}&subject=${subject}&body=${body}`;
    window.open(outlookUrl, '_blank');
  };

  const isOverdue = (dateString) => {
    const diff = Math.ceil((new Date() - new Date(dateString)) / (1000 * 60 * 60 * 24))
    return diff > 30
  }

  const getLoanLimit = (member) => member?.type === 'Association' ? 5 : 3
  const getDatabaseLoansCount = (memberId) => loans.filter(l => l.member_id === memberId).length

  const openNewLoan = () => {
    setSelectedMember(null); setSelectedGames([]);
    setLoanDate(new Date().toISOString().split('T')[0]); setShowFormModal(true)
  }

  async function handleSaveLoan() {
    if (!selectedMember || selectedGames.length === 0) return
    const entries = selectedGames.map(game => ({ member_id: selectedMember.id, game_id: game.id, loan_date: loanDate }))
    
    if (navigator.onLine) {
      const { error } = await supabase.from('loans').insert(entries)
      if (!error) {
        await supabase.from('games').update({ is_available: false }).in('id', selectedGames.map(g => g.id))
        setShowFormModal(false); fetchInitialData()
      }
    } else {
      const queue = JSON.parse(localStorage.getItem('offline_sync_queue') || '[]');
      entries.forEach(entry => {
        queue.push({ table: 'loans', data: entry, timestamp: Date.now() });
      });
      localStorage.setItem('offline_sync_queue', JSON.stringify(queue));
      alert("⚠️ Mode hors-ligne : Prêt enregistré localement.");
      setShowFormModal(false);
      fetchInitialData();
    }
  }

  async function processConfirmAction() {
    const { type, loan } = confirmAction
    if (navigator.onLine) {
      if (type === 'return') {
        await supabase.from('loans').delete().eq('id', loan.id)
        await supabase.from('games').update({ is_available: true }).eq('id', loan.game_id)
      } else if (type === 'extend') {
        const newDate = new Date(loan.loan_date)
        newDate.setDate(newDate.getDate() + 15)
        await supabase.from('loans').update({ loan_date: newDate.toISOString().split('T')[0] }).eq('id', loan.id)
      }
      setConfirmAction(null); fetchInitialData()
    } else {
      alert("Action réseau requise pour cette opération.");
      setConfirmAction(null);
    }
  }

  const filteredLoans = loans.filter(l => 
    `${l.members?.first_name} ${l.members?.last_name} ${l.games?.name}`.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  const overdueLoansCount = loans.filter(l => isOverdue(l.loan_date)).length
  const totalCount = (selectedMember ? getDatabaseLoansCount(selectedMember.id) : 0) + selectedGames.length

  if (loading) return <div className="flex items-center justify-center h-screen bg-[#fdfaf6] text-[#1a5f7a] font-black uppercase text-xs tracking-widest animate-pulse">Chargement des prêts...</div>

  return (
    <div className="p-4 md:p-10 bg-[#fdfaf6] min-h-screen font-sans text-slate-900">
      
      <div className="max-w-7xl mx-auto mb-6 md:mb-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-xl md:text-4xl font-black text-slate-900 flex items-center gap-3">
          <div className="p-2.5 bg-[#1a5f7a] rounded-xl shadow-lg text-white"><Share2 size={24} /></div>
          <span>Gestion des <span className="text-[#1a5f7a]">Prêts</span></span>
        </h1>
        <button onClick={openNewLoan} className="w-full md:w-auto px-6 py-4 bg-[#e38154] text-white rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all shadow-xl">
          Nouveau Prêt
        </button>
      </div>

      <main className="max-w-7xl mx-auto space-y-6">
        
        {overdueLoansCount > 0 && (
          <div className="flex items-center gap-3 bg-rose-50 border border-rose-100 p-4 rounded-2xl text-rose-800 animate-in fade-in slide-in-from-top-2">
            <AlertTriangle className="text-rose-500 shrink-0 animate-bounce" size={20} />
            <p className="text-[10px] md:text-xs font-black uppercase tracking-wider">Attention : {overdueLoansCount} prêt(s) en retard !</p>
          </div>
        )}

        <div className="relative group">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
          <input type="text" placeholder="Rechercher par adhérent ou jeu..." className="w-full bg-white border border-slate-100 p-4 pl-14 rounded-2xl font-bold text-slate-700 outline-none shadow-sm focus:ring-2 focus:ring-[#1a5f7a]/10 transition-all" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>

        <div className="hidden md:block bg-white rounded-[2.5rem] shadow-sm border border-slate-50 overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-[10px] uppercase text-slate-400 font-black">
              <tr>
                <th className="p-8">Date Sortie</th>
                <th className="p-8">Emprunteur</th>
                <th className="p-8">Jeu emprunté</th>
                <th className="p-8 text-right pr-12">Gestion</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredLoans.map((l) => {
                const late = isOverdue(l.loan_date);
                return (
                  <tr key={l.id} className={`transition-colors ${late ? 'bg-rose-50/40 hover:bg-rose-50/60' : 'hover:bg-slate-50/50'}`}>
                    <td className={`p-8 font-black ${late ? 'text-rose-600' : 'text-[#1a5f7a]'}`}>
                      {new Date(l.loan_date).toLocaleDateString()}
                    </td>
                    <td className="p-8">
                      <div className={`font-black uppercase text-sm ${late ? 'text-rose-900' : 'text-slate-900'}`}>
                        {l.members?.last_name} {l.members?.first_name}
                      </div>
                    </td>
                    <td className="p-8">
                      <div className="text-sm font-bold text-slate-700">
                        <span className="text-[#1a5f7a] mr-2 font-black">#{l.games?.registration_number}</span>
                        {l.games?.name}
                      </div>
                    </td>
                    <td className="p-8 text-right pr-12 space-x-2">
                      {late && (
                        <button title="Relancer" onClick={() => { setRenewalAction(l); setShowCodeStep(false); }} className="p-3 bg-amber-50 text-amber-600 rounded-xl border border-amber-100 hover:bg-amber-100 transition-all shadow-sm">
                          <Send size={18} />
                        </button>
                      )}
                      <button title="Prolonger" onClick={() => setConfirmAction({ type: 'extend', loan: l })} className="p-3 text-slate-400 bg-white rounded-xl shadow-sm hover:text-amber-500 transition-all"><Clock size={18} /></button>
                      <button onClick={() => setConfirmAction({ type: 'return', loan: l })} className={`px-4 py-2.5 rounded-xl text-[9px] font-black uppercase text-white shadow-md transition-all active:scale-95 ${late ? 'bg-rose-500' : 'bg-emerald-500'}`}>Valider Retour</button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </main>

      {/* MODALE DE RELANCE (CALQUÉE SUR ADHÉRENTS) */}
      {renewalAction && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-[#1a5f7a]/80 backdrop-blur-md" onClick={() => setRenewalAction(null)}></div>
          <div className="relative bg-white rounded-[3rem] p-8 md:p-12 max-w-lg w-full shadow-2xl border-b-8 border-amber-500 animate-in zoom-in-95 overflow-y-auto max-h-[90vh]">
            
            {!showCodeStep ? (
              <>
                <div className="flex justify-between items-start mb-8">
                  <div className="w-16 h-16 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center">
                    <Share2 size={28} />
                  </div>
                  <button onClick={() => setRenewalAction(null)} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400">
                    <X size={24} />
                  </button>
                </div>

                <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight mb-2">Relance Prêt en retard</h2>
                <p className="text-sm text-slate-500 mb-6">Coordonnées de l'adhérent <strong>{renewalAction.members?.first_name} {renewalAction.members?.last_name}</strong> :</p>

                <div className="space-y-3 mb-8">
                  <div className="flex items-center gap-4 text-slate-600 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <Mail size={18} className="text-[#1a5f7a] shrink-0"/>
                    <span className="text-sm font-bold truncate">{renewalAction.members?.email || 'Email non renseigné'}</span>
                  </div>
                  <div className="flex items-center gap-4 text-slate-600 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <Phone size={18} className="text-[#1a5f7a] shrink-0"/>
                    <span className="text-sm font-bold">{renewalAction.members?.phone || 'Téléphone non renseigné'}</span>
                  </div>
                  <div className="flex items-start gap-4 text-slate-600 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <MapPin size={18} className="text-[#1a5f7a] mt-1 shrink-0"/>
                    <span className="text-sm font-bold leading-relaxed">{renewalAction.members?.address || 'Adresse non renseignée'}</span>
                  </div>
                </div>

                <div className="space-y-4 mb-8">
                  <button 
                    onClick={() => setShowCodeStep(true)}
                    className="w-full p-5 bg-[#1a5f7a] text-white rounded-[1.5rem] flex items-center justify-center gap-4 hover:bg-[#154d63] transition-all shadow-xl font-black uppercase text-[10px] tracking-widest"
                  >
                    Envoyer le mail de rappel
                    <ExternalLink size={18} />
                  </button>
                </div>

                {/* SUIVI DE LA RELANCE */}
                <div className="bg-amber-50/50 rounded-[2rem] p-6 border border-amber-100">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-[10px] font-black uppercase text-amber-600 flex items-center gap-2">
                      <Calendar size={14} /> Suivi des relances
                    </span>
                    {renewalAction.last_reminder_date ? (
                      <span className="px-3 py-1 bg-amber-100 text-amber-700 text-[9px] font-black rounded-full uppercase">
                        Relancé le {new Date(renewalAction.last_reminder_date).toLocaleDateString()}
                      </span>
                    ) : (
                      <span className="text-[9px] font-bold text-amber-400 italic">Aucun rappel noté</span>
                    )}
                  </div>
                  
                  <button
                    onClick={async () => {
                      const today = new Date().toISOString().split('T')[0];
                      const { error } = await supabase.from('loans').update({ last_reminder_date: today }).eq('id', renewalAction.id);
                      if (!error) {
                        setLoans(loans.map(l => l.id === renewalAction.id ? {...l, last_reminder_date: today} : l));
                        setRenewalAction({...renewalAction, last_reminder_date: today});
                      }
                    }}
                    className="w-full py-3 bg-white border border-amber-200 text-amber-600 rounded-xl font-black uppercase text-[9px] tracking-widest hover:bg-amber-500 hover:text-white transition-all shadow-sm flex items-center justify-center gap-2"
                  >
                    Valider une relance aujourd'hui
                  </button>
                </div>
              </>
            ) : (
              <div className="text-center animate-in slide-in-from-right-4">
                <div className="w-16 h-16 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6"><ExternalLink size={32}/></div>
                <h3 className="text-xl font-black uppercase text-slate-900 mb-2">Prêt pour l'envoi</h3>
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-8">Code d'accès Outlook de la ludo :</p>
                
                <div className="bg-[#1a5f7a] rounded-[2rem] p-8 mb-10 shadow-xl border border-white/10">
                  <p className="text-3xl font-black text-white tracking-[0.4em]">Coligny1991</p>
                </div>

                <div className="flex flex-col gap-3">
                  <button 
                    onClick={() => triggerOutlook(renewalAction)} 
                    className="w-full py-6 bg-emerald-600 text-white rounded-[1.5rem] font-black uppercase text-sm shadow-lg hover:bg-emerald-700 transition-all"
                  >
                    Ouvrir Outlook
                  </button>
                  <button onClick={() => setShowCodeStep(false)} className="py-4 text-slate-400 font-black uppercase text-[10px] underline">Retour</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODALES CONFIRMATION (RETOUR / PROLONGATION) */}
      {confirmAction && (
        <div className="fixed inset-0 z-[120] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-sm p-10 text-center shadow-2xl animate-in zoom-in-95">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 ${confirmAction.type === 'return' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
              {confirmAction.type === 'return' ? <CheckCircle size={32}/> : <Clock size={32}/>}
            </div>
            <h3 className="text-xl font-black uppercase mb-2">{confirmAction.type === 'return' ? 'Confirmer le retour' : 'Confirmer le délai'}</h3>
            <p className="text-[10px] font-black uppercase text-slate-500 mb-8">Voulez-vous valider cette action ?</p>
            <div className="flex flex-col gap-3">
              <button onClick={processConfirmAction} className={`w-full py-5 text-white rounded-2xl font-black uppercase text-xs shadow-lg ${confirmAction.type === 'return' ? 'bg-emerald-600' : 'bg-amber-600'}`}>Confirmer</button>
              <button onClick={() => setConfirmAction(null)} className="w-full py-4 bg-slate-50 text-slate-400 rounded-2xl font-black uppercase text-[10px]">Annuler</button>
            </div>
          </div>
        </div>
      )}

      {/* MODALE FORMULAIRE NOUVEAU PRÊT */}
      {showFormModal && (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
            <div className="p-8 border-b border-slate-50 flex justify-between items-center shrink-0">
              <h2 className="text-xl font-black uppercase">Enregistrer un <span className="text-[#1a5f7a]">Prêt</span></h2>
              <button onClick={() => setShowFormModal(false)} className="p-2 bg-slate-50 rounded-full text-slate-400 hover:text-rose-500"><X size={24}/></button>
            </div>
            <div className="p-8 space-y-8 overflow-y-auto">
              {/* SÉLECTION ADHÉRENT */}
              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-tighter text-[#1a5f7a]">1. Sélection de l'adhérent</label>
                {!selectedMember ? (
                  <div className="relative">
                    <input type="text" placeholder="Nom ou prénom..." className="w-full p-5 bg-slate-50 rounded-2xl font-bold text-sm outline-none border-2 border-transparent focus:border-[#1a5f7a]" value={memberSearch} onFocus={() => setMemberListVisible(true)} onBlur={() => setTimeout(() => setMemberListVisible(false), 200)} onChange={(e) => setMemberSearch(e.target.value)} />
                    {memberListVisible && (
                      <div className="absolute top-full w-full bg-white border border-slate-100 rounded-2xl mt-2 shadow-2xl max-h-48 overflow-y-auto z-[110] p-2 divide-y divide-slate-50">
                        {members.filter(m => `${m.first_name} ${m.last_name}`.toLowerCase().includes(memberSearch.toLowerCase())).map(m => (
                          <div key={m.id} onMouseDown={() => setSelectedMember(m)} className="p-4 hover:bg-slate-50 rounded-xl cursor-pointer flex justify-between items-center">
                            <span className="uppercase font-black text-xs">{m.last_name} {m.first_name}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="bg-cyan-50 p-5 rounded-2xl flex justify-between items-center border border-cyan-100">
                    <div>
                      <p className="font-black text-[#1a5f7a] text-sm uppercase">{selectedMember.last_name} {selectedMember.first_name}</p>
                      <p className="text-[10px] font-bold text-cyan-600 uppercase">Jeux en cours : {totalCount} / {getLoanLimit(selectedMember)}</p>
                    </div>
                    <button onClick={() => {setSelectedMember(null); setSelectedGames([]);}} className="text-[9px] font-black uppercase text-slate-400 underline">Changer</button>
                  </div>
                )}
              </div>

              {/* SÉLECTION JEUX */}
              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-tighter text-[#1a5f7a]">2. Jeux à ajouter</label>
                {selectedMember ? (
                  <>
                    {totalCount < getLoanLimit(selectedMember) ? (
                      <div className="relative">
                        <input type="text" placeholder="Rechercher un jeu..." className="w-full p-5 bg-slate-50 rounded-2xl font-bold text-sm outline-none border-2 border-transparent focus:border-[#1a5f7a]" value={gameSearch} onFocus={() => setGameListVisible(true)} onBlur={() => setTimeout(() => setGameListVisible(false), 200)} onChange={(e) => setGameSearch(e.target.value)} />
                        {gameListVisible && (
                          <div className="absolute top-full w-full bg-white border border-slate-100 rounded-2xl mt-2 shadow-2xl max-h-48 overflow-y-auto z-[110] p-2 divide-y divide-slate-50">
                            {games.filter(g => g.is_available && g.name.toLowerCase().includes(gameSearch.toLowerCase())).map(g => (
                              <div key={g.id} onMouseDown={() => { setSelectedGames([...selectedGames, g]); setGameSearch('') }} className="p-4 hover:bg-slate-50 rounded-xl cursor-pointer">
                                <p className="font-black text-xs uppercase tracking-tight">#{g.registration_number} - {g.name}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="p-5 bg-rose-50 text-rose-500 rounded-2xl text-[10px] font-black uppercase text-center">Quota maximum atteint.</div>
                    )}
                    <div className="space-y-2">
                      {selectedGames.map(g => (
                        <div key={g.id} className="bg-white border border-slate-100 p-4 rounded-xl flex justify-between items-center shadow-sm">
                          <span className="text-[10px] font-black uppercase text-slate-700">#{g.registration_number} - {g.name}</span>
                          <button onClick={() => setSelectedGames(selectedGames.filter(sg => sg.id !== g.id))} className="text-rose-500"><X size={16}/></button>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="p-5 bg-slate-50 text-slate-400 rounded-2xl text-[10px] font-bold uppercase text-center border-dashed border-2">Veuillez d'abord choisir l'adhérent</div>
                )}
              </div>

              {/* DATE ET BOUTON */}
              <div className="pt-6 border-t border-slate-50 space-y-4">
                <input type="date" className="w-full p-5 bg-slate-50 rounded-2xl font-black text-sm outline-none" value={loanDate} onChange={e => setLoanDate(e.target.value)} />
                <button onClick={handleSaveLoan} disabled={!selectedMember || selectedGames.length === 0} className="w-full py-6 bg-[#1a5f7a] text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl disabled:opacity-30">Valider le prêt</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}