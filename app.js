/**
 * WhatTime • Simplified Dual Timezone Interactive Clock
 * - Search bar with typing-activated dropdown (doesn't open on click; opens when typing 'pst', 'ust', etc.)
 * - Bidirectional synchronized time/date adjustments (change Indian time -> top time changes, and vice-versa)
 * - Tappable Time and Date displays
 * - Apple Watch Crown Audio Feedback
 */

// =====================================================================
// GLOBAL APPLICATION STATE
// =====================================================================
const state = {
  // Timezones
  topTz: 'America/Los_Angeles', // Default Top: US Pacific Time (PST/PDT)
  indianTz: 'Asia/Kolkata',     // Bottom: Indian Standard Time (IST)

  // Simulated Time: Unix timestamp in ms
  simulatedTimestamp: Date.now(),
  isLiveTicking: true,

  // Modal Editing Target: 'top' or 'indian'
  activeModalTarget: 'indian',

  // Temp values during time picker editing
  modalHour: 10,
  modalMin: 15,
  modalPeriod: 'pm',

  // Calendar State
  calYear: new Date().getFullYear(),
  calMonth: new Date().getMonth(),

  // Audio & Aesthetic Preferences
  soundEnabled: true,
  fontMode: 'sketch', // 'sketch' or 'modern'
};

// =====================================================================
// EXTENSIVE TIMEZONE ENGINE & ALIASES
// =====================================================================
const POPULAR_ZONES = [
  {
    city: 'San Francisco / Los Angeles',
    name: 'Pacific Time (PST / PDT)',
    tz: 'America/Los_Angeles',
    abbr: 'PST',
    aliases: ['pst', 'pdt', 'pt', 'pacific', 'los angeles', 'san francisco', 'sf', 'la', 'seattle', 'california', 'ust', 'us']
  },
  {
    city: 'UTC / Universal Time',
    name: 'UTC • Universal Coordinated Time',
    tz: 'UTC',
    abbr: 'UTC',
    aliases: ['utc', 'ust', 'gmt', 'universal', 'zulu', 'world']
  },
  {
    city: 'New York / Washington DC',
    name: 'Eastern Time (EST / EDT)',
    tz: 'America/New_York',
    abbr: 'EST',
    aliases: ['est', 'edt', 'et', 'eastern', 'new york', 'nyc', 'ny', 'washington', 'boston', 'miami', 'ust', 'us']
  },
  {
    city: 'Chicago / Dallas',
    name: 'Central Time (CST / CDT)',
    tz: 'America/Chicago',
    abbr: 'CST',
    aliases: ['cst', 'cdt', 'ct', 'central', 'chicago', 'dallas', 'texas', 'austin', 'ust', 'us']
  },
  {
    city: 'Denver / Phoenix',
    name: 'Mountain Time (MST / MDT)',
    tz: 'America/Denver',
    abbr: 'MST',
    aliases: ['mst', 'mdt', 'mt', 'mountain', 'denver', 'phoenix', 'arizona', 'colorado', 'ust', 'us']
  },
  {
    city: 'London / Dublin',
    name: 'Greenwich Mean Time (GMT / BST)',
    tz: 'Europe/London',
    abbr: 'GMT',
    aliases: ['gmt', 'bst', 'london', 'uk', 'england', 'britain', 'dublin', 'ireland']
  },
  {
    city: 'Paris / Berlin / Rome',
    name: 'Central European Time (CET / CEST)',
    tz: 'Europe/Paris',
    abbr: 'CET',
    aliases: ['cet', 'cest', 'paris', 'france', 'berlin', 'germany', 'rome', 'italy', 'madrid', 'spain', 'amsterdam']
  },
  {
    city: 'Dubai / Abu Dhabi',
    name: 'Gulf Standard Time (GST)',
    tz: 'Asia/Dubai',
    abbr: 'GST',
    aliases: ['gst', 'dubai', 'uae', 'abu dhabi', 'gulf']
  },
  {
    city: 'Singapore',
    name: 'Singapore Time (SGT)',
    tz: 'Asia/Singapore',
    abbr: 'SGT',
    aliases: ['sgt', 'singapore']
  },
  {
    city: 'Tokyo',
    name: 'Japan Standard Time (JST)',
    tz: 'Asia/Tokyo',
    abbr: 'JST',
    aliases: ['jst', 'tokyo', 'japan', 'osaka']
  },
  {
    city: 'Sydney / Melbourne',
    name: 'Australian Eastern Time (AEST / AEDT)',
    tz: 'Australia/Sydney',
    abbr: 'AEST',
    aliases: ['aest', 'aedt', 'sydney', 'australia', 'melbourne', 'canberra']
  },
  {
    city: 'Hong Kong',
    name: 'Hong Kong Time (HKT)',
    tz: 'Asia/Hong_Kong',
    abbr: 'HKT',
    aliases: ['hkt', 'hong kong']
  },
  {
    city: 'Seoul',
    name: 'Korea Standard Time (KST)',
    tz: 'Asia/Seoul',
    abbr: 'KST',
    aliases: ['kst', 'seoul', 'korea']
  },
  {
    city: 'Toronto / Montreal',
    name: 'Eastern Time - Canada (EST / EDT)',
    tz: 'America/Toronto',
    abbr: 'EST',
    aliases: ['toronto', 'montreal', 'canada', 'est', 'edt']
  },
  {
    city: 'São Paulo',
    name: 'Brasília Time (BRT)',
    tz: 'America/Sao_Paulo',
    abbr: 'BRT',
    aliases: ['brt', 'brazil', 'sao paulo', 'rio']
  },
  {
    city: 'Auckland / Wellington',
    name: 'New Zealand Time (NZST / NZDT)',
    tz: 'Pacific/Auckland',
    abbr: 'NZST',
    aliases: ['nzst', 'nzdt', 'new zealand', 'auckland', 'wellington']
  },
  {
    city: 'Mumbai / New Delhi',
    name: 'Indian Standard Time (IST)',
    tz: 'Asia/Kolkata',
    abbr: 'IST',
    aliases: ['ist', 'india', 'indian time', 'mumbai', 'delhi', 'bangalore', 'kolkata']
  },
  {
    city: 'Cairo',
    name: 'Eastern European Time (EET)',
    tz: 'Africa/Cairo',
    abbr: 'EET',
    aliases: ['eet', 'cairo', 'egypt']
  },
  {
    city: 'Johannesburg',
    name: 'South Africa Standard Time (SAST)',
    tz: 'Africa/Johannesburg',
    abbr: 'SAST',
    aliases: ['sast', 'south africa', 'johannesburg', 'cape town']
  }
];

