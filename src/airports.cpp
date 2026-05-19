#include "airports.h"

#include <string.h>

namespace airports {
namespace {

struct Entry {
  const char* icao;  // 4 chars, uppercase
  const char* iata;  // 3 chars, uppercase
  const char* city;  // short display name
};

// Curated table. Linear search is fine — called at most twice per route
// lookup (every 30 s on a cache miss).
const Entry kTable[] = {
    // ── Iceland / Faroes ──
    {"BIKF", "KEF", "Reykjavik"},

    // ── Canada ──
    {"CYUL", "YUL", "Montreal"},
    {"CYVR", "YVR", "Vancouver"},
    {"CYYC", "YYC", "Calgary"},
    {"CYYZ", "YYZ", "Toronto"},

    // ── Belgium / Netherlands / Luxembourg ──
    {"EBBR", "BRU", "Brussels"},
    {"EBCI", "CRL", "Charleroi"},
    {"EBLG", "LGG", "Liege"},
    {"EBOS", "OST", "Ostend"},
    {"EHAM", "AMS", "Amsterdam"},
    {"EHEH", "EIN", "Eindhoven"},
    {"EHGG", "GRQ", "Groningen"},
    {"EHRD", "RTM", "Rotterdam"},
    {"ELLX", "LUX", "Luxembourg"},

    // ── Germany ──
    {"EDDB", "BER", "Berlin"},
    {"EDDC", "DRS", "Dresden"},
    {"EDDE", "ERF", "Erfurt"},
    {"EDDF", "FRA", "Frankfurt"},
    {"EDDG", "FMO", "Muenster"},
    {"EDDH", "HAM", "Hamburg"},
    {"EDDK", "CGN", "Koeln"},
    {"EDDL", "DUS", "Dusseldorf"},
    {"EDDM", "MUC", "Muenchen"},
    {"EDDN", "NUE", "Nuernberg"},
    {"EDDP", "LEJ", "Leipzig"},
    {"EDDR", "SCN", "Saarbruckn"},
    {"EDDS", "STR", "Stuttgart"},
    {"EDDT", "TXL", "Berlin"},
    {"EDDV", "HAJ", "Hannover"},
    {"EDDW", "BRE", "Bremen"},
    {"EDFE", "QEF", "Egelsbach"},
    {"EDFH", "HHN", "Hahn"},
    {"EDJA", "FMM", "Memmingen"},
    {"EDLP", "PAD", "Paderborn"},
    {"EDLV", "NRN", "Weeze"},
    {"EDLW", "DTM", "Dortmund"},
    {"EDNY", "FDH", "Fr.hafen"},

    // ── UK / Ireland ──
    {"EGAA", "BFS", "Belfast"},
    {"EGBB", "BHX", "Birmingham"},
    {"EGCC", "MAN", "Manchester"},
    {"EGGD", "BRS", "Bristol"},
    {"EGGW", "LTN", "London"},
    {"EGKK", "LGW", "London"},
    {"EGLC", "LCY", "London"},
    {"EGLL", "LHR", "London"},
    {"EGNX", "EMA", "E.Midlands"},
    {"EGPF", "GLA", "Glasgow"},
    {"EGPH", "EDI", "Edinburgh"},
    {"EGSS", "STN", "London"},
    {"EIDW", "DUB", "Dublin"},

    // ── Nordic / Baltic ──
    {"EFHK", "HEL", "Helsinki"},
    {"EKBI", "BLL", "Billund"},
    {"EKCH", "CPH", "Copenhagen"},
    {"ENBR", "BGO", "Bergen"},
    {"ENGM", "OSL", "Oslo"},
    {"ENVA", "TRD", "Trondheim"},
    {"ENZV", "SVG", "Stavanger"},
    {"ESGG", "GOT", "Gothenburg"},
    {"ESMS", "MMX", "Malmoe"},
    {"ESSA", "ARN", "Stockholm"},
    {"EETN", "TLL", "Tallinn"},
    {"EVRA", "RIX", "Riga"},
    {"EYVI", "VNO", "Vilnius"},

    // ── Poland / Czechia / Slovakia / Hungary / Romania / Bulgaria ──
    {"EPGD", "GDN", "Gdansk"},
    {"EPKK", "KRK", "Krakow"},
    {"EPPO", "POZ", "Poznan"},
    {"EPWA", "WAW", "Warsaw"},
    {"EPWR", "WRO", "Wroclaw"},
    {"LKPR", "PRG", "Prague"},
    {"LZIB", "BTS", "Bratislava"},
    {"LHBP", "BUD", "Budapest"},
    {"LROP", "OTP", "Bucharest"},
    {"LBSF", "SOF", "Sofia"},

    // ── France ──
    {"LFBD", "BOD", "Bordeaux"},
    {"LFBO", "TLS", "Toulouse"},
    {"LFLL", "LYS", "Lyon"},
    {"LFML", "MRS", "Marseille"},
    {"LFMN", "NCE", "Nice"},
    {"LFPB", "LBG", "Paris"},
    {"LFPG", "CDG", "Paris"},
    {"LFPO", "ORY", "Paris"},
    {"LFRS", "NTE", "Nantes"},
    {"LFSB", "BSL", "Basel"},

    // ── Spain / Portugal ──
    {"LEAL", "ALC", "Alicante"},
    {"LEBL", "BCN", "Barcelona"},
    {"LEIB", "IBZ", "Ibiza"},
    {"LEMD", "MAD", "Madrid"},
    {"LEMG", "AGP", "Malaga"},
    {"LEMH", "MAH", "Menorca"},
    {"LEPA", "PMI", "Mallorca"},
    {"LEVC", "VLC", "Valencia"},
    {"LEZL", "SVQ", "Sevilla"},
    {"LPPR", "OPO", "Porto"},
    {"LPPT", "LIS", "Lisbon"},
    {"LPFR", "FAO", "Faro"},
    {"LPMA", "FNC", "Madeira"},
    {"GCFV", "FUE", "Fuertevent"},
    {"GCLP", "LPA", "G.Canaria"},
    {"GCRR", "ACE", "Lanzarote"},
    {"GCTS", "TFS", "Tenerife"},
    {"GCXO", "TFN", "Tenerife"},

    // ── Italy / Malta ──
    {"LICC", "CTA", "Catania"},
    {"LICJ", "PMO", "Palermo"},
    {"LIMC", "MXP", "Milano"},
    {"LIME", "BGY", "Bergamo"},
    {"LIML", "LIN", "Milano"},
    {"LIMF", "TRN", "Torino"},
    {"LIPB", "BZO", "Bolzano"},
    {"LIPZ", "VCE", "Venezia"},
    {"LIRA", "CIA", "Roma"},
    {"LIRF", "FCO", "Roma"},
    {"LIRN", "NAP", "Napoli"},
    {"LIRP", "PSA", "Pisa"},
    {"LIRQ", "FLR", "Firenze"},
    {"LMML", "MLA", "Malta"},

    // ── Greece / Cyprus ──
    {"LCLK", "LCA", "Larnaca"},
    {"LCPH", "PFO", "Paphos"},
    {"LGAV", "ATH", "Athens"},
    {"LGIR", "HER", "Heraklion"},
    {"LGKO", "KGS", "Kos"},
    {"LGKR", "CFU", "Corfu"},
    {"LGMK", "JMK", "Mykonos"},
    {"LGRP", "RHO", "Rhodes"},
    {"LGSR", "JTR", "Santorini"},
    {"LGTS", "SKG", "Thessalnki"},
    {"LGZA", "ZTH", "Zakynthos"},

    // ── Austria / Switzerland ──
    {"LOWG", "GRZ", "Graz"},
    {"LOWI", "INN", "Innsbruck"},
    {"LOWK", "KLU", "Klagenfurt"},
    {"LOWS", "SZG", "Salzburg"},
    {"LOWW", "VIE", "Vienna"},
    {"LSGG", "GVA", "Geneva"},
    {"LSZA", "LUG", "Lugano"},
    {"LSZB", "BRN", "Bern"},
    {"LSZH", "ZRH", "Zurich"},

    // ── Balkans ──
    {"LATI", "TIA", "Tirana"},
    {"LDDU", "DBV", "Dubrovnik"},
    {"LDSP", "SPU", "Split"},
    {"LDZA", "ZAG", "Zagreb"},
    {"LJLJ", "LJU", "Ljubljana"},
    {"LWSK", "SKP", "Skopje"},
    {"LYBE", "BEG", "Belgrade"},
    {"LYPG", "TGD", "Podgorica"},
    {"LYTV", "TIV", "Tivat"},

    // ── Turkey ──
    {"LTAC", "ESB", "Ankara"},
    {"LTAI", "AYT", "Antalya"},
    {"LTBS", "DLM", "Dalaman"},
    {"LTFE", "BJV", "Bodrum"},
    {"LTFJ", "SAW", "Istanbul"},
    {"LTFM", "IST", "Istanbul"},

    // ── Middle East ──
    {"OBBI", "BAH", "Bahrain"},
    {"OEDF", "DMM", "Dammam"},
    {"OEJN", "JED", "Jeddah"},
    {"OERK", "RUH", "Riyadh"},
    {"OKBK", "KWI", "Kuwait"},
    {"OLBA", "BEY", "Beirut"},
    {"OMAA", "AUH", "Abu Dhabi"},
    {"OMDB", "DXB", "Dubai"},
    {"OMDW", "DWC", "Dubai"},
    {"OMSJ", "SHJ", "Sharjah"},
    {"OOMS", "MCT", "Muscat"},
    {"OTHH", "DOH", "Doha"},
    {"LLBG", "TLV", "Tel Aviv"},

    // ── North + Sub-Saharan Africa ──
    {"DGAA", "ACC", "Accra"},
    {"DNMM", "LOS", "Lagos"},
    {"FAOR", "JNB", "Johannesbg"},
    {"FACT", "CPT", "Cape Town"},
    {"FALE", "DUR", "Durban"},
    {"HAAB", "ADD", "AddisAbaba"},
    {"HECA", "CAI", "Cairo"},
    {"HEGN", "HRG", "Hurghada"},
    {"HEMA", "RMF", "MarsaAlam"},
    {"HESH", "SSH", "Sharm elSh"},
    {"HKJK", "NBO", "Nairobi"},

    // ── Asia ──
    {"RJAA", "NRT", "Tokyo"},
    {"RJBB", "KIX", "Osaka"},
    {"RJTT", "HND", "Tokyo"},
    {"RKSI", "ICN", "Seoul"},
    {"VABB", "BOM", "Mumbai"},
    {"VHHH", "HKG", "Hong Kong"},
    {"VIDP", "DEL", "Delhi"},
    {"VOBL", "BLR", "Bangalore"},
    {"VOMM", "MAA", "Chennai"},
    {"VTBD", "DMK", "Bangkok"},
    {"VTBS", "BKK", "Bangkok"},
    {"WIII", "CGK", "Jakarta"},
    {"WMKK", "KUL", "K. Lumpur"},
    {"WSSS", "SIN", "Singapore"},
    {"ZBAA", "PEK", "Beijing"},
    {"ZGGG", "CAN", "Guangzhou"},
    {"ZSPD", "PVG", "Shanghai"},
    {"ZUUU", "CTU", "Chengdu"},

    // ── USA ──
    {"KATL", "ATL", "Atlanta"},
    {"KAUS", "AUS", "Austin"},
    {"KBOS", "BOS", "Boston"},
    {"KBWI", "BWI", "Baltimore"},
    {"KCLT", "CLT", "Charlotte"},
    {"KDCA", "DCA", "Washington"},
    {"KDEN", "DEN", "Denver"},
    {"KDFW", "DFW", "Dallas"},
    {"KDTW", "DTW", "Detroit"},
    {"KEWR", "EWR", "Newark"},
    {"KFLL", "FLL", "Ft.Laudrdl"},
    {"KIAD", "IAD", "Washington"},
    {"KIAH", "IAH", "Houston"},
    {"KJFK", "JFK", "New York"},
    {"KLAS", "LAS", "Las Vegas"},
    {"KLAX", "LAX", "L.Angeles"},
    {"KLGA", "LGA", "New York"},
    {"KMCO", "MCO", "Orlando"},
    {"KMIA", "MIA", "Miami"},
    {"KMSP", "MSP", "Minneapols"},
    {"KORD", "ORD", "Chicago"},
    {"KPHL", "PHL", "Phila."},
    {"KPHX", "PHX", "Phoenix"},
    {"KSAN", "SAN", "San Diego"},
    {"KSEA", "SEA", "Seattle"},
    {"KSFO", "SFO", "S.Francisc"},
    {"KSLC", "SLC", "SaltLakeC."},
    {"KTPA", "TPA", "Tampa"},

    // ── Latin America ──
    {"MMMX", "MEX", "MexicoCity"},
    {"MMUN", "CUN", "Cancun"},
    {"MDPC", "PUJ", "PuntaCana"},
    {"MDSD", "SDQ", "StoDomingo"},
    {"SAEZ", "EZE", "B.Aires"},
    {"SBGL", "GIG", "Rio"},
    {"SBGR", "GRU", "Sao Paulo"},
    {"SCEL", "SCL", "Santiago"},
    {"SKBO", "BOG", "Bogota"},
    {"SPJC", "LIM", "Lima"},

    // ── Russia / CIS ──
    {"UUEE", "SVO", "Moscow"},
    {"UUDD", "DME", "Moscow"},
    {"UUWW", "VKO", "Moscow"},
    {"ULLI", "LED", "St.Petersb"},
    {"UKBB", "KBP", "Kyiv"},
    {"UMMS", "MSQ", "Minsk"},

    // ── Oceania ──
    {"NZAA", "AKL", "Auckland"},
    {"NZCH", "CHC", "Christchch"},
    {"YBBN", "BNE", "Brisbane"},
    {"YMML", "MEL", "Melbourne"},
    {"YPPH", "PER", "Perth"},
    {"YSSY", "SYD", "Sydney"},
};

constexpr int kTableSize = sizeof(kTable) / sizeof(kTable[0]);

}  // namespace

const char* icao_to_iata(const char* icao) {
  if (!icao || icao[0] == 0) return nullptr;
  for (int i = 0; i < kTableSize; ++i) {
    if (strcmp(kTable[i].icao, icao) == 0) return kTable[i].iata;
  }
  return nullptr;
}

const char* code_to_city(const char* code) {
  if (!code || code[0] == 0) return nullptr;
  size_t len = strlen(code);
  for (int i = 0; i < kTableSize; ++i) {
    if (len == 3 && strcmp(kTable[i].iata, code) == 0) return kTable[i].city;
    if (len == 4 && strcmp(kTable[i].icao, code) == 0) return kTable[i].city;
  }
  return nullptr;
}

}  // namespace airports
