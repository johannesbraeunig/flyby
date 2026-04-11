// FlyBy client bootstrap.
//
// Two responsibilities:
//   1. On the locating screen (no lat/lon in URL), call
//      navigator.geolocation and redirect to /?lat=...&lon=....
//   2. On the home screen, poll the /api/nearest endpoint
//      every 30 s and replace the plane card markup.

(function () {
  'use strict'

  var DEFAULT_POLL_INTERVAL_MS = 30000

  // Build a same-origin path + query string for navigation. Using
  // `new URL(…, location.origin)` guarantees the result is anchored
  // to our origin no matter what the caller passes as values —
  // eliminates any open-redirect footgun where a future caller
  // might accidentally concat a `//evil.com/…` value into the URL.
  function homeUrl(params) {
    var url = new URL('/', window.location.origin)
    if (params) {
      Object.keys(params).forEach(function (k) {
        var v = params[k]
        if (v !== undefined && v !== null && v !== '') {
          url.searchParams.set(k, String(v))
        }
      })
    }
    return url.pathname + url.search
  }

  function bootGeolocate() {
    // Wire the "Use my location" button on the locating page. No
    // auto-prompt — we only call getCurrentPosition in response to
    // an explicit user click, which keeps the permission UX clean
    // and avoids the denied-bounce loop that plagued the old
    // auto-prompt flow.
    var btn = document.getElementById('allow-location-btn')
    if (!btn) return

    btn.addEventListener('click', function () {
      if (!('geolocation' in navigator)) {
        window.location.replace(homeUrl({ denied: '1' }))
        return
      }
      btn.setAttribute('disabled', 'disabled')
      btn.textContent = 'Locating…'
      navigator.geolocation.getCurrentPosition(
        function (pos) {
          var lat = pos.coords.latitude.toFixed(4)
          var lon = pos.coords.longitude.toFixed(4)
          window.location.replace(homeUrl({ lat: lat, lon: lon }))
        },
        function () {
          // Permission denied or unavailable — fall through to the
          // Hamburg default with a flag so the home page can show
          // the "please unblock" banner.
          window.location.replace(homeUrl({ denied: '1' }))
        },
        { enableHighAccuracy: false, timeout: 10000, maximumAge: 5 * 60 * 1000 },
      )
    })
  }

  function bootPolling() {
    var card = document.getElementById('plane-card')
    if (!card) return
    var pollUrl = card.getAttribute('data-fly-poll')
    if (!pollUrl) return

    // Interval comes from the server (driven by the Settings form).
    // 0 = user turned auto-refresh off; just render the initial
    // server response and stop.
    var intervalSec = parseInt(card.getAttribute('data-fly-interval') || '', 10)
    if (!isFinite(intervalSec) || intervalSec < 0) {
      intervalSec = DEFAULT_POLL_INTERVAL_MS / 1000
    }
    if (intervalSec === 0) return
    var intervalMs = intervalSec * 1000

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
      timer = setInterval(tick, intervalMs)
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

  function bootSettingsEsc() {
    // Close the settings modal on Escape. The modal is a pure-CSS
    // checkbox toggle, so "closing" just means unchecking the box.
    var checkbox = document.getElementById('settings-toggle')
    if (!checkbox) return
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && checkbox.checked) {
        checkbox.checked = false
      }
    })
  }

  function bootFullscreen() {
    // Event delegation on document — the Fullscreen button lives
    // inside #plane-card and gets replaced every 30 s by the poll,
    // so a direct addEventListener on the element would stop
    // firing after the first refresh.
    document.addEventListener('click', function (e) {
      var target = e.target
      if (!target || typeof target.closest !== 'function') return
      var btn = target.closest('#fullscreen-btn')
      if (!btn) return
      var doc = document
      var docEl = doc.documentElement
      if (doc.fullscreenElement) {
        if (doc.exitFullscreen) doc.exitFullscreen()
      } else if (docEl.requestFullscreen) {
        docEl.requestFullscreen().catch(function (err) {
          console.warn('fullscreen request failed', err)
        })
      }
    })
  }

  function bootUpdateLocation() {
    // "Update location" button inside the settings overlay. Triggers
    // a fresh geolocation prompt and, on success, redirects to the
    // home URL preserving the user's current radius + refresh.
    document.addEventListener('click', function (e) {
      var target = e.target
      if (!target || typeof target.closest !== 'function') return
      var btn = target.closest('#update-location-btn')
      if (!btn) return
      if (!('geolocation' in navigator)) return
      btn.setAttribute('disabled', 'disabled')
      var originalText = btn.textContent
      btn.textContent = 'Locating…'
      var form = btn.closest('form')
      var radiusInput = form && form.querySelector('[name="radius"]')
      var refreshInput = form && form.querySelector('[name="refresh"]')
      var radius = (radiusInput && radiusInput.value) || '50'
      var refresh = (refreshInput && refreshInput.value) || '30'
      navigator.geolocation.getCurrentPosition(
        function (pos) {
          var lat = pos.coords.latitude.toFixed(4)
          var lon = pos.coords.longitude.toFixed(4)
          // homeUrl() encodes each value through URLSearchParams, so
          // a malformed radius like "50&foo=bar" can't inject
          // additional query params.
          window.location.replace(
            homeUrl({ lat: lat, lon: lon, radius: radius, refresh: refresh }),
          )
        },
        function () {
          btn.removeAttribute('disabled')
          btn.textContent = originalText
        },
        { enableHighAccuracy: false, timeout: 10000, maximumAge: 5 * 60 * 1000 },
      )
    })
  }

  function boot() {
    bootGeolocate()
    bootPolling()
    bootFullscreen()
    bootUpdateLocation()
    bootSettingsEsc()
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot)
  } else {
    boot()
  }
})()
