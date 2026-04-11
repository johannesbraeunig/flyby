import type { BuildAction } from 'remix/fetch-router'

import { getAircraft } from '../data/aircraft.ts'
import { getNearestAircraft } from '../data/opensky.ts'
import { getRoute, verifyRouteAgainstTrack } from '../data/routes.ts'
import { getTrackStart } from '../data/tracks.ts'
import { resolveLocation } from '../data/location.ts'
import { routes } from '../routes.ts'
import { PlaneCard } from '../ui/plane-card.tsx'
import { render } from '../utils/render.tsx'

// JSON-or-fragment endpoint that the client polls every 30 s. Returns
// just the <PlaneCard> markup so the page can innerHTML-replace
// without a full reload. The cookie/URL fallback chain is the same as
// the home page.
export let nearestApi: BuildAction<'GET', typeof routes.nearestApi> = {
  async handler({ url }) {
    let location = resolveLocation(url)
    if (location.source === 'fallback' && location.fallbackReason === 'no-params') {
      return new Response('missing lat/lon', { status: 400 })
    }
    let result = await getNearestAircraft(location.lat, location.lon, location.radiusKm)
    let route = null
    let aircraft = null
    if (result.kind === 'ok' || result.kind === 'ok-stale') {
      let [r, a, t] = await Promise.all([
        result.plane.callsign ? getRoute(result.plane.callsign) : Promise.resolve(null),
        getAircraft(result.plane.icao24),
        getTrackStart(result.plane.icao24),
      ])
      aircraft = a
      route = verifyRouteAgainstTrack(r, t)
    }
    return render(<PlaneCard result={result} route={route} aircraft={aircraft} />, {
      headers: { 'Cache-Control': 'no-store' },
    })
  },
}
