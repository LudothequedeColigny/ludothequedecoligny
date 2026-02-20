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
      // Priorité aux données en ligne si dispo
      const { data, error } = await supabase.from('members').select('*').order('last_name')
      if (error) throw error
      setMembers(data || [])
      // Sauvegarde du dernier état propre pour consultation hors-ligne
      localStorage.setItem('cache_members', JSON.stringify(data));
    } catch (err) { 
      console.error("Mode Hors-ligne : Chargement du cache");
      const saved = localStorage.getItem('cache_members');
      if (saved) setMembers(JSON.parse(saved));
    }
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

  // LOGIQUE DE SAUVEGARDE AMÉLIORÉE (ONLINE / OFFLINE)
  async function handleSubmit(e) {
    e.preventDefault();
    
    if (navigator.onLine) {
      // MODE EN LIGNE : On tente l'envoi classique à Supabase
      const { error } = editingId 
        ? await supabase.from('members').update(newMember).eq('id', editingId) 
        : await supabase.from('members').insert([newMember]);
      
      if (!error) { 
        setShowForm(false); 
        setNewMember(initialFormState); 
        fetchMembers(); 
      } else {
        alert("Erreur serveur : " + error.message);
      }
    } else {
      // MODE HORS-LIGNE : On stocke dans la file d'attente (App.jsx s'occupera de la synchro)
      const queue = JSON.parse(localStorage.getItem('offline_sync_queue') || '[]');
      queue.push({ 
        table: 'members', 
        data: newMember, 
        timestamp: Date.now() 
      });
      localStorage.setItem('offline_sync_queue', JSON.stringify(queue));

      // Simulation visuelle pour le bénévole
      setMembers([...members, { ...newMember, id: 'temp-' + Date.now() }]);
      alert("⚠️ Mode hors-ligne : L'adhérent a été enregistré localement. Il sera envoyé automatiquement à Supabase dès que le réseau reviendra.");
      
      setShowForm(false);
      setNewMember(initialFormState);
    }
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

      {/* MODALES (Relance, Consultation, Suppression) ... Restent identiques ... */}
      {/* (Inchangées par rapport à ton code original pour conserver les fonctionnalités) */}
      {renewalAction && ( /* ... code original ... */ null )}
      {viewMember && ( /* ... code original ... */ null )}
      {deleteConfirm && ( /* ... code original ... */ null )}
      
      {/* NOTE : J'ai omis le rendu visuel répétitif des modales ici pour la clarté, 
          mais elles doivent être conservées telles quelles dans ton fichier réel. */}
    </div>
  )
}