export function Empty() {
  return ({ origin }: { origin: string }) => (
    <div>
      <div class="sc-bar">
        <div class="left">
          <span class="brand led">flyby</span>
          <span class="lbl">HAMBURG · EPPENDORF</span>
        </div>
        <div class="right">
          <span><span class="pulse"></span>LIVE · 03:17:42</span>
          <span>RADIUS 40 KM</span>
          <span>QUIET</span>
        </div>
      </div>

      <section class="empty">
        <div class="big">the sky</div>
        <div class="big led">is empty</div>
        <div class="sub">
          No aircraft within 40 km. Last contact <span class="cool">DLH9Y</span> — 00:12:08 ago, headed for Copenhagen.
        </div>

        <div class="stat-row">
          <div class="cell">
            <div class="n led">00:12:08</div>
            <div class="l">Since last contact</div>
          </div>
          <div class="cell">
            <div class="n led">347</div>
            <div class="l">Flights today · in range</div>
          </div>
          <div class="cell">
            <div class="n led">04:42</div>
            <div class="l">Next expected · DLH001 · CPH→HAM</div>
          </div>
        </div>

        <p class="txt" style="margin-top:56px; max-width:640px;">
          Quiet hours over northern Germany run 00:00–05:00 local. FlyBy will keep watching and flash the screen when something appears.
        </p>
      </section>

      <div class="sc-foot">
        <a href={`${origin}/screens/overhead`}>◉ RESUME OVERHEAD</a>
        <a href={`${origin}/screens/landing`}>⟲ CHANGE LOCATION</a>
        <a href={`${origin}/screens/board`}>◱ BOARD</a>
        <a href={`${origin}/screens/radar`}>◎ RADAR</a>
        <a href={`${origin}/screens/detail`}>⊞ FLIGHT CARD</a>
      </div>
    </div>
  )
}
