import type { RemixNode } from 'remix/component'

import { ScreenDocument } from './screen-document.tsx'

export interface ScreenLayoutProps {
  title?: string
  origin?: string
  children?: RemixNode
}

export function ScreenLayout() {
  return ({ title, children }: ScreenLayoutProps) => (
    <ScreenDocument title={title}>
      <div class="field dots" aria-hidden="true"></div>
      <div class="field scan" aria-hidden="true"></div>
      <div class="field flicker" aria-hidden="true"></div>
      <div class="field vignette" aria-hidden="true"></div>
      <main class="sc-stage">
        {children}
      </main>
    </ScreenDocument>
  )
}
