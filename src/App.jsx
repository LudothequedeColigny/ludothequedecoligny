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
import HistoriquePrets from './pages/admin/HistoriquePrets'
import EvenementsAdmin from './pages/admin/Evenements'
import GestionPermanences from './pages/admin/GestionPermanences'
import InstallationApp from './pages/admin/InstallationApp'
import Parametres from './pages/admin/Parametres'
import Aide from './pages/admin/Aide'

/**
 * COMPOSANT SPLASHSCREEN (ANIMATION DE CLIGNOTEMENT)
 */
function SplashScreen() {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#315b61] transition-opacity duration-700 ease-in-out">
      <div className="relative flex flex-col items-center">
        
        {/* Animation de clignotement avec l'image icon-512 (Logo + Texte) */}
        <div className="w-40 h-40 md:w-60 md:h-60 mb-8 animate-blink">
           <img 
             src="/icon-512.png" 
             alt="Logo Ludothèque" 
             className="w-full h-full object-contain"
           />
        </div>
        
        {/* Texte fixe */}
        <h1 className="text-white font-black uppercase tracking-[0.2em] text-sm md:text-xl">
          Ludothèque de Coligny
        </h1>
        
        {/* Barre de chargement */}
        <div className="mt-8 w-48 h-1 bg-white/10 rounded-full overflow-hidden">
          <div className="h-full bg-white animate-progress origin-left"></div>
        </div>
      </div>

      <style>{`
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
        @keyframes progress {
          0% { transform: scaleX(0); }
          100% { transform: scaleX(1); }
        }
        .animate-blink {
          animation: blink 1.5s ease-in-out infinite;
        }
        .animate-progress {
          animation: progress 2.8s ease-in-out forwards;
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
        <Route path="/historique-prets" element={<ProtectedRoute><AdminLayout><HistoriquePrets /></AdminLayout></ProtectedRoute>} />
        <Route path="/admin/evenements" element={<ProtectedRoute><AdminLayout><EvenementsAdmin /></AdminLayout></ProtectedRoute>} />
        <Route path="/admin/permanences" element={<ProtectedRoute><AdminLayout><GestionPermanences /></AdminLayout></ProtectedRoute>} />
        <Route path="/admin/installation" element={<ProtectedRoute><AdminLayout><InstallationApp /></AdminLayout></ProtectedRoute>} />
        <Route path="/admin/parametres" element={<ProtectedRoute><AdminLayout><Parametres /></AdminLayout></ProtectedRoute>} />
        <Route path="/admin/aide" element={<ProtectedRoute><AdminLayout><Aide /></AdminLayout></ProtectedRoute>} />
        
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  )
}

export default App;