import { get, route } from 'remix/fetch-router/routes'

export let routes = route({
  home: get('/'),
  nearestApi: get('/api/nearest'),
  screenLanding: get('/screens/landing'),
  screenOverhead: get('/screens/overhead'),
  screenBoard: get('/screens/board'),
  screenRadar: get('/screens/radar'),
  screenDetail: get('/screens/detail'),
  screenEmpty: get('/screens/empty'),
})
