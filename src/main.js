import './style.css'
import { validateZip } from './modules/zipValidator.js'
import { fetchWeather } from './modules/weatherService.js'
import { computeSlots } from './modules/scheduler.js'
import { savePreferences, loadPreferences } from './modules/preferences.js'
import { downloadICS } from './modules/calendarExport.js'
import { addToGoogleCalendar } from './modules/googleCalendar.js'

// ── State ────────────────────────────────────────────────────────────────────
const state = {
  lat: null, lon: null, city: '',
  lastMowDate: null,
  preferences: null,
  slots: [],
  selectedSlot: null,
}

// ── DOM helpers ──────────────────────────────────────────────────────────────
const $ = id => document.getElementById(id)
const show = el => el.classList.remove('hidden')
const hide = el => el.classList.add('hidden')

function setStep(n) {
  document.querySelectorAll('.step').forEach(s => s.classList.add('hidden'))
  show($(`step${n}`))
  $('stepCounter').textContent = `Step ${n} of 5`
  $('progressFill').style.width = `${((n - 1) / 4) * 100}%`
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

// ── Step 1: ZIP ──────────────────────────────────────────────────────────────
$('validateZipBtn').addEventListener('click', async () => {
  const btn = $('validateZipBtn')
  $('zipError').textContent = ''
  $('locationResult').textContent = ''
  btn.disabled = true
  btn.textContent = 'Checking…'
  try {
    const result = await validateZip($('zipInput').value.trim())
    state.lat = result.lat
    state.lon = result.lon
    state.city = `${result.city}, ${result.state}`
    $('locationResult').textContent = `📍 ${state.city}`
    setTimeout(() => setStep(2), 700)
  } catch (err) {
    $('zipError').textContent = err.message
  } finally {
    btn.disabled = false
    btn.textContent = 'Validate ZIP →'
  }
})

$('zipInput').addEventListener('keydown', e => { if (e.key === 'Enter') $('validateZipBtn').click() })

// ── Step 2: Last Mow Date ────────────────────────────────────────────────────
$('lastMowDate').max = new Date().toISOString().split('T')[0]

$('backToStep1').addEventListener('click', () => setStep(1))

$('goToStep3').addEventListener('click', () => {
  state.lastMowDate = $('lastMowDate').value || null
  restorePreferences()
  setStep(3)
})

// ── Step 3: Preferences ──────────────────────────────────────────────────────
$('dryHours').addEventListener('input', () => {
  $('dryHoursVal').textContent = $('dryHours').value
})

function restorePreferences() {
  const prefs = loadPreferences()
  if (!prefs) return
  document.querySelectorAll('#dayPicker input[type=checkbox]').forEach(cb => {
    cb.checked = prefs.days?.includes(parseInt(cb.value))
  })
  if (prefs.timeOfDay) $('timeOfDay').value = prefs.timeOfDay
  if (prefs.dryHours !== undefined) {
    $('dryHours').value = prefs.dryHours
    $('dryHoursVal').textContent = prefs.dryHours
  }
}

$('backToStep2').addEventListener('click', () => setStep(2))

$('findSlotsBtn').addEventListener('click', async () => {
  const days = [...document.querySelectorAll('#dayPicker input[type=checkbox]:checked')]
    .map(cb => parseInt(cb.value))
  state.preferences = {
    days,
    timeOfDay: $('timeOfDay').value,
    dryHours: parseInt($('dryHours').value),
  }
  savePreferences(state.preferences)
  setStep(4)
  await fetchAndCompute()
})

// ── Step 4: Fetch + Compute ──────────────────────────────────────────────────
async function fetchAndCompute() {
  try {
    const weather = await fetchWeather(state.lat, state.lon)
    state.slots = computeSlots(weather, state.preferences, state.lastMowDate)
    $('cityDisplay').textContent = state.city
    renderSlots()
    setStep(5)
  } catch (err) {
    $('cityDisplay').textContent = state.city
    $('slotsError').textContent = `Could not load weather: ${err.message}`
    setStep(5)
  }
}

// ── Step 5: Render Slots ─────────────────────────────────────────────────────
const DAY_NAMES = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']
const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function renderSlots() {
  const list = $('slotsList')
  list.innerHTML = ''
  if (!state.slots.length) {
    list.innerHTML = '<p class="no-slots">No suitable slots found. Try broadening your day/time preferences.</p>'
    return
  }
  state.slots.forEach((slot, i) => {
    const dt = slot.time
    const dayName = DAY_NAMES[dt.getDay()]
    const dateStr = `${MONTH_NAMES[dt.getMonth()]} ${dt.getDate()}`
    const timeStr = dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    const rainStr = slot.precipitation === 0 ? '☀️ No rain' : `🌧 ${slot.precipitation}mm rain`
    const tempStr = `${Math.round(slot.temp)}°F`

    const card = document.createElement('div')
    card.className = 'slot-card'
    card.innerHTML = `
      <div class="slot-rank">#${i + 1}</div>
      <div class="slot-info">
        <div class="slot-datetime">${dayName}, ${dateStr} at ${timeStr}</div>
        <div class="slot-weather">${rainStr} · ${tempStr}</div>
      </div>
      <button class="btn btn-primary slot-btn" data-index="${i}">Schedule</button>
    `
    list.appendChild(card)
  })
  list.querySelectorAll('.slot-btn').forEach(btn => {
    btn.addEventListener('click', () => openExportModal(state.slots[parseInt(btn.dataset.index)]))
  })
}

$('backToStep3').addEventListener('click', () => setStep(3))

// ── Export Modal ─────────────────────────────────────────────────────────────
function openExportModal(slot) {
  state.selectedSlot = slot
  $('modalSlotTime').textContent = slot.time.toLocaleString([], {
    weekday: 'long', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
  $('modalStatus').textContent = ''
  $('modalStatus').className = 'modal-status'
  show($('exportModal'))
}

$('closeModalBtn').addEventListener('click', () => hide($('exportModal')))
$('exportModal').addEventListener('click', e => { if (e.target === $('exportModal')) hide($('exportModal')) })

$('downloadICSBtn').addEventListener('click', () => {
  downloadICS(state.selectedSlot)
  $('modalStatus').textContent = '✅ .ics file downloaded — open it to import into any calendar app.'
  $('modalStatus').className = 'modal-status success'
})

$('addToGoogleBtn').addEventListener('click', async () => {
  const btn = $('addToGoogleBtn')
  btn.disabled = true
  $('modalStatus').textContent = 'Opening Google sign-in…'
  $('modalStatus').className = 'modal-status'
  try {
    await addToGoogleCalendar(state.selectedSlot)
    $('modalStatus').textContent = '✅ Event added to your Google Calendar!'
    $('modalStatus').className = 'modal-status success'
  } catch (err) {
    $('modalStatus').textContent = `❌ ${err.message}`
    $('modalStatus').className = 'modal-status error'
  } finally {
    btn.disabled = false
  }
})

// ── Init ─────────────────────────────────────────────────────────────────────
setStep(1)