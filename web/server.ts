import * as http from 'node:http'

import { createRequestListener } from 'remix/node-fetch-server'

import { router } from './app/router.ts'
import { applySecurityHeaders } from './app/utils/security-headers.ts'

let server = http.createServer(
  createRequestListener(async (request) => {
    try {
      let response = await router.fetch(request)
      return applySecurityHeaders(response)
    } catch (error) {
      console.error(error)
      return applySecurityHeaders(
        new Response('Internal Server Error', { status: 500 }),
      )
    }
  }),
)

// Port precedence: PORT env var → 3000 (production default, matches
// Fly's expectations and Dockerfile EXPOSE conventions). Local dev
// pins PORT=44100 via the `dev` npm script so nothing changes when
// running on a laptop.
let port = process.env.PORT ? Number.parseInt(process.env.PORT, 10) : 3000
// Bind explicitly to 0.0.0.0 so container runtimes (Fly, Docker)
// see the listener. Node's no-host default binds to `::` which is
// dual-stack on most hosts but not reliably reachable from Fly's
// proxy — the proxy probes 0.0.0.0 specifically.
let host = process.env.HOST ?? '0.0.0.0'

server.listen(port, host, () => {
  // Always print `localhost` in the startup log — it's clickable in
  // terminals, whereas `0.0.0.0` is not. The actual bind host is
  // still `host` (0.0.0.0 by default for container reachability).
  console.log(`FlyBy web is running on http://localhost:${port}`)
})

let shuttingDown = false

function shutdown() {
  if (shuttingDown) return
  shuttingDown = true
  server.close(() => process.exit(0))
  server.closeAllConnections()
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
