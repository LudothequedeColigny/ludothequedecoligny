import { useState, useEffect } from 'react'
import { supabase } from '../../services/supabaseClient'
import { 
  Settings, UserPlus, Save, Loader2, UserCheck, Ban, Euro, 
  ShieldCheck, X, ChevronRight, Users, CreditCard, Info, Mail, Lock, ShieldAlert, CheckCircle2, User
} from 'lucide-react'

export default function Parametres() {
  const [loading, setLoading] = useState(false)
  const [saveLoading, setSaveLoading] = useState(false)
  const [volunteers, setVolunteers] = useState([])
  
  // Nouveaux états pour le bénévole (Ajout Prénom/Nom)
  const [newEmail, setNewEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  
  const [showFinanceModal, setShowFinanceModal] = useState(false)
  const [showVolunteerModal, setShowVolunteerModal] = useState(false)

  // États pour les modales de confirmation esthétiques
  const [confirmModal, setConfirmModal] = useState({ show: false, title: '', message: '' })
  const [deleteConfirm, setDeleteConfirm] = useState({ show: false, id: null })

  const [prices, setPrices] = useState({
    prix_particulier: 24,
    degressivite_mensuelle: 2,
    prix_minimum: 10,
    prix_association: 50,
    degressivite_association: 5,
    prix_minimum_asso: 20,
    active_caution_particulier: "false",
    montant_caution_particulier: 50,
    active_caution_association: "false",
    montant_caution_association: 100,
    mode_adhesion_particulier: "degressif",
    mode_adhesion_association: "glissant"
  })

  useEffect(() => {
    fetchVolunteers()
    fetchSettings()
  }, [])

  async function fetchVolunteers() {
    // On récupère toutes les infos des profils
    const { data } = await supabase.from('profiles').select('*')
    setVolunteers(data || [])
  }

  async function fetchSettings() {
    const { data } = await supabase.from('settings').select('*')
    if (data) {
      const obj = {}
      data.forEach(s => obj[s.id] = s.value)
      setPrices(prev => ({ ...prev, ...obj }))
    }
  }

  const handleUpdatePrice = async (e) => {
    e.preventDefault()
    setSaveLoading(true)
    const updates = Object.entries(prices).map(([id, value]) => ({ id, value: value.toString() }))
    const { error } = await supabase.from('settings').upsert(updates)
    if (!error) {
      setConfirmModal({
        show: true,
        title: "Configuration enregistrée",
        message: "Les tarifs et règles de caution ont été mis à jour avec succès."
      })
      setShowFinanceModal(false)
    }
    setSaveLoading(false)
  }

  const handleAddVolunteer = async (e) => {
    e.preventDefault()
    setLoading(true)
    
    // Appel de la fonction RPC mise à jour avec 4 paramètres
    const { error } = await supabase.rpc('create_volunteer_manually', {
      user_email: newEmail,
      user_password: newPassword,
      first_name: firstName,
      last_name: lastName
    })

    if (!error) {
      setConfirmModal({
        show: true,
        title: "Bénévole ajouté",
        message: `Le compte de ${firstName} ${lastName} est opérationnel. Activation immédiate.`
      })
      setNewEmail(''); setNewPassword(''); setFirstName(''); setLastName('');
      fetchVolunteers()
    } else { 
      alert("Erreur lors de l'ajout : " + error.message) 
    }
    setLoading(false)
  }

  const handleRemoveVolunteer = async () => {
    if (deleteConfirm.id) {
      const { error } = await supabase.from('profiles').delete().eq('id', deleteConfirm.id)
      if (!error) {
        fetchVolunteers()
        setDeleteConfirm({ show: false, id: null })
      }
    }
  }

  const HelpBox = ({ text, color = "blue" }) => (
    <div className={`flex gap-3 p-4 rounded-[1.5rem] text-[10px] font-bold leading-tight ${color === "blue" ? 'bg-blue-50 text-blue-700' : 'bg-orange-50 text-orange-700'}`}>
      <span className="shrink-0"><Info size={16} /></span>
      <p className="uppercase tracking-tight">{text}</p>
    </div>
  )

  return (
    <div className="p-4 md:p-10 max-w-5xl mx-auto font-sans">
      
      {/* --- HEADER --- */}
      <div className="max-w-7xl mx-auto mb-6 md:mb-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-xl md:text-4xl font-black text-slate-900 flex items-center gap-3">
          <div className="p-2.5 bg-[#1a5f7a] rounded-xl shadow-lg text-white">
            <Settings size={24} />
          </div>
          <span>Paramètres <span className="text-[#1a5f7a]">Système</span></span>
        </h1>
      </div>

      {/* --- DASHBOARD --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <button onClick={() => setShowFinanceModal(true)} className="group relative p-10 bg-white border border-slate-50 rounded-[3.5rem] shadow-xl shadow-slate-200/40 hover:translate-y-[-4px] transition-all text-left overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-orange-50 rounded-full -mr-16 -mt-16 opacity-50 group-hover:scale-110 transition-transform"></div>
          <div className="relative">
            <div className="w-14 h-14 bg-orange-50 rounded-2xl flex items-center justify-center text-[#e38154] mb-8 group-hover:bg-[#e38154] group-hover:text-white transition-all duration-300"><CreditCard size={28} /></div>
            <h3 className="font-black text-2xl text-slate-900 mb-2 uppercase tracking-tighter">Cotisations & Cautions</h3>
            <p className="text-slate-400 font-bold text-sm mb-8 leading-relaxed">Tarifs, dégressivité et gestion des dépôts de garantie.</p>
            <div className="flex items-center gap-2 text-[#e38154] font-black text-[11px] uppercase tracking-[0.2em]">Configurer <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" /></div>
          </div>
        </button>

        <button onClick={() => setShowVolunteerModal(true)} className="group relative p-10 bg-white border border-slate-50 rounded-[3.5rem] shadow-xl shadow-slate-200/40 hover:translate-y-[-4px] transition-all text-left overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-full -mr-16 -mt-16 opacity-50 group-hover:scale-110 transition-transform"></div>
          <div className="relative">
            <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center text-[#1a5f7a] mb-8 group-hover:bg-[#1a5f7a] group-hover:text-white transition-all duration-300"><Users size={28} /></div>
            <h3 className="font-black text-2xl text-slate-900 mb-2 uppercase tracking-tighter">Équipe Bénévoles</h3>
            <p className="text-slate-400 font-bold text-sm mb-8 leading-relaxed">Gérez les accès administrateurs et ajoutez des membres.</p>
            <div className="flex items-center gap-2 text-[#1a5f7a] font-black text-[11px] uppercase tracking-[0.2em]">Gérer l'équipe <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" /></div>
          </div>
        </button>
      </div>

      {/* --- MODALE COTISATIONS & CAUTIONS (INCHANGÉE) --- */}
      {showFinanceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1a5f7a]/60 backdrop-blur-md">
          <div className="bg-white w-full max-w-2xl rounded-[3.5rem] shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
            <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
              <h3 className="font-black text-2xl text-slate-900 uppercase tracking-tighter">Finance & Règles</h3>
              <button onClick={() => setShowFinanceModal(false)} className="p-3 hover:bg-white rounded-2xl transition-all"><X /></button>
            </div>
            
            <form onSubmit={handleUpdatePrice} className="p-8 overflow-y-auto space-y-12">
              <div className="space-y-6">
                <div className="flex items-center gap-2 text-[#1a5f7a] font-black text-[11px] uppercase tracking-widest"><Euro size={18}/> Particuliers</div>
                <div className="grid grid-cols-2 gap-2 bg-slate-100 p-2 rounded-2xl">
                  <button type="button" onClick={() => setPrices({...prices, mode_adhesion_particulier: 'degressif'})} className={`py-3 rounded-xl text-[10px] font-black uppercase transition-all ${prices.mode_adhesion_particulier === 'degressif' ? 'bg-white shadow-md text-[#1a5f7a]' : 'text-slate-400'}`}>Dégressif</button>
                  <button type="button" onClick={() => setPrices({...prices, mode_adhesion_particulier: 'glissant'})} className={`py-3 rounded-xl text-[10px] font-black uppercase transition-all ${prices.mode_adhesion_particulier === 'glissant' ? 'bg-white shadow-md text-[#1a5f7a]' : 'text-slate-400'}`}>Année Glissante</button>
                </div>
                <HelpBox text={prices.mode_adhesion_particulier === 'degressif' ? "Dégressif (Particuliers) : Le prix baisse chaque mois. Fin au 31 décembre." : "Glissant (Particuliers) : Prix fixe. Adhésion valable 12 mois."} />
                <div className="grid grid-cols-3 gap-4">
                  <div><label className="text-[9px] font-black text-slate-400 uppercase ml-2 mb-1 block">Prix Base</label><input type="number" className="w-full p-4 bg-slate-50 rounded-2xl font-black outline-none border-none" value={prices.prix_particulier} onChange={e => setPrices({...prices, prix_particulier: e.target.value})} /></div>
                  {prices.mode_adhesion_particulier === 'degressif' && (
                    <>
                      <div><label className="text-[9px] font-black text-slate-400 uppercase ml-2 mb-1 block">Baisse/Mois</label><input type="number" className="w-full p-4 bg-slate-50 rounded-2xl font-black outline-none border-none" value={prices.degressivite_mensuelle} onChange={e => setPrices({...prices, degressivite_mensuelle: e.target.value})} /></div>
                      <div><label className="text-[9px] font-black text-slate-400 uppercase ml-2 mb-1 block">Prix Min</label><input type="number" className="w-full p-4 bg-slate-50 rounded-2xl font-black outline-none border-none" value={prices.prix_minimum} onChange={e => setPrices({...prices, prix_minimum: e.target.value})} /></div>
                    </>
                  )}
                </div>
                <div className={`p-6 rounded-[2.5rem] border-2 transition-all ${prices.active_caution_particulier === "true" ? 'bg-orange-50 border-orange-100' : 'bg-slate-50 border-transparent'}`}>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-[10px] font-black uppercase text-orange-800 tracking-widest">Caution Particulier</span>
                    <input type="checkbox" className="w-6 h-6 accent-[#e38154] rounded-lg" checked={prices.active_caution_particulier === "true"} onChange={e => setPrices({...prices, active_caution_particulier: e.target.checked ? "true" : "false"})} />
                  </div>
                  {prices.active_caution_particulier === "true" ? (
                    <div className="space-y-4">
                      <input type="number" placeholder="Montant (€)" className="w-full p-4 rounded-2xl bg-white shadow-sm font-black outline-none" value={prices.montant_caution_particulier} onChange={e => setPrices({...prices, montant_caution_particulier: e.target.value})} />
                      <HelpBox color="orange" text="Une case à cocher 'Caution reçue' apparaîtra lors de l'inscription." />
                    </div>
                  ) : <p className="text-[10px] font-bold text-slate-400 uppercase italic opacity-50">Aucune caution demandée</p>}
                </div>
              </div>

              <div className="space-y-6 pt-10 border-t border-slate-100">
                <div className="flex items-center gap-2 text-[#1a5f7a] font-black text-[11px] uppercase tracking-widest"><Users size={18}/> Associations</div>
                <div className="grid grid-cols-2 gap-2 bg-slate-100 p-2 rounded-2xl">
                  <button type="button" onClick={() => setPrices({...prices, mode_adhesion_association: 'degressif'})} className={`py-3 rounded-xl text-[10px] font-black uppercase transition-all ${prices.mode_adhesion_association === 'degressif' ? 'bg-white shadow-md text-[#1a5f7a]' : 'text-slate-400'}`}>Dégressif</button>
                  <button type="button" onClick={() => setPrices({...prices, mode_adhesion_association: 'glissant'})} className={`py-3 rounded-xl text-[10px] font-black uppercase transition-all ${prices.mode_adhesion_association === 'glissant' ? 'bg-white shadow-md text-[#1a5f7a]' : 'text-slate-400'}`}>Année Glissante</button>
                </div>
                <HelpBox text={prices.mode_adhesion_association === 'degressif' ? "Dégressif (Associations) : Adapté pour un prorata de fin d'année." : "Glissant (Associations) : Adhésion de 365 jours."} />
                <div className="grid grid-cols-3 gap-4">
                  <div><label className="text-[9px] font-black text-slate-400 uppercase ml-2 mb-1 block">Prix Base</label><input type="number" className="w-full p-4 bg-slate-50 rounded-2xl font-black outline-none border-none" value={prices.prix_association} onChange={e => setPrices({...prices, prix_association: e.target.value})} /></div>
                  {prices.mode_adhesion_association === 'degressif' && (
                    <>
                      <div><label className="text-[9px] font-black text-slate-400 uppercase ml-2 mb-1 block">Baisse/Mois</label><input type="number" className="w-full p-4 bg-slate-50 rounded-2xl font-black outline-none border-none" value={prices.degressivite_association} onChange={e => setPrices({...prices, degressivite_association: e.target.value})} /></div>
                      <div><label className="text-[9px] font-black text-slate-400 uppercase ml-2 mb-1 block">Prix Min</label><input type="number" className="w-full p-4 bg-slate-50 rounded-2xl font-black outline-none border-none" value={prices.prix_minimum_asso} onChange={e => setPrices({...prices, prix_minimum_asso: e.target.value})} /></div>
                    </>
                  )}
                </div>
                <div className={`p-6 rounded-[2.5rem] border-2 transition-all ${prices.active_caution_association === "true" ? 'bg-orange-50 border-orange-100' : 'bg-slate-50 border-transparent'}`}>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-[10px] font-black uppercase text-orange-800 tracking-widest">Caution Association</span>
                    <input type="checkbox" className="w-6 h-6 accent-[#e38154] rounded-lg" checked={prices.active_caution_association === "true"} onChange={e => setPrices({...prices, active_caution_association: e.target.checked ? "true" : "false"})} />
                  </div>
                  {prices.active_caution_association === "true" ? (
                    <input type="number" placeholder="Montant (€)" className="w-full p-4 rounded-2xl bg-white shadow-sm font-black outline-none" value={prices.montant_caution_association} onChange={e => setPrices({...prices, montant_caution_association: e.target.value})} />
                  ) : <p className="text-[10px] font-bold text-slate-400 uppercase italic opacity-50">Aucune caution demandée</p>}
                </div>
              </div>

              <button type="submit" disabled={saveLoading} className="w-full py-6 bg-[#e38154] text-white rounded-[2rem] font-black uppercase text-xs tracking-widest shadow-xl shadow-orange-200 active:scale-95 transition-all flex items-center justify-center gap-3">
                {saveLoading ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />} Enregistrer la configuration
              </button>
            </form>
          </div>
        </div>
      )}

      {/* --- MODALE BÉNÉVOLES (AVEC PRÉNOM/NOM) --- */}
      {showVolunteerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1a5f7a]/60 backdrop-blur-md">
          <div className="bg-white w-full max-w-2xl rounded-[3.5rem] shadow-2xl overflow-hidden max-h-[92vh] flex flex-col animate-in zoom-in-95">
            <div className="p-8 md:p-10 border-b border-slate-50 flex justify-between items-center bg-blue-50/30">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-[#1a5f7a] text-white rounded-2xl"><Users size={24}/></div>
                <div>
                  <h3 className="font-black text-2xl text-slate-900 uppercase tracking-tighter">Gestion d'équipe</h3>
                  <p className="text-slate-400 text-[9px] font-black uppercase tracking-widest mt-1">Accès administrateur</p>
                </div>
              </div>
              <button onClick={() => setShowVolunteerModal(false)} className="p-3 hover:bg-white rounded-2xl transition-all"><X /></button>
            </div>
            
            <div className="p-8 md:p-10 overflow-y-auto space-y-12">
              <div className="bg-[#1a5f7a] p-8 rounded-[2.5rem] flex gap-5 text-white shadow-xl">
                <ShieldAlert className="text-orange-400 shrink-0" size={28} />
                <div className="space-y-2">
                  <p className="text-sm font-black uppercase">Note importante</p>
                  <ul className="text-[11px] text-blue-100/80 space-y-1 list-disc ml-4 font-medium italic leading-relaxed">
                    <li>Indiquez l'identité complète du membre pour le suivi.</li>
                    <li>Aucun email d'invitation ne sera envoyé (activation immédiate).</li>
                    <li>Le compte pourra tout gérer (jeux, prêts, adhérents).</li>
                  </ul>
                </div>
              </div>

              <form onSubmit={handleAddVolunteer} className="space-y-4">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 italic">Ajouter un membre</p>
                
                {/* Ligne Prénom / Nom */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="relative">
                    <User className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
                    <input type="text" placeholder="Prénom" className="w-full pl-14 pr-6 py-5 rounded-2xl bg-slate-50 font-black text-sm border-none focus:ring-2 ring-blue-100 outline-none transition-all" value={firstName} onChange={e => setFirstName(e.target.value)} required />
                  </div>
                  <div className="relative">
                    <input type="text" placeholder="Nom" className="w-full px-6 py-5 rounded-2xl bg-slate-50 font-black text-sm border-none focus:ring-2 ring-blue-100 outline-none transition-all" value={lastName} onChange={e => setLastName(e.target.value)} required />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="relative">
                    <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
                    <input type="email" placeholder="Email" className="w-full pl-14 pr-6 py-5 rounded-2xl bg-slate-50 font-black text-sm border-none focus:ring-2 ring-blue-100 outline-none transition-all" value={newEmail} onChange={e => setNewEmail(e.target.value)} required />
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
                    <input type="password" placeholder="Mot de passe" className="w-full pl-14 pr-6 py-5 rounded-2xl bg-slate-50 font-black text-sm border-none focus:ring-2 ring-blue-100 outline-none transition-all" value={newPassword} onChange={e => setNewPassword(e.target.value)} required />
                  </div>
                </div>
                <button type="submit" disabled={loading} className="w-full py-5 bg-[#1a5f7a] text-white rounded-[2rem] font-black uppercase text-xs tracking-widest shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2">
                  {loading ? <Loader2 className="animate-spin" size={20} /> : <UserPlus size={20} />} Créer l'accès direct
                </button>
              </form>

              <div className="space-y-6 pt-6">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 italic">Membres actuels ({volunteers.length})</p>
                <div className="grid grid-cols-1 gap-4">
                  {volunteers.map((v) => (
                    <div key={v.id} className="flex items-center justify-between p-5 bg-white border border-slate-100 rounded-[2rem] hover:shadow-lg transition-all shadow-sm group">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-[#1a5f7a] font-black text-sm group-hover:bg-[#1a5f7a] group-hover:text-white transition-all">
                          {v.first_name ? v.first_name.charAt(0).toUpperCase() : v.email.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-black text-slate-800 leading-none">
                            {v.first_name ? `${v.first_name} ${v.last_name}` : v.email}
                          </p>
                          <p className="text-[9px] font-bold text-slate-300 uppercase mt-2 tracking-tighter flex items-center gap-2">
                             {v.email} • <span className="text-slate-200 tracking-[0.2em] font-black">••••••••</span>
                          </p>
                        </div>
                      </div>
                      <button onClick={() => setDeleteConfirm({ show: true, id: v.id })} className="p-4 text-slate-200 hover:text-rose-500 hover:bg-rose-50 rounded-2xl transition-all">
                        <Ban size={22} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- CONFIRMATION --- */}
      {confirmModal.show && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-[#1a5f7a]/80 backdrop-blur-md">
          <div className="bg-white rounded-[3rem] p-10 max-sm w-full text-center shadow-2xl border-b-8 border-emerald-500 animate-in zoom-in-95">
             <div className="mx-auto w-20 h-20 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mb-6 shadow-inner"><CheckCircle2 size={40} /></div>
             <h3 className="text-2xl font-black uppercase text-slate-900 mb-2 tracking-tighter">{confirmModal.title}</h3>
             <p className="text-xs font-bold text-slate-500 mb-8 italic leading-relaxed">{confirmModal.message}</p>
             <button onClick={() => setConfirmModal({ ...confirmModal, show: false })} className="w-full py-5 bg-[#1a5f7a] text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg active:scale-95 transition-all">Continuer</button>
          </div>
        </div>
      )}

      {/* --- SUPPRESSION --- */}
      {deleteConfirm.show && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-[#1a5f7a]/80 backdrop-blur-md">
          <div className="bg-white rounded-[3rem] p-10 max-sm w-full text-center shadow-2xl border-b-8 border-rose-500 animate-in zoom-in-95">
             <div className="mx-auto w-20 h-20 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mb-6 shadow-inner"><ShieldAlert size={40} /></div>
             <h3 className="text-2xl font-black uppercase text-slate-900 mb-2 tracking-tighter">Révoquer ?</h3>
             <p className="text-xs font-bold text-slate-500 mb-8 italic leading-relaxed">Attention, ce bénévole n'aura plus aucun accès à l'administration.</p>
             <div className="flex flex-col gap-3">
                <button onClick={handleRemoveVolunteer} className="w-full py-5 bg-rose-500 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg">Confirmer</button>
                <button onClick={() => setDeleteConfirm({ show: false, id: null })} className="w-full py-5 bg-slate-50 text-slate-400 rounded-2xl font-black uppercase text-[10px] tracking-widest">Annuler</button>
             </div>
          </div>
        </div>
      )}

    </div>
  )
}