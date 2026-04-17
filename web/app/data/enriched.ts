// Shared types for enriched plane data, used by both controllers and screen
// UI components. Kept separate to avoid circular imports between controllers
// that pass data *down* to components.

import type { Plane } from './opensky.ts'
import type { RouteInfo } from './routes.ts'
import type { AircraftInfo } from './aircraft.ts'
import type { Airline } from './airlines.ts'

export interface EnrichedPlane {
  plane: Plane
  route: RouteInfo | null
  aircraft: AircraftInfo | null
  airline: Airline | null
  bearing: number
  elevation: number
  compassDir: string
}

export interface BoardRow {
  cs: string
  rt: string
  alt: string
  spd: string
  dst: string
  eta: string
  hot: boolean
}

export interface RadarBlip {
  cs: string
  sym: string
  x: number
  y: number
  hot: boolean
}
