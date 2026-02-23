import { useState, useEffect } from 'react'
import { 
  Users, Trash2, Edit2, X, Plus, Hash, CreditCard, 
  Phone, Mail, Search, MapPin, Eye, User, Send, AlertTriangle, 
  Building2, Home, ChevronRight, ExternalLink, Calendar, ShieldCheck, ShieldOff
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

  // --- RÉGLAGES DYNAMIQUES (Intégration Caution) ---
  const [appSettings, setAppSettings] = useState({
    prix_particulier: 24,
    prix_association: 50,
    degressivite_mensuelle: 2,
    prix_minimum: 10,
    active_caution_particulier: "false",
    montant_caution_particulier: 50,
    active_caution_association: "false",
    montant_caution_association: 100
  })

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
    caution_received: false,
    family_members: [], 
    membership_date: todayStr,
    fee_amount: 24,
    last_reminder_date: null
  }

  const [newMember, setNewMember] = useState(initialFormState)
  const [tempFamilyMember, setTempFamilyMember] = useState('')

  useEffect(() => { 
    fetchMembers() 
    loadSettings()
  }, [])

  async function loadSettings() {
    try {
      const { data, error } = await supabase.from('settings').select('*')
      if (!error && data) {
        const settingsObj = {}
        data.forEach(s => {
          settingsObj[s.id] = (s.value === "true" || s.value === "false") ? s.value : parseFloat(s.value)
        })
        setAppSettings(prev => ({ ...prev, ...settingsObj }))
      }
    } catch (e) { console.error("Erreur chargement paramètres :", e) }
  }

  useEffect(() => {
    if (newMember.type === 'Particulier') {
      const month = new Date(newMember.membership_date).getMonth();
      const calculatedFee = Math.max(
        appSettings.prix_particulier - (month * appSettings.degressivite_mensuelle), 
        appSettings.prix_minimum
      );
      setNewMember(prev => ({ ...prev, fee_amount: calculatedFee }));
    } else {
      setNewMember(prev => ({ ...prev, fee_amount: appSettings.prix_association }));
    }
  }, [newMember.membership_date, newMember.type, appSettings]);

  async function fetchMembers() {
    setLoading(true)
    try {
      const { data, error } = await supabase.from('members').select('*').order('last_name')
      if (error) throw error
      setMembers(data || [])
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
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
  };

  const addFamilyMember = () => {
    if (tempFamilyMember.trim()) {
      setNewMember({
        ...newMember,
        family_members: [...newMember.family_members, tempFamilyMember.trim()]
      });
      setTempFamilyMember('');
    }
  }

  const formatMemberNumber = (num) => num?.toString().padStart(3, '0') || '---';

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

  async function handleSubmit(e) {
    e.preventDefault();
    const { error } = editingId 
      ? await supabase.from('members').update(newMember).eq('id', editingId) 
      : await supabase.from('members').insert([newMember]);
    if (!error) { setShowForm(false); setNewMember(initialFormState); fetchMembers(); setEditingId(null); }
    else { alert(error.message); }
  }

  const filteredMembers = members.filter(m => `${m.first_name} ${m.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) || m.member_number?.toString().includes(searchTerm));
  const expiredCount = members.filter(m => getExpirationStatus(m).expired).length;

  if (loading) return <div className="flex items-center justify-center h-screen bg-[#fdfaf6] text-[#1a5f7a] font-black uppercase text-xs tracking-widest animate-pulse">Chargement des adhérents...</div>

  return (
    <div className="p-4 md:p-10 bg-[#fdfaf6] min-h-screen font-sans text-slate-900">
      
      <div className="max-w-7xl mx-auto mb-6 md:mb-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-xl md:text-4xl font-black text-slate-900 flex items-center gap-3">
          <div className="p-2.5 bg-[#1a5f7a] rounded-xl shadow-lg text-white"><Users size={24} /></div>
          <span>Gestion des <span className="text-[#1a5f7a]">Adhérents</span></span>
        </h1>
        <button onClick={() => { if(showForm) setShowForm(false); else { setEditingId(null); setNewMember(initialFormState); setShowForm(true); }}} className={`w-full md:w-auto px-6 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all shadow-xl ${showForm ? 'bg-slate-800 text-white' : 'bg-[#e38154] text-white'}`}>
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
            <input type="text" placeholder="Rechercher par nom ou numéro..." className="w-full bg-white border border-slate-100 p-4 pl-14 rounded-2xl font-bold text-slate-700 outline-none shadow-sm focus:ring-2 focus:ring-[#1a5f7a]/10 transition-all" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
        )}

        {showForm && (
          <form onSubmit={handleSubmit} className="bg-white p-6 md:p-12 rounded-[2.5rem] shadow-xl border border-slate-50 mb-8 animate-in zoom-in-95">
             <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                <div className="space-y-4">
                  <h3 className="text-[10px] font-black text-[#1a5f7a] uppercase tracking-widest flex items-center gap-2"><User size={14}/> Type & Identité</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {['Particulier', 'Association'].map((t) => (
                      <button key={t} type="button" onClick={() => setNewMember({...newMember, type: t, first_name: t === 'Association' ? 'Association' : ''})} className={`py-3 rounded-xl font-bold text-[10px] border transition-all ${newMember.type === t ? 'bg-[#1a5f7a] text-white border-[#1a5f7a] shadow-md' : 'bg-slate-50 text-slate-400 border-slate-100'}`}>{t}</button>
                    ))}
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase ml-2">Numéro d'adhérent</label>
                    <input required type="text" className="w-full p-4 rounded-xl bg-slate-50 font-bold text-sm border-2 border-transparent focus:border-[#1a5f7a] outline-none" value={newMember.member_number} onChange={e => setNewMember({...newMember, member_number: e.target.value})} />
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                    {newMember.type !== 'Association' && (
                       <input required placeholder="Prénom" className="w-full p-4 rounded-xl bg-slate-50 font-bold text-sm border-2 border-transparent focus:border-[#1a5f7a] outline-none" value={newMember.first_name} onChange={e => setNewMember({...newMember, first_name: e.target.value})} />
                    )}
                    <input required placeholder={newMember.type === 'Association' ? "Nom de l'Association" : "Nom"} className="w-full p-4 rounded-xl bg-slate-50 font-bold text-sm border-2 border-transparent focus:border-[#1a5f7a] outline-none" value={newMember.last_name} onChange={e => setNewMember({...newMember, last_name: e.target.value})} />
                  </div>
                  <input type="date" required className="w-full p-4 rounded-xl bg-slate-50 font-bold text-sm outline-none" value={newMember.membership_date} onChange={e => setNewMember({...newMember, membership_date: e.target.value})} />
                </div>

                <div className="space-y-4">
                  <h3 className="text-[10px] font-black text-[#e38154] uppercase tracking-widest flex items-center gap-2"><Plus size={14}/> Coordonnées & Foyer</h3>
                  <input type="email" placeholder="Email" className="w-full p-4 rounded-xl bg-slate-50 font-bold text-sm" value={newMember.email} onChange={e => setNewMember({...newMember, email: e.target.value})} />
                  <input type="tel" placeholder="Téléphone" className="w-full p-4 rounded-xl bg-slate-50 font-bold text-sm" value={newMember.phone} onChange={e => setNewMember({...newMember, phone: e.target.value})} />
                  <textarea placeholder="Adresse complète" rows="2" className="w-full p-4 rounded-xl bg-slate-50 font-bold text-sm outline-none border-2 border-transparent focus:border-[#e38154] transition-all resize-none" value={newMember.address} onChange={e => setNewMember({...newMember, address: e.target.value})} />
                  
                  {newMember.type === 'Particulier' && (
                    <div className="pt-2">
                      <label className="text-[9px] font-black text-slate-400 uppercase ml-2 mb-2 block">Membres du foyer</label>
                      <div className="flex gap-2 mb-3">
                        <input placeholder="Prénom..." className="flex-1 p-4 rounded-xl bg-slate-50 font-bold text-sm outline-none" value={tempFamilyMember} onChange={e => setTempFamilyMember(e.target.value)} />
                        <button type="button" onClick={addFamilyMember} className="bg-[#1a5f7a] text-white p-4 rounded-xl shadow-md"><Plus size={20}/></button>
                      </div>
                      <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                        {newMember.family_members.map((name, i) => (
                          <span key={i} className="flex items-center gap-2 bg-[#fdfaf6] px-3 py-1.5 rounded-lg text-[10px] font-black uppercase border border-slate-100">
                            {name} <X size={12} className="text-rose-500 cursor-pointer" onClick={() => setNewMember({...newMember, family_members: newMember.family_members.filter((_, idx) => idx !== i)})} />
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <h3 className="text-[10px] font-black text-[#1a5f7a] uppercase tracking-widest flex items-center gap-2"><CreditCard size={14}/> Cotisation & Caution</h3>
                  <div className={`p-6 rounded-[2rem] border-2 text-center transition-all ${newMember.has_paid ? 'bg-emerald-50 border-emerald-100' : 'bg-rose-50 border-rose-100'}`}>
                    <span className="text-3xl font-black text-slate-900 block mb-3">{newMember.fee_amount}€</span>
                    <label className="flex items-center justify-center gap-3 cursor-pointer">
                      <input type="checkbox" className="w-5 h-5 accent-emerald-500" checked={newMember.has_paid} onChange={(e) => setNewMember({...newMember, has_paid: e.target.checked})} />
                      <span className="text-[10px] font-black uppercase text-slate-600">Cotisation Réglée</span>
                    </label>
                  </div>

                  {((newMember.type === 'Particulier' && appSettings.active_caution_particulier === "true") || 
                    (newMember.type === 'Association' && appSettings.active_caution_association === "true")) && (
                    <div className={`p-6 rounded-[2rem] border-2 text-center transition-all ${newMember.caution_received ? 'bg-orange-50 border-orange-100' : 'bg-slate-50 border-slate-100'}`}>
                      <span className="text-xl font-black text-slate-700 block mb-2">
                        {newMember.type === 'Particulier' ? appSettings.montant_caution_particulier : appSettings.montant_caution_association}€
                      </span>
                      <label className="flex items-center justify-center gap-3 cursor-pointer">
                        <input type="checkbox" className="w-5 h-5 accent-orange-500" checked={newMember.caution_received} onChange={(e) => setNewMember({...newMember, caution_received: e.target.checked})} />
                        <span className="text-[10px] font-black uppercase text-slate-600 tracking-tighter">Caution Reçue</span>
                      </label>
                    </div>
                  )}

                  <button type="submit" className="w-full py-5 bg-[#1a5f7a] text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg transition-all active:scale-95">
                    {editingId ? "Mettre à jour" : "Enregistrer"}
                  </button>
                </div>
             </div>
          </form>
        )}

        {/* TABLEAU */}
        <div className="hidden md:block bg-white rounded-[2.5rem] shadow-sm border border-slate-50 overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-[10px] uppercase text-slate-400 font-black">
              <tr>
                <th className="p-8">N°</th>
                <th className="p-8">Adhérent / Association</th>
                <th className="p-8">Status Adhésion</th>
                <th className="p-8">Caution</th>
                <th className="p-8 text-right pr-12">Gestion</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredMembers.map((m) => {
                const status = getExpirationStatus(m);
                const isCautionActive = (m.type === 'Particulier' && appSettings.active_caution_particulier === "true") || 
                                       (m.type === 'Association' && appSettings.active_caution_association === "true");
                return (
                  <tr key={m.id} className={`transition-colors ${status.expired ? 'bg-rose-50/40 hover:bg-rose-50/60' : 'hover:bg-slate-50/50'}`}>
                    <td className={`p-8 font-black ${status.expired ? 'text-rose-600' : 'text-[#1a5f7a]'}`}>{formatMemberNumber(m.member_number)}</td>
                    <td className="p-8">
                      <div className={`font-black uppercase text-sm flex items-center gap-2 ${status.expired ? 'text-rose-900' : 'text-slate-900'}`}>
                        {m.type === 'Association' && <Building2 size={14} className="text-slate-400"/>}
                        {m.last_name} {m.type !== 'Association' ? m.first_name : ''}
                      </div>
                    </td>
                    <td className="p-8">
                      <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase border flex items-center gap-2 w-fit ${status.expired ? 'bg-rose-100 text-rose-600 border-rose-200' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>
                        {status.message} ({m.fee_amount}€)
                      </span>
                    </td>
                    <td className="p-8 text-[10px] font-black uppercase">
                       {!isCautionActive ? (
                         <span className="text-slate-300 italic">Pas nécessaire</span>
                       ) : m.caution_received ? (
                         <span className="text-orange-600 flex items-center gap-2"><ShieldCheck size={16}/> Reçue</span>
                       ) : (
                         <span className="text-rose-400 flex items-center gap-2"><ShieldOff size={16}/> À réclamer</span>
                       )}
                    </td>
                    <td className="p-8 text-right pr-12 space-x-2">
                      {status.expired && (
                        <button onClick={() => setRenewalAction(m)} className="p-3 bg-amber-50 text-amber-600 rounded-xl border border-amber-100 hover:bg-amber-100 transition-all shadow-sm">
                          <Send size={18} />
                        </button>
                      )}
                      <button onClick={() => setViewMember(m)} className="p-3 text-slate-400 bg-white rounded-xl shadow-sm hover:text-[#1a5f7a] transition-all"><Eye size={18} /></button>
                      <button onClick={() => { setNewMember({...m, family_members: m.family_members || []}); setEditingId(m.id); setShowForm(true); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="p-3 text-slate-400 bg-white rounded-xl shadow-sm hover:text-amber-500 transition-all"><Edit2 size={18} /></button>
                      <button onClick={() => setDeleteConfirm(m)} className="p-3 text-slate-400 bg-white rounded-xl shadow-sm hover:text-rose-500 transition-all"><Trash2 size={18} /></button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </main>

      {/* --- MODALE DE RELANCE COTISATION (VERSION ORIGINALE) --- */}
      {renewalAction && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-[#1a5f7a]/80 backdrop-blur-md" onClick={() => setRenewalAction(null)}></div>
          <div className="relative bg-white rounded-[3rem] p-8 md:p-12 max-w-lg w-full shadow-2xl border-b-8 border-amber-500 animate-in zoom-in-95 overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-start mb-8">
              <div className="w-16 h-16 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center">
                <CreditCard size={28} />
              </div>
              <button onClick={() => setRenewalAction(null)} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400">
                <X size={24} />
              </button>
            </div>

            <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight mb-2">Renouvellement Cotisation</h2>
            <p className="text-sm text-slate-500 mb-6">Coordonnées de l'adhérent <strong>{renewalAction.first_name} {renewalAction.last_name}</strong> :</p>

            <div className="space-y-3 mb-8">
              <div className="flex items-center gap-4 text-slate-600 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <Mail size={18} className="text-[#1a5f7a] shrink-0"/>
                <span className="text-sm font-bold truncate">{renewalAction.email || 'Email non renseigné'}</span>
              </div>
              <div className="flex items-center gap-4 text-slate-600 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <Phone size={18} className="text-[#1a5f7a] shrink-0"/>
                <span className="text-sm font-bold">{renewalAction.phone || 'Téléphone non renseigné'}</span>
              </div>
              <div className="flex items-start gap-4 text-slate-600 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <MapPin size={18} className="text-[#1a5f7a] mt-1 shrink-0"/>
                <span className="text-sm font-bold leading-relaxed">{renewalAction.address || 'Adresse non renseignée'}</span>
              </div>
            </div>

            <div className="space-y-4 mb-8">
              <button 
                onClick={() => triggerOutlook(renewalAction)}
                className="w-full p-5 bg-[#1a5f7a] text-white rounded-[1.5rem] flex items-center justify-center gap-4 hover:bg-[#154d63] transition-all shadow-xl shadow-cyan-900/10 font-black uppercase text-[10px] tracking-widest"
              >
                Envoyer le mail de rappel
                <ExternalLink size={18} />
              </button>
            </div>

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
                  const { error } = await supabase.from('members').update({ last_reminder_date: today }).eq('id', renewalAction.id);
                  if (!error) {
                    setMembers(members.map(m => m.id === renewalAction.id ? {...m, last_reminder_date: today} : m));
                    setRenewalAction({...renewalAction, last_reminder_date: today});
                  }
                }}
                className="w-full py-3 bg-white border border-amber-200 text-amber-600 rounded-xl font-black uppercase text-[9px] tracking-widest hover:bg-amber-500 hover:text-white transition-all shadow-sm flex items-center justify-center gap-2"
              >
                Valider une relance aujourd'hui
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODALE CONSULTATION (VERSION ORIGINALE) --- */}
      {viewMember && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setViewMember(null)}></div>
          <div className="relative bg-white rounded-[2.5rem] p-8 max-w-md w-full shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-4 mb-6 pb-6 border-b border-slate-100">
              <div className="w-14 h-14 bg-[#1a5f7a] text-white rounded-2xl flex items-center justify-center shadow-lg shadow-cyan-900/20">
                <User size={24} />
              </div>
              <div>
                <h3 className="font-black text-slate-900 uppercase text-lg leading-tight">{viewMember.last_name} {viewMember.type !== 'Association' ? viewMember.first_name : ''}</h3>
                <span className="text-[10px] font-black text-[#1a5f7a] uppercase tracking-widest">Adhérent N° {formatMemberNumber(viewMember.member_number)}</span>
              </div>
            </div>
            <div className="space-y-4 mb-8">
              <div className="flex items-center gap-4 text-slate-600 bg-slate-50 p-4 rounded-2xl"><Mail size={18} className="text-[#1a5f7a]"/><span className="text-sm font-bold truncate">{viewMember.email || 'Non renseigné'}</span></div>
              <div className="flex items-center gap-4 text-slate-600 bg-slate-50 p-4 rounded-2xl"><Phone size={18} className="text-[#1a5f7a]"/><span className="text-sm font-bold">{viewMember.phone || 'Non renseigné'}</span></div>
              <div className="flex items-start gap-4 text-slate-600 bg-slate-50 p-4 rounded-2xl"><MapPin size={18} className="text-[#1a5f7a] mt-1"/><span className="text-sm font-bold leading-relaxed">{viewMember.address || 'Aucune adresse enregistrée'}</span></div>
              {viewMember.family_members?.length > 0 && (
                <div className="mt-4 pt-4 border-t border-slate-100">
                   <div className="text-[10px] font-black text-slate-400 uppercase mb-3 tracking-widest">Membres rattachés</div>
                   <div className="flex flex-wrap gap-2">
                     {viewMember.family_members.map((name, i) => (
                       <span key={i} className="px-3 py-1.5 bg-cyan-50 text-[#1a5f7a] text-[10px] font-black uppercase rounded-lg border border-cyan-100">{name}</span>
                     ))}
                   </div>
                </div>
              )}
            </div>
            <button onClick={() => setViewMember(null)} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg active:scale-95 transition-all">Fermer la fiche</button>
          </div>
        </div>
      )}

      {/* MODALE SUPPRESSION */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-[#1a5f7a]/80 backdrop-blur-md" onClick={() => setDeleteConfirm(null)}></div>
          <div className="relative bg-white rounded-[3rem] p-10 max-w-sm w-full text-center shadow-2xl border-b-8 border-rose-500 animate-in slide-in-from-bottom-4">
             <div className="mx-auto w-16 h-16 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mb-6"><Trash2 size={28} /></div>
             <h3 className="text-xl font-black uppercase text-slate-900 mb-2">Supprimer ?</h3>
             <p className="text-xs text-slate-500 mb-8 italic">"{deleteConfirm.last_name} {deleteConfirm.first_name}"</p>
             <div className="flex flex-col gap-3">
               <button onClick={async () => { await supabase.from('members').delete().eq('id', deleteConfirm.id); setDeleteConfirm(null); fetchMembers(); }} className="w-full py-5 bg-rose-500 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg">Confirmer</button>
               <button onClick={() => setDeleteConfirm(null)} className="w-full py-5 bg-slate-100 text-slate-400 rounded-2xl font-black uppercase text-[10px]">Annuler</button>
             </div>
          </div>
        </div>
      )}
    </div>
  )
}