/**
 * Generates a standards-compliant .ics file and triggers a browser download.
 * No external library needed — ICS is plain text.
 */
function pad(n) {
  return String(n).padStart(2, '0')
}

function toICSDate(date) {
  return (
    `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}` +
    `T${pad(date.getHours())}${pad(date.getMinutes())}00`
  )
}

export function downloadICS(slot) {
  const start = new Date(slot.time)
  const end   = new Date(start.getTime() + 60 * 60 * 1000) // 1 hour session

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Lawn Mowing Scheduler//EN',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `DTSTART:${toICSDate(start)}`,
    `DTEND:${toICSDate(end)}`,
    'SUMMARY:Lawn Mowing Session',
    `DESCRIPTION:Temp: ${Math.round(slot.temp)}°F · Precipitation: ${slot.precipitation}mm`,
    'END:VEVENT',
    'END:VCALENDAR',
  ]

  const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' })
  const url  = URL.createObjectURL(blob)
  const a    = Object.assign(document.createElement('a'), { href: url, download: 'lawn-mowing.ics' })
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}