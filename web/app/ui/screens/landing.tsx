import type { ResolvedLocation } from '../../data/location.ts'

interface LandingProps {
  origin: string
  totalCount: number
  inRangeCount: number
  overheadCount: number
  location: ResolvedLocation
}

// Format a number with space-separated thousands, e.g. 2417 → "2 417"
function formatStat(n: number): string {
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
}

// Zero-pad to at least 2 digits.
function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

export function Landing() {
  return ({ origin, totalCount, inRangeCount, overheadCount, location }: LandingProps) => {
    let hasLocation = location.source === 'url'
    let qs = hasLocation
      ? `?lat=${location.lat}&lon=${location.lon}&radius=${location.radiusKm}`
      : ''

    return (
      <div>
        <div class="landing grid-stats">
          <div class="cell">
            <div class="lbl">Now tracking</div>
            <div class="num led dim">{hasLocation ? formatStat(totalCount) : '—'}</div>
          </div>
          <div class="cell">
            <div class="lbl">In range · ≤ {hasLocation ? location.radiusKm : 40}km</div>
            <div class="num led dim">{hasLocation ? pad2(inRangeCount) : '—'}</div>
          </div>
          <div class="cell">
            <div class="lbl">Overhead · ≤ 2km</div>
            <div class="num led">{hasLocation ? pad2(overheadCount) : '—'}</div>
          </div>
        </div>

        <section class="landing">
          <div class="brand-giant led mute">flyby</div>
          <h1 class="led">
            Pick your location
            <br />
            <span class="line2">to see what's passing over.</span>
          </h1>
          <div class="cta">
            <a class="btn" href={`${origin}/screens/overhead${qs}`}>► Use my location</a>
            <a class="btn ghost" href={`${origin}/screens/board${qs || '?lat=53.5511&lon=9.9937&radius=50'}`}>
              {hasLocation ? '◱ Nearby board' : 'Use Hamburg · 53.55° N'}
            </a>
            <a class="btn ghost" href={`${origin}/screens/radar${qs || '?lat=53.5511&lon=9.9937&radius=50'}`}>
              {hasLocation ? '◎ Radar' : 'Drop a pin'}
            </a>
          </div>
          <p class="txt micro">
            Coordinates stay local. FlyBy pings OpenSky for a live snapshot
            every&nbsp;8&nbsp;seconds and forgets you in&nbsp;between. No account,
            no tracking, no cookies worth eating.
          </p>

          <div class="features">
            <div>
              <div class="lbl">01 · Frequency</div>
              <div class="txt">Refreshes every 8 seconds. Overhead events push instantly.</div>
            </div>
            <div>
              <div class="lbl">02 · Radius</div>
              <div class="txt">Default 40 km. Tune from 5 km up to the horizon.</div>
            </div>
            <div>
              <div class="lbl">03 · Altitude</div>
              <div class="txt">Filter out stratosphere traffic or keep the whole sky.</div>
            </div>
            <div>
              <div class="lbl">04 · History</div>
              <div class="txt">Every flight you've spotted, logged on-device only.</div>
            </div>
          </div>
        </section>

        <ScreenFooter origin={origin} qs={qs} />
      </div>
    )
  }
}

function ScreenFooter() {
  return ({ origin, qs }: { origin: string; qs: string }) => (
    <div class="sc-foot">
      <a href={`${origin}/screens/overhead${qs}`}>◉ OVERHEAD</a>
      <a href={`${origin}/screens/board${qs}`}>◱ NEARBY BOARD</a>
      <a href={`${origin}/screens/radar${qs}`}>◎ RADAR</a>
      <a href={`${origin}/screens/detail${qs}`}>⊞ FLIGHT CARD</a>
      <a href={`${origin}/screens/empty${qs}`}>◯ EMPTY STATE</a>
    </div>
  )
}
