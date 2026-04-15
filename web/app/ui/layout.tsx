import type { RemixNode } from 'remix/component'

import { Document } from './document.tsx'

export interface LayoutProps {
  title?: string
  description?: string
  canonicalUrl?: string
  ogImageUrl?: string
  children?: RemixNode
}

// The layout for Remix v3 is a near-zero shell: the page is the
// plane panel, full-viewport. Branding and meta links live inside
// the floating settings overlay rendered by the home controller.
export function Layout() {
  return ({ title, description, canonicalUrl, ogImageUrl, children }: LayoutProps) => (
    <Document
      title={title}
      description={description}
      canonicalUrl={canonicalUrl}
      ogImageUrl={ogImageUrl}
    >
      <div class="page">{children}</div>
    </Document>
  )
}
