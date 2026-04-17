export function Landing() {
  return ({ origin }: { origin: string }) => (
    <div>
      <div class="landing grid-stats">
        <div class="cell">
          <div class="lbl">Now tracking</div>
          <div class="num led dim">2 417</div>
        </div>
        <div class="cell">
          <div class="lbl">In range · ≤ 40km</div>
          <div class="num led dim">12</div>
        </div>
        <div class="cell">
          <div class="lbl">Overhead · ≤ 2km</div>
          <div class="num led">01</div>
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
          <a class="btn" href={`${origin}/screens/overhead`}>► Use my location</a>
          <a class="btn ghost" href={`${origin}/screens/board`}>Use Hamburg · 53.55° N</a>
          <a class="btn ghost" href={`${origin}/screens/radar`}>Drop a pin</a>
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

      <ScreenFooter origin={origin} />
    </div>
  )
}

function ScreenFooter() {
  return ({ origin }: { origin: string }) => (
    <div class="sc-foot">
      <a href={`${origin}/screens/overhead`}>◉ OVERHEAD</a>
      <a href={`${origin}/screens/board`}>◱ NEARBY BOARD</a>
      <a href={`${origin}/screens/radar`}>◎ RADAR</a>
      <a href={`${origin}/screens/detail`}>⊞ FLIGHT CARD</a>
      <a href={`${origin}/screens/empty`}>◯ EMPTY STATE</a>
    </div>
  )
}
