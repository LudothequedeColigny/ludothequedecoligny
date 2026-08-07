/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        // Police d'affichage du site public (titres, chiffres clés)
        display: ["'Bricolage Grotesque'", 'system-ui', 'sans-serif'],
        // Police de texte du site public — `sans` reste intact pour l'admin
        body: ['Poppins', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
