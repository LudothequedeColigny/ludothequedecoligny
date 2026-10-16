// Réglages de l'outil qui relit le code (npm run lint) à la recherche d'erreurs.
module.exports = {
  root: true,
  env: { browser: true, es2022: true },
  extends: ['eslint:recommended', 'plugin:react-hooks/recommended'],
  parserOptions: { ecmaVersion: 'latest', sourceType: 'module', ecmaFeatures: { jsx: true } },
  plugins: ['react', 'react-refresh'],
  ignorePatterns: ['dist', 'node_modules', 'sauvegarde-jaquettes-originales', '*.config.*', '.eslintrc.cjs'],
  overrides: [
    // Scripts lancés à la main sur l'ordinateur, pas dans le navigateur
    { files: ['scripts/**', 'bgg-proxy.mjs', 'supabase/**'], env: { node: true, browser: false } },
    // Le service worker tourne en arrière-plan, hors de la page
    { files: ['src/sw.js'], env: { serviceworker: true } },
  ],
  rules: {
    // Sans cette règle, un composant utilisé seulement dans le JSX passe pour inutilisé
    'react/jsx-uses-vars': 'error',
    'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
  },
}