// Add all other world timezones from browser Intl
function buildComprehensiveTimezones() {
  const map = new Map();
  POPULAR_ZONES.forEach(z => map.set(z.tz, z));

  try {
    if (typeof Intl.supportedValuesOf === 'function') {
      const allZones = Intl.supportedValuesOf('timeZone');
      allZones.forEach(tzKey => {
        if (!map.has(tzKey)) {
          const parts = tzKey.split('/');
          const cityRaw = parts[parts.length - 1].replace(/_/g, ' ');
          const regionRaw = parts[0];
          map.set(tzKey, {
            city: cityRaw,
            name: `${cityRaw} (${regionRaw})`,
            tz: tzKey,
            abbr: regionRaw,
            aliases: [cityRaw.toLowerCase(), tzKey.toLowerCase()]
          });
        }
      });
    }
  } catch (e) {
    // Fallback gracefully
  }

  return Array.from(map.values());
}

const ALL_ZONES = buildComprehensiveTimezones();

// =====================================================================
// WEB AUDIO: APPLE WATCH TACTILE DETENT SOUND
// =====================================================================
let audioCtx = null;

function initAudio() {
  if (!audioCtx) {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (AudioContext) {
      audioCtx = new AudioContext();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}

function playTactileTick() {
  if (!state.soundEnabled) return;
  initAudio();
  if (!audioCtx) return;

  const now = audioCtx.currentTime;

  // 1. Low sub-thud
  const subOsc = audioCtx.createOscillator();
  const subGain = audioCtx.createGain();
  subOsc.type = 'sine';
  subOsc.frequency.setValueAtTime(240, now);
  subOsc.frequency.exponentialRampToValueAtTime(50, now + 0.012);
  subGain.gain.setValueAtTime(0.45, now);
  subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.012);
  subOsc.connect(subGain);
  subGain.connect(audioCtx.destination);
  subOsc.start(now);
  subOsc.stop(now + 0.014);

  // 2. Ceramic click
  const clickOsc = audioCtx.createOscillator();
  const clickGain = audioCtx.createGain();
  const clickFilter = audioCtx.createBiquadFilter();
  clickOsc.type = 'triangle';
  clickOsc.frequency.setValueAtTime(2600, now);
  clickOsc.frequency.exponentialRampToValueAtTime(900, now + 0.008);
  clickFilter.type = 'bandpass';
  clickFilter.frequency.setValueAtTime(2400, now);
  clickFilter.Q.setValueAtTime(4.0, now);
  clickGain.gain.setValueAtTime(0.3, now);
  clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.008);
  clickOsc.connect(clickFilter);
  clickFilter.connect(clickGain);
  clickGain.connect(audioCtx.destination);
  clickOsc.start(now);
  clickOsc.stop(now + 0.01);

  if (navigator.vibrate) {
    try { navigator.vibrate(3); } catch (e) {}
  }
}

