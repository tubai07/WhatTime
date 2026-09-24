/**
 * WhatTime: Dual Timezone Split-Screen Interactive Clock
 * - Searchable Timezone Modal with ALL World Timezones (Intl.supportedValuesOf)
 * - 1-Minute Rotator Precision & Mechanical Clock Escapement Audio
 * - Dynamic Day / Night Lighting (when one side goes night, that side goes dark)
 * - Modern Custom Calendar In-App Date Picker
 */

// --- Global State ---
const state = {
  userTz: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
  clientTz: 'America/Los_Angeles',
  offsetMinutes: 0,
  selectedDate: new Date(),
  calendarViewingYear: new Date().getFullYear(),
  calendarViewingMonth: new Date().getMonth(),
  userIsNight: false,
  clientIsNight: false,
  activeTzTarget: 'client', // 'user' or 'client'
  tzSearchQuery: '',
  tzActiveRegion: 'all',
};

// --- Comprehensive World Timezone Engine ---
// Collect all official IANA timezones supported by the browser engine (400+ zones)
function getAllWorldTimezones() {
  let rawList = [];
  try {
    if (typeof Intl.supportedValuesOf === 'function') {
      rawList = Intl.supportedValuesOf('timeZone');
    }
  } catch (e) {
    rawList = [];
  }

  // Curated Popular Business Hubs (prioritized in search)
  const popularHubs = [
    { city: 'San Francisco (PDT/PST)', tz: 'America/Los_Angeles', region: 'Americas', priority: 1 },
    { city: 'New York (EDT/EST)', tz: 'America/New_York', region: 'Americas', priority: 1 },
    { city: 'London (BST/GMT)', tz: 'Europe/London', region: 'Europe', priority: 1 },
    { city: 'Paris / Berlin (CEST/CET)', tz: 'Europe/Paris', region: 'Europe', priority: 1 },
    { city: 'Tokyo (JST)', tz: 'Asia/Tokyo', region: 'Asia', priority: 1 },
    { city: 'Mumbai / Delhi (IST)', tz: 'Asia/Kolkata', region: 'Asia', priority: 1 },
    { city: 'Dubai (GST)', tz: 'Asia/Dubai', region: 'Asia', priority: 1 },
    { city: 'Singapore (SGT)', tz: 'Asia/Singapore', region: 'Asia', priority: 1 },
    { city: 'Sydney (AEST/AEDT)', tz: 'Australia/Sydney', region: 'Oceania', priority: 1 },
    { city: 'Hong Kong (HKT)', tz: 'Asia/Hong_Kong', region: 'Asia', priority: 1 },
    { city: 'Chicago (CDT/CST)', tz: 'America/Chicago', region: 'Americas', priority: 1 },
    { city: 'Toronto (EDT/EST)', tz: 'America/Toronto', region: 'Americas', priority: 1 },
    { city: 'São Paulo (BRT)', tz: 'America/Sao_Paulo', region: 'Americas', priority: 1 },
    { city: 'Auckland (NZST/NZDT)', tz: 'Pacific/Auckland', region: 'Oceania', priority: 1 },
    { city: 'Johannesburg (SAST)', tz: 'Africa/Johannesburg', region: 'Africa', priority: 1 },
    { city: 'UTC (Universal Time)', tz: 'UTC', region: 'Universal', priority: 1 },
  ];

  const processedMap = new Map();

  // Insert popular hubs first
  popularHubs.forEach(h => {
    processedMap.set(h.tz, {
      city: h.city,
      tz: h.tz,
      region: h.region,
      priority: h.priority
    });
  });

  // Insert all other IANA timezones
  rawList.forEach(tzKey => {
    if (!processedMap.has(tzKey)) {
      const parts = tzKey.split('/');
      const rawRegion = parts[0] || 'Other';
      const rawCity = parts[parts.length - 1].replace(/_/g, ' ');

      let regionGroup = 'Other';
      if (rawRegion.startsWith('America')) regionGroup = 'Americas';
      else if (rawRegion.startsWith('Europe')) regionGroup = 'Europe';
      else if (rawRegion.startsWith('Asia')) regionGroup = 'Asia';
      else if (rawRegion.startsWith('Africa')) regionGroup = 'Africa';
      else if (rawRegion.startsWith('Australia') || rawRegion.startsWith('Pacific')) regionGroup = 'Oceania';
      else if (rawRegion === 'UTC' || rawRegion === 'Etc') regionGroup = 'Universal';

      processedMap.set(tzKey, {
        city: rawCity,
        tz: tzKey,
        region: regionGroup,
        priority: 10
      });
    }
  });

  return Array.from(processedMap.values());
}

