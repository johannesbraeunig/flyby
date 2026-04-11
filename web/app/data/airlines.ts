// FlyBy airlines — ICAO airline code → display name + brand color.
//
// Ported verbatim from src/airlines.cpp so the web UI shows the
// same brand colors as the ESP32 LED board. When the firmware
// table changes, mirror the change here.

export interface Airline {
  icao: string // 3 ASCII uppercase chars
  name: string
  hex: string // CSS hex color, "#RRGGBB"
}

export const AIRLINES: ReadonlyArray<Airline> = [
  { icao: 'AAL', name: 'American', hex: '#C8102E' },
  { icao: 'ACA', name: 'Air Canada', hex: '#D8232A' },
  { icao: 'AFL', name: 'Aeroflot', hex: '#092C74' },
  { icao: 'AFR', name: 'Air France', hex: '#002157' },
  { icao: 'AIC', name: 'Air India', hex: '#E31837' },
  { icao: 'ANA', name: 'ANA', hex: '#1B3F8B' },
  { icao: 'AUA', name: 'Austrian', hex: '#CC0000' },
  { icao: 'BAW', name: 'British Airways', hex: '#075AAA' },
  { icao: 'BCS', name: 'DHL', hex: '#FFCC00' },
  { icao: 'BEL', name: 'Brussels', hex: '#002F87' },
  { icao: 'CFG', name: 'Condor', hex: '#FFD700' },
  { icao: 'CPA', name: 'Cathay Pacific', hex: '#006564' },
  { icao: 'DAL', name: 'Delta', hex: '#C8102E' },
  { icao: 'DLH', name: 'Lufthansa', hex: '#F9BA00' },
  { icao: 'ETD', name: 'Etihad', hex: '#CB9D5C' },
  { icao: 'EWG', name: 'Eurowings', hex: '#9B1B30' },
  { icao: 'EZY', name: 'easyJet', hex: '#FF6600' },
  { icao: 'FIN', name: 'Finnair', hex: '#0F1689' },
  { icao: 'GEC', name: 'LH Cargo', hex: '#F9BA00' },
  { icao: 'IBE', name: 'Iberia', hex: '#D7192D' },
  { icao: 'ICE', name: 'Icelandair', hex: '#00529B' },
  { icao: 'JAL', name: 'Japan Airlines', hex: '#CC0000' },
  { icao: 'KAL', name: 'Korean Air', hex: '#00256C' },
  { icao: 'KLM', name: 'KLM', hex: '#00A1DE' },
  { icao: 'LOT', name: 'LOT', hex: '#00266B' },
  { icao: 'NAX', name: 'Norwegian', hex: '#D81E05' },
  { icao: 'PGT', name: 'Pegasus', hex: '#FFCC00' },
  { icao: 'QTR', name: 'Qatar Airways', hex: '#5C0632' },
  { icao: 'ROT', name: 'TAROM', hex: '#002B5C' },
  { icao: 'RYR', name: 'Ryanair', hex: '#073590' },
  { icao: 'SAS', name: 'SAS', hex: '#003D7C' },
  { icao: 'SIA', name: 'Singapore', hex: '#002E6D' },
  { icao: 'SVA', name: 'Saudia', hex: '#00744C' },
  { icao: 'SWR', name: 'Swiss', hex: '#CC0033' },
  { icao: 'SXS', name: 'SunExpress', hex: '#FF6400' },
  { icao: 'TAP', name: 'TAP Portugal', hex: '#00A039' },
  { icao: 'THY', name: 'Turkish', hex: '#E81932' },
  { icao: 'TUI', name: 'TUIfly', hex: '#12326F' },
  { icao: 'UAE', name: 'Emirates', hex: '#D71920' },
  { icao: 'UAL', name: 'United', hex: '#002244' },
  { icao: 'VLG', name: 'Vueling', hex: '#FFD700' },
  { icao: 'WZZ', name: 'Wizz Air', hex: '#C6007E' },
]

const BY_ICAO = new Map(AIRLINES.map((a) => [a.icao, a]))

// Look up an airline from a callsign (e.g. "DLH441" → Lufthansa).
// Uses the first three characters as the ICAO code, case-insensitive.
// Returns null if no entry matches or the callsign is too short.
export function lookupAirline(callsign: string | null | undefined): Airline | null {
  if (!callsign || callsign.length < 3) return null
  let prefix = callsign.slice(0, 3).toUpperCase()
  return BY_ICAO.get(prefix) ?? null
}
