import { createRouter } from 'remix/fetch-router'
import { logger } from 'remix/logger-middleware'
import { staticFiles } from 'remix/static-middleware'

import { home } from './controllers/home.tsx'
import { nearestApi } from './controllers/nearest-api.tsx'
import { routes } from './routes.ts'

let middleware = []
if (process.env.NODE_ENV === 'development') {
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