const ALL_TIMEZONES = getAllWorldTimezones();

// --- Web Audio API: Apple Watch Digital Crown Taptic Sound ---
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

/**
 * Synthesizes the exact Apple Watch Digital Crown tactile "tock"
 * - Sub-surface low-frequency physical bump (260Hz -> 55Hz taptic pulse)
 * - Ultra-tight ceramic/glass detent click (2.4kHz bandpass, 8ms decay)
 * - Clean, non-fatiguing, and snappy on rapid rotations
 */
function playDigitalCrownClick() {
  initAudio();
  if (!audioCtx) return;

  const now = audioCtx.currentTime;

  // 1. Taptic Low-End Pulse (Physical Solenoid Thud)
  const subOsc = audioCtx.createOscillator();
  const subGain = audioCtx.createGain();

  subOsc.type = 'sine';
  subOsc.frequency.setValueAtTime(260, now);
  subOsc.frequency.exponentialRampToValueAtTime(55, now + 0.012);

  subGain.gain.setValueAtTime(0.55, now);
  subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.012);

  subOsc.connect(subGain);
  subGain.connect(audioCtx.destination);
  subOsc.start(now);
  subOsc.stop(now + 0.014);

  // 2. Crisp Ceramic/Glass Micro-Detent (Sharp Crown Click)
  const clickOsc = audioCtx.createOscillator();
  const clickGain = audioCtx.createGain();
  const clickFilter = audioCtx.createBiquadFilter();

  clickOsc.type = 'triangle';
  clickOsc.frequency.setValueAtTime(2800, now);
  clickOsc.frequency.exponentialRampToValueAtTime(900, now + 0.008);

  clickFilter.type = 'bandpass';
  clickFilter.frequency.setValueAtTime(2400, now);
  clickFilter.Q.setValueAtTime(4.5, now);

  clickGain.gain.setValueAtTime(0.38, now);
  clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.008);

  clickOsc.connect(clickFilter);
  clickFilter.connect(clickGain);
  clickGain.connect(audioCtx.destination);

  clickOsc.start(now);
  clickOsc.stop(now + 0.01);

  // Apple Watch style 4ms micro-haptic bump
  if (navigator.vibrate) {
    try { navigator.vibrate(4); } catch (e) {}
  }
}

// Alias for seamless backward compatibility
function playMetallicTick() {
  playDigitalCrownClick();
}

// --- Daylight Saving Time (DST) Intelligence ---
function getDstInfo(timeZone, targetDate) {
  try {
    const year = targetDate.getFullYear();
    const jan = new Date(year, 0, 15);
    const jul = new Date(year, 6, 15);

    const getOffset = (d) => {
      const parts = new Intl.DateTimeFormat('en-US', {
        timeZone,
        timeZoneName: 'shortOffset',
      }).formatToParts(d);
      const tzPart = parts.find(p => p.type === 'timeZoneName')?.value || '';
      const match = tzPart.match(/GMT([+-])(\d+)(?::(\d+))?/);
      if (!match) return 0;
      const sign = match[1] === '-' ? -1 : 1;
      const h = parseInt(match[2], 10);
      const m = match[3] ? parseInt(match[3], 10) : 0;
      return sign * (h * 60 + m);
    };

    const currentOffset = getOffset(targetDate);
    const janOffset = getOffset(jan);
    const julOffset = getOffset(jul);

    const observesDst = janOffset !== julOffset;
    const maxOffset = Math.max(janOffset, julOffset);
    const isCurrentlyDst = observesDst && currentOffset === maxOffset;

    const shortTzName = new Intl.DateTimeFormat('en-US', {
      timeZone,
      timeZoneName: 'short',
    }).formatToParts(targetDate).find(p => p.type === 'timeZoneName')?.value || '';

    return {
      observesDst,
      isCurrentlyDst,
      shortTzName,
      offsetMinutes: currentOffset
    };
  } catch (err) {
    return { observesDst: false, isCurrentlyDst: false, shortTzName: 'UTC', offsetMinutes: 0 };
  }
}

