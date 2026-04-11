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
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="color-scheme" content="dark" />
        <title>{title}</title>
        <link rel="stylesheet" href="/app.css" />
        <link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' fill='%23000'/%3E%3Ctext x='32' y='44' font-family='monospace' font-size='42' fill='%23F9BA00' text-anchor='middle'%3E%E2%9C%88%3C/text%3E%3C/svg%3E" />
      </head>
      <body>{children}</body>
    </html>
  )
}
