/**
 * Open-Meteo current weather — free, no API key required.
 * https://open-meteo.com/en/docs
 * @param {number} lat @param {number} lng
 * @returns {Promise<{ windSpeedMph: number, windDirectionDeg: number, temperatureF: number } | null>}
 */
export async function fetchWeather(lat, lng) {
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lng),
    current_weather: "true",
    windspeed_unit: "mph",
    temperature_unit: "fahrenheit",
  });

  try {
    const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
    if (!res.ok) return null;

    const body = await res.json();
    const current = body.current_weather;
    if (!current) return null;

    return {
      windSpeedMph: current.windspeed,
      windDirectionDeg: current.winddirection,
      temperatureF: current.temperature,
    };
  } catch {
    return null;
  }
}

const DIRECTIONS = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];

/** @param {number} deg */
export function windDirectionCompass(deg) {
  return DIRECTIONS[Math.round(deg / 22.5) % 16];
}