function formatTzPill(timeZone, targetDate) {
  const dst = getDstInfo(timeZone, targetDate);
  const abbr = dst.shortTzName;
  const found = ALL_TIMEZONES.find(t => t.tz === timeZone);
  let city = found ? found.city.split(' (')[0] : timeZone.split('/').pop().replace(/_/g, ' ');
  return `${city} (${abbr})`;
}

function getBusinessStatus(hours) {
  if (hours >= 9 && hours < 18) {
    return { text: '💼 Business', className: '' };
  } else if (hours >= 18 && hours < 22) {
    return { text: '🍷 Evening', className: 'evening' };
  } else if (hours >= 7 && hours < 9) {
    return { text: '☕ Morning', className: 'evening' };
  } else {
    return { text: '🌙 Sleeping', className: 'sleeping' };
  }
}

// --- DOM References ---
const halfTop = document.getElementById('halfTop');
const halfBottom = document.getElementById('halfBottom');
const dialBackdropTop = document.getElementById('dialBackdropTop');
const dialBackdropBottom = document.getElementById('dialBackdropBottom');
const dialCenterCap = document.getElementById('dialCenterCap');

const youDateBtn = document.getElementById('youDateBtn');
const youDateText = document.getElementById('youDateText');
const youTzBtn = document.getElementById('youTzBtn');
const youTzText = document.getElementById('youTzText');
const youTimeEl = document.getElementById('youTime');
const youDstPill = document.getElementById('youDstPill');
const youTimeWrap = document.getElementById('youTimeWrap');

const clientDateBtn = document.getElementById('clientDateBtn');
const clientDateText = document.getElementById('clientDateText');
const clientTzBtn = document.getElementById('clientTzBtn');
const clientTzText = document.getElementById('clientTzText');
const clientTimeEl = document.getElementById('clientTime');
const clientDstPill = document.getElementById('clientDstPill');
const clientBizPill = document.getElementById('clientBizPill');
const clientTimeWrap = document.getElementById('clientTimeWrap');

const rotaryCanvas = document.getElementById('rotaryCanvas');
const rotaryWheelContainer = document.getElementById('rotaryWheelContainer');
const scrubDeltaTooltip = document.getElementById('scrubDeltaTooltip');

// Time Input Modal
const timeInputModal = document.getElementById('timeInputModal');
const modalTitle = document.getElementById('modalTitle');
const modalTimeInput = document.getElementById('modalTimeInput');
const modalCancelBtn = document.getElementById('modalCancelBtn');
const modalApplyBtn = document.getElementById('modalApplyBtn');
let activeModalTarget = 'client';

// Modern Calendar Modal
const modernDateModal = document.getElementById('modernDateModal');
const calMonthYearTitle = document.getElementById('calMonthYearTitle');
const calPrevMonthBtn = document.getElementById('calPrevMonthBtn');
const calNextMonthBtn = document.getElementById('calNextMonthBtn');
const calDaysGrid = document.getElementById('calDaysGrid');
const calCloseBtn = document.getElementById('calCloseBtn');
const presetToday = document.getElementById('presetToday');
const presetTomorrow = document.getElementById('presetTomorrow');
const presetNextWeek = document.getElementById('presetNextWeek');

// Modern Timezone Modal
const modernTzModal = document.getElementById('modernTzModal');
const tzModalTitle = document.getElementById('tzModalTitle');
const tzCloseBtn = document.getElementById('tzCloseBtn');
const tzSearchInput = document.getElementById('tzSearchInput');
const tzClearSearchBtn = document.getElementById('tzClearSearchBtn');
const tzRegionChips = document.getElementById('tzRegionChips');
const tzListContainer = document.getElementById('tzListContainer');

// --- Date Formatter ---
function getSimulatedDate() {
  const now = new Date();
  const target = new Date(state.selectedDate);
  target.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());
  return new Date(target.getTime() + state.offsetMinutes * 60 * 1000);
}

