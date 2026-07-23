// services/regionSelector.js

const REGIONS = [
  {
    id: "ap-south-1",
    // Mumbai
    lat: 19.0760,
    lon: 72.8777,
  },
  {
    id: "ap-southeast-1",
    // Singapore
    lat: 1.3521,
    lon: 103.8198,
  },
  {
    id: "eu-central-1",
    // Frankfurt
    lat: 50.1109,
    lon: 8.6821,
  },
  {
    id: "us-east-1",
    // Northern Virginia
    lat: 38.9517,
    lon: -77.1467,
  },
];

function toRadians(degrees) {
  return (degrees * Math.PI) / 180;
}

function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;

  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) ** 2;

  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function selectRegionByCountry(country) {
  if (!country) return "us-east-1";

  const southAsia = [
    "IN",
    "PK",
    "BD",
    "LK",
    "NP",
    "BT",
  ];

  if (southAsia.includes(country))
    return "ap-south-1";

  const europe = [
    "DE","FR","GB","IT","ES","NL","BE",
    "PL","CH","AT","SE","NO","DK","FI",
    "IE","PT","CZ","HU","GR","RO","BG",
    "HR","SI","SK","RS","UA"
  ];

  if (europe.includes(country))
    return "eu-central-1";

  const asiaPacific = [
    "SG","MY","TH","ID","VN",
    "PH","JP","KR","TW",
    "AU","NZ","HK"
  ];

  if (asiaPacific.includes(country))
    return "ap-southeast-1";

  const middleEast = [
    "AE","SA","OM","QA",
    "KW","BH","IL"
  ];

  if (middleEast.includes(country))
    return "ap-south-1";

  const northAmerica = [
    "US","CA","MX"
  ];

  if (northAmerica.includes(country))
    return "us-east-1";

  console.warn("[Region] Unknown country:", country);

  return "us-east-1";
}

export function selectRegion(userSession) {
  const lat = userSession?.geo?.latitude;
  const lon = userSession?.geo?.longitude;
  const country = userSession?.geo?.countryCode;

  // Primary: latitude/longitude
  if (
    typeof lat === "number" &&
    typeof lon === "number"
  ) {
    let closest = REGIONS[0];
    let shortestDistance = Number.MAX_VALUE;

    for (const region of REGIONS) {
      const distance = haversineDistance(
        lat,
        lon,
        region.lat,
        region.lon
      );

      if (distance < shortestDistance) {
        shortestDistance = distance;
        closest = region;
      }
    }

    console.log(
      `[Region] Using coordinates (${lat}, ${lon}) -> ${closest.id} (${Math.round(shortestDistance)} km)`
    );

    return closest.id;
  }

  // Fallback: country mapping
  console.warn(
    "[Region] Missing coordinates. Falling back to country code:",
    country
  );

  return selectRegionByCountry(country);
}