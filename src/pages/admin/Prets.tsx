import { useState, useEffect } from 'react'
import { supabase } from '../../services/supabaseClient'
import { 
  Share2, Plus, Search, X, Clock, Edit2, 
  AlertTriangle, CheckCircle, Mail, Send, 
  ChevronRight, Phone, MapPin, User, ExternalLink, Calendar
} from 'lucide-react'

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
    const { data: loansData } = await supabase.from('loans').select('*, members(*), games(*)').order('loan_date', { ascending: false })
    const { data: membersData } = await supabase.from('members').select('*').order('last_name')
    const { data: gamesData } = await supabase.from('games').select('*').order('name')
    setLoans(loansData || [])
    setMembers(membersData || [])
    setGames(gamesData || [])
    setLoading(false)
  }

  const triggerOutlook = (loan) => {
    const subject = encodeURIComponent(`Rappel : Retour de jeu en retard - Ludothèque`);
    const body = encodeURIComponent(
      `Bonjour ${loan.members?.first_name || loan.members?.last_name},\n\n` +
      `Sauf erreur de notre part, le jeu "${loan.games?.name}" (N°${loan.games?.registration_number}) est toujours en votre possession.\n\n` +
      `Ce prêt date du ${new Date(loan.loan_date).toLocaleDateString('fr-FR')}. Nous vous remercions de bien vouloir nous le rapporter lors de notre prochaine permanence.\n\n` +
      `À bientôt !\n\nL'équipe de la Ludothèque`
    );
    const outlookUrl = `https://outlook.live.com/mail/0/deeplink/compose?to=${loan.members?.email}&subject=${subject}&body=${body}`;
    window.open(outlookUrl, '_blank');
    setRenewalAction(null);
    setShowCodeStep(false);
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
    const { error } = await supabase.from('loans').insert(entries)
    if (!error) {
      await supabase.from('games').update({ is_available: false }).in('id', selectedGames.map(g => g.id))
      setShowFormModal(false); fetchInitialData()
    }
  }

  async function processConfirmAction() {
    const { type, loan } = confirmAction
    if (type === 'return') {
      await supabase.from('loans').delete().eq('id', loan.id)
      await supabase.from('games').update({ is_available: true }).eq('id', loan.game_id)
    } else if (type === 'extend') {
      const newDate = new Date(loan.loan_date)
      newDate.setDate(newDate.getDate() + 15)
      await supabase.from('loans').update({ loan_date: newDate.toISOString().split('T')[0] }).eq('id', loan.id)
    }
    setConfirmAction(null); fetchInitialData()
  }

  const filteredLoans = loans.filter(l => `${l.members?.first_name} ${l.members?.last_name} ${l.games?.name}`.toLowerCase().includes(searchTerm.toLowerCase()))
  const overdueLoansCount = loans.filter(l => isOverdue(l.loan_date)).length
  const totalCount = (selectedMember ? getDatabaseLoansCount(selectedMember.id) : 0) + selectedGames.length

  if (loading) return <div className="flex h-screen items-center justify-center font-black text-[#1a5f7a] uppercase text-[10px] tracking-[0.3em]">Synchronisation de la base...</div>

  return (
    <div className="min-h-screen bg-[#fdfaf6] p-4 md:p-10 font-sans text-slate-900">
      
      {/* HEADER */}
      <div className="max-w-7xl mx-auto mb-6 md:mb-10 flex flex-col md:flex-row justify-between items-center gap-4">
        <h1 className="text-xl md:text-4xl font-black flex items-center gap-3 uppercase">
          <div className="bg-[#1a5f7a] p-2.5 rounded-xl shadow-lg text-white"><Share2 size={24} /></div>
          <span>Suivi des <span className="text-[#1a5f7a]">Prêts</span></span>
        </h1>
        <button onClick={openNewLoan} className="w-full md:w-auto px-6 py-4 bg-[#e38154] text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl transition-all">
          <Plus size={16} className="mr-2 inline" /> Enregistrer un nouveau prêt
        </button>
      </div>

      <main className="max-w-7xl mx-auto space-y-6">
        {/* BANDEAU ALERTE */}
        {overdueLoansCount > 0 && (
          <div className="flex items-center gap-3 bg-rose-50 border border-rose-100 p-4 rounded-2xl text-rose-800 animate-pulse">
            <AlertTriangle className="text-rose-500 shrink-0" size={20} />
            <p className="text-[10px] md:text-xs font-black uppercase">Attention : {overdueLoansCount} prêt(s) dépassent la limite des 30 jours !</p>
          </div>
        )}

        {/* RECHERCHE */}
        <div className="relative">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
          <input type="text" placeholder="Rechercher par nom d'adhérent ou titre de jeu..." className="w-full bg-white border border-slate-100 p-4 pl-14 rounded-2xl font-bold text-sm shadow-sm outline-none focus:ring-2 focus:ring-[#1a5f7a]/10" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>

        {/* --- LISTE VERSION PC (Tableau) --- */}
        <div className="hidden md:block bg-white rounded-[2.5rem] border border-slate-50 shadow-sm overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-400">
              <tr>
                <th className="p-8">Date de sortie</th>
                <th className="p-8">Emprunteur</th>
                <th className="p-8">Jeu emprunté</th>
                <th className="p-8 text-right pr-12">Actions de gestion</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredLoans.map((loan) => {
                const late = isOverdue(loan.loan_date)
                return (
                  <tr key={loan.id} className={`transition-colors ${late ? 'bg-rose-50/30' : 'hover:bg-slate-50/50'}`}>
                    <td className={`p-8 text-sm font-bold ${late ? 'text-rose-500' : 'text-slate-400'}`}>{new Date(loan.loan_date).toLocaleDateString('fr-FR')}</td>
                    <td className="p-8 text-sm font-black uppercase tracking-tight">{loan.members?.last_name} {loan.members?.first_name}</td>
                    <td className="p-8 text-sm font-bold text-slate-700">
                      <span className={`mr-2 px-2 py-1 rounded text-[10px] font-black ${late ? 'bg-rose-100 text-rose-600' : 'bg-slate-100 text-[#1a5f7a]'}`}>#{loan.games?.registration_number}</span>
                      {loan.games?.name}
                    </td>
                    <td className="p-8 text-right pr-12 space-x-2">
                      {late && <button title="Relancer l'adhérent" onClick={() => { setRenewalAction(loan); setShowCodeStep(false); }} className="p-3 bg-amber-50 text-amber-600 rounded-xl border border-amber-100 hover:bg-amber-100 transition-all shadow-sm"><Send size={18} /></button>}
                      <button title="Prolonger de 15 jours" onClick={() => setConfirmAction({ type: 'extend', loan })} className="p-3 bg-slate-50 text-slate-400 rounded-xl hover:bg-amber-500 hover:text-white transition-all"><Clock size={18} /></button>
                      <button onClick={() => setConfirmAction({ type: 'return', loan })} className={`px-5 py-2.5 rounded-xl font-black uppercase text-[9px] text-white shadow-md transition-all active:scale-95 ${late ? 'bg-rose-600 hover:bg-rose-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}>Valider retour</button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* --- LISTE VERSION MOBILE (Cartes) --- */}
        <div className="md:hidden space-y-4">
          {filteredLoans.map((loan) => {
            const late = isOverdue(loan.loan_date)
            return (
              <div key={loan.id} className={`bg-white p-5 rounded-[1.8rem] shadow-sm border ${late ? 'border-rose-100 bg-rose-50/20' : 'border-slate-50'}`}>
                <div className="flex justify-between items-start mb-3">
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><Calendar size={12}/> Prêt du {new Date(loan.loan_date).toLocaleDateString('fr-FR')}</div>
                  {late && <span className="bg-rose-500 text-white text-[8px] font-black px-2 py-1 rounded-full uppercase tracking-tighter">Retard +30j</span>}
                </div>
                <div className="font-black text-slate-900 uppercase text-sm mb-1">{loan.members?.last_name} {loan.members?.first_name}</div>
                <div className="text-xs font-bold text-[#1a5f7a] uppercase mb-4 flex items-center gap-2">
                   <span className="bg-[#1a5f7a]/10 px-1.5 py-0.5 rounded text-[9px]">#{loan.games?.registration_number}</span>
                   {loan.games?.name}
                </div>
                
                <div className="flex gap-2 pt-4 border-t border-slate-100">
                  <button onClick={() => setConfirmAction({ type: 'return', loan })} className={`flex-1 py-3 rounded-xl text-white font-black uppercase text-[9px] ${late ? 'bg-rose-600' : 'bg-emerald-600'}`}>Retourner</button>
                  <button onClick={() => setConfirmAction({ type: 'extend', loan })} className="p-3 bg-slate-50 text-slate-400 rounded-xl border border-slate-100"><Clock size={18}/></button>
                  {late && <button onClick={() => { setRenewalAction(loan); setShowCodeStep(false); }} className="p-3 bg-amber-50 text-amber-600 rounded-xl border border-amber-100"><Send size={18}/></button>}
                </div>
              </div>
            )
          })}
        </div>
      </main>

      {/* --- MODALE DE RELANCE (COORDONNÉES + CODE OUTLOOK) --- */}
      {renewalAction && (
        <div className="fixed inset-0 z-[120] bg-slate-900/60 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-4">
          <div className="bg-white rounded-t-[2.5rem] md:rounded-[2.5rem] w-full max-w-md overflow-hidden shadow-2xl animate-in slide-in-from-bottom md:zoom-in-95">
            
            {!showCodeStep ? (
              /* ÉTAPE 1 : INFOS DE CONTACT */
              <div className="p-8 space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-black uppercase text-slate-900 flex items-center gap-3">
                    <div className="p-2 bg-amber-100 text-amber-600 rounded-lg"><User size={20}/></div>
                    Relance Adhérent
                  </h3>
                  <button onClick={() => setRenewalAction(null)} className="text-slate-300 hover:text-rose-500 transition-colors"><X size={24}/></button>
                </div>

                <p className="text-[11px] font-bold text-slate-500 uppercase leading-relaxed">
                  Vous pouvez relancer <span className="text-slate-900">{renewalAction.members?.first_name} {renewalAction.members?.last_name}</span> par téléphone ou préparer un mail de rappel.
                </p>

                <div className="bg-slate-50 rounded-2xl p-5 space-y-4 border border-slate-100">
                  <div className="flex items-center gap-4 text-slate-700">
                    <div className="p-2 bg-white rounded-lg shadow-sm text-[#1a5f7a]"><Phone size={18}/></div>
                    <div className="flex flex-col">
                      <span className="text-[9px] font-black uppercase text-slate-400">N° de Téléphone</span>
                      <span className="text-sm font-black tracking-wider">{renewalAction.members?.phone || "Non renseigné"}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-slate-700">
                    <div className="p-2 bg-white rounded-lg shadow-sm text-[#1a5f7a]"><Mail size={18}/></div>
                    <div className="flex flex-col">
                      <span className="text-[9px] font-black uppercase text-slate-400">Adresse Email</span>
                      <span className="text-sm font-bold truncate max-w-[220px]">{renewalAction.members?.email || "Non renseigné"}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-slate-700">
                    <div className="p-2 bg-white rounded-lg shadow-sm text-[#e38154]"><MapPin size={18}/></div>
                    <div className="flex flex-col">
                      <span className="text-[9px] font-black uppercase text-slate-400">Lieu de résidence</span>
                      <span className="text-sm font-bold leading-tight line-clamp-1">{renewalAction.members?.address || "Non renseignée"}</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-3 pt-2">
                  <button 
                    onClick={() => setShowCodeStep(true)} 
                    className="w-full py-5 bg-amber-600 text-white rounded-2xl font-black uppercase text-xs shadow-lg hover:bg-amber-700 transition-all flex items-center justify-center gap-2"
                  >
                    Préparer le mail Outlook <ChevronRight size={16}/>
                  </button>
                  <button onClick={() => setRenewalAction(null)} className="w-full py-4 text-slate-400 font-black uppercase text-[10px] tracking-widest">Abandonner</button>
                </div>
              </div>
            ) : (
              /* ÉTAPE 2 : CODE ACCÈS AVANT OUVERTURE */
              <div className="p-10 text-center animate-in slide-in-from-right-4">
                <div className="w-16 h-16 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                  <ExternalLink size={32}/>
                </div>
                
                <h3 className="text-xl font-black uppercase text-slate-900 mb-2">Accès Messagerie</h3>
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-8 leading-relaxed px-4">
                  Notez ou mémorisez le code ci-dessous. <br/>Il vous sera demandé à la connexion Outlook :
                </p>

                <div className="bg-[#1a5f7a] rounded-[2rem] p-8 mb-10 shadow-xl shadow-[#1a5f7a]/20 border border-white/10">
                  <p className="text-[10px] font-black uppercase text-white/50 mb-3 tracking-[0.2em]">Mot de passe compte Ludo</p>
                  <p className="text-3xl font-black text-white tracking-[0.4em] drop-shadow-sm">Coligny1991</p>
                </div>

                <div className="flex flex-col gap-3">
                  <button 
                    onClick={() => triggerOutlook(renewalAction)} 
                    className="w-full py-6 bg-emerald-600 text-white rounded-[1.5rem] font-black uppercase text-sm shadow-lg hover:bg-emerald-700 transition-all flex items-center justify-center gap-3"
                  >
                    Lancer la messagerie
                  </button>
                  <button 
                    onClick={() => setShowCodeStep(false)} 
                    className="py-4 text-slate-400 font-black uppercase text-[10px] tracking-widest underline underline-offset-4"
                  >
                    Retour aux coordonnées
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- MODALE CONFIRMATION (RETOUR / PROLONGATION) --- */}
      {confirmAction && (
        <div className="fixed inset-0 z-[120] bg-slate-900/60 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-4">
          <div className="bg-white rounded-t-[2.5rem] md:rounded-[2.5rem] w-full max-w-sm p-10 text-center shadow-2xl animate-in slide-in-from-bottom">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 ${confirmAction.type === 'return' ? 'bg-emerald-50 text-emerald-600 shadow-emerald-100' : 'bg-amber-50 text-amber-600 shadow-amber-100'} shadow-inner`}>
              {confirmAction.type === 'return' ? <CheckCircle size={32}/> : <Clock size={32}/>}
            </div>
            <h3 className="text-xl font-black uppercase mb-2">
              {confirmAction.type === 'return' ? 'Confirmer le retour' : 'Confirmer le délai'}
            </h3>
            <p className="text-[10px] font-black uppercase text-slate-500 mb-8 leading-relaxed px-4">
              {confirmAction.type === 'return' 
                ? "Le jeu sera marqué comme disponible immédiatement pour un nouvel emprunt." 
                : "La date du prêt sera décalée de 15 jours supplémentaires par rapport à aujourd'hui."}
            </p>
            <div className="flex flex-col gap-3">
              <button onClick={processConfirmAction} className={`w-full py-5 text-white rounded-2xl font-black uppercase text-xs shadow-lg transition-all active:scale-95 ${confirmAction.type === 'return' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-amber-600 hover:bg-amber-700'}`}>
                Oui, valider l'action
              </button>
              <button onClick={() => setConfirmAction(null)} className="w-full py-4 bg-slate-50 text-slate-400 rounded-2xl font-black uppercase text-[10px] transition-all hover:bg-slate-100">
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODALE FORMULAIRE NOUVEAU PRÊT --- */}
      {showFormModal && (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-end md:items-center justify-center p-0">
          <div className="bg-white rounded-t-[2.5rem] md:rounded-[2.5rem] w-full max-w-xl max-h-[95vh] overflow-hidden shadow-2xl animate-in slide-in-from-bottom flex flex-col">
            <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-white shrink-0">
              <div className="flex flex-col">
                <h2 className="text-xl font-black uppercase tracking-tight">Enregistrer un <span className="text-[#1a5f7a]">Prêt</span></h2>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Remplissez les informations ci-dessous</p>
              </div>
              <button onClick={() => setShowFormModal(false)} className="p-2 bg-slate-50 rounded-full text-slate-400 hover:text-rose-500 transition-colors"><X size={24}/></button>
            </div>
            
            <div className="p-8 space-y-8 overflow-y-auto">
              {/* ÉTAPE 1 : CHOIX DE L'ADHÉRENT */}
              <div className="space-y-3">
                <div className="flex justify-between items-end">
                  <label className="text-[10px] font-black uppercase tracking-tighter text-[#1a5f7a]">1. Sélection de l'adhérent</label>
                  {selectedMember && <span className="text-[9px] font-black text-emerald-500 uppercase">Validé ✓</span>}
                </div>
                {!selectedMember ? (
                  <div className="relative">
                    <input type="text" placeholder="Taper le nom ou le prénom..." className="w-full p-5 bg-slate-50 rounded-2xl font-bold text-sm outline-none border-2 border-transparent focus:border-[#1a5f7a] transition-all" value={memberSearch} onFocus={() => setMemberListVisible(true)} onBlur={() => setTimeout(() => setMemberListVisible(false), 200)} onChange={(e) => setMemberSearch(e.target.value)} />
                    {memberListVisible && (
                      <div className="absolute top-full w-full bg-white border border-slate-100 rounded-2xl mt-2 shadow-2xl max-h-48 overflow-y-auto z-[110] p-2 divide-y divide-slate-50">
                        {members.filter(m => `${m.first_name} ${m.last_name}`.toLowerCase().includes(memberSearch.toLowerCase())).map(m => (
                          <div key={m.id} onMouseDown={() => setSelectedMember(m)} className="p-4 hover:bg-slate-50 rounded-xl cursor-pointer flex justify-between items-center">
                            <span className="uppercase font-black text-xs text-slate-700">{m.last_name} {m.first_name}</span>
                            <span className="text-[8px] bg-[#1a5f7a]/10 px-2 py-1 rounded-full text-[#1a5f7a] font-black">{m.type}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="bg-cyan-50/50 p-5 rounded-2xl flex justify-between items-center border border-cyan-100 shadow-sm animate-in zoom-in-95">
                    <div>
                      <p className="font-black text-[#1a5f7a] text-sm uppercase">{selectedMember.last_name} {selectedMember.first_name}</p>
                      <p className="text-[10px] font-bold text-cyan-600 uppercase">Quotas : {totalCount} jeux sur {getLoanLimit(selectedMember)} autorisés</p>
                    </div>
                    <button onClick={() => {setSelectedMember(null); setSelectedGames([]);}} className="text-[9px] font-black uppercase text-slate-400 hover:text-rose-500 underline decoration-2">Changer d'adhérent</button>
                  </div>
                )}
              </div>

              {/* ÉTAPE 2 : CHOIX DU/DES JEU(X) */}
              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-tighter text-[#1a5f7a]">2. Jeux à ajouter au prêt</label>
                {selectedMember ? (
                  <>
                    {totalCount < getLoanLimit(selectedMember) ? (
                      <div className="relative">
                        <input type="text" placeholder="Rechercher par titre ou N° de stock..." className="w-full p-5 bg-slate-50 rounded-2xl font-bold text-sm outline-none border-2 border-transparent focus:border-[#1a5f7a] transition-all" value={gameSearch} onFocus={() => setGameListVisible(true)} onBlur={() => setTimeout(() => setGameListVisible(false), 200)} onChange={(e) => setGameSearch(e.target.value)} />
                        {gameListVisible && (
                          <div className="absolute top-full w-full bg-white border border-slate-100 rounded-2xl mt-2 shadow-2xl max-h-48 overflow-y-auto z-[110] p-2 divide-y divide-slate-50">
                            {games.filter(g => g.is_available && g.name.toLowerCase().includes(gameSearch.toLowerCase()) && !selectedGames.find(sg => sg.id === g.id)).map(g => (
                              <div key={g.id} onMouseDown={() => { setSelectedGames([...selectedGames, g]); setGameSearch('') }} className="p-4 hover:bg-[#1a5f7a] hover:text-white rounded-xl cursor-pointer transition-colors">
                                <p className="font-black text-xs uppercase tracking-tight">#{g.registration_number} - {g.name}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="p-5 bg-rose-50 text-rose-500 rounded-2xl text-[10px] font-black uppercase text-center border border-rose-100">
                        Attention : Cet adhérent a atteint son quota maximum de jeux.
                      </div>
                    )}
                    <div className="grid grid-cols-1 gap-2 pt-2">
                      {selectedGames.map(g => (
                        <div key={g.id} className="bg-white border border-slate-100 p-4 rounded-xl flex justify-between items-center shadow-sm animate-in slide-in-from-left-2">
                          <span className="text-[10px] font-black uppercase text-slate-700">#{g.registration_number} - {g.name}</span>
                          <button onClick={() => setSelectedGames(selectedGames.filter(sg => sg.id !== g.id))} className="text-rose-500 p-1 hover:bg-rose-50 rounded-lg"><X size={16}/></button>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="p-5 bg-slate-50 text-slate-400 rounded-2xl text-[10px] font-bold uppercase text-center border border-dashed border-slate-200">
                    Sélectionnez d'abord un adhérent pour voir les jeux disponibles
                  </div>
                )}
              </div>

              {/* ÉTAPE 3 : DATE ET VALIDATION */}
              <div className="pt-6 border-t border-slate-50 space-y-4 shrink-0">
                <div className="flex flex-col gap-2">
                   <label className="text-[10px] font-black uppercase tracking-tighter text-[#1a5f7a]">3. Date du prêt (Par défaut aujourd'hui)</label>
                   <input type="date" className="w-full p-5 bg-slate-50 rounded-2xl font-black text-sm outline-none focus:ring-2 focus:ring-[#1a5f7a]/10" value={loanDate} onChange={e => setLoanDate(e.target.value)} />
                </div>
                <button 
                  onClick={handleSaveLoan} 
                  disabled={!selectedMember || selectedGames.length === 0} 
                  className="w-full py-6 bg-[#1a5f7a] text-white rounded-[1.8rem] font-black uppercase text-xs tracking-[0.2em] shadow-xl disabled:opacity-30 disabled:grayscale transition-all active:scale-95"
                >
                  Confirmer et enregistrer le prêt
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}