import { useState, useEffect } from 'react'
import { 
  Users, Trash2, Edit2, X, Plus, CreditCard, 
  Phone, Mail, Search, MapPin, Eye, User, Send, AlertTriangle, 
  Building2, ExternalLink, Calendar, ShieldCheck, ShieldOff, CheckCircle2, ChevronRight, Info
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
  const [showPaymentInfoModal, setShowPaymentInfoModal] = useState(false) // MODALE INFO PAIEMENT

  const [appSettings, setAppSettings] = useState({
    prix_particulier: 0,
    degressivite_mensuelle: 0,
    prix_minimum: 0,
    mode_adhesion_particulier: "degressif",
    prix_association: 0,
    degressivite_association: 0,
    prix_minimum_asso: 0,
    mode_adhesion_association: "glissant",
    active_caution_particulier: "false",
    montant_caution_particulier: 0,
    active_caution_association: "false",
    montant_caution_association: 0,
    // Nouveaux réglages paiements
    pay_cb: "false",
    pay_especes: "false",
    pay_cheque: "false",
    pay_virement: "false",
    iban: '',
    bic: '',
    nom_compte: ''
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
    fee_amount: 0,
    last_reminder_date: null
  }

  const [newMember, setNewMember] = useState(initialFormState)
  const [tempFamilyMember, setTempFamilyMember] = useState('')

  const calculateFee = (type, date, settings) => {
    const isAsso = type === 'Association';
    const base = Number(isAsso ? settings.prix_association : settings.prix_particulier) || 0;
    const deg = Number(isAsso ? settings.degressivite_association : settings.degressivite_mensuelle) || 0;
    const min = Number(isAsso ? settings.prix_minimum_asso : settings.prix_minimum) || 0;
    const mode = isAsso ? settings.mode_adhesion_association : settings.mode_adhesion_particulier;

    if (mode === 'degressif') {
      const monthIndex = new Date(date).getMonth();
      const calculated = base - (monthIndex * deg);
      return Math.max(calculated, min);
    }
    return base;
  }

  useEffect(() => { 
    fetchMembers() 
    loadSettings()
  }, [])

  async function loadSettings() {
    const { data } = await supabase.from('settings').select('*')
    if (data) {
      const obj = {}
      data.forEach(s => obj[s.id] = s.value)
      setAppSettings(prev => ({ ...prev, ...obj }))
    }
  }

  useEffect(() => {
    setNewMember(prev => ({
      ...prev,
      fee_amount: calculateFee(prev.type, prev.membership_date, appSettings)
    }));
  }, [appSettings, newMember.type, newMember.membership_date]);

  // FONCTION POUR TROUVER LE PROCHAIN NUMÉRO DISPONIBLE
  const getNextAvailableNumber = (currentMembers) => {
    if (!currentMembers || currentMembers.length === 0) return '001';
    const numbers = currentMembers
      .map(m => parseInt(m.member_number))
      .filter(n => !isNaN(n));
    const max = numbers.length > 0 ? Math.max(...numbers) : 0;
    return (max + 1).toString().padStart(3, '0');
  }

  const handleOpenForm = () => {
    setEditingId(null);
    setNewMember({
      ...initialFormState,
      member_number: getNextAvailableNumber(members), // Numérotation auto
      fee_amount: calculateFee('Particulier', todayStr, appSettings)
    });
    setShowForm(true);
  };

  const getExpirationStatus = (member) => {
    if (!member.has_paid) return { expired: true, message: "Non réglé" };
    const dateAdhesion = new Date(member.membership_date);
    const isAsso = member.type === 'Association';
    const mode = isAsso ? appSettings.mode_adhesion_association : appSettings.mode_adhesion_particulier;

    if (mode === 'degressif') {
      if (dateAdhesion.getFullYear() < currentYear) return { expired: true, message: "Année expirée" };
    } else {
      const expiryDate = new Date(dateAdhesion);
      expiryDate.setFullYear(expiryDate.getFullYear() + 1);
      if (now > expiryDate) return { expired: true, message: "Contrat expiré" };
    }
    return { expired: false, message: "À jour" };
  }

  async function fetchMembers() {
    setLoading(true)
    // TRIÉ PAR NUMÉRO D'ADHÉRENT
    const { data } = await supabase.from('members').select('*').order('member_number', { ascending: true })
    setMembers(data || [])
    setLoading(false)
  }

  const triggerOutlook = (member) => {
    const name = member.type === 'Association' ? member.last_name : member.first_name;
    const subject = encodeURIComponent(`Renouvellement de votre adhésion - Ludothèque`);
    const body = encodeURIComponent(`Bonjour ${name},\n\nSauf erreur de notre part, votre adhésion à la ludothèque est arrivée à son terme.\n\nNous serions ravis de vous compter à nouveau parmi nos adhérents ! Nous vous invitons à venir renouveler votre adhésion lors de notre prochaine permanence.\n\nCe sera l'occasion de découvrir les nouveautés et de partager un moment convivial.\n\nÀ très bientôt !`);
    window.open(`https://outlook.live.com/mail/0/deeplink/compose?to=${member.email}&subject=${subject}&body=${body}`, '_blank');
  };

  async function handleSubmit(e) {
    e.preventDefault();
    const { error } = editingId 
      ? await supabase.from('members').update(newMember).eq('id', editingId) 
      : await supabase.from('members').insert([newMember]);
    if (!error) { setShowForm(false); setNewMember(initialFormState); fetchMembers(); setEditingId(null); }
  }

  const filteredMembers = members.filter(m => 
    `${m.first_name} ${m.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) || 
    m.member_number?.toString().includes(searchTerm)
  );

  if (loading) return <div className="flex items-center justify-center h-screen bg-[#fdfaf6] text-[#1a5f7a] font-black uppercase text-xs tracking-widest animate-pulse">Chargement...</div>

  return (
    <div className="p-4 md:p-10 bg-[#fdfaf6] min-h-screen font-sans text-slate-900">
      
      {/* HEADER */}
      <div className="max-w-7xl mx-auto mb-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-xl md:text-4xl font-black text-slate-900 flex items-center gap-3">
          <div className="p-2.5 bg-[#1a5f7a] rounded-xl shadow-lg text-white"><Users size={24} /></div>
          <span>Gestion des <span className="text-[#1a5f7a]">Adhérents</span></span>
        </h1>
        <button onClick={() => showForm ? setShowForm(false) : handleOpenForm()} className={`w-full md:w-auto px-6 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all shadow-xl ${showForm ? 'bg-slate-800 text-white' : 'bg-[#e38154] text-white'}`}>
          {showForm ? "Fermer" : "Nouvel Adhérent"}
        </button>
      </div>

      <main className="max-w-7xl mx-auto space-y-6">
        {!showForm && (
          <div className="relative group">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
            <input type="text" placeholder="Rechercher..." className="w-full bg-white border border-slate-100 p-4 pl-14 rounded-2xl font-bold text-slate-700 outline-none shadow-sm focus:ring-2 focus:ring-[#1a5f7a]/10 transition-all" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
        )}

        {showForm && (
          <form onSubmit={handleSubmit} className="bg-white p-6 md:p-12 rounded-[2.5rem] shadow-xl border border-slate-50 mb-8 animate-in zoom-in-95">
             <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                {/* IDENTITÉ */}
                <div className="space-y-4">
                  <h3 className="text-[10px] font-black text-[#1a5f7a] uppercase tracking-widest flex items-center gap-2"><User size={14}/> Type & Identité</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {['Particulier', 'Association'].map((t) => (
                      <button key={t} type="button" onClick={() => setNewMember({...newMember, type: t, first_name: t === 'Association' ? 'Association' : ''})} className={`py-3 rounded-xl font-bold text-[10px] border transition-all ${newMember.type === t ? 'bg-[#1a5f7a] text-white border-[#1a5f7a] shadow-md' : 'bg-slate-50 text-slate-400 border-slate-100'}`}>{t}</button>
                    ))}
                  </div>
                  <input required placeholder="N° Adhérent" className="w-full p-4 rounded-xl bg-slate-50 font-bold text-sm border-2 border-transparent focus:border-[#1a5f7a] outline-none" value={newMember.member_number} onChange={e => setNewMember({...newMember, member_number: e.target.value})} />
                  <div className="grid grid-cols-1 gap-2">
                    {newMember.type !== 'Association' && (
                       <input required placeholder="Prénom" className="w-full p-4 rounded-xl bg-slate-50 font-bold text-sm border-2 border-transparent focus:border-[#1a5f7a] outline-none" value={newMember.first_name} onChange={e => setNewMember({...newMember, first_name: e.target.value})} />
                    )}
                    <input required placeholder={newMember.type === 'Association' ? "Nom de l'Asso" : "Nom"} className="w-full p-4 rounded-xl bg-slate-50 font-bold text-sm border-2 border-transparent focus:border-[#1a5f7a] outline-none" value={newMember.last_name} onChange={e => setNewMember({...newMember, last_name: e.target.value})} />
                  </div>
                  <input type="date" required className="w-full p-4 rounded-xl bg-slate-50 font-bold text-sm outline-none" value={newMember.membership_date} onChange={e => setNewMember({...newMember, membership_date: e.target.value})} />
                </div>

                {/* CONTACT */}
                <div className="space-y-4">
                  <h3 className="text-[10px] font-black text-[#e38154] uppercase tracking-widest flex items-center gap-2"><Mail size={14}/> Coordonnées</h3>
                  <input type="email" placeholder="Email" className="w-full p-4 rounded-xl bg-slate-50 font-bold text-sm" value={newMember.email} onChange={e => setNewMember({...newMember, email: e.target.value})} />
                  <input type="tel" placeholder="Téléphone" className="w-full p-4 rounded-xl bg-slate-50 font-bold text-sm" value={newMember.phone} onChange={e => setNewMember({...newMember, phone: e.target.value})} />
                  <textarea placeholder="Adresse complète" rows="2" className="w-full p-4 rounded-xl bg-slate-50 font-bold text-sm outline-none resize-none" value={newMember.address} onChange={e => setNewMember({...newMember, address: e.target.value})} />
                  
                  {newMember.type === 'Particulier' && (
                    <div className="pt-2">
                      <div className="flex gap-2 mb-2">
                        <input placeholder="Membre foyer..." className="flex-1 p-4 rounded-xl bg-slate-50 font-bold text-sm outline-none" value={tempFamilyMember} onChange={e => setTempFamilyMember(e.target.value)} />
                        <button type="button" onClick={() => { if(tempFamilyMember.trim()){ setNewMember({...newMember, family_members: [...newMember.family_members, tempFamilyMember.trim()]}); setTempFamilyMember(''); }}} className="bg-[#1a5f7a] text-white p-4 rounded-xl shadow-md"><Plus size={20}/></button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {newMember.family_members.map((name, i) => (
                          <span key={i} className="flex items-center gap-2 bg-[#fdfaf6] px-3 py-1.5 rounded-lg text-[10px] font-black uppercase border border-slate-100">
                            {name} <X size={12} className="text-rose-500 cursor-pointer" onClick={() => setNewMember({...newMember, family_members: newMember.family_members.filter((_, idx) => idx !== i)})} />
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* PAIEMENT */}
                <div className="space-y-4">
                  <h3 className="text-[10px] font-black text-[#1a5f7a] uppercase tracking-widest flex items-center gap-2"><CreditCard size={14}/> Cotisation</h3>
                  <div className={`p-6 rounded-[2rem] border-2 text-center transition-all ${newMember.has_paid ? 'bg-emerald-50 border-emerald-100' : 'bg-rose-50 border-rose-100'}`}>
                    <span className="text-3xl font-black text-slate-900 block mb-3">{newMember.fee_amount}€</span>
                    
                    {/* BOUTON MODALITÉS DE PAIEMENT */}
                    <button type="button" onClick={() => setShowPaymentInfoModal(true)} className="mb-4 flex items-center gap-2 mx-auto px-4 py-2 bg-white rounded-xl border border-slate-100 text-[9px] font-black uppercase text-[#1a5f7a] hover:bg-slate-50 transition-all">
                      <Info size={14} /> Modalités de paiement
                    </button>

                    <label className="flex items-center justify-center gap-3 cursor-pointer">
                      <input type="checkbox" className="w-5 h-5 accent-emerald-500" checked={newMember.has_paid} onChange={(e) => setNewMember({...newMember, has_paid: e.target.checked})} />
                      <span className="text-[10px] font-black uppercase text-slate-600 tracking-widest">Réglée</span>
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
                        <span className="text-[10px] font-black uppercase text-slate-600 tracking-widest">Caution reçue</span>
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

        {/* LISTE - TABLEAU (DESKTOP) & CARDS (MOBILE) */}
        {!showForm && (
          <div className="space-y-4">
            {/* VUE TABLEAU (VISIBLE UNIQUEMENT SUR DESKTOP) */}
            <div className="hidden md:block bg-white rounded-[2.5rem] shadow-sm border border-slate-50 overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-[10px] uppercase text-slate-400 font-black">
                  <tr>
                    <th className="p-8">N°</th>
                    <th className="p-8">Adhérent</th>
                    <th className="p-8">Status</th>
                    <th className="p-8">Caution</th>
                    <th className="p-8 text-right pr-12">Gestion</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredMembers.map((m) => {
                    const status = getExpirationStatus(m);
                    const isCautionActive = (m.type === 'Particulier' && appSettings.active_caution_particulier === "true") || (m.type === 'Association' && appSettings.active_caution_association === "true");
                    return (
                      <tr key={m.id} className={`transition-colors ${status.expired ? 'bg-rose-50/40 hover:bg-rose-50/60' : 'hover:bg-slate-50/50'}`}>
                        <td className="p-8 font-black text-[#1a5f7a]">{m.member_number}</td>
                        <td className="p-8 font-black uppercase text-sm">
                          {m.type === 'Association' && <Building2 size={14} className="inline mr-2 text-slate-400"/>}
                          {m.last_name} {m.type !== 'Association' ? m.first_name : ''}
                        </td>
                        <td className="p-8">
                          <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase border flex items-center gap-2 w-fit ${status.expired ? 'bg-rose-100 text-rose-600 border-rose-200' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>
                            {status.message} ({m.fee_amount}€)
                          </span>
                        </td>
                        <td className="p-8 text-[10px] font-black uppercase">
                          {!isCautionActive ? <span className="text-slate-300 italic">N/A</span> : m.caution_received ? <span className="text-orange-600 flex items-center gap-2"><ShieldCheck size={16}/> OK</span> : <span className="text-rose-400 flex items-center gap-2"><ShieldOff size={16}/> Manquante</span>}
                        </td>
                        <td className="p-8 text-right pr-12 space-x-2">
                          {status.expired && <button onClick={() => setRenewalAction(m)} className="p-3 bg-amber-50 text-amber-600 rounded-xl"><Send size={18} /></button>}
                          <button onClick={() => setViewMember(m)} className="p-3 text-slate-400 hover:text-[#1a5f7a]"><Eye size={18} /></button>
                          <button onClick={() => { setNewMember({...m, family_members: m.family_members || []}); setEditingId(m.id); setShowForm(true); }} className="p-3 text-slate-400 hover:text-amber-500"><Edit2 size={18} /></button>
                          <button onClick={() => setDeleteConfirm(m)} className="p-3 text-slate-400 hover:text-rose-500"><Trash2 size={18} /></button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* VUE CARDS (VISIBLE UNIQUEMENT SUR MOBILE) */}
            <div className="md:hidden grid grid-cols-1 gap-4">
              {filteredMembers.map((m) => {
                const status = getExpirationStatus(m);
                return (
                  <div key={m.id} className={`bg-white p-6 rounded-[2rem] shadow-sm border border-slate-50 space-y-4 ${status.expired ? 'bg-rose-50/30' : ''}`}>
                    <div className="flex justify-between items-start">
                      <div className="flex gap-3 items-center">
                        <div className="w-10 h-10 bg-[#1a5f7a]/10 rounded-xl flex items-center justify-center text-[#1a5f7a] font-black text-xs">{m.member_number}</div>
                        <div>
                          <p className="font-black uppercase text-sm leading-tight">{m.last_name} {m.type !== 'Association' ? m.first_name : ''}</p>
                          <p className="text-[10px] text-slate-400 font-bold flex items-center gap-1 uppercase tracking-wider">
                            {m.type === 'Association' ? <><Building2 size={10}/> Association</> : <><User size={10}/> Particulier</>}
                          </p>
                        </div>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase border ${status.expired ? 'bg-rose-100 text-rose-600 border-rose-200' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>
                        {status.message}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between pt-2 border-t border-slate-50">
                       <div className="flex gap-2">
                        <button onClick={() => setViewMember(m)} className="p-3 bg-slate-50 text-slate-400 rounded-xl"><Eye size={18}/></button>
                        <button onClick={() => { setNewMember({...m, family_members: m.family_members || []}); setEditingId(m.id); setShowForm(true); }} className="p-3 bg-slate-50 text-slate-400 rounded-xl"><Edit2 size={18}/></button>
                        <button onClick={() => setDeleteConfirm(m)} className="p-3 bg-rose-50 text-rose-400 rounded-xl"><Trash2 size={18}/></button>
                       </div>
                       {status.expired && (
                         <button onClick={() => setRenewalAction(m)} className="px-5 py-3 bg-amber-50 text-amber-600 rounded-xl font-black text-[9px] uppercase tracking-widest flex items-center gap-2">Relancer <Send size={14}/></button>
                       )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </main>

      {/* MODALE MODALITÉS DE PAIEMENT */}
      {showPaymentInfoModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-[2.5rem] p-10 max-w-lg w-full shadow-2xl animate-in zoom-in-95">
             <h3 className="font-black text-slate-900 uppercase text-xl mb-6 flex items-center gap-3">
               <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg"><CreditCard size={20}/></div>
               Moyens de paiement acceptés
             </h3>
             <div className="space-y-4 mb-8">
                {appSettings.pay_cb === "true" && (
                  <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl font-bold text-sm text-slate-700 border border-slate-100">
                    <CheckCircle2 size={18} className="text-emerald-500" /> Carte Bancaire (CB)
                  </div>
                )}
                {appSettings.pay_especes === "true" && (
                  <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl font-bold text-sm text-slate-700 border border-slate-100">
                    <CheckCircle2 size={18} className="text-emerald-500" /> Espèces
                  </div>
                )}
                {appSettings.pay_cheque === "true" && (
                  <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl font-bold text-sm text-slate-700 border border-slate-100">
                    <CheckCircle2 size={18} className="text-emerald-500" /> Chèque
                  </div>
                )}
                {appSettings.pay_virement === "true" && (
                  <div className="p-6 bg-blue-50/50 rounded-3xl border border-blue-100 space-y-4">
                    <div className="flex items-center gap-3 font-black text-[10px] uppercase text-blue-600 tracking-widest">
                      <Send size={16} /> Virement Bancaire
                    </div>
                    <div className="space-y-2">
                       <p className="text-[9px] font-black text-slate-400 uppercase">Titulaire</p>
                       <p className="text-sm font-bold text-slate-700 bg-white p-3 rounded-xl border border-blue-50">{appSettings.nom_compte || 'Non renseigné'}</p>
                       <p className="text-[9px] font-black text-slate-400 uppercase mt-2">IBAN</p>
                       <p className="text-sm font-mono font-bold text-slate-700 bg-white p-3 rounded-xl border border-blue-50 break-all">{appSettings.iban || 'Non renseigné'}</p>
                       <p className="text-[9px] font-black text-slate-400 uppercase mt-2">Code BIC</p>
                       <p className="text-sm font-mono font-bold text-slate-700 bg-white p-3 rounded-xl border border-blue-50">{appSettings.bic || 'Non renseigné'}</p>
                    </div>
                  </div>
                )}
                {appSettings.pay_cb !== "true" && appSettings.pay_especes !== "true" && appSettings.pay_cheque !== "true" && appSettings.pay_virement !== "true" && (
                  <p className="text-center italic text-slate-400 text-sm py-4">Aucun moyen de paiement configuré dans les paramètres.</p>
                )}
             </div>
             <button onClick={() => setShowPaymentInfoModal(false)} className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg active:scale-95 transition-all">Fermer</button>
          </div>
        </div>
      )}

      {/* MODALE DE RELANCE */}
      {renewalAction && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-6 bg-[#1a5f7a]/80 backdrop-blur-md">
          <div className="bg-white rounded-[3rem] p-10 max-w-lg w-full shadow-2xl border-b-8 border-amber-500 animate-in zoom-in-95">
            <h2 className="text-2xl font-black text-slate-900 uppercase mb-6">Relancer l'adhérent</h2>
            <div className="space-y-4 mb-8">
                <div className="bg-slate-50 p-4 rounded-xl flex gap-3 text-sm font-bold text-slate-600 truncate"><Mail size={18} className="text-[#1a5f7a] shrink-0"/> {renewalAction.email || 'N/A'}</div>
                <div className="bg-slate-50 p-4 rounded-xl flex gap-3 text-sm font-bold text-slate-600"><Phone size={18} className="text-[#1a5f7a] shrink-0"/> {renewalAction.phone || 'N/A'}</div>
                <div className="bg-slate-50 p-4 rounded-xl flex gap-3 text-sm font-bold text-slate-600"><MapPin size={18} className="text-[#1a5f7a] shrink-0"/> {renewalAction.address || 'N/A'}</div>
            </div>
            <button onClick={() => triggerOutlook(renewalAction)} className="w-full p-5 bg-[#1a5f7a] text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl flex items-center justify-center gap-3 transition-all active:scale-95">Ouvrir Outlook <ExternalLink size={18} /></button>
            <button onClick={async () => {
                const today = new Date().toISOString().split('T')[0];
                await supabase.from('members').update({ last_reminder_date: today }).eq('id', renewalAction.id);
                fetchMembers(); setRenewalAction(null);
            }} className="w-full mt-4 py-3 bg-amber-50 text-amber-600 rounded-xl font-black uppercase text-[9px] tracking-widest">Marquer comme relancé aujourd'hui</button>
            <button onClick={() => setRenewalAction(null)} className="w-full mt-2 py-3 text-slate-400 font-bold text-[10px] uppercase">Annuler</button>
          </div>
        </div>
      )}

      {/* MODALE VUE DÉTAILLÉE (AVEC FOYER) */}
      {viewMember && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm">
          <div className="relative bg-white rounded-[2.5rem] p-8 md:p-12 max-w-lg w-full shadow-2xl animate-in fade-in zoom-in-95 overflow-y-auto max-h-[90vh]">
            <h3 className="font-black text-slate-900 uppercase text-2xl mb-8 flex items-center gap-4">
              <div className="p-3 bg-[#1a5f7a]/10 rounded-2xl text-[#1a5f7a]"><User size={24}/></div>
              <span>{viewMember.first_name !== 'Association' ? viewMember.first_name : ''} {viewMember.last_name}</span>
            </h3>
            
            <div className="space-y-4 mb-8 text-sm font-bold text-slate-600">
              <div className="bg-slate-50 p-5 rounded-2xl flex items-center gap-4 border border-slate-100"><Mail size={20} className="text-[#1a5f7a] shrink-0"/> <span className="truncate">{viewMember.email || 'N/A'}</span></div>
              <div className="bg-slate-50 p-5 rounded-2xl flex items-center gap-4 border border-slate-100"><Phone size={20} className="text-[#1a5f7a] shrink-0"/> <span>{viewMember.phone || 'N/A'}</span></div>
              <div className="bg-slate-50 p-5 rounded-2xl flex items-start gap-4 border border-slate-100"><MapPin size={20} className="text-[#1a5f7a] shrink-0 mt-0.5"/> <span className="leading-relaxed">{viewMember.address || 'N/A'}</span></div>

              {viewMember.type === 'Particulier' && (
                <div className="mt-8 pt-6 border-t border-slate-100">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2"><Users size={14}/> Membres du foyer</h4>
                  {viewMember.family_members?.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {viewMember.family_members.map((name, i) => (
                        <div key={i} className="px-4 py-2 bg-emerald-50 text-emerald-700 rounded-xl text-[11px] font-black uppercase border border-emerald-100 shadow-sm">{name}</div>
                      ))}
                    </div>
                  ) : <p className="text-[11px] text-slate-300 italic">Seul membre</p>}
                </div>
              )}
            </div>
            <button onClick={() => setViewMember(null)} className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg">Fermer</button>
          </div>
        </div>
      )}

      {/* MODALE SUPPRESSION */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-6 bg-[#1a5f7a]/80 backdrop-blur-md">
          <div className="bg-white rounded-[3rem] p-10 max-w-sm w-full text-center shadow-2xl border-b-8 border-rose-500 animate-in slide-in-from-bottom-4">
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