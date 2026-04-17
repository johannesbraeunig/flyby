import type { ResolvedLocation } from '../../data/location.ts'

interface EmptyProps {
  origin: string
  location: ResolvedLocation
}

function utcTimeStr(): string {
  let d = new Date()
  let h = String(d.getUTCHours()).padStart(2, '0')
  let m = String(d.getUTCMinutes()).padStart(2, '0')
  let s = String(d.getUTCSeconds()).padStart(2, '0')
  return `${h}:${m}:${s}`
}

export function Empty() {
  return ({ origin, location }: EmptyProps) => {
    let qs = `?lat=${location.lat}&lon=${location.lon}&radius=${location.radiusKm}`
    let locLabel = `${location.lat.toFixed(2)}°N · ${location.lon.toFixed(2)}°E`

    return (
      <div>
        <div class="sc-bar">
          <div class="left">
            <span class="brand led">flyby</span>
            <span class="lbl">{locLabel}</span>
          </div>
          <div class="right">
            <span><span class="pulse"></span>LIVE · {utcTimeStr()}</span>
            <span>RADIUS {location.radiusKm} KM</span>
            <span>QUIET</span>
          </div>
        </div>

        <section class="empty">
          <div class="big">the sky</div>
          <div class="big led">is empty</div>
          <div class="sub">
            No aircraft within {location.radiusKm} km. Try increasing the radius or check back soon.
          </div>

          <div class="stat-row">
            <div class="cell">
              <div class="n led">0</div>
              <div class="l">Contacts in range</div>
            </div>
            <div class="cell">
              <div class="n led">{location.radiusKm} km</div>
              <div class="l">Search radius</div>
            </div>
            <div class="cell">
              <div class="n led">{utcTimeStr()}</div>
              <div class="l">Last checked · UTC</div>
            </div>
          </div>

          <p class="txt" style="margin-top:56px; max-width:640px;">
            FlyBy queries OpenSky Network for live ADS-B data. If the sky
            appears empty, it may be a quiet period or the search radius
            may be too small. Try widening the range.
          </p>
        </section>

        <div class="sc-foot">
          <a href={`${origin}/screens/overhead${qs}`}>◉ RESUME OVERHEAD</a>
          <a href={`${origin}/screens/landing`}>⟲ CHANGE LOCATION</a>
          <a href={`${origin}/screens/board${qs}`}>◱ BOARD</a>
          <a href={`${origin}/screens/radar${qs}`}>◎ RADAR</a>
          <a href={`${origin}/screens/detail${qs}`}>⊞ FLIGHT CARD</a>
        </div>
      </div>
    )
  }
}
