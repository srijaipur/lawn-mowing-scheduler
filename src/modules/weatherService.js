/**
 * Fetches a 7-day hourly forecast from Open-Meteo (free, no API key).
 * In dev: routes through Vite proxy to avoid Codespace CORS restrictions.
 * In production (GitHub Pages): calls Open-Meteo directly (CORS is supported).
 */
export async function fetchWeather(lat, lon) {
  const base = import.meta.env.DEV
    ? '/api/weather'
    : 'https://api.open-meteo.com/v1/forecast'

  const url =
    `${base}` +
    `?latitude=${encodeURIComponent(lat)}` +
    `&longitude=${encodeURIComponent(lon)}` +
    `&hourly=temperature_2m,precipitation,weathercode` +
    `&temperature_unit=fahrenheit` +
    `&forecast_days=7` +
    `&timezone=auto`

  let res
  try {
    res = await fetch(url)
  } catch (err) {
    console.error('[weatherService] fetch threw:', err)
    throw new Error(`Network error fetching weather: ${err.message}`)
  }

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    console.error('[weatherService] HTTP error:', res.status, body)
    throw new Error(`Weather service returned HTTP ${res.status}. Please try again.`)
  }

  return res.json()
}