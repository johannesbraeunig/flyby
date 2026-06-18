import type { RadarBlip } from '../../data/enriched.ts'
import type { ResolvedLocation } from '../../data/location.ts'

interface RadarProps {
  origin: string
  blips: RadarBlip[]
  closestCs: string
  closestDst: string
  closestDir: string
  sweepLog: Array<{ cs: string; rt: string; dst: string }>
  location: ResolvedLocation
  radiusKm: number
}

export function Radar() {
  return ({ origin, blips, closestCs, closestDst, closestDir, sweepLog, location, radiusKm }: RadarProps) => {
    let qs = `?lat=${location.lat}&lon=${location.lon}&radius=${location.radiusKm}`

    return (
      <div>
        <div class="sc-bar">
          <div class="left">
            <span class="brand led">flyby</span>
            <span class="lbl">RADAR SCOPE · PPI</span>
          </div>
          <div class="right">
            <span><span class="pulse"></span>SWEEP 4 S</span>
            <span>RANGE {radiusKm} KM</span>
            <span>N UP</span>
          </div>
        </div>

        <div class="radar-wrap">
          <div class="scope">
            <div class="sweep"></div>
            <div class="me"></div>
            <div class="compass-ticks">
              <span style="top:6px; left:50%; transform:translateX(-50%);">N · 000</span>
              <span style="right:10px; top:50%; transform:translateY(-50%);">E · 090</span>
              <span style="bottom:6px; left:50%; transform:translateX(-50%);">S · 180</span>
              <span style="left:10px; top:50%; transform:translateY(-50%);">W · 270</span>
            </div>
            {blips.map((b) => (
              <div
                class={`blip${b.hot ? ' hot' : ''}`}
                style={`left:${b.x}%; top:${b.y}%`}
              >
                {b.sym}<span class="tag">{b.cs}</span>
              </div>
            ))}
          </div>

          <div class="radar-side">
            <div class="block">
              <h4>Closest contact</h4>
              <div class="val-lg led">{closestDst} km</div>
              <div class="lbl" style="margin-top:8px;">{closestCs} · {closestDir} · closing</div>
            </div>

            <div class="block">
              <h4>Sweep log</h4>
              <div class="ticker">
                {sweepLog.map((s) => (
                  <div class="row">
                    <span class="cs led">{s.cs}</span>
                    <span class="rt">{s.rt}</span>
                    <span class="dst led">{s.dst}</span>
                  </div>
                ))}
              </div>
            </div>

            <div class="block">
              <h4>Legend</h4>
              <div class="txt">
                <div>▲ fixed wing · jet</div>
                <div>◆ prop / turboprop</div>
                <div>✚ helicopter</div>
                <div><span class="hot">⬤</span> overhead · &lt; 2 km</div>
              </div>
            </div>
          </div>
        </div>

        <div class="sc-foot">
          <a href={`${origin}/screens/overhead${qs}`}>◉ BACK TO OVERHEAD</a>
          <a href={`${origin}/screens/board${qs}`}>◱ BOARD</a>
          <a href={`${origin}/screens/detail${qs}`}>⊞ FLIGHT CARD</a>
          <a href={`${origin}/screens/empty${qs}`}>◯ EMPTY STATE</a>
          <a href={`${origin}/screens/landing`}>⟲ RESET</a>
        </div>
      </div>
    )
  }
}
