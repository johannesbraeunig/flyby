// FlyBy airports — small curated ICAO -> IATA lookup.
//
// OpenSky's /flights/aircraft returns ICAO airport codes (e.g. EDDH).
// IATA codes (HAM) are nicer to read on the LED panel. adsbdb gives us
// IATA when its callsign mapping is verified, but for unverified or
// missing mappings we fall back to OpenSky and need a static lookup.
//
// Coverage: German airports, DACH neighbours, major European hubs,
// common holiday destinations, intercontinental hubs. Unknown ICAOs
// return nullptr and the caller displays the ICAO instead.

#pragma once

namespace airports {

// Returns the 3-letter IATA code for `icao` (4-letter), or nullptr if the
// airport is not in the table. `icao` is matched case-sensitively (uppercase).
// Safe for null and empty input.
const char* icao_to_iata(const char* icao);

}  // namespace airports
