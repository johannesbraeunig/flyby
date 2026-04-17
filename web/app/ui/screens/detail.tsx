import type { EnrichedPlane } from '../../data/enriched.ts'
import type { ResolvedLocation } from '../../data/location.ts'
import {
  compass8,
  formatAltMeters,
  formatFlightLevel,
  formatSpeedCompact,
  splitCallsign,
} from '../../utils/format.ts'

interface DetailProps {
  origin: string
  enriched: EnrichedPlane
  location: ResolvedLocation
  fetchedAt: number
}

function utcTimeStr(ms: number): string {
  let d = new Date(ms)
  let h = String(d.getUTCHours()).padStart(2, '0')
  let m = String(d.getUTCMinutes()).padStart(2, '0')
  let s = String(d.getUTCSeconds()).padStart(2, '0')
  return `${h}:${m}:${s}`
}

function vrFpm(mps: number | null): string {
  if (mps === null || !Number.isFinite(mps)) return '?'
  let fpm = Math.round(mps * 196.85)
  return fpm.toLocaleString('en-US')
}

function vrLabel(mps: number | null): string {
  if (mps === null) return ''
  if (mps > 0.5) return 'climbing'
  if (mps < -0.5) return 'descending'
  return 'level'
}

export function Detail() {
  return ({ origin, enriched, location, fetchedAt }: DetailProps) => {
    let p = enriched.plane
    let qs = `?lat=${location.lat}&lon=${location.lon}&radius=${location.radiusKm}`
    let cs = p.callsign || p.icao24.toUpperCase()
    let parts = splitCallsign(cs)
    let displayCs = parts.icao ? `${parts.icao} ${parts.number}` : cs
    let fl = formatFlightLevel(p.altMeters)
    let altM = formatAltMeters(p.altMeters)
    let spdKt = formatSpeedCompact(p.velocityMps)
    let heading = p.trackDeg !== null ? `${Math.round(p.trackDeg)}°` : '?'
    let headingCompass = p.trackDeg !== null ? compass8(p.trackDeg) : ''
    let vrStr = vrFpm(p.verticalRateMps)
    let vrDescr = vrLabel(p.verticalRateMps)
    let isDescending = p.verticalRateMps !== null && p.verticalRateMps < -0.5

    let airlineStr = ''
    if (enriched.airline) airlineStr += enriched.airline.name
    if (enriched.aircraft) {
      if (airlineStr) airlineStr += ' · '
      airlineStr += enriched.aircraft.typeName || enriched.aircraft.icaoType
    }
    if (enriched.aircraft?.registration) {
      if (airlineStr) airlineStr += ' · '
      airlineStr += enriched.aircraft.registration
    }

    let hasRoute = enriched.route !== null

    return (
      <div>
        <div class="sc-bar">
          <div class="left">
            <span class="brand led">flyby</span>
            <span class="lbl">FLIGHT · {cs}</span>
          </div>
          <div class="right">
            <span><span class="pulse"></span>TRACKING</span>
            <span>PINNED</span>
            <span>{utcTimeStr(fetchedAt)} UTC</span>
          </div>
        </div>

        <section class="detail">
          <div>
            <div class="lbl">Flight number</div>
            <div class="hero-num led">{displayCs}</div>
            <div class="txt" style="margin-top:10px;">
              {airlineStr || p.originCountry}
            </div>

            {hasRoute ? (
              <div class="airports">
                <div>
                  <div class="iata led">{enriched.route!.originIata}</div>
                  <div class="city">{enriched.route!.originName}</div>
                </div>
                <div class="arrow led dim">—▶</div>
                <div style="text-align:right;">
                  <div class="iata led">{enriched.route!.destinationIata}</div>
                  <div class="city">{enriched.route!.destinationName}</div>
                </div>
              </div>
            ) : (
              <div class="airports">
                <div>
                  <div class="iata led">?</div>
                  <div class="city">Origin unknown</div>
                </div>
                <div class="arrow led dim">—▶</div>
                <div style="text-align:right;">
                  <div class="iata led">?</div>
                  <div class="city">Destination unknown</div>
                </div>
              </div>
            )}

            <div class="sub-info">
              <div class="stat">
                <div class="lbl">Alt</div>
                <div class="val led">{altM}</div>
                <div class="sub">{fl}</div>
              </div>
              <div class="stat">
                <div class="lbl">Speed</div>
                <div class="val led">{spdKt} kt</div>
                <div class="sub">ground</div>
              </div>
              <div class="stat">
                <div class="lbl">Heading</div>
                <div class="val led">{heading}</div>
                <div class="sub">{headingCompass}</div>
              </div>
              <div class="stat">
                <div class="lbl">V/S</div>
                <div class={`val led${isDescending ? ' hot' : ''}`}>{isDescending ? '−' : ''}{vrStr}</div>
                <div class="sub">fpm · {vrDescr}</div>
              </div>
            </div>
          </div>

          <div>
            <div class="chart">
              <span class="caption">Altitude profile{hasRoute ? ` · ${enriched.route!.originIata} → ${enriched.route!.destinationIata}` : ''}</span>
              <span class="peak led">NOW · {fl}</span>
              <svg viewBox="0 0 400 200" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="g" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stop-color="currentColor" stop-opacity=".45" />
                    <stop offset="100%" stop-color="currentColor" stop-opacity="0" />
                  </linearGradient>
                </defs>
                <g style="color: var(--ink);">
                  <path
                    d="M0,180 C60,150 90,40 160,30 C210,22 240,24 280,60 C320,100 350,150 400,185 L400,200 L0,200 Z"
                    fill="url(#g)"
                  />
                  <path
                    d="M0,180 C60,150 90,40 160,30 C210,22 240,24 280,60 C320,100 350,150 400,185"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    style="filter: drop-shadow(0 0 6px currentColor);"
                  />
                  <circle cx="342" cy="158" r="4" fill="currentColor" />
                  <line
                    x1="342" y1="0" x2="342" y2="200"
                    stroke="currentColor" stroke-width="1"
                    stroke-dasharray="2 4" opacity=".6"
                  />
                </g>
                <g font-family="JetBrains Mono" font-size="9" fill="var(--ink-mute)" letter-spacing="1">
                  <text x="346" y="10">NOW</text>
                </g>
              </svg>
            </div>

            <div class="timeline">
              <div class="ev">
                <span class="t led hot">NOW</span>
                <span class="d">▶ {p.distanceKm < 10 ? p.distanceKm.toFixed(1) : Math.round(p.distanceKm)} KM · {Math.round(enriched.bearing)}° {enriched.compassDir}</span>
              </div>
            </div>
          </div>
        </section>

        <div class="sc-foot">
          <a href={`${origin}/screens/overhead${qs}`}>◉ OVERHEAD</a>
          <a href={`${origin}/screens/board${qs}`}>◱ BOARD</a>
          <a href={`${origin}/screens/radar${qs}`}>◎ RADAR</a>
          <a href={`${origin}/screens/empty${qs}`}>◯ EMPTY STATE</a>
          <a href={`${origin}/screens/landing`}>⟲ RESET</a>
        </div>
      </div>
    )
  }
}
