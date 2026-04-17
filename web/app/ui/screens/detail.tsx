export function Detail() {
  return ({ origin }: { origin: string }) => (
    <div>
      <div class="sc-bar">
        <div class="left">
          <span class="brand led">flyby</span>
          <span class="lbl">FLIGHT · CLH14N</span>
        </div>
        <div class="right">
          <span><span class="pulse"></span>TRACKING 00:12:40</span>
          <span>PINNED</span>
          <span>14:03:21 UTC</span>
        </div>
      </div>

      <section class="detail">
        <div>
          <div class="lbl">Flight number</div>
          <div class="hero-num led">CL 14N</div>
          <div class="txt" style="margin-top:10px;">
            Lufthansa CityLine · Embraer E190 · D-AECF<br />
            Operating LH 2063 · Mon · daily
          </div>

          <div class="airports">
            <div>
              <div class="iata led">MUC</div>
              <div class="city">Munich · Franz Josef Strauss</div>
              <div class="time led dim">12:48 · ON TIME</div>
            </div>
            <div class="arrow led dim">—▶</div>
            <div style="text-align:right;">
              <div class="iata led">HAM</div>
              <div class="city">Hamburg · Fuhlsbüttel</div>
              <div class="time led dim">14:06 · +03 MIN</div>
            </div>
          </div>

          <div class="sub-info">
            <div class="stat">
              <div class="lbl">Alt</div>
              <div class="val led">820 m</div>
              <div class="sub">FL027</div>
            </div>
            <div class="stat">
              <div class="lbl">Speed</div>
              <div class="val led">194 kt</div>
              <div class="sub">ground</div>
            </div>
            <div class="stat">
              <div class="lbl">Heading</div>
              <div class="val led">312°</div>
              <div class="sub">NW</div>
            </div>
            <div class="stat">
              <div class="lbl">V/S</div>
              <div class="val led hot">−1 200</div>
              <div class="sub">fpm · descending</div>
            </div>
          </div>
        </div>

        <div>
          <div class="chart">
            <span class="caption">Altitude profile · MUC → HAM</span>
            <span class="peak led">PEAK · FL330</span>
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
                <text x="4" y="196">12:48</text>
                <text x="160" y="196">13:20</text>
                <text x="280" y="196">13:52</text>
                <text x="370" y="196">14:06</text>
                <text x="346" y="10">NOW</text>
              </g>
            </svg>
          </div>

          <div class="timeline">
            <div class="ev done">
              <span class="t led dim">12:48</span>
              <span class="d">OFF BLOCKS · MUC · GATE G32</span>
            </div>
            <div class="ev done">
              <span class="t led dim">13:03</span>
              <span class="d">WHEELS UP · RUNWAY 08R</span>
            </div>
            <div class="ev done">
              <span class="t led dim">13:22</span>
              <span class="d">LEVEL FL330 · ENROUTE</span>
            </div>
            <div class="ev">
              <span class="t led">13:54</span>
              <span class="d">TOP OF DESCENT · EDDINGER VOR</span>
            </div>
            <div class="ev">
              <span class="t led hot">14:03</span>
              <span class="d">▶ OVERHEAD YOU · 1.2 KM SLANT</span>
            </div>
            <div class="ev">
              <span class="t led mute">14:04</span>
              <span class="d">TURNING FINAL · RUNWAY 23</span>
            </div>
            <div class="ev">
              <span class="t led mute">14:06</span>
              <span class="d">WHEELS DOWN · HAM</span>
            </div>
          </div>
        </div>
      </section>

      <div class="sc-foot">
        <a href={`${origin}/screens/overhead`}>◉ OVERHEAD</a>
        <a href={`${origin}/screens/board`}>◱ BOARD</a>
        <a href={`${origin}/screens/radar`}>◎ RADAR</a>
        <a href={`${origin}/screens/empty`}>◯ EMPTY STATE</a>
        <a href={`${origin}/screens/landing`}>⟲ RESET</a>
      </div>
    </div>
  )
}
