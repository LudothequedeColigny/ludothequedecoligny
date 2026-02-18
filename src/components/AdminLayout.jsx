import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, Dices, Users, Calendar, LogOut, 
  X, Menu, ChevronRight, ClipboardCheck, Share2 
} from 'lucide-react';

export default function AdminLayout({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const menuItems = [
    { path: '/admin', icon: <LayoutDashboard size={20} />, label: 'Tableau de bord' },
    { path: '/admin/jeux', icon: <Dices size={20} />, label: 'Jeux' },
    { path: '/admin/adherents', icon: <Users size={20} />, label: 'Adhérents' },
    { path: '/admin/evenements', icon: <Calendar size={20} />, label: 'Événements' },
  ];

  const pretPath = '/admin/prets';
  const isPretActive = location.pathname === pretPath;

  const closeMobileMenu = () => setIsMobileMenuOpen(false);

  return (
    <div className="flex min-h-screen bg-[#fdfaf6] flex-col md:flex-row font-sans">
      
      {/* --- HEADER MOBILE --- */}
      <div className="md:hidden bg-[#1a5f7a] text-white p-4 flex items-center justify-between sticky top-0 z-[60] shadow-lg">
        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-white/20 rounded-lg">
            <Dices size={20} />
          </div>
          <h2 className="font-black text-[10px] uppercase tracking-[0.2em]">Ludothèque de Coligny</h2>
        </div>
        <button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 bg-white/10 rounded-xl active:scale-95 transition-all"
        >
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* --- SIDEBAR --- */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-72 bg-white text-slate-800 flex flex-col shadow-2xl transition-transform duration-300 ease-in-out border-r border-slate-100
        md:translate-x-0 md:sticky md:h-screen
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        
        {/* LOGO / TITRE MODIFIÉ */}
        <div className="p-8 mb-4">
          <h2 className="text-xl font-black text-slate-900 leading-[0.9] uppercase tracking-tighter">
            <span className="text-[10px] text-slate-400 tracking-[0.1em]">Gestion de la</span> <br />
            <span className="text-[#1a5f7a] text-2xl">Ludothèque</span>
          </h2>
          <div className="h-1 w-12 bg-[#e38154] mt-3 rounded-full"></div>
        </div>

        <nav className="flex-1 px-6 flex flex-col overflow-y-auto">
          
          {/* SECTION PRÊTS */}
          <div className="mb-8">
            <Link
              to={pretPath}
              onClick={closeMobileMenu}
              className={`flex items-center gap-4 p-5 rounded-[1.8rem] transition-all border-2 group ${
                isPretActive 
                  ? 'bg-[#1a5f7a] border-[#1a5f7a] text-white shadow-xl shadow-cyan-100 scale-[1.02]' 
                  : 'bg-white border-slate-100 text-slate-600 hover:border-[#1a5f7a]/30 shadow-sm'
              }`}
            >
              <div className={`transition-colors ${isPretActive ? 'text-white' : 'text-[#1a5f7a]'}`}>
                <Share2 size={28} strokeWidth={2.5} />
              </div>
              <div className="flex flex-col min-w-0">
                <span className={`font-black uppercase tracking-[0.15em] leading-none mb-1.5 text-[14px] ${
                  isPretActive ? 'text-white' : 'text-slate-900'
                }`}>
                  Prêts
                </span>
                <span className={`text-[8px] font-black uppercase tracking-wider leading-tight ${
                  isPretActive ? 'text-white/80' : 'text-slate-400'
                }`}>
                  Sorties et retours
                </span>
              </div>
              {isPretActive && <ChevronRight size={18} className="ml-auto animate-pulse shrink-0" />}
            </Link>
          </div>

          <div className="text-[9px] font-black text-slate-300 uppercase tracking-[0.25em] mb-4 ml-2">
            Administration
          </div>

          {/* MENU ITEMS SECONDAIRES */}
          <div className="space-y-2">
            {menuItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={closeMobileMenu}
                  className={`flex items-center gap-4 p-4 rounded-2xl transition-all group ${
                    isActive 
                      ? 'bg-slate-50 text-[#1a5f7a]' 
                      : 'text-slate-500 hover:bg-slate-50 hover:text-[#1a5f7a]'
                  }`}
                >
                  <span className={`transition-transform group-hover:scale-110 ${isActive ? 'text-[#1a5f7a]' : 'text-slate-300'}`}>
                    {item.icon}
                  </span>
                  <span className={`text-xs uppercase tracking-widest ${isActive ? 'font-black' : 'font-bold'}`}>
                    {item.label}
                  </span>
                </Link>
              );
            })}

            {/* --- LIEN PERMANENCES --- */}
            <div className="mt-10 pt-4 border-t border-slate-50">
              <Link
                to="/admin/permanences"
                onClick={closeMobileMenu}
                className={`flex items-center gap-4 p-4 rounded-2xl transition-all group ${
                  location.pathname === '/admin/permanences' 
                    ? 'bg-slate-50 text-[#1a5f7a]' 
                    : 'text-slate-400 hover:bg-slate-50 hover:text-[#1a5f7a]'
                }`}
              >
                <span className={`transition-transform group-hover:scale-110 ${location.pathname === '/admin/permanences' ? 'text-[#1a5f7a]' : 'text-slate-200'}`}>
                  <ClipboardCheck size={20} />
                </span>
                <span className={`text-[10px] uppercase tracking-widest ${location.pathname === '/admin/permanences' ? 'font-black text-[#1a5f7a]' : 'font-bold'}`}>
                  Permanences
                </span>
              </Link>
            </div>
          </div>

          {/* FOOTER SIDEBAR */}
          <div className="mt-auto py-8 border-t border-slate-50">
            <button
              onClick={() => { setShowExitConfirm(true); closeMobileMenu(); }}
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-rose-400 hover:bg-rose-50 transition-all group w-full text-left"
            >
              <LogOut size={18} />
              <span className="font-black uppercase text-[10px] tracking-widest">Quitter l'admin</span>
            </button>
          </div>
        </nav>
      </aside>

      {/* OVERLAY MOBILE */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 md:hidden transition-opacity" 
          onClick={closeMobileMenu}
        />
      )}

      {/* CONTENU PRINCIPAL */}
      <main className="flex-1 min-w-0 md:h-screen overflow-y-auto">
        {children}
      </main>

      {/* MODALE DE SORTIE */}
      {showExitConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="relative bg-white rounded-[2.5rem] p-10 max-sm w-full shadow-2xl text-center animate-in zoom-in-95 duration-200">
            <div className="mx-auto w-16 h-16 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mb-6">
              <LogOut size={32} />
            </div>
            <h3 className="text-xl font-black text-slate-900 mb-2 uppercase tracking-tight">Quitter ?</h3>
            <p className="text-slate-500 text-sm font-bold mb-8 italic">Souhaitez-vous fermer la session de gestion ?</p>
            <div className="flex flex-col gap-3">
              <button 
                onClick={() => navigate('/')} 
                className="w-full py-4 bg-[#1a5f7a] text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl active:scale-95 transition-all"
              >
                Confirmer la déconnexion
              </button>
              <button 
                onClick={() => setShowExitConfirm(false)} 
                className="w-full py-4 bg-slate-100 text-slate-500 rounded-2xl font-black uppercase text-[10px] tracking-widest active:scale-95 transition-all"
              >
                Rester ici
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}