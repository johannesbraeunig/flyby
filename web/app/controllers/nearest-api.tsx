import type { BuildAction } from 'remix/fetch-router'

import { getNearestAircraft } from '../data/opensky.ts'
import { resolveLocation } from '../data/location.ts'
import { routes } from '../routes.ts'
import { PlaneCard } from '../ui/plane-card.tsx'
import { render } from '../utils/render.tsx'

// JSON-or-fragment endpoint that the client polls every 30 s. Returns
// just the <PlaneCard> markup so the page can innerHTML-replace
// without a full reload. The cookie/URL fallback chain is the same as
// the home page.
export let nearestApi: BuildAction<'GET', typeof routes.nearestApi> = {
  async handler({ request, url }) {
    let location = resolveLocation(url, request.headers.get('cookie'))
    if (location.source === 'fallback' && location.fallbackReason === 'no-params') {
      return new Response('missing lat/lon', { status: 400 })
    }
    let result = await getNearestAircraft(location.lat, location.lon, location.radiusKm)
    return render(<PlaneCard result={result} />, {
      headers: { 'Cache-Control': 'no-store' },
    })
  },
}
