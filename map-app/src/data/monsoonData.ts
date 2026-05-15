const monsoonData = [
  // STRONG POSITIVE
  { name: "Sahel (Mali/Niger)", lat: 15, lon: 0, value: 0.72, radius: 450 },
  { name: "Ethiopia Highlands", lat: 10, lon: 40, value: 0.67, radius: 400 },
  { name: "Sudan Belt", lat: 12, lon: 30, value: 0.62, radius: 500 },
  { name: "Southeast Asia (Thailand)", lat: 15, lon: 100, value: 0.72, radius: 600 },
  { name: "Myanmar", lat: 20, lon: 96, value: 0.68, radius: 550 },
  { name: "Vietnam", lat: 16, lon: 106, value: 0.65, radius: 480 },
  { name: "Southern China (Yunnan)", lat: 23, lon: 102, value: 0.60, radius: 520 },

  // MODERATE POSITIVE
  { name: "West Africa Coast (Ghana)", lat: 6, lon: -1, value: 0.55, radius: 350 },
  { name: "Central Africa (Cameroon)", lat: 5, lon: 12, value: 0.47, radius: 420 },
  { name: "Bangladesh", lat: 24, lon: 90, value: 0.80, radius: 300 },
  { name: "Nepal", lat: 28, lon: 84, value: 0.75, radius: 320 },

  // STRONG NEGATIVE
  { name: "Southern Africa (Botswana)", lat: -22, lon: 24, value: -0.50, radius: 650 },
  { name: "Mozambique", lat: -18, lon: 35, value: -0.45, radius: 580 },
  { name: "Tanzania (South)", lat: -10, lon: 35, value: -0.42, radius: 450 },

  // MODERATE NEGATIVE
  { name: "Mediterranean (Spain)", lat: 40, lon: -4, value: -0.50, radius: 700 },
  { name: "Turkey", lat: 39, lon: 35, value: -0.45, radius: 620 },
  { name: "California", lat: 36, lon: -120, value: -0.45, radius: 750 },

  // NEUTRAL
  { name: "Congo Basin", lat: 0, lon: 20, value: 0.0, radius: 800 },
  { name: "Amazon Core", lat: -5, lon: -60, value: 0.0, radius: 900 },
  { name: "Arabian Desert", lat: 25, lon: 45, value: 0.0, radius: 600 },

  // RUSSIA & HIGH LATITUDES (Teleconnections via Siberian Snow/Highs)
  { name: "Yamal Peninsula (Arctic Russia)", lat: 70, lon: 72, value: -0.65, radius: 850 },
  { name: "Yakutsk (East Siberia)", lat: 62, lon: 129, value: -0.45, radius: 750 },
  { name: "Urals (Yekaterinburg)", lat: 56, lon: 60, value: -0.40, radius: 650 },
  { name: "Caucasus (Black Sea Region)", lat: 43, lon: 39, value: 0.45, radius: 450 },
  { name: "Moscow (Western Russia)", lat: 55, lon: 37, value: -0.35, radius: 600 },
  { name: "Kamchatka Peninsula", lat: 53, lon: 158, value: 0.15, radius: 550 },

  // GLOBAL WALKER & PACIFIC NODES
  { name: "Darwin (Northern Australia)", lat: -12, lon: 130, value: 0.82, radius: 600 },
  { name: "Peru Coast (ENSO Core)", lat: -9, lon: -79, value: -0.78, radius: 700 },
  { name: "East Asian Monsoon (South Korea)", lat: 36, lon: 128, value: 0.55, radius: 450 },
  { name: "Madagascar (Mascarene High)", lat: -20, lon: 47, value: 0.45, radius: 500 },
  { name: "Iceland (North Atlantic)", lat: 65, lon: -18, value: -0.30, radius: 600 }
];

export default monsoonData;
