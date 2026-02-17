import { useState, useEffect } from 'react'
import { 
  Users, Trash2, Edit2, X, Plus, Hash, CreditCard, 
  Phone, Mail, Search, MapPin, Eye, User, Send, AlertTriangle, 
  Building2, Home, ChevronRight, ExternalLink
} from 'lucide-react'
import { supabase } from '../../services/supabaseClient'

export default function Adherents() {
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [viewMember, setViewMember] = useState(null)
  const [renewalAction, setRenewalAction] = useState(null)
  const [showCodeStep, setShowCodeStep] = useState(false)

  const now = new Date();
  const currentYear = now.getFullYear();
  const todayStr = now.toISOString().split('T')[0];

  const initialFormState = {
    member_number: '', 
    first_name: '', 
    last_name: '', 
    email: '', 
    phone: '',
    address: '', 
    type: 'Particulier', 
    has_paid: true, 
    family_members: [], 
    membership_date: todayStr,
    fee_amount: 24
  }

  const [newMember, setNewMember] = useState(initialFormState)
  const [tempFamilyMember, setTempFamilyMember] = useState('')

  useEffect(() => { fetchMembers() }, [])

  // Calcul du tarif dégressif
  useEffect(() => {
    if (newMember.type === 'Particulier') {
      const month = new Date(newMember.membership_date).getMonth();
      const calculatedFee = Math.max(24 - (month * 2), 10);
      setNewMember(prev => ({ ...prev, fee_amount: calculatedFee }));
    } else {
      setNewMember(prev => ({ ...prev, fee_amount: 50 }));
    }
  }, [newMember.membership_date, newMember.type]);

  async function fetchMembers() {
    setLoading(true)
    try {
      const { data, error } = await supabase.from('members').select('*').order('last_name')
      if (error) throw error
      setMembers(data || [])
    } catch (err) { console.error("Erreur:", err.message) }
    finally { setLoading(false) }
  }

  const formatMemberNumber = (num) => {
    if (!num) return '---';
    return num.toString().padStart(3, '0');
  }

  const getExpirationStatus = (member) => {
    if (!member.has_paid) return { expired: true, message: "Non réglé" };
    const dateAdhesion = new Date(member.membership_date);
    if (member.type === 'Particulier') {
      if (dateAdhesion.getFullYear() < currentYear) return { expired: true, message: "Année expirée" };
    } else {
      const expiryDate = new Date(dateAdhesion);
      expiryDate.setFullYear(expiryDate.getFullYear() + 1);
      if (now > expiryDate) return { expired: true, message: "Contrat expiré" };
    }
    return { expired: false, message: "À jour" };
  }

  const triggerOutlook = (member) => {
    const subject = encodeURIComponent(`Relance : Renouvellement de votre adhésion - Ludothèque`);
    const body = encodeURIComponent(
      `Bonjour ${member.first_name !== 'Association' ? member.first_name : member.last_name},\n\n` +
      `Sauf erreur de notre part, votre adhésion à la Ludothèque de Coligny est arrivée à son terme.\n\n` +
      `Pour continuer à profiter du prêt de jeux, nous vous invitons à venir renouveler votre cotisation lors de notre prochaine permanence.\n\n` +
      `À bientôt !\n\nL'équipe de la Ludothèque`
    );
    const outlookUrl = `https://outlook.live.com/mail/0/deeplink/compose?to=${member.email}&subject=${subject}&body=${body}`;
    window.open(outlookUrl, '_blank');
    setRenewalAction(null);
    setShowCodeStep(false);
  };

  const openNewForm = async () => {
    setEditingId(null);
    const existingNumbers = members.map(m => parseInt(m.member_number)).filter(n => !isNaN(n)).sort((a, b) => a - b);
    let nextNum = 1;
    for (let num of existingNumbers) {
      if (num === nextNum) nextNum++;
      else if (num > nextNum) break;
    }
    setNewMember({ ...initialFormState, member_number: nextNum.toString().padStart(3, '0') });
    setShowForm(true);
  }

  const startEdit = (member) => {
    setNewMember({ ...member, family_members: member.family_members || [], membership_date: member.membership_date || todayStr, address: member.address || '' });
    setEditingId(member.id); 
    setShowForm(true); 
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  const addFamilyMember = () => {
    if (tempFamilyMember.trim()) {
      setNewMember({
        ...newMember,
        family_members: [...newMember.family_members, tempFamilyMember.trim()]
      });
      setTempFamilyMember('');
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const { error } = editingId ? await supabase.from('members').update(newMember).eq('id', editingId) : await supabase.from('members').insert([newMember]);
    if (!error) { setShowForm(false); setNewMember(initialFormState); fetchMembers(); }
  }

  const filteredMembers = members.filter(m => `${m.first_name} ${m.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) || m.member_number?.toString().includes(searchTerm));
  const expiredCount = members.filter(m => getExpirationStatus(m).expired).length;

  if (loading) return <div className="flex items-center justify-center h-screen bg-[#fdfaf6] text-[#1a5f7a] font-black uppercase text-xs tracking-widest animate-pulse">Chargement des adhérents...</div>

  return (
    <div className="p-4 md:p-10 bg-[#fdfaf6] min-h-screen font-sans text-slate-900">
      
      {/* HEADER */}
      <div className="max-w-7xl mx-auto mb-6 md:mb-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-xl md:text-4xl font-black text-slate-900 flex items-center gap-3">
          <div className="p-2.5 bg-[#1a5f7a] rounded-xl shadow-lg text-white"><Users size={24} /></div>
          <span>Gestion des <span className="text-[#1a5f7a]">Adhérents</span></span>
        </h1>
        <button onClick={() => showForm ? setShowForm(false) : openNewForm()} className={`w-full md:w-auto px-6 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all shadow-xl ${showForm ? 'bg-slate-800 text-white' : 'bg-[#e38154] text-white'}`}>
          {showForm ? "Fermer" : "Nouvel Adhérent"}
        </button>
      </div>

      <main className="max-w-7xl mx-auto space-y-6">
        
        {!showForm && expiredCount > 0 && (
          <div className="flex items-center gap-3 bg-rose-50 border border-rose-100 p-4 rounded-2xl text-rose-800 animate-in fade-in slide-in-from-top-2">
            <AlertTriangle className="text-rose-500 shrink-0 animate-bounce" size={20} />
            <p className="text-[10px] md:text-xs font-black uppercase tracking-wider">Attention : {expiredCount} adhésion(s) doivent être renouvelées !</p>
          </div>
        )}

        {!showForm && (
          <div className="relative group">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
            <input type="text" placeholder="Rechercher par nom ou numéro (ex: 005)..." className="w-full bg-white border border-slate-100 p-4 pl-14 rounded-2xl font-bold text-slate-700 outline-none shadow-sm focus:ring-2 focus:ring-[#1a5f7a]/10 transition-all" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
        )}

        {showForm && (
          <form onSubmit={handleSubmit} className="bg-white p-6 md:p-12 rounded-[2.5rem] shadow-xl border border-slate-50 mb-8 animate-in zoom-in-95">
             <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                
                {/* Section Identité */}
                <div className="space-y-4">
                  <h3 className="text-[10px] font-black text-[#1a5f7a] uppercase tracking-widest flex items-center gap-2"><User size={14}/> Type & Identité</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {['Particulier', 'Association'].map((t) => (
                      <button key={t} type="button" onClick={() => setNewMember({...newMember, type: t, first_name: '', last_name: ''})} className={`py-3 rounded-xl font-bold text-[10px] border transition-all ${newMember.type === t ? 'bg-[#1a5f7a] text-white border-[#1a5f7a] shadow-md' : 'bg-slate-50 text-slate-400 border-slate-100'}`}>{t}</button>
                    ))}
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase ml-2">Numéro d'adhérent (format 000)</label>
                    <input required type="text" className="w-full p-4 rounded-xl bg-slate-50 font-bold text-sm border-2 border-transparent focus:border-[#1a5f7a] outline-none" value={newMember.member_number} onChange={e => setNewMember({...newMember, member_number: e.target.value})} />
                  </div>
                  {newMember.type === 'Association' ? (
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-400 uppercase ml-2">Nom de l'Association</label>
                      <div className="relative">
                        <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16}/>
                        <input required placeholder="Nom de l'organisme" className="w-full p-4 pl-12 rounded-xl bg-slate-50 font-bold text-sm border-2 border-transparent focus:border-[#1a5f7a] outline-none" value={newMember.last_name} onChange={e => setNewMember({...newMember, last_name: e.target.value, first_name: 'Association'})} />
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      <input required placeholder="Prénom" className="w-full p-4 rounded-xl bg-slate-50 font-bold text-sm border-2 border-transparent focus:border-[#1a5f7a] outline-none" value={newMember.first_name} onChange={e => setNewMember({...newMember, first_name: e.target.value})} />
                      <input required placeholder="Nom" className="w-full p-4 rounded-xl bg-slate-50 font-bold text-sm border-2 border-transparent focus:border-[#1a5f7a] outline-none" value={newMember.last_name} onChange={e => setNewMember({...newMember, last_name: e.target.value})} />
                    </div>
                  )}
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase ml-2">Date d'adhésion</label>
                    <input type="date" required className="w-full p-4 rounded-xl bg-slate-50 font-bold text-sm outline-none border-2 border-transparent focus:border-[#1a5f7a]" value={newMember.membership_date} onChange={e => setNewMember({...newMember, membership_date: e.target.value})} />
                  </div>
                </div>

                {/* Section Contact & Foyer */}
                <div className="space-y-4">
                  <h3 className="text-[10px] font-black text-[#e38154] uppercase tracking-widest flex items-center gap-2"><Plus size={14}/> Coordonnées & Foyer</h3>
                  <div className="space-y-2">
                    <input type="email" placeholder="Email" className="w-full p-4 rounded-xl bg-slate-50 font-bold text-sm" value={newMember.email} onChange={e => setNewMember({...newMember, email: e.target.value})} />
                    <input type="tel" placeholder="Téléphone" className="w-full p-4 rounded-xl bg-slate-50 font-bold text-sm" value={newMember.phone} onChange={e => setNewMember({...newMember, phone: e.target.value})} />
                    <div className="relative">
                       <MapPin className="absolute left-4 top-4 text-slate-300" size={16}/>
                       <textarea placeholder="Adresse postale complète" rows="2" className="w-full p-4 pl-12 rounded-xl bg-slate-50 font-bold text-sm outline-none border-2 border-transparent focus:border-[#e38154] transition-all resize-none" value={newMember.address} onChange={e => setNewMember({...newMember, address: e.target.value})} />
                    </div>
                  </div>
                  
                  {/* AJOUT DES MEMBRES DU FOYER (RESTAURÉ) */}
                  {newMember.type === 'Particulier' && (
                    <div className="pt-2">
                      <label className="text-[9px] font-black text-slate-400 uppercase ml-2 mb-2 block">Membres du foyer</label>
                      <div className="flex gap-2 mb-3">
                        <input placeholder="Prénom..." className="flex-1 p-4 rounded-xl bg-slate-50 font-bold text-sm outline-none" value={tempFamilyMember} onChange={e => setTempFamilyMember(e.target.value)} />
                        <button type="button" onClick={addFamilyMember} className="bg-[#1a5f7a] text-white p-4 rounded-xl shadow-md hover:bg-[#1a5f7a]/90 transition-all"><Plus size={20}/></button>
                      </div>
                      <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto pr-1">
                        {newMember.family_members.map((name, i) => (
                          <span key={i} className="flex items-center gap-2 bg-[#fdfaf6] px-3 py-1.5 rounded-lg text-[10px] font-black uppercase border border-slate-100 text-slate-600">
                            {name} <X size={12} className="text-rose-500 cursor-pointer" onClick={() => setNewMember({...newMember, family_members: newMember.family_members.filter((_, idx) => idx !== i)})} />
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Section Cotisation */}
                <div className="space-y-4">
                  <h3 className="text-[10px] font-black text-[#1a5f7a] uppercase tracking-widest flex items-center gap-2"><CreditCard size={14}/> Cotisation</h3>
                  <div className={`p-8 rounded-[2rem] border-2 text-center transition-all ${newMember.has_paid ? 'bg-emerald-50 border-emerald-100' : 'bg-rose-50 border-rose-100'}`}>
                    <span className="text-4xl font-black text-slate-900 block mb-4">{newMember.fee_amount}€</span>
                    <label className="flex items-center justify-center gap-3 cursor-pointer">
                      <div className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-colors ${newMember.has_paid ? 'bg-emerald-500 border-emerald-500' : 'bg-white border-slate-200'}`}>
                        {newMember.has_paid && <X size={14} className="text-white rotate-45"/>}
                      </div>
                      <input type="checkbox" className="hidden" checked={newMember.has_paid} onChange={(e) => setNewMember({...newMember, has_paid: e.target.checked})} />
                      <span className="text-[10px] font-black uppercase text-slate-600">Cotisation Réglée</span>
                    </label>
                  </div>
                  <button type="submit" className="w-full py-5 bg-[#1a5f7a] text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg hover:shadow-2xl transition-all active:scale-95">
                    {editingId ? "Mettre à jour" : "Enregistrer l'adhérent"}
                  </button>
                </div>
             </div>
          </form>
        )}

        {/* LISTE PC */}
        <div className="hidden md:block bg-white rounded-[2.5rem] shadow-sm border border-slate-50 overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-[10px] uppercase text-slate-400 font-black">
              <tr>
                <th className="p-8">N°</th>
                <th className="p-8">Adhérent / Association</th>
                <th className="p-8">Status Adhésion</th>
                <th className="p-8 text-right pr-12">Gestion</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredMembers.map((m) => {
                const status = getExpirationStatus(m);
                return (
                  <tr key={m.id} className={`transition-colors ${status.expired ? 'bg-rose-50/40 hover:bg-rose-50/60' : 'hover:bg-slate-50/50'}`}>
                    <td className={`p-8 font-black ${status.expired ? 'text-rose-600' : 'text-[#1a5f7a]'}`}>
                      {formatMemberNumber(m.member_number)}
                    </td>
                    <td className="p-8">
                      <div className={`font-black uppercase text-sm flex items-center gap-2 ${status.expired ? 'text-rose-900' : 'text-slate-900'}`}>
                        {m.type === 'Association' && <Building2 size={14} className="text-slate-400"/>}
                        {m.last_name} {m.type !== 'Association' ? m.first_name : ''}
                      </div>
                      <div className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">Depuis le {new Date(m.membership_date).toLocaleDateString()}</div>
                    </td>
                    <td className="p-8">
                      <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase border flex items-center gap-2 w-fit ${status.expired ? 'bg-rose-100 text-rose-600 border-rose-200' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>
                        {status.expired && <AlertTriangle size={10} className="animate-pulse"/>}
                        {status.message} ({m.fee_amount}€)
                      </span>
                    </td>
                    <td className="p-8 text-right pr-12 space-x-2">
                      {status.expired && (
                        <button title="Relancer" onClick={() => { setRenewalAction(m); setShowCodeStep(false); }} className="p-3 bg-amber-50 text-amber-600 rounded-xl border border-amber-100 hover:bg-amber-100 transition-all shadow-sm">
                          <Send size={18} />
                        </button>
                      )}
                      <button onClick={() => setViewMember(m)} className="p-3 text-slate-400 bg-white rounded-xl shadow-sm hover:text-[#1a5f7a] transition-all"><Eye size={18} /></button>
                      <button onClick={() => startEdit(m)} className="p-3 text-slate-400 bg-white rounded-xl shadow-sm hover:text-amber-500 transition-all"><Edit2 size={18} /></button>
                      <button onClick={() => setDeleteConfirm(m)} className="p-3 text-slate-400 bg-white rounded-xl shadow-sm hover:text-rose-500 transition-all"><Trash2 size={18} /></button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* LISTE MOBILE */}
        <div className="md:hidden space-y-4">
          {filteredMembers.map((m) => {
            const status = getExpirationStatus(m);
            return (
              <div key={m.id} className={`p-5 rounded-[2rem] shadow-sm border transition-all ${status.expired ? 'bg-rose-50/50 border-rose-100' : 'bg-white border-slate-50'}`}>
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <div className={`text-[10px] font-black uppercase mb-1 ${status.expired ? 'text-rose-600' : 'text-[#1a5f7a]'}`}>
                      Adhérent N° {formatMemberNumber(m.member_number)}
                    </div>
                    <div className="font-black text-slate-900 uppercase text-sm leading-tight">{m.last_name} {m.type !== 'Association' ? m.first_name : ''}</div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-[8px] font-black border uppercase ${status.expired ? 'bg-rose-500 text-white border-rose-500' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>
                    {status.message}
                  </span>
                </div>
                <div className="flex gap-2 pt-4 border-t border-slate-100/50">
                   {status.expired && (
                     <button onClick={() => { setRenewalAction(m); setShowCodeStep(false); }} className="p-3 bg-amber-50 text-amber-600 rounded-xl border border-amber-100"><Send size={18}/></button>
                   )}
                   <button onClick={() => setViewMember(m)} className="flex-1 py-3 bg-white text-slate-600 rounded-xl font-black uppercase text-[9px] shadow-sm flex items-center justify-center gap-2"><Eye size={14}/> Voir</button>
                   <button onClick={() => startEdit(m)} className="flex-1 py-3 bg-white text-slate-600 rounded-xl font-black uppercase text-[9px] shadow-sm flex items-center justify-center gap-2"><Edit2 size={14}/> Éditer</button>
                </div>
              </div>
            )
          })}
        </div>
      </main>

      {/* MODALE RELANCE */}
      {renewalAction && (
        <div className="fixed inset-0 z-[120] bg-slate-900/60 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-4">
          <div className="bg-white rounded-t-[2.5rem] md:rounded-[2.5rem] w-full max-w-md overflow-hidden shadow-2xl animate-in slide-in-from-bottom md:zoom-in-95">
            {!showCodeStep ? (
              <div className="p-8 space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-black uppercase text-slate-900 flex items-center gap-3">
                    <div className="p-2 bg-amber-100 text-amber-600 rounded-lg"><User size={20}/></div>
                    Relance Cotisation
                  </h3>
                  <button onClick={() => setRenewalAction(null)} className="text-slate-300 hover:text-rose-500 transition-colors"><X size={24}/></button>
                </div>
                <p className="text-[11px] font-bold text-slate-500 uppercase leading-relaxed">
                  Relancer <span className="text-slate-900">{renewalAction.first_name !== 'Association' ? renewalAction.first_name : ''} {renewalAction.last_name}</span> (N° {formatMemberNumber(renewalAction.member_number)})
                </p>
                <div className="bg-slate-50 rounded-2xl p-5 space-y-4 border border-slate-100">
                  <div className="flex items-center gap-4 text-slate-700">
                    <div className="p-2 bg-white rounded-lg shadow-sm text-[#1a5f7a]"><Phone size={18}/></div>
                    <div className="flex flex-col"><span className="text-[9px] font-black uppercase text-slate-400">Téléphone</span><span className="text-sm font-black tracking-wider">{renewalAction.phone || "---"}</span></div>
                  </div>
                  <div className="flex items-center gap-4 text-slate-700">
                    <div className="p-2 bg-white rounded-lg shadow-sm text-[#1a5f7a]"><Mail size={18}/></div>
                    <div className="flex flex-col"><span className="text-[9px] font-black uppercase text-slate-400">Email</span><span className="text-sm font-bold truncate max-w-[220px]">{renewalAction.email || "---"}</span></div>
                  </div>
                </div>
                <div className="flex flex-col gap-3 pt-2">
                  <button onClick={() => setShowCodeStep(true)} className="w-full py-5 bg-amber-600 text-white rounded-2xl font-black uppercase text-xs shadow-lg hover:bg-amber-700 transition-all flex items-center justify-center gap-2">
                    Préparer le mail Outlook <ChevronRight size={16}/>
                  </button>
                  <button onClick={() => setRenewalAction(null)} className="w-full py-4 text-slate-400 font-black uppercase text-[10px] tracking-widest">Abandonner</button>
                </div>
              </div>
            ) : (
              <div className="p-10 text-center animate-in slide-in-from-right-4">
                <div className="w-16 h-16 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner"><ExternalLink size={32}/></div>
                <h3 className="text-xl font-black uppercase text-slate-900 mb-2">Accès Messagerie</h3>
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-8 leading-relaxed px-4">Notez le code ci-dessous pour la connexion Outlook :</p>
                <div className="bg-[#1a5f7a] rounded-[2rem] p-8 mb-10 shadow-xl border border-white/10">
                  <p className="text-[10px] font-black uppercase text-white/50 mb-3 tracking-[0.2em]">Mot de passe compte Ludo</p>
                  <p className="text-3xl font-black text-white tracking-[0.4em]">Coligny1991</p>
                </div>
                <div className="flex flex-col gap-3">
                  <button onClick={() => triggerOutlook(renewalAction)} className="w-full py-6 bg-emerald-600 text-white rounded-[1.5rem] font-black uppercase text-sm shadow-lg hover:bg-emerald-700 flex items-center justify-center gap-3">Lancer la messagerie</button>
                  <button onClick={() => setShowCodeStep(false)} className="py-4 text-slate-400 font-black uppercase text-[10px] underline underline-offset-4">Retour aux coordonnées</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODALE CONSULTATION */}
      {viewMember && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[3rem] w-full max-w-lg p-10 shadow-2xl animate-in zoom-in-95">
            <div className="flex justify-between items-start mb-8">
              <div>
                <h2 className="text-2xl font-black text-slate-900 uppercase mb-1">
                  {viewMember.type === 'Association' && "Association "}
                  {viewMember.last_name} {viewMember.type !== 'Association' ? viewMember.first_name : ''}
                </h2>
                <p className="text-[#1a5f7a] font-bold text-sm uppercase tracking-widest">
                  Adhérent N° {formatMemberNumber(viewMember.member_number)}
                </p>
              </div>
              <button onClick={() => setViewMember(null)} className="p-2 text-slate-300 hover:text-rose-500 transition-colors"><X size={24}/></button>
            </div>
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="bg-slate-50 p-5 rounded-[1.5rem] border border-slate-100">
                  <p className="text-[9px] font-black text-slate-400 uppercase mb-3">Contact</p>
                  <div className="space-y-2 text-xs font-bold text-slate-700">
                    <div className="flex items-center gap-2 truncate"><Mail size={14} className="text-[#1a5f7a]"/> {viewMember.email || '-'}</div>
                    <div className="flex items-center gap-2"><Phone size={14} className="text-[#1a5f7a]"/> {viewMember.phone || '-'}</div>
                  </div>
                </div>
                <div className="bg-slate-50 p-5 rounded-[1.5rem] border border-slate-100">
                  <p className="text-[9px] font-black text-slate-400 uppercase mb-3">Adhésion</p>
                  <div className="space-y-1 text-xs font-bold text-slate-700">
                    <div>Type : {viewMember.type}</div>
                    <div className={`font-black ${getExpirationStatus(viewMember).expired ? 'text-rose-500' : 'text-emerald-600'}`}>
                      {viewMember.fee_amount}€ {viewMember.has_paid ? "(Réglé)" : "(À payer)"}
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="bg-slate-50 p-5 rounded-[1.5rem] border border-slate-100">
                  <p className="text-[9px] font-black text-slate-400 uppercase mb-2">Adresse Postale</p>
                  <div className="flex items-start gap-3 text-xs font-bold text-slate-700 leading-relaxed">
                    <Home size={16} className="text-[#e38154] shrink-0 mt-0.5"/>
                    <p>{viewMember.address || 'Aucune adresse renseignée'}</p>
                  </div>
              </div>

              {/* AFFICHAGE DES MEMBRES DU FOYER (RESTAURÉ) */}
              {viewMember.type === 'Particulier' && (
                <div>
                  <h4 className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-3">Membres du foyer</h4>
                  <div className="flex flex-wrap gap-2">
                    {viewMember.family_members?.length > 0 ? viewMember.family_members.map((name, i) => (
                      <span key={i} className="px-4 py-2 bg-[#fdfaf6] border border-slate-100 rounded-xl text-[11px] font-black text-slate-600 shadow-sm">{name}</span>
                    )) : <span className="text-xs italic text-slate-400 font-medium">Aucun membre enregistré</span>}
                  </div>
                </div>
              )}
            </div>
            <button onClick={() => setViewMember(null)} className="w-full mt-8 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-xs tracking-[0.2em] shadow-lg hover:bg-slate-800 transition-colors">Fermer la fiche</button>
          </div>
        </div>
      )}

      {/* MODALE SUPPRESSION */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] p-10 max-w-sm w-full text-center shadow-2xl animate-in zoom-in-95">
            <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center mx-auto mb-6"><Trash2 size={32}/></div>
            <h3 className="text-lg font-black uppercase text-slate-900 mb-2">Supprimer ?</h3>
            <p className="text-sm text-slate-500 mb-8 font-medium">Confirmez-vous la suppression de l'adhérent <b>{deleteConfirm.last_name}</b> ?</p>
            <div className="flex flex-col gap-3">
              <button onClick={async () => { await supabase.from('members').delete().eq('id', deleteConfirm.id); setDeleteConfirm(null); fetchMembers(); }} className="w-full py-4 bg-rose-500 text-white rounded-xl font-black uppercase text-xs shadow-lg shadow-rose-200">Oui, supprimer</button>
              <button onClick={() => setDeleteConfirm(null)} className="w-full py-4 bg-slate-100 text-slate-400 rounded-xl font-black uppercase text-[10px] tracking-widest">Annuler</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}