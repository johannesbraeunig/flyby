// FlyBy client bootstrap.
//
// Two responsibilities:
//   1. On the locating screen (no lat/lon in URL), call
//      navigator.geolocation and redirect to /?lat=...&lon=....
//   2. On the home screen, poll the /api/nearest endpoint
//      every 30 s and replace the plane card markup.

(function () {
  'use strict'

  var POLL_INTERVAL_MS = 30000
  var DENIED_FALLBACK = '/?denied=1'

  function bootGeolocate() {
    // Only prompt on the locating screen. The home template always
    // includes a #plane-card; if it's present, the server has already
    // resolved a location (URL, cookie, or Hamburg fallback after a
    // denial) and we must not re-prompt — otherwise a denied user
    // bounces /?denied=1 → denied → /?denied=1 forever.
    if (document.getElementById('plane-card')) return

    var url = new URL(window.location.href)
    if (url.searchParams.has('lat') && url.searchParams.has('lon')) return

    if (!('geolocation' in navigator)) {
      window.location.replace(DENIED_FALLBACK)
      return
    }

    navigator.geolocation.getCurrentPosition(
      function (pos) {
        var lat = pos.coords.latitude.toFixed(4)
        var lon = pos.coords.longitude.toFixed(4)
        window.location.replace('/?lat=' + lat + '&lon=' + lon)
      },
      function () {
        // Permission denied or unavailable.
        window.location.replace(DENIED_FALLBACK)
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 5 * 60 * 1000 },
    )
  }

  function bootPolling() {
    var card = document.getElementById('plane-card')
    if (!card) return
    var pollUrl = card.getAttribute('data-fly-poll')
    if (!pollUrl) return

    var inFlight = false
    var timer = null

    function tick() {
      if (inFlight) return
      if (document.hidden) return
      inFlight = true
      fetch(pollUrl, { headers: { Accept: 'text/html' } })
        .then(function (res) {
          if (!res.ok) throw new Error('http ' + res.status)
          return res.text()
        })
        .then(function (html) {
          // The endpoint returns just the <div class="panel">. Replace
          // the panel inside #plane-card without touching the wrapper
          // (so the data-fly-poll attribute and id stick around).
          card.innerHTML = html
        })
        .catch(function (err) {
          console.warn('flyby poll failed', err)
        })
        .finally(function () {
          inFlight = false
        })
    }

    function start() {
      stop()
      timer = setInterval(tick, POLL_INTERVAL_MS)
    }
    function stop() {
      if (timer !== null) {
        clearInterval(timer)
        timer = null
      }
    }

    document.addEventListener('visibilitychange', function () {
      if (document.hidden) {
        stop()
      } else {
        // Refresh immediately on tab refocus, then resume polling.
        tick()
        start()
      }
    })

    start()
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      bootGeolocate()
      bootPolling()
    })
  } else {
    bootGeolocate()
    bootPolling()
  }
})()
