import type { RemixNode } from 'remix/component'

export interface DocumentProps {
  title?: string
  children?: RemixNode
}

export function Document() {
  return ({ title = 'FlyBy', children }: DocumentProps) => (
    <html lang="en">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="color-scheme" content="dark" />
        <meta name="theme-color" content="#0a0604" />
        <title>{title}</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Jersey+10&display=swap"
        />
        <link rel="stylesheet" href="/app.css" />
        <link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' fill='%230a0604'/%3E%3Ctext x='32' y='48' font-family='monospace' font-size='48' font-weight='bold' fill='%23ffaa00' text-anchor='middle'%3E%E2%9C%88%3C/text%3E%3C/svg%3E" />
      </head>
      <body>
        {children}
        {/* Ambient "aging LED" flicker: 8 small dots at fixed
            percent-positions around the viewport, each
            independently flashing amber at staggered times via
            CSS keyframes. Pure cosmetic — pointer-events: none
            and aria-hidden so they don't get in the way. */}
        <div class="dead-pixels" aria-hidden="true">
          <span class="dead-pixel dead-pixel-1"></span>
          <span class="dead-pixel dead-pixel-2"></span>
          <span class="dead-pixel dead-pixel-3"></span>
          <span class="dead-pixel dead-pixel-4"></span>
          <span class="dead-pixel dead-pixel-5"></span>
          <span class="dead-pixel dead-pixel-6"></span>
          <span class="dead-pixel dead-pixel-7"></span>
          <span class="dead-pixel dead-pixel-8"></span>
        </div>
      </body>
    </html>
  )
}
