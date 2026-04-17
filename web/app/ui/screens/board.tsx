import type { BoardRow } from '../../data/enriched.ts'
import type { ResolvedLocation } from '../../data/location.ts'

interface BoardProps {
  origin: string
  rows: BoardRow[]
  location: ResolvedLocation
  contactCount: number
  fetchedAt: number
}

function utcTimeStr(ms: number): string {
  let d = new Date(ms)
  let h = String(d.getUTCHours()).padStart(2, '0')
  let m = String(d.getUTCMinutes()).padStart(2, '0')
  let s = String(d.getUTCSeconds()).padStart(2, '0')
  return `${h}:${m}:${s}`
}

export function Board() {
  return ({ origin, rows, location, contactCount, fetchedAt }: BoardProps) => {
    let qs = `?lat=${location.lat}&lon=${location.lon}&radius=${location.radiusKm}`

    return (
      <div>
        <div class="sc-bar">
          <div class="left">
            <span class="brand led">flyby</span>
            <span class="lbl">NEARBY BOARD · {location.radiusKm} KM</span>
          </div>
          <div class="right">
            <span><span class="pulse"></span>{contactCount} CONTACTS</span>
            <span>SORT · SLANT RANGE</span>
            <span>{utcTimeStr(fetchedAt)} UTC</span>
          </div>
        </div>

        <h2 class="led" style="font-family:var(--px); font-size:72px; line-height:.9; margin: 8px 0 28px;">
          Arriving overhead
        </h2>

        <div class="board">
          <div class="head">
            <span>#</span>
            <span>Callsign</span>
            <span>Route</span>
            <span>Alt</span>
            <span>Spd</span>
            <span>Dist</span>
            <span>ETA · Look</span>
          </div>
          {rows.map((r, i) => (
            <div class={`row${r.hot ? ' hot' : ''}`}>
              <span class="idx led mute">{String(i + 1).padStart(2, '0')}</span>
              <span class="cs led">
                <span class="flip"><span>{r.cs}</span></span>
              </span>
              <span class="rt">{r.rt}</span>
              <span class="alt led dim">{r.alt}</span>
              <span class="spd led dim">
                {r.spd}<span class="lbl" style="margin-left:4px;">KT</span>
              </span>
              <span class="dst led dim">
                {r.dst}<span class="lbl" style="margin-left:4px;">KM</span>
              </span>
              <span class="tag">{r.eta}</span>
            </div>
          ))}
        </div>

        <div class="sc-foot">
          <a href={`${origin}/screens/overhead${qs}`}>◉ BACK TO OVERHEAD</a>
          <a href={`${origin}/screens/radar${qs}`}>◎ RADAR</a>
          <a href={`${origin}/screens/detail${qs}`}>⊞ FLIGHT CARD</a>
          <a href={`${origin}/screens/empty${qs}`}>◯ EMPTY STATE</a>
          <a href={`${origin}/screens/landing`}>⟲ RESET</a>
        </div>
      </div>
    )
  }
}
