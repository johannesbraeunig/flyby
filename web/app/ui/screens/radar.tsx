let BLIPS = [
  { cs: 'CLH14N', sym: '▲', x: 56, y: 36, hot: true },
  { cs: 'DLH441', sym: '▲', x: 72, y: 50, hot: false },
  { cs: 'BAW976', sym: '▲', x: 34, y: 58, hot: false },
  { cs: 'EZY8PH', sym: '▲', x: 40, y: 74, hot: false },
  { cs: 'RYR5TF', sym: '▲', x: 25, y: 52, hot: false },
  { cs: 'KLM1776', sym: '▲', x: 78, y: 66, hot: false },
  { cs: 'SAS942', sym: '▲', x: 64, y: 24, hot: false },
  { cs: 'WZZ33H', sym: '▲', x: 82, y: 78, hot: false },
  { cs: 'AFR1412', sym: '▲', x: 18, y: 82, hot: false },
  { cs: 'FIN881', sym: '▲', x: 62, y: 14, hot: false },
  { cs: 'DHL2Z', sym: '◆', x: 12, y: 22, hot: false },
  { cs: 'RESCUE9', sym: '✚', x: 58, y: 6, hot: false },
]

export function Radar() {
  return ({ origin }: { origin: string }) => (
    <div>
      <div class="sc-bar">
        <div class="left">
          <span class="brand led">flyby</span>
          <span class="lbl">RADAR SCOPE · PPI</span>
        </div>
        <div class="right">
          <span><span class="pulse"></span>SWEEP 4 S</span>
          <span>RANGE 40 KM</span>
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
          {BLIPS.map((b) => (
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
            <div class="val-lg led">1.2 km</div>
            <div class="lbl" style="margin-top:8px;">CLH14N · 42° NE · closing</div>
          </div>

          <div class="block">
            <h4>Sweep log</h4>
            <div class="ticker">
              <div class="row"><span class="cs led">CLH14N</span><span class="rt">MUC → HAM</span><span class="dst led">1.2</span></div>
              <div class="row"><span class="cs led">DLH441</span><span class="rt">FRA → CPH</span><span class="dst led">2.8</span></div>
              <div class="row"><span class="cs led">BAW976</span><span class="rt">LHR → HAM</span><span class="dst led">4.1</span></div>
              <div class="row"><span class="cs led">EZY8PH</span><span class="rt">BER → AMS</span><span class="dst led">6.4</span></div>
              <div class="row"><span class="cs led">RYR5TF</span><span class="rt">DUB → HAM</span><span class="dst led">9.0</span></div>
              <div class="row"><span class="cs led">KLM1776</span><span class="rt">AMS → CPH</span><span class="dst led">11.4</span></div>
              <div class="row"><span class="cs led">SAS942</span><span class="rt">ARN → HAM</span><span class="dst led">14.2</span></div>
              <div class="row"><span class="cs led">WZZ33H</span><span class="rt">GDN → CGN</span><span class="dst led">18.0</span></div>
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
        <a href={`${origin}/screens/overhead`}>◉ BACK TO OVERHEAD</a>
        <a href={`${origin}/screens/board`}>◱ BOARD</a>
        <a href={`${origin}/screens/detail`}>⊞ FLIGHT CARD</a>
        <a href={`${origin}/screens/empty`}>◯ EMPTY STATE</a>
        <a href={`${origin}/screens/landing`}>⟲ RESET</a>
      </div>
    </div>
  )
}