// =====================================================================
// TIMEZONE MATH & DATE UTILITIES
// =====================================================================
const MONTH_NAMES_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec'];
const MONTH_NAMES_LONG = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

/**
 * Returns formatted time, period, date, and components in the requested timezone.
 */
function getTimeParts(date, tz) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    day: 'numeric',
    month: 'numeric',
    year: 'numeric',
    timeZoneName: 'short'
  });

  const parts = formatter.formatToParts(date);
  const get = (type) => parts.find(p => p.type === type)?.value || '';

  const hourStr = get('hour');
  const minuteStr = get('minute');
  const periodStr = get('dayPeriod').toLowerCase();
  const dayNum = parseInt(get('day'), 10);
  const monthNum = parseInt(get('month'), 10) - 1; // 0-indexed
  const yearNum = parseInt(get('year'), 10);
  const tzAbbr = get('timeZoneName');

  let h24 = parseInt(hourStr, 10);
  if (periodStr === 'pm' && h24 < 12) h24 += 12;
  if (periodStr === 'am' && h24 === 12) h24 = 0;

  const monthLabel = MONTH_NAMES_SHORT[monthNum] || 'Sept';
  const dateDisplay = `${dayNum} ${monthLabel}, ${yearNum}`;

  return {
    timeDisplay: `${hourStr}:${minuteStr}`,
    hour: hourStr,
    minute: minuteStr,
    period: periodStr,
    dateDisplay,
    day: dayNum,
    month: monthNum,
    monthLabel,
    year: yearNum,
    h24,
    m: parseInt(minuteStr, 10),
    tzAbbr
  };
}

/**
 * High-precision reverse converter:
 * Given local (Y, M, D, H24, Min) in a specific timezone `tz`,
 * calculates the exact UTC timestamp ms.
 */
function makeTimestampFromLocal(year, month, day, hour24, minute, tz) {
  // Start with a direct UTC date representation
  let guess = new Date(Date.UTC(year, month, day, hour24, minute, 0));

  // Iterate up to 4 times to converge to the exact millisecond across DST boundaries
  for (let i = 0; i < 4; i++) {
    const curParts = getTimeParts(guess, tz);
    const targetUtc = Date.UTC(year, month, day, hour24, minute, 0);
    const curUtc = Date.UTC(curParts.year, curParts.month, curParts.day, curParts.h24, curParts.m, 0);
    const diff = targetUtc - curUtc;
    if (diff === 0) break;
    guess = new Date(guess.getTime() + diff);
  }

  return guess.getTime();
}

/**
 * Computes human-friendly offset difference relative to Indian Time (IST)
 */
function getOffsetDiffFromIndia(targetTz, date) {
  try {
    const getOffsetMinutes = (tz) => {
      const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: tz,
        timeZoneName: 'shortOffset'
      }).formatToParts(date);
      const str = parts.find(p => p.type === 'timeZoneName')?.value || '';
      const match = str.match(/GMT([+-])(\d+)(?::(\d+))?/);
      if (!match) return 0;
      const sign = match[1] === '-' ? -1 : 1;
      const h = parseInt(match[2], 10);
      const m = match[3] ? parseInt(match[3], 10) : 0;
      return sign * (h * 60 + m);
    };

    const targetOffset = getOffsetMinutes(targetTz);
    const indiaOffset = getOffsetMinutes('Asia/Kolkata'); // 330 mins (+5:30)
    const diffMins = targetOffset - indiaOffset;

    if (diffMins === 0) return 'Same as IST';

    const sign = diffMins > 0 ? '+' : '-';
    const abs = Math.abs(diffMins);
    const h = Math.floor(abs / 60);
    const m = abs % 60;

    return `${sign}${h}h${m > 0 ? ` ${m}m` : ''}`;
  } catch (e) {
    return '';
  }
}

