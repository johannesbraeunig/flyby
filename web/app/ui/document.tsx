import type { RemixNode } from 'remix/component'

export interface DocumentProps {
  title?: string
  description?: string
  /** Absolute URL for og:url + canonical link. */
  canonicalUrl?: string
  /** Absolute URL for og:image / twitter:image. Defaults to /og-image.png on the same origin. */
  ogImageUrl?: string
  children?: RemixNode
}

const DEFAULT_DESCRIPTION =
  "Find the nearest plane overhead — a DIY ESP32 flight tracker, in your browser. Live ADS-B data from OpenSky, rendered like a warm-amber LED matrix board."

const DEFAULT_OG_IMAGE_PATH = '/og-image.png'

export function Document() {
  return ({
    title = 'FlyBy',
    description = DEFAULT_DESCRIPTION,
    canonicalUrl,
    ogImageUrl,
    children,
  }: DocumentProps) => {
    // og:image MUST be absolute. If the caller didn't pass an
    // absolute URL (e.g. tests, fragment renders) fall back to the
    // bare path — broken for unfurlers but not broken for humans.
    let imageUrl = ogImageUrl ?? DEFAULT_OG_IMAGE_PATH
    return (
      <html lang="en">
        <head>
          <meta charSet="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
          <meta name="color-scheme" content="dark" />
          <meta name="theme-color" content="#0a0604" />
          <title>{title}</title>

          {/* SEO + plain-text scrapers (Google, DuckDuckGo, etc) */}
          <meta name="description" content={description} />
          {canonicalUrl ? <link rel="canonical" href={canonicalUrl} /> : null}

          {/* Open Graph — Facebook, LinkedIn, Slack, iMessage, Discord,
              Mastodon, Signal, WhatsApp, Pinterest, Telegram all
              consume this. Width/height let scrapers reserve space
              before the image loads (and Facebook will refuse images
              < 600px wide unless told otherwise). */}
          <meta property="og:type" content="website" />
          <meta property="og:site_name" content="FlyBy" />
          <meta property="og:title" content={title} />
          <meta property="og:description" content={description} />
          {canonicalUrl ? <meta property="og:url" content={canonicalUrl} /> : null}
          <meta property="og:image" content={imageUrl} />
          <meta property="og:image:type" content="image/png" />
          <meta property="og:image:width" content="1200" />
          <meta property="og:image:height" content="630" />
          <meta property="og:image:alt" content="FlyBy LED panel showing the nearest plane overhead — Lufthansa flight DLH441 from FRA to JFK at flight level 380." />

          {/* Twitter / X. summary_large_image renders the 1200x630
              card edge-to-edge; the smaller "summary" card crops to
              a square thumbnail on the side, which would clip the
              middle of our LED text. */}
          <meta name="twitter:card" content="summary_large_image" />
          <meta name="twitter:title" content={title} />
          <meta name="twitter:description" content={description} />
          <meta name="twitter:image" content={imageUrl} />
          <meta name="twitter:image:alt" content="FlyBy LED panel showing the nearest plane overhead — Lufthansa flight DLH441 from FRA to JFK at flight level 380." />

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
          {/* Ambient "aging LED" layer — four effects working
              together to sell a well-used physical panel:
                - dead pixels: LEDs briefly failing
                - hot pixels:  LEDs briefly overdriven
                - stuck pixel: one permanently failed LED
                - (panel breathing is on .panel itself, in CSS)
              All are pointer-events:none, aria-hidden. */}
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
          <div class="hot-pixels" aria-hidden="true">
            <span class="hot-pixel hot-pixel-1"></span>
            <span class="hot-pixel hot-pixel-2"></span>
            <span class="hot-pixel hot-pixel-3"></span>
            <span class="hot-pixel hot-pixel-4"></span>
          </div>
          <span class="stuck-pixel" aria-hidden="true"></span>
        </body>
      </html>
    )
  }
}
