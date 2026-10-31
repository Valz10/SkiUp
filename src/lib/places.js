const geocodingBase = "https://nominatim.openstreetmap.org/search";
const overpassEndpoints = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
];

async function fetchWithTimeout(url, options, timeoutMs) {
  const controller = new AbortController();
  const parentSignal = options.signal;
  let timedOut = false;
  const timer = window.setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);
  const forwardAbort = () => controller.abort();
  parentSignal?.addEventListener("abort", forwardAbort, { once: true });
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch (error) {
    if (timedOut) throw new Error(`The location service did not respond within ${Math.round(timeoutMs / 1000)} seconds.`);
    throw error;
  } finally {
    window.clearTimeout(timer);
    parentSignal?.removeEventListener("abort", forwardAbort);
  }
}

export async function searchPlaces(query, signal) {
  const search = query.trim();
  if (search.length < 3) return [];
  const url = new URL(geocodingBase);
  url.search = new URLSearchParams({
    q: search,
    format: "jsonv2",
    addressdetails: "1",
    limit: "5",
  }).toString();
  const response = await fetchWithTimeout(url, {
    headers: { "Accept-Language": navigator.language || "en" },
    signal,
  }, 10000);
  if (!response.ok) throw new Error(`Location search failed (${response.status}).`);
  const places = await response.json();
  return places.map((place) => ({
    label: place.name && place.name !== place.display_name
      ? `${place.name}, ${place.display_name.split(", ").slice(-2).join(", ")}`
      : place.display_name,
    latitude: Number(place.lat),
    longitude: Number(place.lon),
    type: place.type || place.class || "place",
  }));
}

export async function resolvePlace(query, signal) {
  const places = await searchPlaces(query, signal);
  return places[0] || null;
}

function distanceKm(fromLat, fromLon, toLat, toLon) {
  const radians = (degrees) => degrees * Math.PI / 180;
  const latDelta = radians(toLat - fromLat);
  const lonDelta = radians(toLon - fromLon);
  const a = Math.sin(latDelta / 2) ** 2
    + Math.cos(radians(fromLat)) * Math.cos(radians(toLat)) * Math.sin(lonDelta / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export async function findNearbyMountains(latitude, longitude, signal) {
  const query = `[out:json][timeout:12];(nwr(around:80000,${latitude},${longitude})["leisure"="ski_resort"];nwr(around:80000,${latitude},${longitude})["sport"="skiing"]["name"];nwr(around:80000,${latitude},${longitude})["landuse"="winter_sports"]["name"];);out center tags;`;
  let data;
  let lastError;
  for (const endpoint of overpassEndpoints) {
    try {
      const response = await fetchWithTimeout(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
        body: new URLSearchParams({ data: query }),
        signal,
      }, 6000);
      if (!response.ok) throw new Error(`OpenStreetMap mountain search failed (${response.status}).`);
      data = await response.json();
      break;
    } catch (error) {
      if (error.name === "AbortError") throw error;
      lastError = error;
    }
  }
  if (!data) throw new Error(lastError?.message || "OpenStreetMap mountain search is unavailable.");
  const mountains = new Map();
  for (const element of data.elements || []) {
    const lat = element.lat ?? element.center?.lat;
    const lon = element.lon ?? element.center?.lon;
    const name = element.tags?.name;
    if (!name || !Number.isFinite(lat) || !Number.isFinite(lon)) continue;
    const key = name.toLocaleLowerCase();
    const mountain = {
      id: `${element.type}-${element.id}`,
      name,
      latitude: lat,
      longitude: lon,
      distanceKm: distanceKm(latitude, longitude, lat, lon),
      website: element.tags?.website || element.tags?.["contact:website"] || "",
      region: element.tags?.["addr:city"] || element.tags?.["addr:town"] || "",
    };
    if (!mountains.has(key) || mountain.distanceKm < mountains.get(key).distanceKm) {
      mountains.set(key, mountain);
    }
  }
  return [...mountains.values()].sort((a, b) => a.distanceKm - b.distanceKm).slice(0, 5);
}

export async function getMountainForecast(latitude, longitude, signal) {
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.search = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    current: "temperature_2m,apparent_temperature,snowfall,snow_depth,weather_code,wind_speed_10m",
    daily: "snowfall_sum,temperature_2m_min,temperature_2m_max",
    forecast_days: "1",
    temperature_unit: "celsius",
    wind_speed_unit: "kmh",
    precipitation_unit: "mm",
    timezone: "auto",
  }).toString();
  const response = await fetchWithTimeout(url, { signal }, 10000);
  if (!response.ok) throw new Error(`Weather forecast unavailable (${response.status}).`);
  return response.json();
}

export function describeWeatherCode(code) {
  if (code === 0) return "Clear";
  if ([1, 2, 3].includes(code)) return "Partly cloudy";
  if ([45, 48].includes(code)) return "Fog";
  if ([51, 53, 55, 56, 57].includes(code)) return "Drizzle";
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return "Rain or showers";
  if ([71, 73, 75, 77, 85, 86].includes(code)) return "Snow or snow showers";
  if ([95, 96, 99].includes(code)) return "Thunderstorms";
  return "Conditions unavailable";
}
