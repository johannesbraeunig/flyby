---
# flyby-hezd
title: Fix Locate-me button on iOS captive portal
status: todo
type: bug
priority: normal
created_at: 2026-05-09T14:21:32Z
updated_at: 2026-05-09T14:29:56Z
---

User reports the "Locate me" button in the WiFi setup portal does nothing on iPhone — no text change, no alert, no geolocation prompt. The click handler is not running.

Most likely cause: iOS captive-portal WebView blocks inline `onclick=` attribute handlers. Workaround is to attach the handler via addEventListener inside a `<script>` block, which is typically allowed where inline event attributes are not.

## Tasks

- [ ] Replace inline onclick with a script block using addEventListener
- [ ] Give the button an explicit id (e.g. flyby-locate-btn) instead of relying on querySelector([type=button])
- [ ] Capture the button element ref once; use in callbacks instead of fragile selectors
- [ ] Build, flash, ask user to retest on iPhone

Note: built but not flashed yet — user serial monitor was holding port. Resume when port free.
