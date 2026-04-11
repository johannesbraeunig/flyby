import { createRouter } from 'remix/fetch-router'
import { logger } from 'remix/logger-middleware'
import { staticFiles } from 'remix/static-middleware'

import { home } from './controllers/home.tsx'
import { nearestApi } from './controllers/nearest-api.tsx'
import { routes } from './routes.ts'

// Always mount the request logger, dev and prod. In production
// it's the difference between "it's broken somewhere" and a
// grep-able line in `fly logs` showing the URL + status.
// Suppressed only in tests to keep the test output tidy.
let middleware = []
if (process.env.NODE_ENV !== 'test') {
  middleware.push(logger())
}
middleware.push(
  staticFiles('./public', {
    cacheControl: 'no-store, must-revalidate',
    etag: false,
    lastModified: false,
  }),
)

export let router = createRouter({ middleware })

router.map(routes.home, home)
router.map(routes.nearestApi, nearestApi)