// =====================================================================
// DOM REFERENCES
// =====================================================================
// Top Section
const tzSearchWrapper = document.getElementById('tzSearchWrapper');
const tzSearchInput = document.getElementById('tzSearchInput');
const tzClearBtn = document.getElementById('tzClearBtn');
const tzDropdown = document.getElementById('tzDropdown');
const tzDropdownList = document.getElementById('tzDropdownList');

const topZoneTag = document.getElementById('topZoneTag');
const topZoneBadge = document.getElementById('topZoneBadge');
const topZoneName = document.getElementById('topZoneName');
const topZoneDiff = document.getElementById('topZoneDiff');

const topTimeDigitsInput = document.getElementById('topTimeDigitsInput');
const topPeriodBtn = document.getElementById('topPeriodBtn');
const topDateDisplay = document.getElementById('topDateDisplay');
const topDateText = document.getElementById('topDateText');

// Bottom Section (Indian Time)
const indianTimeDigitsInput = document.getElementById('indianTimeDigitsInput');
const indianPeriodBtn = document.getElementById('indianPeriodBtn');
const indianDateDisplay = document.getElementById('indianDateDisplay');
const indianDateText = document.getElementById('indianDateText');

// Toolbar
const syncNowBtn = document.getElementById('syncNowBtn');

// Date Picker Modal
const datePickerModal = document.getElementById('datePickerModal');
const datePickerTitle = document.getElementById('datePickerTitle');
const datePickerCloseBtn = document.getElementById('datePickerCloseBtn');
const datePickerCloseBottomBtn = document.getElementById('datePickerCloseBottomBtn');
const calPrevBtn = document.getElementById('calPrevBtn');
const calNextBtn = document.getElementById('calNextBtn');
const calCurrentMonthYear = document.getElementById('calCurrentMonthYear');
const calDaysGrid = document.getElementById('calDaysGrid');
const presetBtnToday = document.getElementById('presetBtnToday');
const presetBtnTomorrow = document.getElementById('presetBtnTomorrow');
const presetBtnNextWeek = document.getElementById('presetBtnNextWeek');

// =====================================================================
// UI RENDER LOOP
// =====================================================================
function renderUI() {
  const currentDate = new Date(state.simulatedTimestamp);

  // 1. Top Timezone Render
  const topInfo = getTimeParts(currentDate, state.topTz);
  if (document.activeElement !== topTimeDigitsInput) {
    topTimeDigitsInput.value = topInfo.timeDisplay;
  }
  topTimeDigitsInput.style.width = topTimeDigitsInput.value.length <= 4 ? '180px' : '220px';
  topPeriodBtn.textContent = topInfo.period;
  topDateText.textContent = topInfo.dateDisplay;

  // Selected Zone pill info
  const foundTop = ALL_ZONES.find(z => z.tz === state.topTz);
  const topName = foundTop ? foundTop.name : state.topTz.split('/').pop().replace(/_/g, ' ');
  topZoneBadge.textContent = topInfo.tzAbbr || 'TZ';
  topZoneName.textContent = topName;
  const diffStr = getOffsetDiffFromIndia(state.topTz, currentDate);
  topZoneDiff.textContent = diffStr;

  // 2. Indian Timezone Render
  const indianInfo = getTimeParts(currentDate, state.indianTz);
  if (document.activeElement !== indianTimeDigitsInput) {
    indianTimeDigitsInput.value = indianInfo.timeDisplay;
  }
  indianTimeDigitsInput.style.width = indianTimeDigitsInput.value.length <= 4 ? '180px' : '220px';
  indianPeriodBtn.textContent = indianInfo.period;
  indianDateText.textContent = indianInfo.dateDisplay;
}

// 1-second ticker (runs if isLiveTicking is active)
setInterval(() => {
  if (state.isLiveTicking) {
    state.simulatedTimestamp = Date.now();
    renderUI();
  }
}, 1000);

// =====================================================================
// TIMEZONE SEARCH: "Dropdown will not instantly appear, after typing pst or ust it will show"
// =====================================================================

// Note: Clicking or focusing does NOT show dropdown!
tzSearchInput.addEventListener('click', (e) => {
  if (tzSearchInput.value.trim().length === 0) {
    tzDropdown.classList.remove('open');
  }
});

