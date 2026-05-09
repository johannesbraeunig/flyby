---
# flyby-l2wa
title: Stream-parse OpenSky JSON to reduce heap pressure
status: todo
type: task
priority: deferred
created_at: 2026-05-09T14:07:46Z
updated_at: 2026-05-09T14:07:46Z
---

Follow-up to flyby-0alz. The current ADS-B fetch buffers up to 48 KB of JSON in an Arduino String before parsing. If heap instrumentation (serial log: `heap: free=… maxAlloc=…`) shows MaxAllocHeap shrinking over time while FreeHeap stays roughly flat, fragmentation is real and this work should be done.

## Tasks

- [ ] Confirm fragmentation from serial heap logs (run device for several hours and inspect)
- [ ] If confirmed, replace `String body = http.getString()` in src/adsb_fetch.cpp do_get() with a streaming parser
- [ ] Use `deserializeJson(doc, http.getStream())` directly, or a chunked reader, so the 48 KB buffer never exists
- [ ] Re-test parse logic with native unit tests (test_adsb_parse) — interface to parse_states_find_nearest may need to take a Stream
- [ ] Re-flash and verify heap stats stable over hours

## Notes

- Cheapest mitigation if fragmentation confirmed.
- Other options (only if streaming alone doesn't fix it): function-static WiFiClientSecure (riskier — TLS state corruption), or heap-watchdog reboot below threshold.
