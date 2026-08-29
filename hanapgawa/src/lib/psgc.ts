// Philippine geography for location filtering. Region codes follow PSGC
// two-digit region numbering; cities use stable slugs. This ships every
// region and all major cities — a full PSGC import (1,600+ cities and
// municipalities, barangay level) is a drop-in data upgrade later since the
// rest of the app only ever sees {code, name, regionCode, lat?, lng?}.

export interface Region {
  code: string;
  name: string;
  short: string;
}

export interface City {
  code: string;
  name: string;
  regionCode: string;
  lat?: number;
  lng?: number;
}

export const REGIONS: Region[] = [
  { code: "13", name: "National Capital Region", short: "NCR / Metro Manila" },
  { code: "01", name: "Region I – Ilocos Region", short: "Ilocos" },
  { code: "02", name: "Region II – Cagayan Valley", short: "Cagayan Valley" },
  { code: "03", name: "Region III – Central Luzon", short: "Central Luzon" },
  { code: "04", name: "Region IV-A – CALABARZON", short: "CALABARZON" },
  { code: "17", name: "MIMAROPA Region", short: "MIMAROPA" },
  { code: "05", name: "Region V – Bicol Region", short: "Bicol" },
  { code: "06", name: "Region VI – Western Visayas", short: "Western Visayas" },
  { code: "07", name: "Region VII – Central Visayas", short: "Central Visayas" },
  { code: "08", name: "Region VIII – Eastern Visayas", short: "Eastern Visayas" },
  { code: "09", name: "Region IX – Zamboanga Peninsula", short: "Zamboanga" },
  { code: "10", name: "Region X – Northern Mindanao", short: "Northern Mindanao" },
  { code: "11", name: "Region XI – Davao Region", short: "Davao" },
  { code: "12", name: "Region XII – SOCCSKSARGEN", short: "SOCCSKSARGEN" },
  { code: "16", name: "Region XIII – Caraga", short: "Caraga" },
  { code: "14", name: "Cordillera Administrative Region", short: "CAR" },
  { code: "19", name: "Bangsamoro (BARMM)", short: "BARMM" },
];

