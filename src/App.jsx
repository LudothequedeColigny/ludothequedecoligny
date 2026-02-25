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