function getTimeParts(date, timeZone) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    month: 'short',
    day: 'numeric'
  });

  const parts = formatter.formatToParts(date);
  const get = (type) => parts.find(p => p.type === type)?.value || '';

  const hourStr = get('hour');
  const minuteStr = get('minute');
  const periodStr = get('dayPeriod').toLowerCase();
  const monthStr = get('month');
  const dayStr = get('day');

  let h24 = parseInt(hourStr, 10);
  if (periodStr === 'pm' && h24 < 12) h24 += 12;
  if (periodStr === 'am' && h24 === 12) h24 = 0;

  return {
    timeDisplay: `${hourStr}:${minuteStr}`,
    period: periodStr,
    datePill: `${monthStr} ${dayStr}`,
    h24,
    m: parseInt(minuteStr, 10)
  };
}

// --- Update UI Displays ---
function updateDisplays() {
  const simDate = getSimulatedDate();

  // 1. Where You Are (Top Half)
  const youInfo = getTimeParts(simDate, state.userTz);
  youTimeEl.innerHTML = `${youInfo.timeDisplay}<span class="time-period">${youInfo.period}</span>`;
  youDateText.textContent = youInfo.datePill;
  youTzText.textContent = formatTzPill(state.userTz, simDate);

  const youDst = getDstInfo(state.userTz, simDate);
  youDstPill.textContent = `${youDst.shortTzName} ${youDst.isCurrentlyDst ? '• DST Active' : '• Standard'}`;

  // Check if User side is Night (6 PM to 6 AM)
  state.userIsNight = (youInfo.h24 < 6 || youInfo.h24 >= 18);
  if (state.userIsNight) {
    halfTop.classList.add('is-night');
    dialBackdropTop.classList.add('is-night');
  } else {
    halfTop.classList.remove('is-night');
    dialBackdropTop.classList.remove('is-night');
  }

  // 2. Where The Client Is (Bottom Half)
  const clientInfo = getTimeParts(simDate, state.clientTz);
  clientTimeEl.innerHTML = `${clientInfo.timeDisplay}<span class="time-period">${clientInfo.period}</span>`;
  clientDateText.textContent = clientInfo.datePill;
  clientTzText.textContent = formatTzPill(state.clientTz, simDate);

  const clientDst = getDstInfo(state.clientTz, simDate);
  clientDstPill.textContent = `${clientDst.shortTzName} ${clientDst.isCurrentlyDst ? '• DST Active' : '• Standard'}`;

  const biz = getBusinessStatus(clientInfo.h24);
  clientBizPill.textContent = biz.text;
  clientBizPill.className = `sub-biz-pill ${biz.className}`;

  // Check if Client side is Night (6 PM to 6 AM)
  state.clientIsNight = (clientInfo.h24 < 6 || clientInfo.h24 >= 18);
  if (state.clientIsNight) {
    halfBottom.classList.add('is-night');
    dialBackdropBottom.classList.add('is-night');
  } else {
    halfBottom.classList.remove('is-night');
    dialBackdropBottom.classList.remove('is-night');
  }

  // Center Cap update
  if (state.userIsNight && state.clientIsNight) {
    dialCenterCap.style.background = '#0a0e17';
    dialCenterCap.style.borderColor = '#ffffff';
  } else if (!state.userIsNight && !state.clientIsNight) {
    dialCenterCap.style.background = '#faf8f5';
    dialCenterCap.style.borderColor = '#2b2520';
  } else {
    dialCenterCap.style.background = '#1c1815';
    dialCenterCap.style.borderColor = '#ffffff';
  }

  // 3. Floating Scrubber Delta Tooltip (Precise to 1 minute)
  if (state.offsetMinutes === 0) {
    scrubDeltaTooltip.classList.remove('visible');
  } else {
    const sign = state.offsetMinutes > 0 ? '+' : '';
    const absMin = Math.abs(state.offsetMinutes);
    if (absMin >= 60) {
      const h = Math.floor(absMin / 60);
      const m = absMin % 60;
      scrubDeltaTooltip.textContent = `${sign}${state.offsetMinutes > 0 ? h : -h}h${m > 0 ? ` ${m}m` : ''}`;
    } else {
      scrubDeltaTooltip.textContent = `${sign}${state.offsetMinutes}m`;
    }
    scrubDeltaTooltip.classList.add('visible');
  }
}

// =====================================================================
// ROTARY DIAL CANVAS RENDERING (60 TICKS = 60 MINUTES PER REVOLUTION)
// =====================================================================
const ctx = rotaryCanvas.getContext('2d');
let canvasSize = 0;

