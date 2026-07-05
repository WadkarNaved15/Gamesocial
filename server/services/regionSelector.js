// services/regionSelector.js

export function selectRegion(userSession) {
  const country = userSession?.geo?.countryCode;

  const southAsia = [
    "IN","PK","BD","LK","NP","BT"
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

  console.warn(
    "[Region] Unknown country:",
    country
);

  return "us-east-1";
}