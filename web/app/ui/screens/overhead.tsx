import type { EnrichedPlane } from '../../data/enriched.ts'
import type { ResolvedLocation } from '../../data/location.ts'
import {
  compass8,
  formatAltMeters,
  formatDistanceCompact,
  formatFlightLevel,
  formatSpeedCompact,
  formatSpeedKmh,
} from '../../utils/format.ts'

interface OverheadProps {
  origin: string
  enriched: EnrichedPlane
  location: ResolvedLocation
  upNext: Array<{ cs: string; dst: string }>
  fetchedAt: number
}

function utcTimeStr(ms: number): string {
  let d = new Date(ms)
  let h = String(d.getUTCHours()).padStart(2, '0')
  let m = String(d.getUTCMinutes()).padStart(2, '0')
  let s = String(d.getUTCSeconds()).padStart(2, '0')
  return `${h}:${m}:${s}`
}

// Vertical rate in fpm from m/s
function vrFpm(mps: number | null): string {
  if (mps === null || !Number.isFinite(mps)) return '?'
  let fpm = Math.round(mps * 196.85)
  let sign = fpm > 0 ? '+' : ''
  return `${sign}${fpm.toLocaleString('en-US')}`
}

function vrLabel(mps: number | null): string {
  if (mps === null) return ''
  if (mps > 0.5) return 'climbing'
  if (mps < -0.5) return 'descending'
  return 'level'
}