function resizeRotaryDial() {
  const rect = rotaryWheelContainer.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  canvasSize = rect.width;

  rotaryCanvas.width = canvasSize * dpr;
  rotaryCanvas.height = canvasSize * dpr;
  ctx.scale(dpr, dpr);
  drawRotaryDial();
}

const TOTAL_TICKS = 60;
const ANGLE_PER_1_MIN = (Math.PI * 2) / TOTAL_TICKS;

function drawRotaryDial() {
  if (!canvasSize) return;

  ctx.clearRect(0, 0, canvasSize, canvasSize);

  const center = canvasSize / 2;
  const radius = center - 8;

  // 1. Draw Dial Circle Body with Symmetrical Day/Night Halves
  ctx.save();
  ctx.beginPath();
  ctx.arc(center, center, radius, Math.PI, 0, false);
  ctx.fillStyle = state.userIsNight ? '#121824' : '#ffffff';
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.beginPath();
  ctx.arc(center, center, radius, 0, Math.PI, false);
  ctx.fillStyle = state.clientIsNight ? '#121824' : '#ffffff';
  ctx.fill();
  ctx.restore();

  // Dial Outer Rim Line
  ctx.save();
  ctx.beginPath();
  ctx.arc(center, center, radius, 0, Math.PI * 2);
  ctx.strokeStyle = (state.userIsNight || state.clientIsNight) ? '#3e4c63' : '#2b2520';
  ctx.lineWidth = 2.2;
  ctx.stroke();
  ctx.restore();

  // 2. Draw Radiating 1-Minute Ticks (60 ticks around the wheel)
  const currentTickStep = state.offsetMinutes;
  const rotationAngle = (currentTickStep * ANGLE_PER_1_MIN);

  ctx.save();
  ctx.translate(center, center);
  ctx.rotate(rotationAngle);

  for (let i = 0; i < TOTAL_TICKS; i++) {
    const angle = i * ANGLE_PER_1_MIN;
    const isQuarter = (i % 15 === 0);
    const isFiveMin = (i % 5 === 0);

    let tickLength = 7;
    let tickWidth = 1.2;

    const effectiveAngle = (angle + rotationAngle) % (Math.PI * 2);
    const normalizedAngle = effectiveAngle < 0 ? effectiveAngle + Math.PI * 2 : effectiveAngle;
    const isInTopHalf = (normalizedAngle > Math.PI && normalizedAngle < Math.PI * 2);
    const isNightArea = isInTopHalf ? state.userIsNight : state.clientIsNight;

    let tickColor = isNightArea ? '#64748b' : '#6b5e52';

    if (isQuarter) {
      tickLength = 20;
      tickWidth = 2.4;
      tickColor = isNightArea ? '#f8fafc' : '#1c1815';
    } else if (isFiveMin) {
      tickLength = 13;
      tickWidth = 1.8;
      tickColor = isNightArea ? '#cbd5e1' : '#2b2520';
    }

    const cos = Math.cos(angle);
    const sin = Math.sin(angle);

    const xOuter = cos * (radius - 2);
    const yOuter = sin * (radius - 2);
    const xInner = cos * (radius - 2 - tickLength);
    const yInner = sin * (radius - 2 - tickLength);

    ctx.beginPath();
    ctx.moveTo(xOuter, yOuter);
    ctx.lineTo(xInner, yInner);
    ctx.strokeStyle = tickColor;
    ctx.lineWidth = tickWidth;
    ctx.lineCap = 'round';
    ctx.stroke();
  }

  ctx.restore();
}

// =====================================================================
// ROTATIONAL DRAG & WHEEL WITH 1-MINUTE SNAPPING
// =====================================================================
let isDragging = false;
let lastPointerAngle = 0;
let accumulatedAngleDelta = 0;

function getAngleFromEvent(e) {
  const rect = rotaryWheelContainer.getBoundingClientRect();
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;
  return Math.atan2(e.clientY - centerY, e.clientX - centerX);
}

function handleAngleDelta(deltaAngle, playAudio = true) {
  accumulatedAngleDelta += deltaAngle;

  const steps = Math.trunc(accumulatedAngleDelta / ANGLE_PER_1_MIN);
  if (steps !== 0) {
    accumulatedAngleDelta -= steps * ANGLE_PER_1_MIN;
    const newOffset = state.offsetMinutes + steps * 1;
    const clamped = Math.max(-1440, Math.min(1440, Math.round(newOffset)));

    if (clamped !== state.offsetMinutes) {
      state.offsetMinutes = clamped;

      if (playAudio) {
        playMetallicTick();
      }

      updateDisplays();
      drawRotaryDial();
    }
  }
}