export const CITIES: City[] = [
  // NCR
  { code: "manila", name: "City of Manila", regionCode: "13", lat: 14.5995, lng: 120.9842 },
  { code: "quezon-city", name: "Quezon City", regionCode: "13", lat: 14.676, lng: 121.0437 },
  { code: "caloocan", name: "Caloocan", regionCode: "13", lat: 14.6507, lng: 120.9672 },
  { code: "las-pinas", name: "Las Piñas", regionCode: "13", lat: 14.4445, lng: 120.9939 },
  { code: "makati", name: "Makati", regionCode: "13", lat: 14.5547, lng: 121.0244 },
  { code: "malabon", name: "Malabon", regionCode: "13", lat: 14.662, lng: 120.9569 },
  { code: "mandaluyong", name: "Mandaluyong", regionCode: "13", lat: 14.5794, lng: 121.0359 },
  { code: "marikina", name: "Marikina", regionCode: "13", lat: 14.6507, lng: 121.1029 },
  { code: "muntinlupa", name: "Muntinlupa", regionCode: "13", lat: 14.4081, lng: 121.0415 },
  { code: "navotas", name: "Navotas", regionCode: "13", lat: 14.6667, lng: 120.9417 },
  { code: "paranaque", name: "Parañaque", regionCode: "13", lat: 14.4793, lng: 121.0198 },
  { code: "pasay", name: "Pasay", regionCode: "13", lat: 14.5378, lng: 121.0014 },
  { code: "pasig", name: "Pasig", regionCode: "13", lat: 14.5764, lng: 121.0851 },
  { code: "pateros", name: "Pateros", regionCode: "13", lat: 14.5454, lng: 121.0687 },
  { code: "san-juan", name: "San Juan", regionCode: "13", lat: 14.6019, lng: 121.0355 },
  { code: "taguig", name: "Taguig", regionCode: "13", lat: 14.5176, lng: 121.0509 },
  { code: "valenzuela", name: "Valenzuela", regionCode: "13", lat: 14.7011, lng: 120.983 },
  // Region I
  { code: "laoag", name: "Laoag", regionCode: "01", lat: 18.1978, lng: 120.5936 },
  { code: "batac", name: "Batac", regionCode: "01" },
  { code: "vigan", name: "Vigan", regionCode: "01", lat: 17.5747, lng: 120.3869 },
  { code: "candon", name: "Candon", regionCode: "01" },
  { code: "san-fernando-lu", name: "San Fernando (La Union)", regionCode: "01", lat: 16.6159, lng: 120.3166 },
  { code: "dagupan", name: "Dagupan", regionCode: "01", lat: 16.0433, lng: 120.3333 },
  { code: "alaminos", name: "Alaminos", regionCode: "01" },
  { code: "san-carlos-pangasinan", name: "San Carlos (Pangasinan)", regionCode: "01" },
  { code: "urdaneta", name: "Urdaneta", regionCode: "01", lat: 15.9761, lng: 120.5711 },
  // Region II
  { code: "tuguegarao", name: "Tuguegarao", regionCode: "02", lat: 17.6132, lng: 121.7269 },
  { code: "cauayan", name: "Cauayan", regionCode: "02" },
  { code: "ilagan", name: "Ilagan", regionCode: "02" },
  { code: "santiago", name: "Santiago", regionCode: "02", lat: 16.6877, lng: 121.5487 },
  // Region III
  { code: "san-fernando-pampanga", name: "San Fernando (Pampanga)", regionCode: "03", lat: 15.0286, lng: 120.6898 },
  { code: "angeles", name: "Angeles", regionCode: "03", lat: 15.145, lng: 120.5887 },
  { code: "mabalacat", name: "Mabalacat", regionCode: "03" },
  { code: "olongapo", name: "Olongapo", regionCode: "03", lat: 14.8386, lng: 120.2842 },
  { code: "balanga", name: "Balanga", regionCode: "03" },
  { code: "malolos", name: "Malolos", regionCode: "03", lat: 14.8443, lng: 120.8114 },
  { code: "meycauayan", name: "Meycauayan", regionCode: "03" },
  { code: "san-jose-del-monte", name: "San Jose del Monte", regionCode: "03", lat: 14.8139, lng: 121.0453 },
  { code: "cabanatuan", name: "Cabanatuan", regionCode: "03", lat: 15.4865, lng: 120.9734 },
  { code: "gapan", name: "Gapan", regionCode: "03" },
  { code: "palayan", name: "Palayan", regionCode: "03" },
  { code: "munoz", name: "Science City of Muñoz", regionCode: "03" },
  { code: "tarlac-city", name: "Tarlac City", regionCode: "03", lat: 15.4755, lng: 120.5963 },
  // Region IV-A CALABARZON
  { code: "antipolo", name: "Antipolo", regionCode: "04", lat: 14.5865, lng: 121.1753 },
  { code: "bacoor", name: "Bacoor", regionCode: "04", lat: 14.4624, lng: 120.9645 },
  { code: "cavite-city", name: "Cavite City", regionCode: "04" },
  { code: "dasmarinas", name: "Dasmariñas", regionCode: "04", lat: 14.3294, lng: 120.9367 },
  { code: "general-trias", name: "General Trias", regionCode: "04", lat: 14.3869, lng: 120.8817 },
  { code: "imus", name: "Imus", regionCode: "04", lat: 14.4297, lng: 120.9367 },
  { code: "tagaytay", name: "Tagaytay", regionCode: "04", lat: 14.1153, lng: 120.9621 },
  { code: "trece-martires", name: "Trece Martires", regionCode: "04" },
  { code: "binan", name: "Biñan", regionCode: "04", lat: 14.3427, lng: 121.0807 },
  { code: "cabuyao", name: "Cabuyao", regionCode: "04" },
  { code: "calamba", name: "Calamba", regionCode: "04", lat: 14.2117, lng: 121.1653 },
  { code: "san-pablo", name: "San Pablo", regionCode: "04" },
  { code: "san-pedro", name: "San Pedro", regionCode: "04", lat: 14.3583, lng: 121.0561 },
  { code: "santa-rosa", name: "Santa Rosa", regionCode: "04", lat: 14.3122, lng: 121.1114 },
  { code: "tanauan", name: "Tanauan", regionCode: "04" },
  { code: "batangas-city", name: "Batangas City", regionCode: "04", lat: 13.7565, lng: 121.0583 },
  { code: "lipa", name: "Lipa", regionCode: "04", lat: 13.9411, lng: 121.1622 },
  { code: "lucena", name: "Lucena", regionCode: "04", lat: 13.9314, lng: 121.6172 },
  { code: "tayabas", name: "Tayabas", regionCode: "04" },
  // MIMAROPA
  { code: "calapan", name: "Calapan", regionCode: "17", lat: 13.4117, lng: 121.1803 },
  { code: "puerto-princesa", name: "Puerto Princesa", regionCode: "17", lat: 9.7392, lng: 118.7353 },
  // Region V
  { code: "legazpi", name: "Legazpi", regionCode: "05", lat: 13.1391, lng: 123.7438 },
  { code: "ligao", name: "Ligao", regionCode: "05" },
  { code: "tabaco", name: "Tabaco", regionCode: "05" },
  { code: "iriga", name: "Iriga", regionCode: "05" },
  { code: "naga", name: "Naga (Camarines Sur)", regionCode: "05", lat: 13.6218, lng: 123.1948 },
  { code: "masbate-city", name: "Masbate City", regionCode: "05" },
  { code: "sorsogon-city", name: "Sorsogon City", regionCode: "05" },
  // Region VI
  { code: "iloilo-city", name: "Iloilo City", regionCode: "06", lat: 10.7202, lng: 122.5621 },
  { code: "passi", name: "Passi", regionCode: "06" },
  { code: "roxas", name: "Roxas", regionCode: "06", lat: 11.5853, lng: 122.7511 },
  { code: "bacolod", name: "Bacolod", regionCode: "06", lat: 10.6765, lng: 122.9509 },
  { code: "bago", name: "Bago", regionCode: "06" },
  { code: "cadiz", name: "Cadiz", regionCode: "06" },
  { code: "himamaylan", name: "Himamaylan", regionCode: "06" },
  { code: "kabankalan", name: "Kabankalan", regionCode: "06" },
  { code: "sagay", name: "Sagay", regionCode: "06" },
  { code: "san-carlos-negros", name: "San Carlos (Negros Occ.)", regionCode: "06" },
  { code: "silay", name: "Silay", regionCode: "06" },
  { code: "talisay-negros", name: "Talisay (Negros Occ.)", regionCode: "06" },
  { code: "victorias", name: "Victorias", regionCode: "06" },
  // Region VII
  { code: "cebu-city", name: "Cebu City", regionCode: "07", lat: 10.3157, lng: 123.8854 },
  { code: "mandaue", name: "Mandaue", regionCode: "07", lat: 10.3236, lng: 123.9223 },
  { code: "lapu-lapu", name: "Lapu-Lapu", regionCode: "07", lat: 10.3103, lng: 123.9494 },
  { code: "talisay-cebu", name: "Talisay (Cebu)", regionCode: "07", lat: 10.2447, lng: 123.8494 },
  { code: "danao", name: "Danao", regionCode: "07" },
  { code: "toledo", name: "Toledo", regionCode: "07" },
  { code: "carcar", name: "Carcar", regionCode: "07" },
  { code: "naga-cebu", name: "Naga (Cebu)", regionCode: "07" },
  { code: "bogo", name: "Bogo", regionCode: "07" },
  { code: "dumaguete", name: "Dumaguete", regionCode: "07", lat: 9.3068, lng: 123.3054 },
  { code: "bais", name: "Bais", regionCode: "07" },
  { code: "bayawan", name: "Bayawan", regionCode: "07" },
  { code: "tanjay", name: "Tanjay", regionCode: "07" },
  { code: "tagbilaran", name: "Tagbilaran", regionCode: "07", lat: 9.6475, lng: 123.8556 },
  // Region VIII
  { code: "tacloban", name: "Tacloban", regionCode: "08", lat: 11.2447, lng: 125.0036 },
  { code: "ormoc", name: "Ormoc", regionCode: "08", lat: 11.0059, lng: 124.6075 },
  { code: "baybay", name: "Baybay", regionCode: "08" },
  { code: "maasin", name: "Maasin", regionCode: "08" },
  { code: "borongan", name: "Borongan", regionCode: "08" },
  { code: "catbalogan", name: "Catbalogan", regionCode: "08" },
  { code: "calbayog", name: "Calbayog", regionCode: "08" },
  // Region IX
  { code: "zamboanga-city", name: "Zamboanga City", regionCode: "09", lat: 6.9214, lng: 122.079 },
  { code: "pagadian", name: "Pagadian", regionCode: "09", lat: 7.8257, lng: 123.437 },
  { code: "dipolog", name: "Dipolog", regionCode: "09" },
  { code: "dapitan", name: "Dapitan", regionCode: "09" },
  { code: "isabela-city", name: "Isabela City (Basilan)", regionCode: "09" },
  // Region X
  { code: "cagayan-de-oro", name: "Cagayan de Oro", regionCode: "10", lat: 8.4542, lng: 124.6319 },
  { code: "el-salvador", name: "El Salvador", regionCode: "10" },
  { code: "gingoog", name: "Gingoog", regionCode: "10" },
  { code: "iligan", name: "Iligan", regionCode: "10", lat: 8.228, lng: 124.2452 },
  { code: "oroquieta", name: "Oroquieta", regionCode: "10" },
  { code: "ozamiz", name: "Ozamiz", regionCode: "10" },
  { code: "tangub", name: "Tangub", regionCode: "10" },
  { code: "malaybalay", name: "Malaybalay", regionCode: "10", lat: 8.1575, lng: 125.1278 },
  { code: "valencia", name: "Valencia", regionCode: "10" },
  // Region XI
  { code: "davao-city", name: "Davao City", regionCode: "11", lat: 7.1907, lng: 125.4553 },
  { code: "digos", name: "Digos", regionCode: "11", lat: 6.7497, lng: 125.3572 },
  { code: "tagum", name: "Tagum", regionCode: "11", lat: 7.4478, lng: 125.8078 },
  { code: "panabo", name: "Panabo", regionCode: "11" },
  { code: "samal", name: "Island Garden City of Samal", regionCode: "11" },
  { code: "mati", name: "Mati", regionCode: "11" },
  // Region XII
  { code: "koronadal", name: "Koronadal", regionCode: "12", lat: 6.5031, lng: 124.8469 },
  { code: "general-santos", name: "General Santos", regionCode: "12", lat: 6.1164, lng: 125.1716 },
  { code: "kidapawan", name: "Kidapawan", regionCode: "12", lat: 7.0083, lng: 125.0894 },
  { code: "tacurong", name: "Tacurong", regionCode: "12" },
  // Caraga
  { code: "butuan", name: "Butuan", regionCode: "16", lat: 8.9475, lng: 125.5406 },
  { code: "cabadbaran", name: "Cabadbaran", regionCode: "16" },
  { code: "bayugan", name: "Bayugan", regionCode: "16" },
  { code: "surigao-city", name: "Surigao City", regionCode: "16", lat: 9.7847, lng: 125.4888 },
  { code: "tandag", name: "Tandag", regionCode: "16" },
  { code: "bislig", name: "Bislig", regionCode: "16" },
  // CAR
  { code: "baguio", name: "Baguio", regionCode: "14", lat: 16.4023, lng: 120.596 },
  { code: "tabuk", name: "Tabuk", regionCode: "14" },
  // BARMM
  { code: "cotabato-city", name: "Cotabato City", regionCode: "19", lat: 7.2236, lng: 124.2464 },
  { code: "marawi", name: "Marawi", regionCode: "19" },
  { code: "lamitan", name: "Lamitan", regionCode: "19" },
];

const regionByCode = new Map(REGIONS.map((r) => [r.code, r]));
const cityByCode = new Map(CITIES.map((c) => [c.code, c]));

export const getRegion = (code: string) => regionByCode.get(code) ?? null;
export const getCity = (code: string) => cityByCode.get(code) ?? null;
export const citiesOfRegion = (regionCode: string) => CITIES.filter((c) => c.regionCode === regionCode);
export const isValidCityInRegion = (cityCode: string, regionCode: string) =>
  cityByCode.get(cityCode)?.regionCode === regionCode;

/** Haversine distance in km between two coordinates. */
export function distanceKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((aLat * Math.PI) / 180) * Math.cos((bLat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}
