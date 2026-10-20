// Working blocks, shared by the dashboard and the notification cron.
// The schedule is editable in the app (Work hours) and stored in the settings table.
// Each weekday (0 = Sun … 6 = Sat) has a workstation window; every other hour is laptop time.
export const TZ = 'America/Toronto';

const WEEKDAY = { on: true, start: 10, end: 20 };
const OFF = { on: false, start: 10, end: 20 };
export const DEFAULT_SCHEDULE = [OFF, WEEKDAY, WEEKDAY, WEEKDAY, WEEKDAY, WEEKDAY, OFF];
export const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const clampHour = (v, d) => { const n = Number(v); return Number.isFinite(n) ? Math.min(24, Math.max(0, Math.round(n * 2) / 2)) : d; };
export function normalizeSchedule(s) {
  if (!Array.isArray(s) || s.length !== 7) return DEFAULT_SCHEDULE;
  return s.map((d, i) => {
    const start = clampHour(d?.start, DEFAULT_SCHEDULE[i].start);
    const end = clampHour(d?.end, DEFAULT_SCHEDULE[i].end);
    return { on: !!d?.on && end > start, start, end };
  });
}

export const addDays = (d, n) => new Date(Date.parse(`${d}T12:00:00Z`) + n * 864e5).toISOString().slice(0, 10);
export const dowOf = (d) => new Date(`${d}T12:00:00Z`).getUTCDay();
export const dayHours = (sched, d) => { const h = sched[dowOf(d)]; return h && h.on ? h : null; };

export function montrealNow(at = new Date()) {
  const p = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(at);
  const g = (t) => p.find((x) => x.type === t).value;
  return { date: `${g('year')}-${g('month')}-${g('day')}`, hour: Number(g('hour')) % 24, minute: Number(g('minute')), day: g('day') };
}

export function fmtHour(h) {
  const hh = Math.floor(h) % 24, mm = Math.round((h - Math.floor(h)) * 60);
  if (h === 24) return 'midnight';
  const ap = hh < 12 ? 'am' : 'pm';
  const h12 = hh % 12 === 0 ? 12 : hh % 12;
  return mm ? `${h12}:${String(mm).padStart(2, '0')} ${ap}` : `${h12} ${ap}`;
}

export function blockAt(sched, date, hour, minute = 0) {
  const h = dayHours(sched, date);
  const t = hour + minute / 60;
  return h && t >= h.start && t < h.end ? 'high' : 'low';
}

// Minutes until the current block ends, plus when the next workstation block starts.
export function nextSwitch(sched, date, hour, minute) {
  const now = hour * 60 + minute;
  const today = dayHours(sched, date);
  if (blockAt(sched, date, hour, minute) === 'high') return { mins: Math.round(today.end * 60 - now), nextWsDate: null, nextStart: null };
  for (let k = 0; k < 8; k++) {
    const d = addDays(date, k);
    const h = dayHours(sched, d);
    if (!h) continue;
    const start = k * 1440 + h.start * 60;
    if (start > now) return { mins: Math.round(start - now), nextWsDate: d, nextStart: h.start };
  }
  return { mins: 0, nextWsDate: null, nextStart: null };
}

// Workstation hours left from now through the end of `until` (inclusive).
export function wsHoursThrough(sched, date, hour, minute, until) {
  const n = Math.round((Date.parse(until) - Date.parse(date)) / 864e5);
  if (n < 0) return 0;
  const now = hour + minute / 60;
  let total = 0;
  for (let k = 0; k <= n; k++) {
    const h = dayHours(sched, addDays(date, k));
    if (!h) continue;
    total += k === 0 ? Math.max(0, h.end - Math.max(now, h.start)) : h.end - h.start;
  }
  return total;
}

// "Mon–Fri 10 am–8 pm", or a short list when days differ.
export function summarize(sched) {
  const order = [1, 2, 3, 4, 5, 6, 0];
  const groups = [];
  for (const i of order) {
    const d = sched[i];
    if (!d.on) { groups.push(null); continue; }
    const last = groups[groups.length - 1];
    if (last && last.start === d.start && last.end === d.end) last.days.push(i);
    else groups.push({ start: d.start, end: d.end, days: [i] });
  }
  const parts = groups.filter(Boolean).map((g) => {
    const name = g.days.length > 1 ? `${DAY_NAMES[g.days[0]]}–${DAY_NAMES[g.days[g.days.length - 1]]}` : DAY_NAMES[g.days[0]];
    return `${name} ${fmtHour(g.start)}–${fmtHour(g.end)}`;
  });
  return parts.length ? parts.join(', ') : 'No workstation hours set';
}
