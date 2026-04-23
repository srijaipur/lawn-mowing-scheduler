/**
 * Scores every candidate hour in the 7-day forecast and returns the
 * top 3 distinct-day slots ranked best to worst.
 */
const TIME_WINDOWS = {
  morning:   { start: 7,  end: 11 },
  afternoon: { start: 12, end: 16 },
  evening:   { start: 17, end: 20 },
}

/**
 * Parses an Open-Meteo time string like "2026-04-23T07:00"
 * as a LOCAL Date object (avoids UTC-parse ambiguity).
 */
function parseLocalTime(str) {
  const [date, time] = str.split('T')
  const [y, mo, d]   = date.split('-').map(Number)
  const [h, mi]      = time.split(':').map(Number)
  return new Date(y, mo - 1, d, h, mi)
}

export function computeSlots(weather, prefs, lastMowDate) {
  const { time, temperature_2m, precipitation } = weather.hourly
  const window      = TIME_WINDOWS[prefs.timeOfDay] ?? TIME_WINDOWS.morning
  const prefDays    = prefs.days ?? []           // empty = any day
  const dryHours    = prefs.dryHours ?? 12
  const now         = new Date()
  const daysSinceLastMow = lastMowDate
    ? (now - new Date(lastMowDate)) / 86_400_000
    : 0

  const candidates = []

  time.forEach((str, i) => {
    const dt   = parseLocalTime(str)
    const hour = dt.getHours()
    const dow  = dt.getDay()

    // Skip past hours and hours outside the preferred window
    if (dt <= now)                             return
    if (hour < window.start || hour > window.end) return
    if (prefDays.length && !prefDays.includes(dow)) return

    let score = 0

    // No rain during the slot hour: +30
    if (precipitation[i] === 0) score += 30

    // Dry lawn — no rain in preceding dryHours: +20
    let priorRain = false
    for (let j = Math.max(0, i - dryHours); j < i; j++) {
      if (precipitation[j] > 0) { priorRain = true; break }
    }
    if (!priorRain) score += 20

    // Won't get rained on mid-mow — no rain 3h after: +10
    let postRain = false
    for (let j = i + 1; j <= Math.min(time.length - 1, i + 3); j++) {
      if (precipitation[j] > 0) { postRain = true; break }
    }
    if (!postRain) score += 10

    // Comfortable temperature 50–90°F: +10
    const temp = temperature_2m[i]
    if (temp >= 50 && temp <= 90) score += 10

    // Overdue bonus — up to +10
    score += Math.min(10, Math.floor(daysSinceLastMow))

    candidates.push({ time: dt, temp, precipitation: precipitation[i], score })
  })

  candidates.sort((a, b) => b.score - a.score)

  // Pick top 3 from different days
  const usedDays = new Set()
  const top3 = []
  for (const c of candidates) {
    const key = c.time.toDateString()
    if (!usedDays.has(key)) {
      usedDays.add(key)
      top3.push(c)
      if (top3.length === 3) break
    }
  }
  return top3
}