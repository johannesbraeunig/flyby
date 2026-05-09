#include "airports.h"

#include <string.h>

namespace airports {
namespace {

struct Entry {
  const char* icao;  // 4 chars, uppercase
  const char* iata;  // 3 chars, uppercase
};

// Curated table. Linear search is fine — called at most twice per route
// lookup (every 30 s on a cache miss).
const Entry kTable[] = {
    // ── Iceland / Faroes ──
    {"BIKF", "KEF"},  // Reykjavik-Keflavik

    // ── Canada ──
    {"CYUL", "YUL"},  // Montreal
    {"CYVR", "YVR"},  // Vancouver
    {"CYYC", "YYC"},  // Calgary
    {"CYYZ", "YYZ"},  // Toronto-Pearson

    // ── Belgium / Netherlands / Luxembourg ──
    {"EBBR", "BRU"},  // Brussels
    {"EBCI", "CRL"},  // Charleroi
    {"EBLG", "LGG"},  // Liege
    {"EBOS", "OST"},  // Ostend
    {"EHAM", "AMS"},  // Amsterdam-Schiphol
    {"EHEH", "EIN"},  // Eindhoven
    {"EHGG", "GRQ"},  // Groningen
    {"EHRD", "RTM"},  // Rotterdam
    {"ELLX", "LUX"},  // Luxembourg

    // ── Germany ──
    {"EDDB", "BER"},  // Berlin-Brandenburg
    {"EDDC", "DRS"},  // Dresden
    {"EDDE", "ERF"},  // Erfurt
    {"EDDF", "FRA"},  // Frankfurt
    {"EDDG", "FMO"},  // Münster/Osnabrück
    {"EDDH", "HAM"},  // Hamburg
    {"EDDK", "CGN"},  // Köln/Bonn
    {"EDDL", "DUS"},  // Düsseldorf
    {"EDDM", "MUC"},  // München
    {"EDDN", "NUE"},  // Nürnberg
    {"EDDP", "LEJ"},  // Leipzig/Halle
    {"EDDR", "SCN"},  // Saarbrücken
    {"EDDS", "STR"},  // Stuttgart
    {"EDDT", "TXL"},  // Berlin-Tegel (closed; historical)
    {"EDDV", "HAJ"},  // Hannover
    {"EDDW", "BRE"},  // Bremen
    {"EDFE", "QEF"},  // Frankfurt-Egelsbach (GA)
    {"EDFH", "HHN"},  // Frankfurt-Hahn
    {"EDJA", "FMM"},  // Memmingen
    {"EDLP", "PAD"},  // Paderborn
    {"EDLV", "NRN"},  // Niederrhein/Weeze
    {"EDLW", "DTM"},  // Dortmund
    {"EDNY", "FDH"},  // Friedrichshafen

    // ── UK / Ireland ──
    {"EGAA", "BFS"},  // Belfast Intl
    {"EGBB", "BHX"},  // Birmingham
    {"EGCC", "MAN"},  // Manchester
    {"EGGD", "BRS"},  // Bristol
    {"EGGW", "LTN"},  // London-Luton
    {"EGKK", "LGW"},  // London-Gatwick
    {"EGLC", "LCY"},  // London-City
    {"EGLL", "LHR"},  // London-Heathrow
    {"EGNX", "EMA"},  // East Midlands
    {"EGPF", "GLA"},  // Glasgow
    {"EGPH", "EDI"},  // Edinburgh
    {"EGSS", "STN"},  // London-Stansted
    {"EIDW", "DUB"},  // Dublin

    // ── Nordic / Baltic ──
    {"EFHK", "HEL"},  // Helsinki
    {"EKBI", "BLL"},  // Billund
    {"EKCH", "CPH"},  // Copenhagen
    {"ENBR", "BGO"},  // Bergen
    {"ENGM", "OSL"},  // Oslo-Gardermoen
    {"ENVA", "TRD"},  // Trondheim
    {"ENZV", "SVG"},  // Stavanger
    {"ESGG", "GOT"},  // Gothenburg
    {"ESMS", "MMX"},  // Malmö
    {"ESSA", "ARN"},  // Stockholm-Arlanda
    {"EETN", "TLL"},  // Tallinn
    {"EVRA", "RIX"},  // Riga
    {"EYVI", "VNO"},  // Vilnius

    // ── Poland / Czechia / Slovakia / Hungary / Romania / Bulgaria ──
    {"EPGD", "GDN"},  // Gdansk
    {"EPKK", "KRK"},  // Krakow
    {"EPPO", "POZ"},  // Poznan
    {"EPWA", "WAW"},  // Warsaw-Chopin
    {"EPWR", "WRO"},  // Wroclaw
    {"LKPR", "PRG"},  // Prague
    {"LZIB", "BTS"},  // Bratislava
    {"LHBP", "BUD"},  // Budapest
    {"LROP", "OTP"},  // Bucharest-Otopeni
    {"LBSF", "SOF"},  // Sofia

    // ── France ──
    {"LFBD", "BOD"},  // Bordeaux
    {"LFBO", "TLS"},  // Toulouse
    {"LFLL", "LYS"},  // Lyon
    {"LFML", "MRS"},  // Marseille
    {"LFMN", "NCE"},  // Nice
    {"LFPB", "LBG"},  // Paris-Le Bourget
    {"LFPG", "CDG"},  // Paris-Charles de Gaulle
    {"LFPO", "ORY"},  // Paris-Orly
    {"LFRS", "NTE"},  // Nantes
    {"LFSB", "BSL"},  // Basel-Mulhouse

    // ── Spain / Portugal ──
    {"LEAL", "ALC"},  // Alicante
    {"LEBL", "BCN"},  // Barcelona
    {"LEIB", "IBZ"},  // Ibiza
    {"LEMD", "MAD"},  // Madrid-Barajas
    {"LEMG", "AGP"},  // Malaga
    {"LEMH", "MAH"},  // Menorca
    {"LEPA", "PMI"},  // Palma de Mallorca
    {"LEVC", "VLC"},  // Valencia
    {"LEZL", "SVQ"},  // Sevilla
    {"LPPR", "OPO"},  // Porto
    {"LPPT", "LIS"},  // Lisbon
    {"LPFR", "FAO"},  // Faro
    {"LPMA", "FNC"},  // Madeira/Funchal
    {"GCFV", "FUE"},  // Fuerteventura
    {"GCLP", "LPA"},  // Gran Canaria
    {"GCRR", "ACE"},  // Lanzarote
    {"GCTS", "TFS"},  // Tenerife-South
    {"GCXO", "TFN"},  // Tenerife-North

    // ── Italy / Malta ──
    {"LICC", "CTA"},  // Catania
    {"LICJ", "PMO"},  // Palermo
    {"LIMC", "MXP"},  // Milano-Malpensa
    {"LIME", "BGY"},  // Bergamo/Milano-Orio
    {"LIML", "LIN"},  // Milano-Linate
    {"LIMF", "TRN"},  // Torino
    {"LIPB", "BZO"},  // Bolzano
    {"LIPZ", "VCE"},  // Venezia
    {"LIRA", "CIA"},  // Roma-Ciampino
    {"LIRF", "FCO"},  // Roma-Fiumicino
    {"LIRN", "NAP"},  // Napoli
    {"LIRP", "PSA"},  // Pisa
    {"LIRQ", "FLR"},  // Firenze
    {"LMML", "MLA"},  // Malta

    // ── Greece / Cyprus ──
    {"LCLK", "LCA"},  // Larnaca
    {"LCPH", "PFO"},  // Paphos
    {"LGAV", "ATH"},  // Athens
    {"LGIR", "HER"},  // Heraklion
    {"LGKO", "KGS"},  // Kos
    {"LGKR", "CFU"},  // Corfu
    {"LGMK", "JMK"},  // Mykonos
    {"LGRP", "RHO"},  // Rhodes
    {"LGSR", "JTR"},  // Santorini
    {"LGTS", "SKG"},  // Thessaloniki
    {"LGZA", "ZTH"},  // Zakynthos

    // ── Austria / Switzerland ──
    {"LOWG", "GRZ"},  // Graz
    {"LOWI", "INN"},  // Innsbruck
    {"LOWK", "KLU"},  // Klagenfurt
    {"LOWS", "SZG"},  // Salzburg
    {"LOWW", "VIE"},  // Vienna
    {"LSGG", "GVA"},  // Geneva
    {"LSZA", "LUG"},  // Lugano
    {"LSZB", "BRN"},  // Bern
    {"LSZH", "ZRH"},  // Zurich

    // ── Balkans ──
    {"LATI", "TIA"},  // Tirana
    {"LDDU", "DBV"},  // Dubrovnik
    {"LDSP", "SPU"},  // Split
    {"LDZA", "ZAG"},  // Zagreb
    {"LJLJ", "LJU"},  // Ljubljana
    {"LWSK", "SKP"},  // Skopje
    {"LYBE", "BEG"},  // Belgrade
    {"LYPG", "TGD"},  // Podgorica
    {"LYTV", "TIV"},  // Tivat

    // ── Turkey ──
    {"LTAC", "ESB"},  // Ankara
    {"LTAI", "AYT"},  // Antalya
    {"LTBS", "DLM"},  // Dalaman
    {"LTFE", "BJV"},  // Bodrum
    {"LTFJ", "SAW"},  // Istanbul-Sabiha Gokcen
    {"LTFM", "IST"},  // Istanbul-New

    // ── Middle East ──
    {"OBBI", "BAH"},  // Bahrain
    {"OEDF", "DMM"},  // Dammam
    {"OEJN", "JED"},  // Jeddah
    {"OERK", "RUH"},  // Riyadh
    {"OKBK", "KWI"},  // Kuwait
    {"OLBA", "BEY"},  // Beirut
    {"OMAA", "AUH"},  // Abu Dhabi
    {"OMDB", "DXB"},  // Dubai
    {"OMDW", "DWC"},  // Dubai-World Central
    {"OMSJ", "SHJ"},  // Sharjah
    {"OOMS", "MCT"},  // Muscat
    {"OTHH", "DOH"},  // Doha
    {"LLBG", "TLV"},  // Tel Aviv

    // ── North + Sub-Saharan Africa ──
    {"DGAA", "ACC"},  // Accra
    {"DNMM", "LOS"},  // Lagos
    {"FAOR", "JNB"},  // Johannesburg
    {"FACT", "CPT"},  // Cape Town
    {"FALE", "DUR"},  // Durban
    {"HAAB", "ADD"},  // Addis Ababa
    {"HECA", "CAI"},  // Cairo
    {"HEGN", "HRG"},  // Hurghada
    {"HEMA", "RMF"},  // Marsa Alam
    {"HESH", "SSH"},  // Sharm el-Sheikh
    {"HKJK", "NBO"},  // Nairobi

    // ── Asia ──
    {"RJAA", "NRT"},  // Tokyo-Narita
    {"RJBB", "KIX"},  // Osaka-Kansai
    {"RJTT", "HND"},  // Tokyo-Haneda
    {"RKSI", "ICN"},  // Seoul-Incheon
    {"VABB", "BOM"},  // Mumbai
    {"VHHH", "HKG"},  // Hong Kong
    {"VIDP", "DEL"},  // Delhi
    {"VOBL", "BLR"},  // Bangalore
    {"VOMM", "MAA"},  // Chennai
    {"VTBD", "DMK"},  // Bangkok-Don Mueang
    {"VTBS", "BKK"},  // Bangkok-Suvarnabhumi
    {"WIII", "CGK"},  // Jakarta-Soekarno-Hatta
    {"WMKK", "KUL"},  // Kuala Lumpur
    {"WSSS", "SIN"},  // Singapore-Changi
    {"ZBAA", "PEK"},  // Beijing-Capital
    {"ZGGG", "CAN"},  // Guangzhou
    {"ZSPD", "PVG"},  // Shanghai-Pudong
    {"ZUUU", "CTU"},  // Chengdu

    // ── USA ──
    {"KATL", "ATL"},  // Atlanta
    {"KAUS", "AUS"},  // Austin
    {"KBOS", "BOS"},  // Boston
    {"KBWI", "BWI"},  // Baltimore
    {"KCLT", "CLT"},  // Charlotte
    {"KDCA", "DCA"},  // Washington-Reagan
    {"KDEN", "DEN"},  // Denver
    {"KDFW", "DFW"},  // Dallas-Fort Worth
    {"KDTW", "DTW"},  // Detroit
    {"KEWR", "EWR"},  // Newark
    {"KFLL", "FLL"},  // Fort Lauderdale
    {"KIAD", "IAD"},  // Washington-Dulles
    {"KIAH", "IAH"},  // Houston-Bush
    {"KJFK", "JFK"},  // New York-JFK
    {"KLAS", "LAS"},  // Las Vegas
    {"KLAX", "LAX"},  // Los Angeles
    {"KLGA", "LGA"},  // New York-LaGuardia
    {"KMCO", "MCO"},  // Orlando
    {"KMIA", "MIA"},  // Miami
    {"KMSP", "MSP"},  // Minneapolis
    {"KORD", "ORD"},  // Chicago-O'Hare
    {"KPHL", "PHL"},  // Philadelphia
    {"KPHX", "PHX"},  // Phoenix
    {"KSAN", "SAN"},  // San Diego
    {"KSEA", "SEA"},  // Seattle-Tacoma
    {"KSFO", "SFO"},  // San Francisco
    {"KSLC", "SLC"},  // Salt Lake City
    {"KTPA", "TPA"},  // Tampa

    // ── Latin America ──
    {"MMMX", "MEX"},  // Mexico City
    {"MMUN", "CUN"},  // Cancún
    {"MDPC", "PUJ"},  // Punta Cana
    {"MDSD", "SDQ"},  // Santo Domingo
    {"SAEZ", "EZE"},  // Buenos Aires-Ezeiza
    {"SBGL", "GIG"},  // Rio de Janeiro-Galeão
    {"SBGR", "GRU"},  // São Paulo-Guarulhos
    {"SCEL", "SCL"},  // Santiago de Chile
    {"SKBO", "BOG"},  // Bogotá
    {"SPJC", "LIM"},  // Lima

    // ── Russia / CIS ──
    {"UUEE", "SVO"},  // Moscow-Sheremetyevo
    {"UUDD", "DME"},  // Moscow-Domodedovo
    {"UUWW", "VKO"},  // Moscow-Vnukovo
    {"ULLI", "LED"},  // St. Petersburg
    {"UKBB", "KBP"},  // Kyiv-Boryspil
    {"UMMS", "MSQ"},  // Minsk

    // ── Oceania ──
    {"NZAA", "AKL"},  // Auckland
    {"NZCH", "CHC"},  // Christchurch
    {"YBBN", "BNE"},  // Brisbane
    {"YMML", "MEL"},  // Melbourne
    {"YPPH", "PER"},  // Perth
    {"YSSY", "SYD"},  // Sydney
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

}  // namespace airports
