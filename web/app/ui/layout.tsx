import type { RemixNode } from 'remix/component'

import { Document } from './document.tsx'

export interface LayoutProps {
  title?: string
  children?: RemixNode
}

const REPO_URL = 'https://github.com/johannesbraeunig/flyby'

export function Layout() {
  return ({ title, children }: LayoutProps) => (
    <Document title={title}>
      <div class="page">
        <header class="page-header">
          <h1>FlyBy</h1>
        </header>
        <main>{children}</main>
        <footer class="page-footer">
          <p>
            Data from{' '}
            <a href="https://opensky-network.org" rel="noreferrer">
              OpenSky Network
            </a>
            {' · '}
            <a href={REPO_URL} rel="noreferrer">
              Source on GitHub
            </a>
          </p>
        </footer>
      </div>
    </Document>
  )
}