export function Overhead() {
  return ({ origin, enriched, location, upNext, fetchedAt }: OverheadProps) => {
    let p = enriched.plane
    let qs = `?lat=${location.lat}&lon=${location.lon}&radius=${location.radiusKm}`
    let cs = p.callsign || p.icao24.toUpperCase()
    let altM = formatAltMeters(p.altMeters)
    let fl = formatFlightLevel(p.altMeters)
    let spdKt = formatSpeedCompact(p.velocityMps)
    let spdKmh = formatSpeedKmh(p.velocityMps)
    let dstStr = p.distanceKm < 10 ? p.distanceKm.toFixed(1) : String(Math.round(p.distanceKm))
    let bearingStr = `${Math.round(enriched.bearing)}°`
    let elevStr = `${Math.round(enriched.elevation)}`

    let routeStr = ''
    if (enriched.airline) routeStr += enriched.airline.name
    if (enriched.route) {
      if (routeStr) routeStr += ' · '
      routeStr += `${enriched.route.originIata} → ${enriched.route.destinationIata}`
    }
    if (enriched.aircraft) {
      if (routeStr) routeStr += ' · '
      routeStr += enriched.aircraft.icaoType
    }

    let squawk = '—'
    let regStr = enriched.aircraft?.registration || p.icao24.toUpperCase()
    let heading = p.trackDeg !== null ? `${Math.round(p.trackDeg)}°` : '?'
    let headingCompass = p.trackDeg !== null ? compass8(p.trackDeg) : ''

    // Server-rendered altitude sparkline: 36 bars approximating descent
    let bars: Array<{ height: string; bright: boolean }> = []
    for (let i = 0; i < 36; i++) {
      let t = i / 35
      let h = 95 - Math.pow(t, 1.6) * 85
      bars.push({ height: `${h}%`, bright: i > 30 })
    }

    return (
      <div>
        <div class="sc-bar">
          <div class="left">
            <span class="brand led">flyby</span>
            <span class="lbl">⤳ {location.lat.toFixed(2)}°N · {location.lon.toFixed(2)}°E</span>
          </div>
          <div class="right">
            <span><span class="pulse"></span>LIVE · {utcTimeStr(fetchedAt)} UTC</span>
            <span>OPENSKY · 8S PING</span>
            <span>RADIUS {location.radiusKm}KM</span>
          </div>
        </div>

        <section class="overhead">
          <div class="eyebrow">
            <span class="tag">OVERHEAD NOW</span>
            <span class="lbl">↑ {altM} · bearing {bearingStr} · closing {dstStr} km</span>
          </div>

          <div class="overhead-wrap">
            <div>
              <div class="country led">{p.originCountry}</div>
              <div class="callsign led">{cs}</div>
              <div class="route">{routeStr || 'Route unknown'}</div>

              <div class="stat-grid">
                <div class="stat">
                  <div class="lbl">Altitude</div>
                  <div class="val led">{altM}</div>
                  <div class="sub">{fl} · {vrLabel(p.verticalRateMps)} {vrFpm(p.verticalRateMps)} fpm</div>
                </div>
                <div class="stat">
                  <div class="lbl">Ground speed</div>
                  <div class="val led">{spdKt} kt</div>
                  <div class="sub">{spdKmh}</div>
                </div>
                <div class="stat">
                  <div class="lbl">Slant range</div>
                  <div class="val led">{dstStr} km</div>
                  <div class="sub">&nbsp;</div>
                </div>
                <div class="stat">
                  <div class="lbl">Look up</div>
                  <div class="val led">{bearingStr} {enriched.compassDir}</div>
                  <div class="sub">azimuth {Math.round(enriched.bearing)} · elevation {elevStr}</div>
                </div>
                <div class="stat">
                  <div class="lbl">Aircraft</div>
                  <div class="val led">{enriched.aircraft?.icaoType || '?'}</div>
                  <div class="sub">{enriched.aircraft?.typeName || ''}</div>
                </div>
                <div class="stat">
                  <div class="lbl">Squawk</div>
                  <div class="val led">{squawk}</div>
                  <div class="sub">{regStr}</div>
                </div>
                <div class="stat">
                  <div class="lbl">Origin</div>
                  <div class="val led">{enriched.route?.originIata || '?'}</div>
                  <div class="sub">{enriched.route?.originName || ''}</div>
                </div>
                <div class="stat">
                  <div class="lbl">Arrival</div>
                  <div class="val led">{enriched.route?.destinationIata || '?'}</div>
                  <div class="sub">{enriched.route?.destinationName || ''}</div>
                </div>
              </div>
            </div>

            <div>
              <div class="compass">
                <span class="mark n">N</span>
                <span class="mark s">S</span>
                <span class="mark e">E</span>
                <span class="mark w">W</span>
                <div class="you"></div>
                <div class="plane">✈</div>
                <div class="ring-lbl">10 · 20 · {location.radiusKm} km</div>
              </div>

              <div class="side-panel" style="margin-top:20px;">
                <h3>Altitude · last 12 min</h3>
                <div class="altstrip">
                  {bars.map((bar) => (
                    <span
                      class={bar.bright ? 'bright' : undefined}
                      style={`height:${bar.height}`}
                    ></span>
                  ))}
                </div>
                <div class="lbl" style="margin-top:10px; display:flex; justify-content:space-between;">
                  <span>12 MIN AGO</span>
                  <span>&nbsp;</span>
                  <span>NOW · {fl}</span>
                </div>
              </div>

              {upNext.length > 0 ? (
                <div class="side-panel" style="margin-top:16px;">
                  <h3>Up next</h3>
                  <div style="display:grid; gap:10px; margin-top:6px;">
                    {upNext.map((n) => (
                      <div style="display:grid; grid-template-columns: 1fr 50px; gap:10px; align-items:baseline;">
                        <span class="px" style="font-size:22px;">{n.cs}</span>
                        <span class="px" style="font-size:18px; color:var(--ink-dim); text-align:right;">{n.dst}km</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </section>

        <div class="sc-foot">
          <a href={`${origin}/screens/board${qs}`}>◱ NEARBY BOARD</a>
          <a href={`${origin}/screens/radar${qs}`}>◎ RADAR</a>
          <a href={`${origin}/screens/detail${qs}`}>⊞ FLIGHT CARD</a>
          <a href={`${origin}/screens/empty${qs}`}>◯ EMPTY STATE</a>
          <a href={`${origin}/screens/landing`}>⟲ RESET</a>
        </div>
      </div>
    )
  }
}
