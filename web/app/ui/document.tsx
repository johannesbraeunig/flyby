import type { RemixNode } from 'remix/component'

export interface DocumentProps {
  title?: string
  origin: string
  children?: RemixNode
}

const DESCRIPTION = 'Look up. Meet the plane overhead.'

export function Document() {
  return ({ title = 'FlyBy', origin, children }: DocumentProps) => {
    let imageUrl = `${origin}/share-image.png`
    return (
      <html lang="en">
        <head>
          <meta charSet="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
          <meta name="color-scheme" content="dark" />
          <meta name="theme-color" content="#0a0604" />
          <meta name="description" content={DESCRIPTION} />
          <meta property="og:type" content="website" />
          <meta property="og:title" content={title} />
          <meta property="og:description" content={DESCRIPTION} />
          <meta property="og:image" content={imageUrl} />
          <meta property="og:url" content={origin} />
          <meta name="twitter:card" content="summary_large_image" />
          <meta name="twitter:title" content={title} />
          <meta name="twitter:description" content={DESCRIPTION} />
          <meta name="twitter:image" content={imageUrl} />
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
        </body>
      </html>
    )
  }
}
