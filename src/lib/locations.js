// Approximate city-center coordinates for Contra Costa County locations —
// all 19 incorporated cities in the county. Good enough for "nearest
// sensor" queries; swap in a specific school's coordinates later if you
// want per-campus accuracy.
export const LOCATIONS = [
  { id: "antioch", name: "Antioch", lat: 38.0049, lng: -121.8058 },
  { id: "brentwood", name: "Brentwood", lat: 37.9319, lng: -121.6958 },
  { id: "clayton", name: "Clayton", lat: 37.9405, lng: -121.9358 },
  { id: "concord", name: "Concord", lat: 37.978, lng: -122.0311 },
  { id: "danville", name: "Danville", lat: 37.8216, lng: -121.9999 },
  { id: "el-cerrito", name: "El Cerrito", lat: 37.9161, lng: -122.3108 },
  { id: "hercules", name: "Hercules", lat: 38.0171, lng: -122.2886 },
  { id: "lafayette", name: "Lafayette", lat: 37.8858, lng: -122.1181 },
  { id: "martinez", name: "Martinez", lat: 38.0194, lng: -122.1341 },
  { id: "moraga", name: "Moraga", lat: 37.8349, lng: -122.1297 },
  { id: "oakley", name: "Oakley", lat: 37.9974, lng: -121.7124 },
  { id: "orinda", name: "Orinda", lat: 37.8771, lng: -122.1797 },
  { id: "pinole", name: "Pinole", lat: 38.0044, lng: -122.2989 },
  { id: "pittsburg", name: "Pittsburg", lat: 38.028, lng: -121.8847 },
  { id: "pleasant-hill", name: "Pleasant Hill", lat: 37.948, lng: -122.0602 },
  { id: "richmond", name: "Richmond", lat: 37.9358, lng: -122.3477 },
  { id: "san-pablo", name: "San Pablo", lat: 37.9622, lng: -122.3455 },
  { id: "san-ramon", name: "San Ramon", lat: 37.7799, lng: -121.978 },
  { id: "walnut-creek", name: "Walnut Creek", lat: 37.9101, lng: -122.0652 },
];
