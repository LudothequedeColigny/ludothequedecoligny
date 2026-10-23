import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { lazy, Suspense, useEffect, useState } from 'react'
import { supabase } from './services/supabaseClient'

// Layouts
import AppIntro from './components/AppIntro'
import { ToastProvider } from './components/ToastContext'

// L'accueil est chargé tout de suite : c'est la page la plus visitée.
// Les autres pages ne sont téléchargées qu'au moment où on les ouvre : un
// habitant qui consulte l'accueil ne télécharge plus l'espace de gestion
// (scanner, finances, affiches, export Excel…).
import Home from './pages/Home'

// Pages Publiques
const Catalogue = lazy(() => import('./pages/Catalogue'))
const VieAssociation = lazy(() => import('./pages/VieAssociation'))
const Login = lazy(() => import('./pages/Login'))
const NouveauMotDePasse = lazy(() => import('./pages/NouveauMotDePasse'))
const HowToBorrow = lazy(() => import('./pages/HowToBorrow.jsx'))
const InscriptionPermanence = lazy(() => import('./pages/InscriptionPermanence'))
const NotFound = lazy(() => import('./pages/NotFound'))
const Desabonnement = lazy(() => import('./pages/Desabonnement'))
const MentionsLegales = lazy(() => import('./pages/MentionsLegales'))
const Adherer = lazy(() => import('./pages/Adherer'))
const Confidentialite = lazy(() => import('./pages/Confidentialite'))

// Pages Admin
const AdminLayout = lazy(() => import('./components/AdminLayout'))
const Dashboard = lazy(() => import('./pages/admin/Dashboard'))
const Adherents = lazy(() => import('./pages/admin/Adherents'))
const Jeux = lazy(() => import('./pages/admin/Jeux'))
const Prets = lazy(() => import('./pages/admin/Prets'))
const HistoriquePrets = lazy(() => import('./pages/admin/HistoriquePrets'))
const EvenementsAdmin = lazy(() => import('./pages/admin/Evenements'))
const GestionPermanences = lazy(() => import('./pages/admin/GestionPermanences'))
const InstallationApp = lazy(() => import('./pages/admin/InstallationApp'))
const Parametres = lazy(() => import('./pages/admin/Parametres'))
const Suggestions = lazy(() => import('./pages/admin/Suggestions'))
const SuiviFinancier = lazy(() => import('./pages/admin/SuiviFinancier'))

/**
 * COMPOSANT DE PROTECTION
 * Vérifie si l'utilisateur est connecté avant d'autoriser l'accès aux pages admin
 */
const ProtectedRoute = ({ children }) => {
  const location = useLocation()
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
  // Adresse demandée gardée pour y revenir après la connexion (ex. rappel « ?bilan=39 »)
  if (!session) return <Navigate to="/login" replace state={{ depuis: location.pathname + location.search }} />

  return children
}

function App() {
  return (
    <ToastProvider>
    <div className="min-h-screen bg-[#fdfaf6]">
      <AppIntro />

      {/* Pendant le court téléchargement d'une page : le fond crème, sans rien d'autre */}
      <Suspense fallback={null}>
      <Routes>
        {/* --- ROUTES PUBLIQUES --- */}
        <Route path="/" element={<Home />} />
        <Route path="/catalogue" element={<Catalogue />} />
        {/* Ancienne page inachevée : l'agenda est sur « Vie de la ludothèque » */}
        <Route path="/evenements" element={<Navigate to="/vie-association" replace />} />
        <Route path="/vie-association" element={<VieAssociation />} />
        <Route path="/comment-emprunter" element={<HowToBorrow />} />
        <Route path="/adherer" element={<Adherer />} />
        <Route path="/mentions-legales" element={<MentionsLegales />} />
        <Route path="/confidentialite" element={<Confidentialite />} />
        <Route path="/login" element={<Login />} />
        <Route path="/nouveau-mot-de-passe" element={<NouveauMotDePasse />} />
        <Route path="/inscription-permanence" element={<InscriptionPermanence />} />
        <Route path="/desabonnement" element={<Desabonnement />} />
        
        {/* --- ROUTES PRIVÉES (ADMIN) --- */}
        <Route path="/admin" element={<ProtectedRoute><AdminLayout><Dashboard /></AdminLayout></ProtectedRoute>} />
        <Route path="/admin/jeux" element={<ProtectedRoute><AdminLayout><Jeux /></AdminLayout></ProtectedRoute>} />
        <Route path="/admin/adherents" element={<ProtectedRoute><AdminLayout><Adherents /></AdminLayout></ProtectedRoute>} />
        <Route path="/admin/prets" element={<ProtectedRoute><AdminLayout><Prets /></AdminLayout></ProtectedRoute>} />
        <Route path="/admin/historique-prets" element={<ProtectedRoute><AdminLayout><HistoriquePrets /></AdminLayout></ProtectedRoute>} />
        <Route path="/admin/evenements" element={<ProtectedRoute><AdminLayout><EvenementsAdmin /></AdminLayout></ProtectedRoute>} />
        <Route path="/admin/permanences" element={<ProtectedRoute><AdminLayout><GestionPermanences /></AdminLayout></ProtectedRoute>} />
        <Route path="/admin/installation" element={<ProtectedRoute><AdminLayout><InstallationApp /></AdminLayout></ProtectedRoute>} />
        <Route path="/admin/parametres" element={<ProtectedRoute><AdminLayout><Parametres /></AdminLayout></ProtectedRoute>} />
        <Route path="/admin/suggestions" element={<ProtectedRoute><AdminLayout><Suggestions /></AdminLayout></ProtectedRoute>} />
        <Route path="/admin/suivi-financier" element={<ProtectedRoute><AdminLayout><SuiviFinancier /></AdminLayout></ProtectedRoute>} />
        
        {/* Page 404 personnalisée pour toute route inexistante */}
        <Route path="*" element={<NotFound />} />
      </Routes>
      </Suspense>
    </div>
    </ToastProvider>
  )
}

export default App;