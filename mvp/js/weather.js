// weather.js — echtes wetter über Open-Meteo (kostenlos, ohne api-key).
// wird 1 h zwischengespeichert. ohne netz/ort: null — der planer läuft dann
// einfach ohne wetter-regel weiter.

const CACHE_KEY = "mp2-weather-cache";

export async function geocode(place) {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(place)}&count=1&language=de&format=json`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("ort nicht gefunden");
  const data = await res.json();
  const r = data.results?.[0];
  if (!r) throw new Error("ort nicht gefunden");
  return { place: r.name, lat: r.latitude, lon: r.longitude };
}

/**
 * liefert { byDate: { "YYYY-MM-DD": { hours: { 9: {temp, rain, code} }, summary } } } oder null
 */
export async function getWeather(cfg) {
  if (!cfg?.enabled || cfg.lat == null) return null;
  try {
    const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || "null");
    if (cached && cached.lat === cfg.lat && cached.lon === cfg.lon && Date.now() - cached.at < 3600000) return cached.data;
  } catch {}
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${cfg.lat}&longitude=${cfg.lon}&hourly=temperature_2m,precipitation_probability,weather_code&timezone=auto&forecast_days=3`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const raw = await res.json();
    const byDate = {};
    raw.hourly.time.forEach((t, i) => {
      const [date, hm] = t.split("T");
      const h = Number(hm.slice(0, 2));
      byDate[date] = byDate[date] || { hours: {} };
      byDate[date].hours[h] = { temp: Math.round(raw.hourly.temperature_2m[i]), rain: raw.hourly.precipitation_probability[i] ?? 0, code: raw.hourly.weather_code[i] };
    });
    for (const d of Object.values(byDate)) {
      const day = Object.entries(d.hours).filter(([h]) => h >= 8 && h <= 20).map(([, v]) => v);
      const max = Math.max(...day.map((v) => v.temp));
      const rainy = day.filter((v) => v.rain >= 50).length;
      const midday = d.hours[13] || day[0];
      d.summary = { max, rainyHours: rainy, icon: iconFor(midday?.code, midday?.rain), text: textFor(midday?.code) };
    }
    const data = { byDate };
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({ lat: cfg.lat, lon: cfg.lon, at: Date.now(), data }));
    } catch {}
    return data;
  } catch {
    return null;
  }
}

/** trocken & nicht zu kalt → draußen-tauglich */
export function isOutdoorHour(day, hour) {
  const h = day?.hours?.[hour];
  if (!h) return null;
  return h.rain < 35 && h.temp >= 5 && ![61, 63, 65, 71, 73, 75, 80, 81, 82, 95, 96, 99].includes(h.code);
}

export function iconFor(code, rain = 0) {
  if (code == null) return "·";
  if (code >= 95) return "⛈️";
  if (code >= 71 && code <= 77) return "🌨️";
  if (code >= 51 || rain >= 60) return "🌧️";
  if (code >= 45) return "🌫️";
  if (code >= 2) return "⛅";
  return "☀️";
}

function textFor(code) {
  if (code == null) return "";
  if (code >= 95) return "gewitter";
  if (code >= 71 && code <= 77) return "schnee";
  if (code >= 51) return "regen";
  if (code >= 45) return "nebel";
  if (code >= 2) return "bewölkt";
  return "sonnig";
}
