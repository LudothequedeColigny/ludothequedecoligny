import { Routes, Route, Navigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { supabase } from './services/supabaseClient'

// Layouts
import AdminLayout from './components/AdminLayout'

// Pages Publiques
import Home from './pages/Home'
import Catalogue from './pages/Catalogue'
import Evenements from './pages/Evenements'
import Login from './pages/Login'
import HowToBorrow from './pages/HowToBorrow.jsx'
import InscriptionPermanence from './pages/InscriptionPermanence'

// Pages Admin
import Dashboard from './pages/admin/Dashboard'
import Adherents from './pages/admin/Adherents'
import Jeux from './pages/admin/Jeux'
import Prets from './pages/admin/Prets'
import HistoriquePrets from './pages/admin/HistoriquePrets' // <-- AJOUTÉ
import EvenementsAdmin from './pages/admin/Evenements'
import GestionPermanences from './pages/admin/GestionPermanences'
import InstallationApp from './pages/admin/InstallationApp'
import Parametres from './pages/admin/Parametres' // <-- AJOUTÉ
import Aide from './pages/admin/Aide' // <-- NOUVEL IMPORT

/**
 * COMPOSANT SPLASHSCREEN (ANIMATION D'OUVERTURE)
 */
function SplashScreen() {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
    }, 2500);
    return () => clearTimeout(timer);
  }, []);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#1a5f7a] transition-opacity duration-700 ease-in-out">
      <div className="relative flex flex-col items-center animate-in zoom-in duration-1000">
        <div className="w-32 h-32 md:w-48 md:h-48 mb-6 animate-pulse">
           <img 
             src="/icon-512.png" 
             alt="Logo Ludothèque" 
             className="w-full h-full object-contain shadow-2xl rounded-full"
           />
        </div>
        <h1 className="text-white font-black uppercase tracking-[0.2em] text-sm md:text-xl">
          Ludothèque de Coligny
        </h1>
        <div className="mt-8 w-48 h-1 bg-white/20 rounded-full overflow-hidden">
          <div className="h-full bg-white animate-progress origin-left"></div>
        </div>
      </div>
      <style>{`
        @keyframes progress {
          0% { transform: scaleX(0); }
          100% { transform: scaleX(1); }
        }
        .animate-progress {
          animation: progress 2.2s ease-in-out forwards;
        }
      `}</style>
    </div>
  );
}

/**
 * COMPOSANT DE PROTECTION
 */
const ProtectedRoute = ({ children }) => {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  if (loading) return null
  if (!session) return <Navigate to="/login" replace />

  return children
}

function App() {
  return (
    <div className="min-h-screen bg-[#fdfaf6]">
      {/* AJOUT DU SPLASHSCREEN AU DÉMARRAGE */}
      <SplashScreen />

      <Routes>
        {/* --- ROUTES PUBLIQUES --- */}
        <Route path="/" element={<Home />} />
        <Route path="/catalogue" element={<Catalogue />} />
        <Route path="/evenements" element={<Evenements />} />
        <Route path="/comment-emprunter" element={<HowToBorrow />} />
        <Route path="/login" element={<Login />} />
        <Route path="/inscription-permanence" element={<InscriptionPermanence />} /> 
        
        {/* --- ROUTES PRIVÉES (ADMIN) --- */}
        <Route path="/admin" element={<ProtectedRoute><AdminLayout><Dashboard /></AdminLayout></ProtectedRoute>} />
        <Route path="/admin/jeux" element={<ProtectedRoute><AdminLayout><Jeux /></AdminLayout></ProtectedRoute>} />
        <Route path="/admin/adherents" element={<ProtectedRoute><AdminLayout><Adherents /></AdminLayout></ProtectedRoute>} />
        <Route path="/admin/prets" element={<ProtectedRoute><AdminLayout><Prets /></AdminLayout></ProtectedRoute>} />
        <Route path="/historique-prets" element={<ProtectedRoute><AdminLayout><HistoriquePrets /></AdminLayout></ProtectedRoute>} /> {/* <-- AJOUTÉ */}
        <Route path="/admin/evenements" element={<ProtectedRoute><AdminLayout><EvenementsAdmin /></AdminLayout></ProtectedRoute>} />
        <Route path="/admin/permanences" element={<ProtectedRoute><AdminLayout><GestionPermanences /></AdminLayout></ProtectedRoute>} />
        <Route path="/admin/installation" element={<ProtectedRoute><AdminLayout><InstallationApp /></AdminLayout></ProtectedRoute>} />
        <Route path="/admin/parametres" element={<ProtectedRoute><AdminLayout><Parametres /></AdminLayout></ProtectedRoute>} /> {/* <-- AJOUTÉ */}
        <Route path="/admin/aide" element={<ProtectedRoute><AdminLayout><Aide /></AdminLayout></ProtectedRoute>} /> {/* <-- NOUVELLE ROUTE */}
        
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  )
}

export default App;