// Pointer Events
rotaryWheelContainer.addEventListener('pointerdown', (e) => {
  isDragging = true;
  lastPointerAngle = getAngleFromEvent(e);
  accumulatedAngleDelta = 0;
  rotaryWheelContainer.setPointerCapture(e.pointerId);
  initAudio();
});

rotaryWheelContainer.addEventListener('pointermove', (e) => {
  if (!isDragging) return;
  const currentAngle = getAngleFromEvent(e);
  
  let delta = currentAngle - lastPointerAngle;
  if (delta > Math.PI) delta -= Math.PI * 2;
  if (delta < -Math.PI) delta += Math.PI * 2;

  lastPointerAngle = currentAngle;
  handleAngleDelta(delta, true);
});

rotaryWheelContainer.addEventListener('pointerup', (e) => {
  if (isDragging) {
    isDragging = false;
    rotaryWheelContainer.releasePointerCapture(e.pointerId);
  }
});

rotaryWheelContainer.addEventListener('pointercancel', () => {
  isDragging = false;
});

// Wheel Scrolling
rotaryWheelContainer.addEventListener('wheel', (e) => {
  e.preventDefault();
  initAudio();
  const stepDirection = e.deltaY > 0 ? 1 : -1;
  const clamped = Math.max(-1440, Math.min(1440, state.offsetMinutes + stepDirection));
  if (clamped !== state.offsetMinutes) {
    state.offsetMinutes = clamped;
    playMetallicTick();
    updateDisplays();
    drawRotaryDial();
  }
}, { passive: false });

// =====================================================================
// MODERN SEARCHABLE TIMEZONE MODAL (ALL WORLD TIMEZONES)
// =====================================================================
function openTimezoneModal(target) {
  initAudio();
  state.activeTzTarget = target;
  tzModalTitle.textContent = target === 'user' ? 'Select Your Time Zone' : 'Select Client Time Zone';
  state.tzSearchQuery = '';
  tzSearchInput.value = '';
  tzClearSearchBtn.classList.remove('visible');

  // Reset active region chip to 'all'
  document.querySelectorAll('.region-chip').forEach(c => {
    c.classList.toggle('active', c.dataset.region === 'all');
  });
  state.tzActiveRegion = 'all';

  renderTimezoneList();

  if (modernTzModal.showModal) {
    modernTzModal.showModal();
    // Focus search input after open
    setTimeout(() => tzSearchInput.focus(), 80);
  }
}

function renderTimezoneList() {
  const query = state.tzSearchQuery.toLowerCase().trim();
  const region = state.tzActiveRegion;
  const simDate = getSimulatedDate();
  const activeTz = state.activeTzTarget === 'user' ? state.userTz : state.clientTz;

  tzListContainer.innerHTML = '';

  const filtered = ALL_TIMEZONES.filter(item => {
    // Region filter
    if (region !== 'all' && item.region !== region) {
      return false;
    }
    // Search query filter
    if (query) {
      const matchCity = item.city.toLowerCase().includes(query);
      const matchTz = item.tz.toLowerCase().includes(query);
      const matchRegion = item.region.toLowerCase().includes(query);
      
      // Also match dynamic abbreviation (e.g. "pdt", "pst", "edt", "est")
      const dst = getDstInfo(item.tz, simDate);
      const matchAbbr = dst.shortTzName.toLowerCase().includes(query);

      return matchCity || matchTz || matchRegion || matchAbbr;
    }
    return true;
  });

  if (filtered.length === 0) {
    const emptyEl = document.createElement('div');
    emptyEl.className = 'tz-no-results';
    emptyEl.textContent = 'No matching timezones found.';
    tzListContainer.appendChild(emptyEl);
    return;
  }

  filtered.forEach(item => {
    const dst = getDstInfo(item.tz, simDate);
    const timeParts = getTimeParts(simDate, item.tz);

    const row = document.createElement('div');
    row.className = 'tz-item';
    if (item.tz === activeTz) {
      row.classList.add('is-selected');
    }

    row.innerHTML = `
      <div class="tz-item-left">
        <div class="tz-item-city">${item.city}</div>
        <div class="tz-item-region">${item.region} • ${item.tz}</div>
      </div>
      <div class="tz-item-right">
        <span class="tz-item-pill">${dst.shortTzName}</span>
        <span class="tz-item-preview-time">${timeParts.timeDisplay} ${timeParts.period.toUpperCase()}</span>
      </div>
    `;

    row.addEventListener('click', () => {
      if (state.activeTzTarget === 'user') {
        state.userTz = item.tz;
      } else {
        state.clientTz = item.tz;
      }
      playMetallicTick();
      updateDisplays();
      drawRotaryDial();
      modernTzModal.close();
    });

    tzListContainer.appendChild(row);
  });
}

