import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Dices, Users, Megaphone, LogOut,
  X, Menu, Share2, ClipboardCheck,
  Settings, Lightbulb, TrendingUp, Bell, BellOff
} from 'lucide-react';
import { usePushNotifications } from '../hooks/usePushNotifications';
import ConfirmModal from './admin/ConfirmModal';

const MENU = [
  { path: '/admin', icon: LayoutDashboard, label: 'Tableau de bord' },
  { path: '/admin/jeux', icon: Dices, label: 'Jeux' },
  { path: '/admin/adherents', icon: Users, label: 'Adhérents' },
  { path: '/admin/evenements', icon: Megaphone, label: 'Communication' },
  { path: '/admin/permanences', icon: ClipboardCheck, label: 'Permanences' },
  { path: '/admin/suivi-financier', icon: TrendingUp, label: 'Suivi financier' },
  { path: '/admin/parametres', icon: Settings, label: 'Paramètres' },
  { path: '/admin/suggestions', icon: Lightbulb, label: 'Suggestions' },
];

const PAGE_LABELS = {
  '/admin': 'Tableau de bord',
  '/admin/prets': 'Prêts',
  '/admin/installation': 'Installation',
  '/admin/historique-prets': 'Historique des prêts',
  ...Object.fromEntries(MENU.map(m => [m.path, m.label])),
};

export default function AdminLayout({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { isSupported: isPushSupported, isSubscribed, subscribe, unsubscribe } = usePushNotifications();

  const isPretActive = location.pathname === '/admin/prets';
  const closeMobileMenu = () => setIsMobileMenuOpen(false);
  const currentPageLabel = PAGE_LABELS[location.pathname] ?? 'Administration';

  return (
    <div className="flex min-h-screen flex-col bg-[#fdfaf6] font-body text-[#0f172a] md:flex-row md:items-start">

      {/* --- EN-TÊTE MOBILE --- */}
      <div className="sticky top-0 z-[60] flex items-center justify-between gap-3 border-b-2 border-[#0f172a] bg-white p-3 md:hidden">
        <div className="flex min-w-0 items-center gap-3">
          <img src="/logo-feuille.svg" className="h-8 shrink-0" alt="" />
          <span className="truncate font-display text-[15px] font-extrabold uppercase tracking-[-0.02em] text-[#1a5f7a]">
            {currentPageLabel}
          </span>
        </div>
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          aria-label={isMobileMenuOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] border-2 border-[#0f172a] bg-[#fdfaf6] text-[#0f172a] transition-colors hover:bg-[#1a5f7a] hover:text-white"
        >
          {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* --- BARRE LATÉRALE --- */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 flex w-[276px] flex-col overflow-y-auto border-r-2 border-[#0f172a] bg-white px-5 py-6
        transition-transform duration-300 ease-in-out
        md:sticky md:top-0 md:h-screen md:translate-x-0
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="mb-6 pl-1.5">
          <div className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-slate-400">Gestion de la</div>
          <div className="font-display text-[28px] font-extrabold uppercase leading-none tracking-[-0.045em] text-[#1a5f7a]">
            Ludothèque
          </div>
          <div className="mt-3 h-[5px] w-12 rounded-[5px] bg-[#e38154]" />
        </div>

        {/* Accès prioritaire : le module de prêt */}
        <Link
          to="/admin/prets"
          onClick={closeMobileMenu}
          className={`mb-6 flex items-center gap-3.5 rounded-[26px] border-2 border-[#0f172a] p-[18px] text-left transition-[transform,box-shadow] duration-200 hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_#1a5f7a] ${
            isPretActive ? 'bg-[#1a5f7a] text-white shadow-[4px_4px_0_#0f172a]' : 'bg-white shadow-[4px_4px_0_#1a5f7a]'
          }`}
        >
          <Share2 size={28} className={`shrink-0 ${isPretActive ? 'text-white' : 'text-[#1a5f7a]'}`} />
          <span className="flex min-w-0 flex-col gap-1.5">
            <span className="font-display text-[17px] font-extrabold uppercase leading-none tracking-[0.04em]">
              Prêts
            </span>
            <span className={`text-[8.5px] font-extrabold uppercase tracking-[0.12em] ${isPretActive ? 'text-white/75' : 'text-slate-400'}`}>
              Sorties et retours
            </span>
          </span>
        </Link>

        <div className="mb-3.5 ml-2 text-[9px] font-extrabold uppercase tracking-[0.25em] text-slate-300">
          Administration
        </div>

        <nav className="flex flex-col gap-1">
          {MENU.map(({ path, icon: Icon, label }) => {
            const active = location.pathname === path;
            return (
              <Link
                key={path}
                to={path}
                onClick={closeMobileMenu}
                aria-current={active ? 'page' : undefined}
                className={`flex items-center gap-3.5 rounded-[18px] px-3.5 py-3 transition-colors ${
                  active ? 'bg-[#f0f7f9]' : 'hover:bg-slate-50'
                }`}
              >
                <Icon size={20} className={`shrink-0 ${active ? 'text-[#1a5f7a]' : 'text-slate-400'}`} />
                <span className={`text-[10.5px] uppercase tracking-[0.14em] ${
                  active ? 'font-extrabold text-[#1a5f7a]' : 'font-bold text-slate-500'
                }`}>
                  {label}
                </span>
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto flex flex-col gap-1 border-t-2 border-slate-100 pt-5">
          {isPushSupported && (
            <button
              onClick={isSubscribed ? unsubscribe : subscribe}
              className="flex w-full items-center gap-3 rounded-[16px] px-3.5 py-3 text-left text-[9.5px] font-extrabold uppercase tracking-[0.14em] text-slate-400 transition-colors hover:bg-slate-50 hover:text-[#1a5f7a]"
            >
              {isSubscribed ? <BellOff size={16} className="shrink-0" /> : <Bell size={16} className="shrink-0" />}
              {isSubscribed ? 'Désactiver les notifications' : 'Activer les notifications'}
            </button>
          )}
          <button
            onClick={() => { setShowExitConfirm(true); closeMobileMenu(); }}
            className="flex w-full items-center gap-3 rounded-[16px] px-3.5 py-3 text-left text-[9.5px] font-extrabold uppercase tracking-[0.14em] text-[#f43f5e] transition-colors hover:bg-rose-50"
          >
            <LogOut size={16} className="shrink-0" />
            Quitter l'admin
          </button>
        </div>
      </aside>

      {/* Voile derrière le menu mobile */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-[#0f172a]/40 backdrop-blur-sm md:hidden"
          onClick={closeMobileMenu}
        />
      )}

      <main className="min-w-0 flex-1 md:h-screen md:overflow-y-auto">
        {children}
      </main>

      <ConfirmModal
        open={showExitConfirm}
        onClose={() => setShowExitConfirm(false)}
        onConfirm={() => navigate('/')}
        title="Quitter ?"
        message="Souhaitez-vous fermer la session de gestion ?"
        confirmLabel="Confirmer la déconnexion"
        cancelLabel="Rester ici"
        tone="exit"
        icon={<LogOut size={28} className="text-[#f43f5e]" />}
      />
    </div>
  );
}