tzSearchInput.addEventListener('focus', (e) => {
  if (tzSearchInput.value.trim().length === 0) {
    tzDropdown.classList.remove('open');
  }
});

// Dropdown ONLY opens on user typing (input event)
tzSearchInput.addEventListener('input', (e) => {
  const query = tzSearchInput.value.trim().toLowerCase();

  if (query.length === 0) {
    tzDropdown.classList.remove('open');
    tzClearBtn.classList.remove('visible');
    return;
  }

  tzClearBtn.classList.add('visible');
  renderDropdownResults(query);
  tzDropdown.classList.add('open');
});

tzClearBtn.addEventListener('click', () => {
  tzSearchInput.value = '';
  tzClearBtn.classList.remove('visible');
  tzDropdown.classList.remove('open');
  tzSearchInput.focus();
});

// Close dropdown if user clicks outside
document.addEventListener('click', (e) => {
  if (!tzSearchWrapper.contains(e.target)) {
    tzDropdown.classList.remove('open');
  }
});

topZoneTag.addEventListener('click', () => {
  tzSearchInput.focus();
  tzSearchInput.select();
});

function renderDropdownResults(query) {
  tzDropdownList.innerHTML = '';
  const now = new Date(state.simulatedTimestamp);

  // Smart matching: query in aliases, name, city, tz
  const matches = ALL_ZONES.filter(item => {
    if (item.aliases && item.aliases.some(a => a.startsWith(query) || a.includes(query))) {
      return true;
    }
    if (item.city.toLowerCase().includes(query)) return true;
    if (item.name.toLowerCase().includes(query)) return true;
    if (item.tz.toLowerCase().includes(query)) return true;
    return false;
  });

  // Rank matches: exact alias/abbr matches first (e.g. 'pst', 'ust')
  matches.sort((a, b) => {
    const aExact = a.aliases && a.aliases.includes(query);
    const bExact = b.aliases && b.aliases.includes(query);
    if (aExact && !bExact) return -1;
    if (!aExact && bExact) return 1;
    return 0;
  });

  if (matches.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'tz-no-matches';
    empty.textContent = `No timezones found for "${query}"`;
    tzDropdownList.appendChild(empty);
    return;
  }

  // Render top 25 matches in a clean single line
  matches.slice(0, 25).forEach(item => {
    const timeParts = getTimeParts(now, item.tz);
    const abbr = timeParts.tzAbbr || item.abbr;
    const label = item.city.includes(abbr) ? item.city : `${item.city} (${abbr})`;

    const row = document.createElement('div');
    row.className = 'tz-drop-item';
    if (item.tz === state.topTz) {
      row.classList.add('selected');
    }

    row.textContent = label;

    row.addEventListener('click', () => {
      state.topTz = item.tz;
      playTactileTick();
      tzDropdown.classList.remove('open');
      tzSearchInput.value = '';
      tzClearBtn.classList.remove('visible');
      renderUI();
    });

    tzDropdownList.appendChild(row);
  });
}

// =====================================================================
// NUMERIC-ONLY TIME INPUT & AM/PM TOGGLE (NO POPUP)
// =====================================================================
function parseNumericTime(str) {
  if (!str) return null;
  const clean = str.trim().replace(/[^0-9:]/g, '');
  if (!clean) return null;

  let h = 0;
  let m = 0;

  if (clean.includes(':')) {
    const parts = clean.split(':');
    h = parseInt(parts[0], 10);
    m = parseInt(parts[1], 10) || 0;
  } else if (clean.length === 3) {
    // e.g. "230" -> 2:30
    h = parseInt(clean.slice(0, 1), 10);
    m = parseInt(clean.slice(1), 10);
  } else if (clean.length === 4) {
    // e.g. "1015" -> 10:15
    h = parseInt(clean.slice(0, 2), 10);
    m = parseInt(clean.slice(2), 10);
  } else if (clean.length <= 2) {
    // e.g. "2" or "10" -> 2:00 or 10:00
    h = parseInt(clean, 10);
    m = 0;
  } else {
    return null;
  }

  if (isNaN(h) || isNaN(m)) return null;

  let inferredPeriod = null;
  if (h >= 13 && h <= 23) {
    h = h - 12;
    inferredPeriod = 'pm';
  } else if (h === 0) {
    h = 12;
    inferredPeriod = 'am';
  }

  if (h < 1 || h > 12 || m < 0 || m > 59) return null;

  return { h, m, inferredPeriod, formatted: `${h}:${String(m).padStart(2, '0')}` };
}

