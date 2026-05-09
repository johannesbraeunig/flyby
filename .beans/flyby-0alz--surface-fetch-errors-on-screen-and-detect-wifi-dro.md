---
# flyby-0alz
title: Surface fetch errors on screen and detect WiFi drops
status: completed
type: bug
priority: normal
created_at: 2026-05-09T14:05:00Z
updated_at: 2026-05-09T14:07:01Z
---

Display gets stuck on "No Plane" until reboot. Root cause likely a silent WiFi disconnect in RUNNING state — tick_running never checks WiFi.status(). Also, fetch failures (network/auth/rate-limit) are indistinguishable from genuine empty results.

## Tasks

- [x] Add FetchStatus enum (Ok / NoPlane / NetworkError / AuthError / RateLimited) in adsb_fetch.h
- [x] Refactor fetch_nearest in adsb_fetch.cpp to return FetchStatus
- [x] In tick_running, check WiFi.status() each tick; if disconnected, re-enter CONNECTING
- [x] In tick_running, surface error states on the LED panel via status_frame (red for hard errors, yellow for rate-limit)
- [x] Log free heap + max alloc heap per fetch so we can confirm/deny fragmentation theory (#3)
- [x] Flash and verify on hardware (built clean, 30 native tests pass, uploaded to /dev/cu.usbserial-110)

## Summary of Changes

**Fix #1 — silent WiFi disconnect.** `tick_running` now checks `WiFi.status()` each loop tick. On disconnect it re-enters CONNECTING, which calls `WiFi.begin()` again. This was almost certainly the cause of the stuck "No Plane" symptom.

**Fix #2 — surface fetch errors on screen.** Replaced bool return of `adsb::fetch_nearest` with a `FetchStatus` enum (Ok / NoPlane / NetworkError / AuthError / RateLimited). `tick_running` now switches on status:
- **Ok** → normal plane frame
- **NoPlane** → yellow "No Plane" idle (true empty bbox)
- **NetworkError** → red "ADS-B / no net"
- **AuthError** → red "ADS-B / no auth" (401 still failing after token refresh)
- **RateLimited** → yellow "ADS-B / rate lim"

User can now distinguish "genuinely no plane nearby" from "system broken." Errors auto-clear on next successful fetch (every 30s).

**Instrumentation for #3 (heap fragmentation).** Logs `ESP.getFreeHeap()` and `ESP.getMaxAllocHeap()` once per fetch cycle. Watch serial output: if `MaxAllocHeap` shrinks over hours/days while `FreeHeap` stays roughly constant, that confirms fragmentation. Mitigations to consider only if confirmed:
- Stream-parse via `http.getStream()` instead of buffering 48 KB in a `String` (biggest single alloc).
- Hold `WiFiClientSecure` as a function-static so the TLS arena is reused (riskier — TLS state can corrupt).
- Heap watchdog: `ESP.restart()` if `MaxAllocHeap` drops below a threshold (e.g. 30 KB).

## Files Changed

- `src/adsb_fetch.h` — new `FetchStatus` enum, signature change.
- `src/adsb_fetch.cpp` — return enum from real impl + native stub; treat 401-after-retry as AuthError instead of NetworkError.
- `src/app.cpp` — WiFi check, switch on FetchStatus, heap log.
