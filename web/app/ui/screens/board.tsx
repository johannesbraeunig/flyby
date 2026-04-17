let BOARD = [
  { cs: 'CLH14N', rt: 'MUC → HAM · E190', alt: 'FL027', spd: '194', dst: '1.2', eta: '14:03 · 42° NE', hot: true },
  { cs: 'DLH441', rt: 'FRA → CPH · A320', alt: 'FL340', spd: '438', dst: '2.8', eta: '14:09 · 88° E', hot: false },
  { cs: 'BAW976', rt: 'LHR → HAM · A319', alt: 'FL180', spd: '312', dst: '4.1', eta: '14:14 · 274° W', hot: false },
  { cs: 'EZY8PH', rt: 'BER → AMS · A320N', alt: 'FL370', spd: '452', dst: '6.4', eta: '14:18 · 220° SW', hot: false },
  { cs: 'RYR5TF', rt: 'DUB → HAM · 738', alt: 'FL240', spd: '401', dst: '9.0', eta: '14:21 · 262° W', hot: false },
  { cs: 'KLM1776', rt: 'AMS → CPH · 73H', alt: 'FL360', spd: '440', dst: '11.4', eta: '14:24 · 80° E', hot: false },
  { cs: 'SAS942', rt: 'ARN → HAM · A20N', alt: 'FL310', spd: '418', dst: '14.2', eta: '14:29 · 52° NE', hot: false },
  { cs: 'WZZ33H', rt: 'GDN → CGN · A321', alt: 'FL380', spd: '462', dst: '18.0', eta: '14:33 · 110° SE', hot: false },
  { cs: 'AFR1412', rt: 'CDG → BER · A319', alt: 'FL330', spd: '430', dst: '22.6', eta: '14:37 · 238° SW', hot: false },
  { cs: 'FIN881', rt: 'HEL → HAM · A321', alt: 'FL220', spd: '371', dst: '28.1', eta: '14:42 · 40° NE', hot: false },
  { cs: 'DHL2Z', rt: 'EMA → LEJ · 757F', alt: 'FL290', spd: '412', dst: '33.4', eta: '14:46 · 304° NW', hot: false },
  { cs: 'RESCUE9', rt: 'HAM EMS · H145', alt: 'FL012', spd: '118', dst: '36.8', eta: '14:51 · 18° N', hot: false },
]

export function Board() {
  return ({ origin }: { origin: string }) => (
    <div>
      <div class="sc-bar">
        <div class="left">
          <span class="brand led">flyby</span>
          <span class="lbl">NEARBY BOARD · 40 KM</span>
        </div>
        <div class="right">
          <span><span class="pulse"></span>12 CONTACTS</span>
          <span>SORT · SLANT RANGE</span>
          <span>14:03:21 UTC</span>
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
        {BOARD.map((r, i) => (
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
        <a href={`${origin}/screens/overhead`}>◉ BACK TO OVERHEAD</a>
        <a href={`${origin}/screens/radar`}>◎ RADAR</a>
        <a href={`${origin}/screens/detail`}>⊞ FLIGHT CARD</a>
        <a href={`${origin}/screens/empty`}>◯ EMPTY STATE</a>
        <a href={`${origin}/screens/landing`}>⟲ RESET</a>
      </div>
    </div>
  )
}