function setupNumericTimeInput(inputEl, periodBtn, targetType) {
  // Select all on focus/click so user can immediately type numbers
  inputEl.addEventListener('focus', () => {
    inputEl.select();
  });

  inputEl.addEventListener('click', () => {
    inputEl.select();
  });

  // Filter input to numbers and colon only and adjust width
  inputEl.addEventListener('input', () => {
    const filtered = inputEl.value.replace(/[^0-9:]/g, '');
    if (filtered !== inputEl.value) {
      inputEl.value = filtered;
    }
    inputEl.style.width = inputEl.value.length <= 4 ? '180px' : '220px';
  });

  function applyNumericTime() {
    const isIndian = targetType === 'indian';
    const targetTz = isIndian ? state.indianTz : state.topTz;
    const curParts = getTimeParts(new Date(state.simulatedTimestamp), targetTz);

    const parsed = parseNumericTime(inputEl.value);
    if (parsed) {
      const activePeriod = parsed.inferredPeriod || periodBtn.textContent.trim().toLowerCase();
      let h24 = parsed.h;
      if (activePeriod === 'pm' && h24 < 12) h24 += 12;
      if (activePeriod === 'am' && h24 === 12) h24 = 0;

      const newTimestamp = makeTimestampFromLocal(
        curParts.year,
        curParts.month,
        curParts.day,
        h24,
        parsed.m,
        targetTz
      );

      state.simulatedTimestamp = newTimestamp;
      state.isLiveTicking = false; // Freeze live clock to user's typed time
      playTactileTick();
      renderUI();
    } else {
      // Revert if invalid
      inputEl.value = curParts.timeDisplay;
    }
  }

  inputEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      applyNumericTime();
      inputEl.blur();
    } else if (e.key === 'Escape') {
      const isIndian = targetType === 'indian';
      const targetTz = isIndian ? state.indianTz : state.topTz;
      const curParts = getTimeParts(new Date(state.simulatedTimestamp), targetTz);
      inputEl.value = curParts.timeDisplay;
      inputEl.blur();
    }
  });

  inputEl.addEventListener('blur', () => {
    applyNumericTime();
  });

  // Tapping AM / PM toggles it immediately
  periodBtn.addEventListener('click', () => {
    const isIndian = targetType === 'indian';
    const targetTz = isIndian ? state.indianTz : state.topTz;
    const curParts = getTimeParts(new Date(state.simulatedTimestamp), targetTz);

    const currentPeriod = curParts.period;
    const newPeriod = currentPeriod === 'am' ? 'pm' : 'am';

    let h24 = parseInt(curParts.hour, 10);
    if (newPeriod === 'pm' && h24 < 12) h24 += 12;
    if (newPeriod === 'am' && h24 === 12) h24 = 0;

    const newTimestamp = makeTimestampFromLocal(
      curParts.year,
      curParts.month,
      curParts.day,
      h24,
      curParts.m,
      targetTz
    );

    state.simulatedTimestamp = newTimestamp;
    state.isLiveTicking = false;
    playTactileTick();
    renderUI();
  });
}

setupNumericTimeInput(topTimeDigitsInput, topPeriodBtn, 'top');
setupNumericTimeInput(indianTimeDigitsInput, indianPeriodBtn, 'indian');

// =====================================================================
// DATE PICKER: TAP DATE TO CHANGE
// =====================================================================
function openDatePicker(target) {
  initAudio();
  playTactileTick();

  state.activeModalTarget = target;
  const isIndian = target === 'indian';
  const tz = isIndian ? state.indianTz : state.topTz;
  const label = isIndian ? 'Indian Date' : 'Top Date';

  datePickerTitle.textContent = `Select ${label}`;

  const curParts = getTimeParts(new Date(state.simulatedTimestamp), tz);
  state.calYear = curParts.year;
  state.calMonth = curParts.month;

  renderCalendar();

  if (datePickerModal.showModal) {
    datePickerModal.showModal();
  }
}

