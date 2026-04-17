import type { RemixNode } from 'remix/component'

export interface ScreenDocumentProps {
  title?: string
  children?: RemixNode
}

export function ScreenDocument() {
  return ({ title = 'FlyBy', children }: ScreenDocumentProps) => (
    <html lang="en" data-bloom="true" data-scanline="true" data-dotgrid="true">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="color-scheme" content="dark" />
        <meta name="theme-color" content="#0a0806" />
        <title>{title}</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=DotGothic16&family=VT323&family=JetBrains+Mono:wght@400;500;700&display=swap"
        />
        <link rel="stylesheet" href="/screens.css" />
        <link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' fill='%230a0604'/%3E%3Ctext x='32' y='48' font-family='monospace' font-size='48' font-weight='bold' fill='%23ffaa00' text-anchor='middle'%3E%E2%9C%88%3C/text%3E%3C/svg%3E" />
      </head>
      <body>
        {children}
      </body>
    </html>
  )
}
