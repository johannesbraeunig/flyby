import type { RemixNode } from 'remix/component'

import { Document } from './document.tsx'

export interface LayoutProps {
  title?: string
  children?: RemixNode
}

// The layout for Remix v3 is a near-zero shell: the page is the
// plane panel, full-viewport. Branding and meta links live inside
// the floating settings overlay rendered by the home controller.
export function Layout() {
  return ({ title, children }: LayoutProps) => (
    <Document title={title}>
      <div class="page">{children}</div>
    </Document>
  )
}