function renderCalendar() {
  const y = state.calYear;
  const m = state.calMonth;
  calCurrentMonthYear.textContent = `${MONTH_NAMES_LONG[m]} ${y}`;
  calDaysGrid.innerHTML = '';

  const firstDay = new Date(y, m, 1).getDay();
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const daysInPrev = new Date(y, m, 0).getDate();

  const isIndian = state.activeModalTarget === 'indian';
  const tz = isIndian ? state.indianTz : state.topTz;
  const activeParts = getTimeParts(new Date(state.simulatedTimestamp), tz);
  const nowParts = getTimeParts(new Date(), tz);

  // Prev month filler cells
  for (let i = firstDay - 1; i >= 0; i--) {
    const d = daysInPrev - i;
    const cell = document.createElement('button');
    cell.className = 'cal-cell outside';
    cell.textContent = d;
    cell.type = 'button';
    cell.addEventListener('click', () => selectCalendarDate(y, m - 1, d));
    calDaysGrid.appendChild(cell);
  }

  // Current month cells
  for (let d = 1; d <= daysInMonth; d++) {
    const cell = document.createElement('button');
    cell.className = 'cal-cell';
    cell.textContent = d;
    cell.type = 'button';

    if (d === activeParts.day && m === activeParts.month && y === activeParts.year) {
      cell.classList.add('selected');
    }
    if (d === nowParts.day && m === nowParts.month && y === nowParts.year) {
      cell.classList.add('today');
    }

    cell.addEventListener('click', () => selectCalendarDate(y, m, d));
    calDaysGrid.appendChild(cell);
  }

  // Next month filler cells
  const totalCells = firstDay + daysInMonth;
  const remaining = (totalCells <= 35 ? 35 : 42) - totalCells;
  for (let d = 1; d <= remaining; d++) {
    const cell = document.createElement('button');
    cell.className = 'cal-cell outside';
    cell.textContent = d;
    cell.type = 'button';
    cell.addEventListener('click', () => selectCalendarDate(y, m + 1, d));
    calDaysGrid.appendChild(cell);
  }
}

function selectCalendarDate(year, month, day) {
  const isIndian = state.activeModalTarget === 'indian';
  const tz = isIndian ? state.indianTz : state.topTz;

  const curParts = getTimeParts(new Date(state.simulatedTimestamp), tz);

  const newTimestamp = makeTimestampFromLocal(
    year,
    month,
    day,
    curParts.h24,
    curParts.m,
    tz
  );

  state.simulatedTimestamp = newTimestamp;
  state.isLiveTicking = false;
  playTactileTick();
  renderUI();
  datePickerModal.close();
}

calPrevBtn.addEventListener('click', () => {
  state.calMonth--;
  if (state.calMonth < 0) {
    state.calMonth = 11;
    state.calYear--;
  }
  playTactileTick();
  renderCalendar();
});

calNextBtn.addEventListener('click', () => {
  state.calMonth++;
  if (state.calMonth > 11) {
    state.calMonth = 0;
    state.calYear++;
  }
  playTactileTick();
  renderCalendar();
});

// Presets: Today, Tomorrow, +1 Week
presetBtnToday.addEventListener('click', () => {
  const now = new Date();
  selectCalendarDate(now.getFullYear(), now.getMonth(), now.getDate());
});

presetBtnTomorrow.addEventListener('click', () => {
  const t = new Date();
  t.setDate(t.getDate() + 1);
  selectCalendarDate(t.getFullYear(), t.getMonth(), t.getDate());
});

presetBtnNextWeek.addEventListener('click', () => {
  const t = new Date();
  t.setDate(t.getDate() + 7);
  selectCalendarDate(t.getFullYear(), t.getMonth(), t.getDate());
});

datePickerCloseBtn.addEventListener('click', () => datePickerModal.close());
datePickerCloseBottomBtn.addEventListener('click', () => datePickerModal.close());

datePickerModal.addEventListener('click', (e) => {
  const rect = datePickerModal.getBoundingClientRect();
  if (
    e.clientX < rect.left ||
    e.clientX > rect.right ||
    e.clientY < rect.top ||
    e.clientY > rect.bottom
  ) {
    datePickerModal.close();
  }
});

// Click handlers for Tappable Date
topDateDisplay.addEventListener('click', () => openDatePicker('top'));
indianDateDisplay.addEventListener('click', () => openDatePicker('indian'));

// =====================================================================
// BOTTOM TOOLBAR ACTIONS
// =====================================================================

// Reset to current real-time
syncNowBtn.addEventListener('click', () => {
  state.simulatedTimestamp = Date.now();
  state.isLiveTicking = true;
  playTactileTick();
  renderUI();
});



// =====================================================================
// INITIALIZATION
// =====================================================================
function init() {
  renderUI();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
