// ⚠️ Replace this with your OAuth 2.0 Client ID from Google Cloud Console
//const CLIENT_ID = '136428508381-csh538be1b0pt8orc0840ig4sulda.apps.googleusercontent.com'
const CLIENT_ID = '123456789-abc.apps.googleusercontent.com'
const SCOPE     = 'https://www.googleapis.com/auth/calendar.events'

let tokenClient  = null
let accessToken  = null

function ensureInit() {
  if (tokenClient) return
  if (!window.google?.accounts?.oauth2) {
    throw new Error('Google sign-in library failed to load. Please refresh the page and try again.')
  }
  tokenClient = window.google.accounts.oauth2.initTokenClient({
    client_id: CLIENT_ID,
    scope:     SCOPE,
    callback:  () => {}, // overridden per call
  })
}

/**
 * Opens a Google OAuth popup, obtains an access token, then inserts the
 * event directly into the user's primary Google Calendar.
 */
export function addToGoogleCalendar(slot) {
  return new Promise((resolve, reject) => {
    try {
      ensureInit()
    } catch (err) {
      reject(err)
      return
    }

    tokenClient.callback = async response => {
      if (response.error) {
        reject(new Error(`Google sign-in failed: ${response.error}`))
        return
      }
      accessToken = response.access_token
      try {
        await insertCalendarEvent(slot)
        resolve()
      } catch (err) {
        reject(err)
      }
    }

    // Skip consent screen on repeat uses within the same session
    tokenClient.requestAccessToken({ prompt: accessToken ? '' : 'consent' })
  })
}

async function insertCalendarEvent(slot) {
  const start = new Date(slot.time)
  const end   = new Date(start.getTime() + 60 * 60 * 1000)

  const event = {
    summary:     'Lawn Mowing Session',
    description: `Temp: ${Math.round(slot.temp)}°F · Precipitation: ${slot.precipitation}mm`,
    start: { dateTime: start.toISOString() },
    end:   { dateTime: end.toISOString() },
  }

  const res = await fetch(
    'https://www.googleapis.com/calendar/v3/calendars/primary/events',
    {
      method:  'POST',
      headers: {
        Authorization:  `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(event),
    }
  )

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error?.message ?? `Calendar API error (HTTP ${res.status})`)
  }
}