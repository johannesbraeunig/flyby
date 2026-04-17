export function Overhead() {
  return ({ origin }: { origin: string }) => {
    // Server-rendered altitude sparkline: 36 bars, descent curve
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
            <span class="lbl">⤳ hamburg · eppendorf</span>
          </div>
          <div class="right">
            <span><span class="pulse"></span>LIVE · 14:03:21 UTC</span>
            <span>OPENSKY · 8S PING</span>
            <span>RADIUS 40KM</span>
          </div>
        </div>

        <section class="overhead">
          <div class="eyebrow">
            <span class="tag">OVERHEAD NOW</span>
            <span class="lbl">↑ 820 m · bearing 042° · closing 640 m</span>
          </div>

          <div class="overhead-wrap">
            <div>
              <div class="country led">Germany</div>
              <div class="callsign led">CLH14N</div>
              <div class="route">Lufthansa CityLine · Munich → Hamburg · E190</div>

              <div class="stat-grid">
                <div class="stat">
                  <div class="lbl">Altitude</div>
                  <div class="val led">820 M</div>
                  <div class="sub">FL027 · descending 1 200 fpm</div>
                </div>
                <div class="stat">
                  <div class="lbl">Ground speed</div>
                  <div class="val led">194 kt</div>
                  <div class="sub">359 km/h · mach 0.31</div>
                </div>
                <div class="stat">
                  <div class="lbl">Slant range</div>
                  <div class="val led">1.2 km</div>
                  <div class="sub">closest approach in 00:08</div>
                </div>
                <div class="stat">
                  <div class="lbl">Look up</div>
                  <div class="val led">42° NE</div>
                  <div class="sub">azimuth 042 · elevation 34</div>
                </div>
                <div class="stat">
                  <div class="lbl">Aircraft</div>
                  <div class="val led">E190</div>
                  <div class="sub">Embraer · 100 pax · 28 t</div>
                </div>
                <div class="stat">
                  <div class="lbl">Squawk</div>
                  <div class="val led">1000</div>
                  <div class="sub">IFR · mode S · D-AECF</div>
                </div>
                <div class="stat">
                  <div class="lbl">Origin</div>
                  <div class="val led">MUC</div>
                  <div class="sub">dep 12:48 · on time</div>
                </div>
                <div class="stat">
                  <div class="lbl">Arrival</div>
                  <div class="val led">HAM</div>
                  <div class="sub">eta 14:06 · 3 min late</div>
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
                <div class="ring-lbl">10 · 20 · 40 km</div>
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
                  <span>FL280</span>
                  <span>NOW · FL027</span>
                </div>
              </div>

              <div class="side-panel" style="margin-top:16px;">
                <h3>Up next · 18 min window</h3>
                <div style="display:grid; gap:10px; margin-top:6px;">
                  <div style="display:grid; grid-template-columns: 1fr 60px 50px; gap:10px; align-items:baseline;">
                    <span class="px" style="font-size:22px;">DLH441</span>
                    <span class="lbl">14:09</span>
                    <span class="px" style="font-size:18px; color:var(--ink-dim); text-align:right;">2.8km</span>
                  </div>
                  <div style="display:grid; grid-template-columns: 1fr 60px 50px; gap:10px; align-items:baseline;">
                    <span class="px" style="font-size:22px;">BAW976</span>
                    <span class="lbl">14:14</span>
                    <span class="px" style="font-size:18px; color:var(--ink-dim); text-align:right;">4.1km</span>
                  </div>
                  <div style="display:grid; grid-template-columns: 1fr 60px 50px; gap:10px; align-items:baseline;">
                    <span class="px" style="font-size:22px;">EZY8PH</span>
                    <span class="lbl">14:21</span>
                    <span class="px" style="font-size:18px; color:var(--ink-dim); text-align:right;">6.4km</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div class="sc-foot">
          <a href={`${origin}/screens/board`}>◱ NEARBY BOARD</a>
          <a href={`${origin}/screens/radar`}>◎ RADAR</a>
          <a href={`${origin}/screens/detail`}>⊞ FLIGHT CARD</a>
          <a href={`${origin}/screens/empty`}>◯ EMPTY STATE</a>
          <a href={`${origin}/screens/landing`}>⟲ RESET</a>
        </div>
      </div>
    )
  }
}