// Search Input Listener
tzSearchInput.addEventListener('input', (e) => {
  state.tzSearchQuery = e.target.value;
  tzClearSearchBtn.classList.toggle('visible', state.tzSearchQuery.length > 0);
  renderTimezoneList();
});

tzClearSearchBtn.addEventListener('click', () => {
  state.tzSearchQuery = '';
  tzSearchInput.value = '';
  tzClearSearchBtn.classList.remove('visible');
  tzSearchInput.focus();
  renderTimezoneList();
});

// Region Filter Chips
tzRegionChips.addEventListener('click', (e) => {
  const chip = e.target.closest('.region-chip');
  if (!chip) return;

  document.querySelectorAll('.region-chip').forEach(c => c.classList.remove('active'));
  chip.classList.add('active');

  state.tzActiveRegion = chip.dataset.region;
  renderTimezoneList();
});

youTzBtn.addEventListener('click', () => openTimezoneModal('user'));
clientTzBtn.addEventListener('click', () => openTimezoneModal('client'));
tzCloseBtn.addEventListener('click', () => modernTzModal.close());

modernTzModal.addEventListener('click', (e) => {
  const rect = modernTzModal.getBoundingClientRect();
  if (
    e.clientX < rect.left ||
    e.clientX > rect.right ||
    e.clientY < rect.top ||
    e.clientY > rect.bottom
  ) {
    modernTzModal.close();
  }
});

// =====================================================================
// MODERN IN-APP CALENDAR LOGIC
// =====================================================================
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

function renderModernCalendar() {
  const y = state.calendarViewingYear;
  const m = state.calendarViewingMonth;
  calMonthYearTitle.textContent = `${MONTH_NAMES[m]} ${y}`;

  calDaysGrid.innerHTML = '';

  const firstDayIndex = new Date(y, m, 1).getDay();
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const daysInPrevMonth = new Date(y, m, 0).getDate();

  const today = new Date();

  // Previous month trailing days
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    const dayNum = daysInPrevMonth - i;
    const btn = document.createElement('button');
    btn.className = 'cal-day-cell is-outside';
    btn.textContent = dayNum;
    btn.type = 'button';
    btn.addEventListener('click', () => {
      selectDate(new Date(y, m - 1, dayNum));
    });
    calDaysGrid.appendChild(btn);
  }

  // Current month days
  for (let d = 1; d <= daysInMonth; d++) {
    const btn = document.createElement('button');
    btn.className = 'cal-day-cell';
    btn.textContent = d;
    btn.type = 'button';

    const cellDate = new Date(y, m, d);
    if (cellDate.toDateString() === today.toDateString()) {
      btn.classList.add('is-today');
    }
    if (cellDate.toDateString() === state.selectedDate.toDateString()) {
      btn.classList.add('is-selected');
    }

    btn.addEventListener('click', () => {
      selectDate(cellDate);
    });
    calDaysGrid.appendChild(btn);
  }

  // Next month leading days
  const totalCellsSoFar = firstDayIndex + daysInMonth;
  const remainingCells = (totalCellsSoFar <= 35 ? 35 : 42) - totalCellsSoFar;
  for (let d = 1; d <= remainingCells; d++) {
    const btn = document.createElement('button');
    btn.className = 'cal-day-cell is-outside';
    btn.textContent = d;
    btn.type = 'button';
    btn.addEventListener('click', () => {
      selectDate(new Date(y, m + 1, d));
    });
    calDaysGrid.appendChild(btn);
  }
}

