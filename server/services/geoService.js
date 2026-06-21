import maxmind from "maxmind";
import path from "path";

let cityLookup;
let asnLookup;

export async function initGeoService() {
  const isProduction = process.env.NODE_ENV === "production";

  const cityDbPath = isProduction
    ? "/home/ubuntu/Rigzer/server/data/GeoLite2-City.mmdb"
    : path.resolve("data/GeoLite2-City.mmdb");

  const asnDbPath = isProduction
    ? "/home/ubuntu/Rigzer/server/data/GeoLite2-ASN.mmdb"
    : path.resolve("data/GeoLite2-ASN.mmdb");

  cityLookup = await maxmind.open(cityDbPath);
  asnLookup = await maxmind.open(asnDbPath);

  console.log("✅ GeoIP databases loaded");

}

export function getGeoData(ip) {
  return cityLookup?.get(ip);
}

export function getASNData(ip) {
  return asnLookup?.get(ip);
}