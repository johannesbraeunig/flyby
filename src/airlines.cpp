#include "airlines.h"

#include <cctype>
#include <cstring>

namespace airlines {
namespace {

// Curated table of ~40 carriers commonly seen in Hamburg airspace +
// major intercontinental flag carriers. Brand colors are approximations
// chosen for readability on a 64×32 LED matrix; refine as desired.
//
// Sorted alphabetically by ICAO code for easy maintenance.
const Entry kTable[] = {
    {"AAL", "American",       0xC8, 0x10, 0x2E},
    {"ACA", "Air Canada",     0xD8, 0x23, 0x2A},
    {"AFL", "Aeroflot",       0x09, 0x2C, 0x74},
    {"AFR", "Air France",     0x00, 0x21, 0x57},
    {"AIC", "Air India",      0xE3, 0x18, 0x37},
    {"ANA", "ANA",            0x1B, 0x3F, 0x8B},
    {"AUA", "Austrian",       0xCC, 0x00, 0x00},
    {"BAW", "British Airways",0x07, 0x5A, 0xAA},
    {"BCS", "DHL",            0xFF, 0xCC, 0x00},
    {"BEL", "Brussels",       0x00, 0x2F, 0x87},
    {"CFG", "Condor",         0xFF, 0xD7, 0x00},
    {"CPA", "Cathay Pacific", 0x00, 0x65, 0x64},
    {"DAL", "Delta",          0xC8, 0x10, 0x2E},
    {"DLH", "Lufthansa",      0xF9, 0xBA, 0x00},
    {"ETD", "Etihad",         0xCB, 0x9D, 0x5C},
    {"EWG", "Eurowings",      0x9B, 0x1B, 0x30},
    {"EZY", "easyJet",        0xFF, 0x66, 0x00},
    {"FIN", "Finnair",        0x0F, 0x16, 0x89},
    {"GEC", "LH Cargo",       0xF9, 0xBA, 0x00},
    {"IBE", "Iberia",         0xD7, 0x19, 0x2D},
    {"ICE", "Icelandair",     0x00, 0x52, 0x9B},
    {"JAL", "Japan Airlines", 0xCC, 0x00, 0x00},
    {"KAL", "Korean Air",     0x00, 0x25, 0x6C},
    {"KLM", "KLM",            0x00, 0xA1, 0xDE},
    {"LOT", "LOT",            0x00, 0x26, 0x6B},
    {"NAX", "Norwegian",      0xD8, 0x1E, 0x05},
    {"PGT", "Pegasus",        0xFF, 0xCC, 0x00},
    {"QTR", "Qatar Airways",  0x5C, 0x06, 0x32},
    {"ROT", "TAROM",          0x00, 0x2B, 0x5C},
    {"RYR", "Ryanair",        0x07, 0x35, 0x90},
    {"SAS", "SAS",            0x00, 0x3D, 0x7C},
    {"SIA", "Singapore",      0x00, 0x2E, 0x6D},
    {"SVA", "Saudia",         0x00, 0x74, 0x4C},
    {"SWR", "Swiss",          0xCC, 0x00, 0x33},
    {"SXS", "SunExpress",     0xFF, 0x64, 0x00},
    {"TAP", "TAP Portugal",   0x00, 0xA0, 0x39},
    {"THY", "Turkish",        0xE8, 0x19, 0x32},
    {"TUI", "TUIfly",         0x12, 0x32, 0x6F},
    {"UAE", "Emirates",       0xD7, 0x19, 0x20},
    {"UAL", "United",         0x00, 0x22, 0x44},
    {"VLG", "Vueling",        0xFF, 0xD7, 0x00},
    {"WZZ", "Wizz Air",       0xC6, 0x00, 0x7E},
};

constexpr size_t kTableSize = sizeof(kTable) / sizeof(kTable[0]);

}  // namespace

const Entry* lookup(const char* callsign) {
  if (!callsign) return nullptr;
  // Need at least 3 characters for an ICAO prefix.
  if (callsign[0] == 0 || callsign[1] == 0 || callsign[2] == 0) return nullptr;

  char prefix[3];
  for (int i = 0; i < 3; ++i) {
    prefix[i] = static_cast<char>(
        std::toupper(static_cast<unsigned char>(callsign[i])));
  }

  // Linear scan — table is small (~40), and the LED display only looks
  // up once per refresh (every 30 s), so a binary search would be
  // premature. Keep it obviously correct.
  for (size_t i = 0; i < kTableSize; ++i) {
    if (std::memcmp(prefix, kTable[i].icao, 3) == 0) {
      return &kTable[i];
    }
  }
  return nullptr;
}

const Entry* table() { return kTable; }
size_t table_size() { return kTableSize; }

}  // namespace airlines