function selectDate(newDate) {
  state.selectedDate = new Date(newDate);
  state.calendarViewingYear = state.selectedDate.getFullYear();
  state.calendarViewingMonth = state.selectedDate.getMonth();
  initAudio();
  playMetallicTick();
  updateDisplays();
  drawRotaryDial();
  modernDateModal.close();
}

calPrevMonthBtn.addEventListener('click', () => {
  state.calendarViewingMonth--;
  if (state.calendarViewingMonth < 0) {
    state.calendarViewingMonth = 11;
    state.calendarViewingYear--;
  }
  renderModernCalendar();
});

calNextMonthBtn.addEventListener('click', () => {
  state.calendarViewingMonth++;
  if (state.calendarViewingMonth > 11) {
    state.calendarViewingMonth = 0;
    state.calendarViewingYear++;
  }
  renderModernCalendar();
});

presetToday.addEventListener('click', () => {
  selectDate(new Date());
});

presetTomorrow.addEventListener('click', () => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  selectDate(tomorrow);
});

presetNextWeek.addEventListener('click', () => {
  const nextWeek = new Date();
  nextWeek.setDate(nextWeek.getDate() + 7);
  selectDate(nextWeek);
});

function openModernCalendar() {
  initAudio();
  state.calendarViewingYear = state.selectedDate.getFullYear();
  state.calendarViewingMonth = state.selectedDate.getMonth();
  renderModernCalendar();
  if (modernDateModal.showModal) {
    modernDateModal.showModal();
  }
}

youDateBtn.addEventListener('click', openModernCalendar);
clientDateBtn.addEventListener('click', openModernCalendar);
calCloseBtn.addEventListener('click', () => modernDateModal.close());

modernDateModal.addEventListener('click', (e) => {
  const rect = modernDateModal.getBoundingClientRect();
  if (
    e.clientX < rect.left ||
    e.clientX > rect.right ||
    e.clientY < rect.top ||
    e.clientY > rect.bottom
  ) {
    modernDateModal.close();
  }
});

// =====================================================================
// TIME INPUT MODAL (DIRECT 1-MINUTE TIME ADJUSTER)
// =====================================================================
function openModalFor(target) {
  initAudio();
  activeModalTarget = target;
  modalTitle.textContent = target === 'user' ? 'Set Your Time' : "Set Client's Time";
  
  const simDate = getSimulatedDate();
  const tz = target === 'user' ? state.userTz : state.clientTz;
  const info = getTimeParts(simDate, tz);

  const pad = (n) => String(n).padStart(2, '0');
  modalTimeInput.value = `${pad(info.h24)}:${pad(info.m)}`;

  if (timeInputModal.showModal) {
    timeInputModal.showModal();
  }
}

youTimeWrap.addEventListener('click', () => openModalFor('user'));
clientTimeWrap.addEventListener('click', () => openModalFor('client'));

modalCancelBtn.addEventListener('click', () => timeInputModal.close());

modalApplyBtn.addEventListener('click', () => {
  const val = modalTimeInput.value;
  if (!val) return;

  const [targetH, targetM] = val.split(':').map(Number);
  const simDate = getSimulatedDate();
  const tz = activeModalTarget === 'user' ? state.userTz : state.clientTz;
  const info = getTimeParts(simDate, tz);

  const currentMins = info.h24 * 60 + info.m;
  const targetMins = targetH * 60 + targetM;

  let delta = targetMins - currentMins;
  if (delta > 720) delta -= 1440;
  if (delta < -720) delta += 1440;

  const newOffset = Math.max(-1440, Math.min(1440, Math.round(state.offsetMinutes + delta)));
  state.offsetMinutes = newOffset;

  playMetallicTick();
  updateDisplays();
  drawRotaryDial();
  timeInputModal.close();
});

timeInputModal.addEventListener('click', (e) => {
  const rect = timeInputModal.getBoundingClientRect();
  if (
    e.clientX < rect.left ||
    e.clientX > rect.right ||
    e.clientY < rect.top ||
    e.clientY > rect.bottom
  ) {
    timeInputModal.close();
  }
});

// Window Resize & Realtime Ticker
window.addEventListener('resize', () => {
  resizeRotaryDial();
});

setInterval(() => {
  updateDisplays();
  drawRotaryDial();
}, 1000);

// --- Initialization ---
function init() {
  resizeRotaryDial();
  updateDisplays();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
