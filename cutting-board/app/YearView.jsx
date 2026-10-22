'use client';
import { useMemo, useState } from 'react';

/* Year view: a circular map of a twelve-month cycle with winter at the top.
   The cycle runs July → June, so the turn of the year sits at the peak of the circle. */

const C = 400;
const TRACKS = { event: 304, drop: 262, content: 220, deadline: 178 };
const INNER = 144;
const OUTER = 328;
export const KINDS = {
  event: { label: 'Events', color: '#6120ee' },
  drop: { label: 'Drops', color: '#0a4dce' },
  content: { label: 'Content', color: '#0a8fb0' },
  deadline: { label: 'Project deadlines', color: 'var(--text)' },
};
export const ROLES = { prep: 'Prep', rollout: 'Rollout', launch: 'Launch content', followup: 'Follow-up', support: 'Supporting' };
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const SEASONS = [
  { name: 'Winter', months: [11, 0, 1], fill: '#99ecff' },
  { name: 'Spring', months: [2, 3, 4], fill: '#f1ffd2' },
  { name: 'Summer', months: [5, 6, 7], fill: '#ffddfa' },
  { name: 'Autumn', months: [8, 9, 10], fill: '#d0b7f9' },
];

const parts = (d) => d.split('-').map(Number);
const dim = (y, m) => new Date(Date.UTC(y, m, 0)).getUTCDate(); // m is 1-based
// 0 rad = top, clockwise. Mid-January sits at the top.
function angleOf(d) {
  const [y, m, day] = parts(d);
  const mf = (m - 1) + (day - 1) / dim(y, m);
  return ((mf - 0.5) / 12) * Math.PI * 2;
}
const monthAngle = (mi) => ((mi - 0.5) / 12) * Math.PI * 2; // start edge of month mi
const pt = (r, a) => [C + r * Math.sin(a), C - r * Math.cos(a)];
function arc(r, a0, a1) {
  const [x0, y0] = pt(r, a0), [x1, y1] = pt(r, a1);
  return `M${x0.toFixed(1)} ${y0.toFixed(1)} A${r} ${r} 0 ${a1 - a0 > Math.PI ? 1 : 0} 1 ${x1.toFixed(1)} ${y1.toFixed(1)}`;
}
function sector(r0, r1, a0, a1) {
  const [ax, ay] = pt(r1, a0), [bx, by] = pt(r1, a1), [cx, cy] = pt(r0, a1), [dx, dy] = pt(r0, a0);
  const big = a1 - a0 > Math.PI ? 1 : 0;
  return `M${ax} ${ay} A${r1} ${r1} 0 ${big} 1 ${bx} ${by} L${cx} ${cy} A${r0} ${r0} 0 ${big} 0 ${dx} ${dy} Z`;
}
const cycleOf = (d) => { const [y, m] = parts(d); return m >= 7 ? y : y - 1; };
const inCycle = (d, cy) => d >= `${cy}-07-01` && d < `${cy + 1}-07-01`;
const daysBetween = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / 864e5);
const fmtDate = (d) => new Date(`${d}T12:00:00Z`).toLocaleDateString('en-CA', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' });
function fmtRange(e) {
  if (!e.start) return 'No date yet';
  if (!e.end) return fmtDate(e.start);
  const s = new Date(`${e.start}T12:00:00Z`), t = new Date(`${e.end}T12:00:00Z`);
  const sameMonth = s.getUTCMonth() === t.getUTCMonth();
  const a = s.toLocaleDateString('en-CA', { month: 'short', day: 'numeric', timeZone: 'UTC' });
  const b = t.toLocaleDateString('en-CA', sameMonth ? { day: 'numeric', timeZone: 'UTC' } : { month: 'short', day: 'numeric', timeZone: 'UTC' });
  return `${a}–${b}`;
}
function countdown(e, today) {
  const n = daysBetween(today, e.start);
  const endN = e.end ? daysBetween(today, e.end) : n;
  if (n <= 0 && endN >= 0) return 'Happening now';
  if (endN < 0) return `${-endN} day${endN === -1 ? '' : 's'} ago`;
  if (n === 1) return 'Tomorrow';
  return `In ${n} days`;
}

function EventSheet({ initial, anchors, hasKids, onClose, onSave, onDelete }) {
  const [f, setF] = useState({ title: '', kind: 'event', start: '', end: '', notes: '', ...initial });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));
  async function run(fn) {
    setBusy(true); setErr('');
    try { await fn(); } catch (e) { setErr(e.message); setBusy(false); }
  }
  return (
    <div className="sheet-wrap" role="dialog" aria-modal="true" aria-label={f.id ? 'Edit date' : 'Add to the year'}>
      <div className="sheet-scrim" onClick={onClose} />
      <div className="sheet">
        <div className="sheet-head"><h2>{f.id ? 'Edit' : 'Add to the year'}</h2><button className="x" aria-label="Close" onClick={onClose}>×</button></div>
        <form className="ev-form" onSubmit={(e) => { e.preventDefault(); run(() => onSave(f)); }}>
          <label className="field">Name
            <input value={f.title} onChange={set('title')} placeholder="Webinar, drop, shoot…" autoFocus={!f.id} />
          </label>
          <div className="ev-kinds" role="group" aria-label="Type">
            {['event', 'drop', 'content'].map((k) => (
              <button type="button" key={k} aria-pressed={f.kind === k} onClick={() => setF((x) => ({ ...x, kind: k }))}>
                <i style={{ background: KINDS[k].color }} />{KINDS[k].label.replace(/s$/, '')}
              </button>
            ))}
          </div>
          <div className="ev-dates">
            <label className="field">Date
              <input type="date" value={f.start || ''} onChange={set('start')} />
            </label>
            <label className="field">Ends (optional)
              <input type="date" value={f.end || ''} min={f.start || undefined} disabled={!f.start} onChange={set('end')} />
            </label>
          </div>
          <p className="ev-hint">Leave the date empty to keep it under “No date yet”.</p>
          {hasKids ? <p className="ev-hint">Other items are linked to this one, so it leads its own campaign.</p> : (
            <div className="ev-dates">
              <label className="field">Part of
                <select value={f.parent_id || ''} onChange={(e) => setF((x) => ({ ...x, parent_id: e.target.value ? Number(e.target.value) : null, role: x.role || 'support' }))}>
                  <option value="">Nothing, it stands alone</option>
                  {anchors.filter((a) => a.id !== f.id).map((a) => <option key={a.id} value={a.id}>{a.title}</option>)}
                </select>
              </label>
              {f.parent_id ? (
                <label className="field">Role
                  <select value={f.role || 'support'} onChange={set('role')}>
                    {Object.entries(ROLES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </label>
              ) : <span />}
            </div>
          )}
          <label className="field">Notes
            <textarea rows={3} value={f.notes || ''} onChange={set('notes')} />
          </label>
          {err && <p className="err" role="alert">{err}</p>}
          <div className="row">
            {f.id && <button type="button" className="btn out" disabled={busy} onClick={() => { if (confirm(`Delete “${f.title}”?`)) run(() => onDelete(f.id)); }}>Delete</button>}
            <button type="submit" className="btn" disabled={busy || !f.title.trim()}>{busy ? 'Saving…' : 'Save'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function YearView({ events, projects, today, onSave, onDelete }) {
  const [cy, setCy] = useState(() => cycleOf(today));
  const [focus, setFocus] = useState(null);
  const [sheet, setSheet] = useState(null);
  const [hidden, setHidden] = useState({});

  const items = useMemo(() => {
    const ev = events.map((e) => ({ ...e, key: `e${e.id}`, editable: true }));
    const dl = projects.filter((p) => p.deadline).map((p) => ({ key: `p${p.id}`, title: p.name, kind: 'deadline', start: p.deadline, end: null, notes: p.lane ? `${p.lane} project deadline` : 'Project deadline' }));
    return [...ev, ...dl];
  }, [events, projects]);

  const evById = useMemo(() => Object.fromEntries(events.map((e) => [e.id, e])), [events]);
  const anchors = events.filter((e) => !e.parent_id);
  const hasKids = (id) => events.some((e) => e.parent_id === id);
  const dated = items.filter((e) => e.start && !hidden[e.kind]);
  const onRing = dated.filter((e) => inCycle(e.start, cy) || (e.end && inCycle(e.end, cy)));
  const upcoming = dated.filter((e) => (e.end || e.start) >= today).sort((a, b) => a.start.localeCompare(b.start));
  const undated = items.filter((e) => !e.start);
  const next = upcoming[0] || null;
  const shown = (focus && items.find((e) => e.key === focus)) || next;
  // Campaign = a main item plus the items linked to it.
  const famId = shown && shown.editable ? (shown.parent_id || shown.id) : null;
  const family = famId ? items.filter((e) => e.editable && (e.id === famId || e.parent_id === famId)) : [];
  const campaign = family.length > 1 ? {
    anchor: family.find((e) => e.id === famId),
    kids: family.filter((e) => e.id !== famId).sort((a, b) => (a.start || '9999').localeCompare(b.start || '9999')),
  } : null;
  const famKeys = new Set(family.map((e) => e.key));
  const dimOthers = !!(focus && campaign);
  const partOf = (e) => (e.parent_id && evById[e.parent_id] ? `${ROLES[e.role] || 'Supporting'} · ${evById[e.parent_id].title}` : null);
  const todayOn = inCycle(today, cy);
  const ta = angleOf(today);
  const boundary = monthAngle(0);

  function clampToCycle(d, lo) {
    if (inCycle(d, cy)) return d;
    return lo ? `${cy}-07-01` : `${cy + 1}-06-30`;
  }

  return (
    <section className="card c-year" aria-labelledby="yr-h">
      <div className="head">
        <div><h2 id="yr-h">The year</h2><div className="sub">Winter sits at the top. Tap a mark to see it.</div></div>
        <div className="head-r">
          <div className="yr-nav">
            <button aria-label="Previous year" onClick={() => setCy(cy - 1)}>‹</button>
            <span>{cy}–{String(cy + 1).slice(2)}</span>
            <button aria-label="Next year" onClick={() => setCy(cy + 1)}>›</button>
          </div>
          <button className="btn sm" onClick={() => setSheet({})}>Add date</button>
        </div>
      </div>

      <div className="yr-grid">
        <div className="yr-ring">
          <div className="yr-dial">
          <svg viewBox="-24 -24 848 848" role="img" aria-label={`Year map, July ${cy} to June ${cy + 1}`}>
            {SEASONS.map((s) => s.months.map((mi) => (
              <path key={`${s.name}${mi}`} d={sector(INNER, OUTER, monthAngle(mi), monthAngle(mi + 1))} fill={s.fill} opacity="0.55" />
            )))}
            {Object.entries(TRACKS).map(([k, r]) => !hidden[k] && (
              <circle key={k} cx={C} cy={C} r={r} fill="none" stroke="var(--line)" strokeWidth="1.5" />
            ))}
            {MONTHS.map((m, mi) => {
              const a0 = monthAngle(mi), [x0, y0] = pt(INNER, a0), [x1, y1] = pt(OUTER, a0);
              const [lx, ly] = pt(356, monthAngle(mi + 0.5));
              const yr = mi >= 6 ? cy : cy + 1;
              const current = todayOn && Number(today.slice(5, 7)) - 1 === mi && Number(today.slice(0, 4)) === yr;
              return (
                <g key={m}>
                  <line x1={x0} y1={y0} x2={x1} y2={y1} stroke="var(--bg)" strokeWidth="2" />
                  <text x={lx} y={ly + 5} textAnchor="middle" className={`yr-month ${current ? 'now' : ''}`}>{m}</text>
                </g>
              );
            })}
            {(() => {
              const [x0, y0] = pt(INNER - 6, boundary), [x1, y1] = pt(OUTER + 6, boundary);
              const [ax, ay] = pt(388, boundary - 0.09), [bx, by] = pt(388, boundary + 0.09);
              return (
                <g aria-hidden="true">
                  <line x1={x0} y1={y0} x2={x1} y2={y1} stroke="var(--text)" strokeWidth="2" strokeDasharray="4 4" />
                  <text x={ax} y={ay} textAnchor="end" className="yr-year">{cy}</text>
                  <text x={bx} y={by} textAnchor="start" className="yr-year">{cy + 1}</text>
                </g>
              );
            })()}
            <circle cx={C} cy={C} r={OUTER} fill="transparent" onClick={() => setFocus(null)} />
            {campaign && (() => {
              const posOf = (e) => (e.start && inCycle(e.start, cy) && !hidden[e.kind] ? { r: TRACKS[e.kind] || TRACKS.event, a: angleOf(e.start) } : null);
              const from = posOf(campaign.anchor);
              if (!from) return null;
              const [x0, y0] = pt(from.r, from.a);
              return (
                <g aria-hidden="true" fill="none" strokeWidth="2" strokeDasharray="5 5">
                  {campaign.kids.map((k) => {
                    const to = posOf(k);
                    if (!to) return null;
                    let a1 = to.a;
                    if (a1 - from.a > Math.PI) a1 -= Math.PI * 2;
                    if (from.a - a1 > Math.PI) a1 += Math.PI * 2;
                    const [x1, y1] = pt(to.r, to.a), [qx, qy] = pt(Math.min(from.r, to.r) * 0.62, (from.a + a1) / 2);
                    return <path key={k.key} d={`M${x0} ${y0} Q${qx} ${qy} ${x1} ${y1}`} stroke={KINDS[k.kind]?.color || KINDS.event.color} />;
                  })}
                </g>
              );
            })()}
            {todayOn && (() => {
              const [x0, y0] = pt(INNER, ta), [x1, y1] = pt(OUTER + 10, ta);
              return <g aria-hidden="true"><line x1={x0} y1={y0} x2={x1} y2={y1} stroke="var(--hot)" strokeWidth="3" strokeLinecap="round" /><circle cx={x1} cy={y1} r="6" fill="var(--hot)" /></g>;
            })()}
            {onRing.map((e) => {
              const r = TRACKS[e.kind] || TRACKS.event;
              const color = KINDS[e.kind]?.color || KINDS.event.color;
              const past = (e.end || e.start) < today;
              const active = shown && shown.key === e.key;
              const sel = { onClick: (ev) => { ev.stopPropagation(); setFocus(e.key); }, onMouseEnter: () => setFocus(e.key), style: { cursor: 'pointer' } };
              const op = dimOthers && !famKeys.has(e.key) ? 0.18 : past ? 0.4 : 1;
              if (e.end) {
                const a0 = angleOf(clampToCycle(e.start, true));
                let a1 = angleOf(clampToCycle(e.end, false)) + 0.01;
                if (a1 < a0) a1 += Math.PI * 2;
                a1 = Math.max(a1, a0 + 0.035);
                return (
                  <g key={e.key} {...sel} opacity={op}>
                    <path d={arc(r, a0, a1)} stroke={color} strokeWidth={active ? 22 : 16} strokeLinecap="round" fill="none" />
                    <path d={arc(r, a0, a1)} stroke="transparent" strokeWidth="36" fill="none"><title>{`${e.title} · ${fmtRange(e)}`}</title></path>
                  </g>
                );
              }
              const [x, y] = pt(r, angleOf(e.start));
              return (
                <g key={e.key} {...sel} opacity={op}>
                  <circle cx={x} cy={y} r={active ? 13 : 9} fill={color} stroke="var(--bg)" strokeWidth="3" />
                  <circle cx={x} cy={y} r="20" fill="transparent"><title>{`${e.title} · ${fmtRange(e)}`}</title></circle>
                </g>
              );
            })}
          </svg>
          <div className="yr-center" aria-live="polite">
            {shown ? (
              <>
                <span className="yr-k" style={{ color: KINDS[shown.kind]?.color }}>{shown === next && !focus ? 'Next up' : KINDS[shown.kind]?.label.replace(/s$/, '')}</span>
                <b className="yr-count">{shown.start ? countdown(shown, today) : 'No date yet'}</b>
                <span className="yr-title">{shown.title}</span>
                <span className="yr-date">{fmtRange(shown)}</span>
                {shown.editable && <button className="link" onClick={() => setSheet(shown)}>Edit</button>}
              </>
            ) : <span className="yr-title">Add a date to start the map.</span>}
          </div>
          </div>
          {shown && (
            <div className="yr-focus-m">
              <i style={{ background: KINDS[shown.kind]?.color }} />
              <span className="yl-main"><span className="yl-title">{shown.title}</span><span className="yl-date">{fmtRange(shown)}</span></span>
              {shown.editable && <button className="link" onClick={() => setSheet(shown)}>Edit</button>}
            </div>
          )}
        </div>

        <div className="yr-side">
          <div className="yr-legend" role="group" aria-label="Show tracks">
            {Object.entries(KINDS).map(([k, v]) => (
              <button key={k} aria-pressed={!hidden[k]} onClick={() => setHidden((h) => ({ ...h, [k]: !h[k] }))}>
                <i style={{ background: v.color }} />{v.label}
              </button>
            ))}
          </div>

          {campaign && (
            <div className="yr-camp">
              <div className="yr-camp-h"><h3>Campaign</h3>{focus && <button className="link" onClick={() => setFocus(null)}>Show everything</button>}</div>
              <button className="yr-camp-main" onClick={() => setSheet(campaign.anchor)}>
                <i style={{ background: KINDS[campaign.anchor.kind]?.color }} />
                <span className="yl-main"><span className="yl-title">{campaign.anchor.title}</span><span className="yl-date">{fmtRange(campaign.anchor)}</span></span>
              </button>
              <ul className="yr-list yr-kids">
                {campaign.kids.map((k) => (
                  <li key={k.key} className={shown && shown.key === k.key ? 'on' : ''}>
                    <button onMouseEnter={() => setFocus(k.key)} onClick={() => setSheet(k)}>
                      <i style={{ background: KINDS[k.kind]?.color }} />
                      <span className="yl-main"><span className="yl-title">{k.title}</span><span className="yl-date">{ROLES[k.role] || 'Supporting'} · {fmtRange(k)}</span></span>
                    </button>
                  </li>
                ))}
              </ul>
              <button className="btn sm out" onClick={() => setSheet({ parent_id: campaign.anchor.id, role: 'support', kind: 'content' })}>Add to this campaign</button>
            </div>
          )}

          <h3>Coming up</h3>
          {upcoming.length === 0 ? <p className="fit">Nothing dated ahead. Add a date to place it on the ring.</p> : (
            <ul className="yr-list">
              {upcoming.slice(0, 8).map((e) => (
                <li key={e.key} className={shown && shown.key === e.key ? 'on' : ''}>
                  <button onMouseEnter={() => { setFocus(e.key); setCy(cycleOf(e.start)); }} onClick={() => (e.editable ? setSheet(e) : setFocus(e.key))}>
                    <i style={{ background: KINDS[e.kind]?.color }} />
                    <span className="yl-main"><span className="yl-title">{e.title}</span><span className="yl-date">{fmtRange(e)}{partOf(e) ? ` · ${partOf(e)}` : ''}</span></span>
                    <span className="yl-when">{countdown(e, today)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          <h3>No date yet <b>{undated.length}</b></h3>
          {undated.length === 0 ? <p className="fit">Everything has a date.</p> : (
            <ul className="yr-list undated">
              {undated.map((e) => (
                <li key={e.key}>
                  <button onMouseEnter={() => setFocus(e.key)} onClick={() => setSheet(e)}>
                    <i style={{ background: KINDS[e.kind]?.color }} />
                    <span className="yl-main"><span className="yl-title">{e.title}</span>{(partOf(e) || e.notes) && <span className="yl-date">{partOf(e) || e.notes}</span>}</span>
                    <span className="yl-when set">Set date</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {sheet && (
        <EventSheet initial={sheet} anchors={anchors} hasKids={!!sheet.id && hasKids(sheet.id)} onClose={() => setSheet(null)}
          onSave={async (f) => { await onSave(f); setSheet(null); if (f.start) setCy(cycleOf(f.start)); }}
          onDelete={async (id) => { await onDelete(id); setSheet(null); setFocus(null); }} />
      )}
    </section>
  );
}
