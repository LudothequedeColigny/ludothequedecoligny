/**
 * bgg-proxy.mjs — Proxy local pour l'API BoardGameGeek
 * ─────────────────────────────────────────────────────
 * Lance ce serveur dans un terminal séparé :
 *   node bgg-proxy.mjs
 *
 * Il écoute sur http://localhost:3001 et redirige
 * les requêtes vers boardgamegeek.com/xmlapi2/
 * en contournant les restrictions CORS.
 */

import http from 'http'
import https from 'https'

const PORT = 3001
const BGG_HOST = 'boardgamegeek.com'

const server = http.createServer((req, res) => {
  // Headers CORS — autorise les requêtes depuis localhost (Vite)
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return }

  const bggPath = '/xmlapi2' + req.url
  console.log(`→ BGG : https://${BGG_HOST}${bggPath}`)

  const options = {
    hostname: BGG_HOST,
    path: bggPath,
    method: 'GET',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      'Accept': 'text/xml, application/xml, */*',
      'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8',
      'Referer': 'https://boardgamegeek.com/',
      'Host': BGG_HOST
    }
  }

  const proxyReq = https.request(options, (proxyRes) => {
    console.log(`← ${proxyRes.statusCode} ${req.url}`)
    res.writeHead(proxyRes.statusCode, {
      'Content-Type': proxyRes.headers['content-type'] || 'text/xml',
      'Access-Control-Allow-Origin': '*'
    })
    proxyRes.pipe(res)
  })

  proxyReq.on('error', (err) => {
    console.error('Erreur proxy :', err.message)
    res.writeHead(502)
    res.end('Proxy error: ' + err.message)
  })

  proxyReq.end()
})

server.listen(PORT, () => {
  console.log(`\n🎲 BGG Proxy démarré sur http://localhost:${PORT}`)
  console.log(`   Laissez ce terminal ouvert pendant votre session de dev.\n`)
})
