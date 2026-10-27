import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import './index.css'
import { rechargerPourNouvelleVersion } from './services/nouvelleVersion.js'

// Page ouverte avant une mise en ligne : un morceau de code chargé à la demande est
// introuvable. Vite le signale par cet évènement ; on recharge pour prendre la nouvelle version.
window.addEventListener('vite:preloadError', (e) => {
  if (rechargerPourNouvelleVersion()) e.preventDefault()
})

// On récupère l'élément 'root' sans le point d'exclamation
const rootElement = document.getElementById('root');

// On vérifie que l'élément existe bien avant de lancer React
if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </React.StrictMode>
  );
}