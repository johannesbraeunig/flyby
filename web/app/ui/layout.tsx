import type { RemixNode } from 'remix/component'

import { Document } from './document.tsx'

export interface LayoutProps {
  title?: string
  children?: RemixNode
}

export function Layout() {
  return ({ title, children }: LayoutProps) => (
    <Document title={title}>
      <div class="page">
        <header class="page-header">
          <h1>FlyBy</h1>
          <p class="tagline">Nearest plane overhead, the same way the LED board sees it.</p>
        </header>
        <main>{children}</main>
        <footer class="page-footer">
          <p>
            Data from{' '}
            <a href="https://opensky-network.org" rel="noreferrer">
              OpenSky Network
            </a>
            . Refreshes every 30 s.
          </p>
        </footer>
      </div>
    </Document>
  )
}
