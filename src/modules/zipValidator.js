/**
 * Validates a 5-digit US ZIP code against the Zippopotam.us API.
 * Returns { city, state, lat, lon } or throws with a user-friendly message.
 */
export async function validateZip(zip) {
  if (!/^\d{5}$/.test(zip)) {
    throw new Error('Please enter a valid 5-digit ZIP code.')
  }
  let res
  try {
    res = await fetch(`https://api.zippopotam.us/us/${zip}`)
  } catch {
    throw new Error('Network error — please check your connection and try again.')
  }
  if (res.status === 404) {
    throw new Error('ZIP code not found. Please double-check and try again.')
  }
  if (!res.ok) {
    throw new Error(`ZIP lookup failed (HTTP ${res.status}). Please try again.`)
  }
  const data = await res.json()
  const place = data.places[0]
  return {
    city: place['place name'],
    state: place['state abbreviation'],
    lat: parseFloat(place.latitude),
    lon: parseFloat(place.longitude),
  }
}