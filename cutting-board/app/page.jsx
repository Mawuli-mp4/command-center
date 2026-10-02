'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

const TZ = 'America/Toronto'; // Montreal
const HIGH_START = 7;
const HIGH_END = 15;
const LANE_COLORS = { Strategy: '#6120ee', Production: '#4a17b0', Hopamine: '#0a8fb0', Business: '#ab77ff' };
const FALLBACK = ['#0a4dce', '#6120ee', '#0a8fb0', '#ab77ff', '#4a17b0'];
const laneColor = (l) => LANE_COLORS[l] || FALLBACK[[...(l || 'Other')].reduce((a, c) => a + c.charCodeAt(0), 0) % FALLBACK.length];

/* ---------------- helpers ---------------- */
function montreal() {
  const p = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(new Date());
  const g = (t) => p.find((x) => x.type === t).value;
  const date = `${g('year')}-${g('month')}-${g('day')}`;
  const noon = new Date(`${date}T12:00:00Z`);
  return {
    date, hour: Number(g('hour')) % 24, minute: Number(g('minute')),
    weekday: noon.toLocaleDateString('en-CA', { weekday: 'long', timeZone: 'UTC' }),
    monthYear: noon.toLocaleDateString('en-CA', { month: 'long', year: 'numeric', timeZone: 'UTC' }),
    day: g('day'),
  };
}
const addDays = (d, n) => new Date(Date.parse(`${d}T12:00:00Z`) + n * 864e5).toISOString().slice(0, 10);
const daysUntil = (d, today) => Math.round((Date.parse(d) - Date.parse(today)) / 864e5);
const shortDay = (d) => new Date(`${d}T12:00:00Z`).toLocaleDateString('en-CA', { weekday: 'short', timeZone: 'UTC' });
const monthDay = (d) => new Date(`${d}T12:00:00Z`).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', timeZone: 'UTC' });
const initials = (n) => n.split(/[\s,]+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
function dueText(n) {
  if (n === null) return 'No deadline';
  if (n < 0) return `${-n}d overdue`;
  if (n === 0) return 'Due today';
  if (n === 1) return 'Due tomorrow';
  return `Due in ${n} days`;
}
function ago(ts) {
  const m = Math.round((Date.now() - Date.parse(ts)) / 6e4);
  if (m < 60) return `${Math.max(m, 1)}m`;
  if (m < 1440) return `${Math.round(m / 60)}h`;
  return `${Math.round(m / 1440)}d`;
}
function b64ToBytes(s) {
  const pad = '='.repeat((4 - (s.length % 4)) % 4);
  const raw = atob((s + pad).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}
async function api(path, { method = 'GET', body } = {}) {
  const r = await fetch(path, { method, headers: { 'content-type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  if (r.status === 401) { location.href = '/login'; throw new Error('Signed out'); }
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || 'Something went wrong. Refresh and try again.');
  return j;
}

/* ---------------- pixel creatures ---------------- */
const CREATURES = [
  { c: '#f1ffd2', o: '#004012', rows: ['..XXXX..', '.XXXXXX.', 'XXOXXOXX', 'XXXXXXXX', 'XXXXXXXX', '.X.XX.X.', 'X.X..X.X'] },
  { c: '#ab77ff', o: '#4a17b0', rows: ['.XXXXXX.', 'XXXXXXXX', 'XXOOXOOX', 'XXXXXXXX', '.XXXXXX.', '..X..X..'] },
  { c: '#ffddfa', o: '#4a17b0', rows: ['...XX...', '..XXXX..', '.XXOOXX.', 'XXXXXXXX', 'X.XXXX.X', '..X..X..'] },
];
function Pixel({ i, size, style, className = '' }) {
  const cr = CREATURES[i];
  const w = cr.rows[0].length, h = cr.rows.length;
  return (
    <svg className={`px ${className}`} style={style} width={w * size} height={h * size} viewBox={`0 0 ${w} ${h}`} shapeRendering="crispEdges" aria-hidden="true">
      {cr.rows.flatMap((row, y) => [...row].map((ch, x) => (ch === '.' ? null : <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill={ch === 'O' ? cr.o : cr.c} />)))}
    </svg>
  );
}

/* ---------------- band ---------------- */
function Band({ clock, mode, onLog, onNotify, pushState }) {
  const [text, setText] = useState('');
  const inputRef = useRef(null);
  const mins = clock.hour * 60 + clock.minute;
  const end = mode === 'high' ? HIGH_END * 60 : clock.hour >= HIGH_END ? (24 + HIGH_START) * 60 : HIGH_START * 60;
  const left = end - mins;
  const hhmm = `${String(clock.hour).padStart(2, '0')}:${String(clock.minute).padStart(2, '0')}`;
  return (
    <div className="band">
      <Pixel i={0} size={12} style={{ right: '6%', top: 18, transform: 'rotate(-6deg)', opacity: 0.9 }} />
      <Pixel i={1} size={10} className="sm-hide" style={{ left: '24%', top: 10, transform: 'rotate(5deg)', opacity: 0.85 }} />
      <Pixel i={2} size={8} className="sm-hide" style={{ right: '30%', top: 64, opacity: 0.9 }} />
      <div className="wrap">
        <div className="top">
          <span className="brand">Cutting Board</span>
          <div className="top-r">
            <button className="ghost" onClick={onNotify} disabled={pushState === 'working'}>
              {pushState === 'on' ? <><span className="lg">Test </span>notification</> : pushState === 'working' ? 'Turning on…' : <><span className="lg">Turn on </span>notifications</>}
            </button>
            <span className="avatar" aria-hidden="true">MC</span>
          </div>
        </div>
        <section className="hero">
          <div>
            <div className="date">
              <div className="date-tile">{clock.day}</div>
              <div className="date-txt"><b>{clock.weekday}</b><span>{clock.monthYear}</span></div>
            </div>
            <div className="block-row">
              <span className={`chip ${mode === 'low' ? 'low' : ''}`}><i />{mode === 'high' ? 'Workstation block' : 'Laptop block'}</span>
              <span className="chip">{Math.floor(left / 60)}h {String(left % 60).padStart(2, '0')}m left</span>
            </div>
          </div>
          <div className="ask">
            <h1 className="ask-label">What moved today?</h1>
            <form className="ask-form" onSubmit={(e) => { e.preventDefault(); if (text.trim()) { onLog(text.trim()); setText(''); } }}>
              <label htmlFor="ask" className="sr">Log an update</label>
              <input ref={inputRef} id="ask" className="ask-input" value={text} onChange={(e) => setText(e.target.value)}
                placeholder="Talk it through…" autoComplete="off" />
              <button className="btn sq" type="button" aria-label="Dictate" onClick={() => inputRef.current?.focus()}>
                <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 15a3 3 0 0 0 3-3V6a3 3 0 1 0-6 0v6a3 3 0 0 0 3 3Zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.92V21h2v-2.08A7 7 0 0 0 19 12h-2Z" /></svg>
              </button>
              <button className="btn" type="submit">Log</button>
            </form>
          </div>
        </section>
        <div className="strip">
          <div className="track" role="img" aria-label={`Now ${hhmm}. Workstation block runs 7 am to 3 pm.`}>
            <span className="seg hi" style={{ left: `${(HIGH_START / 24) * 100}%`, width: `${((HIGH_END - HIGH_START) / 24) * 100}%` }} />
            <span className="ph" style={{ left: `${(mins / 1440) * 100}%` }}><span>{hhmm}</span></span>
          </div>
          <div className="ticks" aria-hidden="true">
            <span>0:00</span><span style={{ left: `${(7 / 24) * 100}%` }}>7:00</span>
            <span style={{ left: `${(15 / 24) * 100}%` }}>15:00</span><span style={{ left: '100%' }}>24:00</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------- week chart ---------------- */
function WeekChart({ week }) {
  const ref = useRef(null);
  const [w, setW] = useState(640);
  const [tip, setTip] = useState(null);
  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(([e]) => setW(Math.max(300, Math.round(e.contentRect.width))));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  const total = week.reduce((s, d) => s + d.ws + d.lt, 0);
  const H = w < 500 ? 180 : 220, pad = 28;
  const max = Math.max(6, ...week.map((d) => d.ws + d.lt));
  const step = Math.ceil(max / 3);
  const bw = (w - pad) / 7, inner = bw * 0.56;
  const y = (v) => H - (v / max) * (H - 24);
  const grid = [];
  for (let v = 0; v <= max; v += step) grid.push(v);
  return (
    <>
      <div className="head">
        <div><div className="big">{total}</div><div className="sub">Tasks closed, last 7 days</div></div>
        <div className="legend"><span><i style={{ background: 'var(--ws)' }} />Workstation</span><span><i style={{ background: 'var(--lt)' }} />Laptop</span></div>
      </div>
      <div className="chart" ref={ref} onMouseLeave={() => setTip(null)}>
        <svg viewBox={`0 0 ${w} ${H + 28}`} role="img" aria-label={`${total} tasks closed in the last 7 days`}>
          {grid.map((v) => (
            <g key={v}><line x1={pad} x2={w} y1={y(v)} y2={y(v)} stroke="var(--line)" /><text x="0" y={y(v) + 4} fontSize="11" fill="var(--muted)">{v}</text></g>
          ))}
          {week.map((d, i) => {
            const x = pad + i * bw + (bw - inner) / 2, today = i === 6;
            return (
              <g key={d.date}>
                <rect x={x} y={y(max)} width={inner} height={H - y(max)} rx="4" fill="var(--fog)" />
                {d.ws > 0 && <rect x={x} y={y(d.ws)} width={inner} height={H - y(d.ws)} rx="4" fill="var(--ws)" />}
                {d.lt > 0 && <rect x={x} y={y(d.ws + d.lt)} width={inner} height={Math.max(2, y(d.ws) - y(d.ws + d.lt) - (d.ws ? 3 : 0))} rx="4" fill="var(--lt)" />}
                <text x={x + inner / 2} y={H + 20} fontSize="12" textAnchor="middle" fill={today ? 'var(--text)' : 'var(--muted)'} fontWeight={today ? 600 : 400}>{today ? 'Today' : shortDay(d.date)}</text>
                <rect x={pad + i * bw} y="0" width={bw} height={H} fill="transparent"
                  onMouseEnter={() => setTip(i)} onClick={() => setTip(i)} />
              </g>
            );
          })}
        </svg>
        {tip !== null && (
          <div className="tip" style={{ left: Math.max(0, Math.min(pad + tip * bw + bw / 2 - 80, w - 170)) }}>
            <b>{shortDay(week[tip].date)}, {monthDay(week[tip].date)}</b>
            <div><span>Workstation</span><span>{week[tip].ws}</span></div>
            <div><span>Laptop</span><span>{week[tip].lt}</span></div>
          </div>
        )}
      </div>
    </>
  );
}

/* ---------------- task row ---------------- */
function TaskRow({ t, sub, actions, showDelete }) {
  return (
    <li className={`task ${t.done ? 'done' : ''}`}>
      <label>
        <input type="checkbox" checked={t.done} onChange={() => actions.toggle(t)} />
        <span className="box" aria-hidden="true" />
        <span className="t-title">{t.title}{sub && <small>{sub}</small>}</span>
      </label>
      <button type="button" className={`tag ${t.compute}`} onClick={() => actions.flip(t)}
        aria-label={`${t.compute === 'high' ? 'Workstation' : 'Laptop'} block. Tap to switch.`}>
        {t.compute === 'high' ? 'Workstation' : 'Laptop'}
      </button>
      {showDelete && <button type="button" className="x" aria-label={`Delete ${t.title}`} onClick={() => actions.removeTask(t)}>×</button>}
    </li>
  );
}

function AddTask({ projectId, defaultCompute, onAdd }) {
  const [title, setTitle] = useState('');
  const [est, setEst] = useState('');
  const [compute, setCompute] = useState(defaultCompute);
  return (
    <form className="add-task" onSubmit={(e) => { e.preventDefault(); if (title.trim()) { onAdd(projectId, title, compute, est); setTitle(''); setEst(''); } }}>
      <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Add a task" aria-label="New task" />
      <input className="est" value={est} onChange={(e) => setEst(e.target.value)} placeholder="hrs" inputMode="decimal" aria-label="Estimated hours" />
      <button type="button" className={`tag ${compute}`} onClick={() => setCompute(compute === 'high' ? 'low' : 'high')}>
        {compute === 'high' ? 'Workstation' : 'Laptop'}
      </button>
      <button className="btn sm" type="submit">Add</button>
    </form>
  );
}

function ProjectRow({ p, tasks, today, open, onOpen, actions, mode }) {
  const done = tasks.filter((t) => t.done).length;
  const pct = tasks.length ? (done / tasks.length) * 100 : 0;
  const d = p.deadline ? daysUntil(p.deadline, today) : null;
  const color = laneColor(p.lane);
  return (
    <div className={`proj ${p.status}`} data-open={open ? 1 : 0}>
      <button className="proj-h" aria-expanded={open} onClick={onOpen}>
        <span className="mark" style={{ background: color }}>{initials(p.name)}</span>
        <span>
          <span className="p-name">{p.name}<small>{done}/{tasks.length}</small></span>
          <span className="bar"><span style={{ width: `${pct}%`, background: color }} /></span>
          <span className="p-meta">
            {p.lane || 'No lane'} · {p.status === 'active'
              ? <span className={d !== null && d <= 1 ? 'hot' : ''}>{dueText(d)}</span>
              : p.status === 'done' ? 'Wrapped' : 'Paused'}
          </span>
        </span>
        <svg className="caret" width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="m9 6 6 6-6 6-1.4-1.4L12.2 12 7.6 7.4z" /></svg>
      </button>
      {open && (
        <div className="p-body">
          {p.summary && <p className="summary">{p.summary}</p>}
          <ul className="tasks">
            {tasks.map((t) => <TaskRow key={t.id} t={t} actions={actions} showDelete sub={t.est_hours ? `~${t.est_hours}h` : null} />)}
          </ul>
          <AddTask projectId={p.id} defaultCompute={mode} onAdd={actions.addTask} />
          <div className="p-actions">
            <label className="field">Deadline
              <input type="date" value={p.deadline || ''} onChange={(e) => actions.patchProject(p.id, { deadline: e.target.value })} />
            </label>
            <label className="field">Priority
              <select value={p.priority} onChange={(e) => actions.patchProject(p.id, { priority: e.target.value })}>
                <option value={0}>Now</option><option value={1}>Next</option><option value={2}>Soon</option><option value={3}>Later</option>
              </select>
            </label>
            {p.status === 'active'
              ? <><button className="btn sm out" onClick={() => actions.patchProject(p.id, { status: 'paused' })}>Pause</button>
                  <button className="btn sm out" onClick={() => actions.patchProject(p.id, { status: 'done' })}>Wrap</button></>
              : <button className="btn sm out" onClick={() => actions.patchProject(p.id, { status: 'active' })}>Reopen</button>}
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------------- composer sheet ---------------- */
function Composer({ initial, projects, ai, onClose, onSaved }) {
  const [text, setText] = useState(initial);
  const [target, setTarget] = useState(ai ? 'auto' : String(projects[0]?.id || ''));
  const [busy, setBusy] = useState(false);
  const [proposal, setProposal] = useState(null);
  const [err, setErr] = useState('');
  const name = (id) => projects.find((p) => p.id === id)?.name || 'Unknown project';

  const submit = useCallback(async (t = text, tg = target) => {
    if (!t.trim()) return;
    setBusy(true); setErr('');
    try {
      if (tg === 'auto') setProposal((await api('/api/parse', { method: 'POST', body: { text: t } })).items);
      else { await api('/api/updates', { method: 'POST', body: { project_id: Number(tg), body: t } }); onSaved('Update saved'); }
    } catch (e) { setErr(e.message); }
    setBusy(false);
  }, [text, target, onSaved]);

  useEffect(() => { if (ai && initial) submit(initial, 'auto'); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function apply() {
    setBusy(true);
    try { await api('/api/apply', { method: 'POST', body: { items: proposal } }); onSaved(`Filed under ${proposal.map((i) => name(i.project_id)).join(', ')}`); }
    catch (e) { setErr(e.message); setBusy(false); }
  }

  return (
    <div className="sheet-wrap" role="dialog" aria-modal="true" aria-label="Log an update">
      <div className="sheet-scrim" onClick={onClose} />
      <div className="sheet">
        <div className="sheet-head"><h2>{proposal ? 'Check before saving' : 'Log an update'}</h2><button className="x" aria-label="Close" onClick={onClose}>×</button></div>
        {!proposal ? (
          <>
            <textarea rows={5} value={text} onChange={(e) => setText(e.target.value)} placeholder="Tap the mic on your keyboard and talk it through." />
            <label className="field wide">File under
              <select value={target} onChange={(e) => setTarget(e.target.value)}>
                {ai && <option value="auto">Let AI sort it across projects</option>}
                {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </label>
            {err && <p className="err" role="alert">{err}</p>}
            <button className="btn full" disabled={busy || !text.trim()} onClick={() => submit()}>
              {busy ? 'Sorting…' : target === 'auto' ? 'Sort update' : 'Save update'}
            </button>
          </>
        ) : (
          <>
            {proposal.length === 0 && <p className="summary">Nothing matched a project. Go back and pick one.</p>}
            {proposal.map((i, k) => (
              <div className="proposal" key={k} style={{ borderColor: laneColor(projects.find((p) => p.id === i.project_id)?.lane) }}>
                <h3>{name(i.project_id)}</h3>
                {i.update && <p>{i.update}</p>}
                {i.complete_task_ids.length > 0 && <p className="pmeta">Closes {i.complete_task_ids.length} task{i.complete_task_ids.length > 1 ? 's' : ''}</p>}
                {i.new_tasks.map((t, j) => <p className="pmeta" key={j}>New task: {t.title} ({t.compute === 'high' ? 'workstation' : 'laptop'})</p>)}
              </div>
            ))}
            {err && <p className="err" role="alert">{err}</p>}
            <div className="row">
              <button className="btn out" onClick={() => setProposal(null)}>Edit memo</button>
              <button className="btn" disabled={busy || proposal.length === 0} onClick={apply}>{busy ? 'Saving…' : 'Save all'}</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ---------------- page ---------------- */
export default function Board() {
  const [s, setS] = useState(null);
  const [err, setErr] = useState('');
  const [clock, setClock] = useState(null);
  const [open, setOpen] = useState({});
  const [composer, setComposer] = useState(null);
  const [qAll, setQAll] = useState(false);
  const [pushState, setPushState] = useState('idle');
  const [toast, setToast] = useState('');

  const load = useCallback(async () => {
    try { setS(await api('/api/state')); setErr(''); } catch (e) { setErr(e.message); }
  }, []);
  const say = useCallback((m) => { setToast(m); clearTimeout(say.t); say.t = setTimeout(() => setToast(''), 2600); }, []);

  useEffect(() => {
    setClock(montreal());
    load();
    const t = setInterval(() => setClock(montreal()), 30000);
    const vis = () => { if (document.visibilityState === 'visible') { setClock(montreal()); load(); } };
    document.addEventListener('visibilitychange', vis);
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js');
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') setPushState('on');
    return () => { clearInterval(t); document.removeEventListener('visibilitychange', vis); };
  }, [load]);

  const mode = clock && clock.hour >= HIGH_START && clock.hour < HIGH_END ? 'high' : 'low';
  const today = clock?.date;
  const ready = !!s?.projects && !!today;

  const byProject = useMemo(() => {
    const m = {};
    for (const p of s?.projects || []) m[p.id] = { tasks: [], updates: [] };
    for (const t of s?.tasks || []) m[t.project_id]?.tasks.push(t);
    for (const u of s?.updates || []) m[u.project_id]?.updates.push(u);
    return m;
  }, [s]);

  const derived = useMemo(() => {
    if (!ready) return null;
    const proj = Object.fromEntries(s.projects.map((p) => [p.id, p]));
    const active = s.projects.filter((p) => p.status === 'active');
    const activeTasks = active.flatMap((p) => byProject[p.id].tasks);
    const open = activeTasks.filter((t) => !t.done);

    const week = Array.from({ length: 7 }, (_, i) => ({ date: addDays(today, i - 6), ws: 0, lt: 0 }));
    for (const c of s.closed || []) {
      const d = week.find((x) => x.date === c.day);
      if (d) d[c.compute === 'high' ? 'ws' : 'lt'] += c.n;
    }

    const pct = activeTasks.length ? Math.round((activeTasks.filter((t) => t.done).length / activeTasks.length) * 100) : 0;
    const dueSoon = active.filter((p) => p.deadline && daysUntil(p.deadline, today) <= 3 && byProject[p.id].tasks.some((t) => !t.done)).length;
    const updWeek = s.updates.filter((u) => Date.now() - Date.parse(u.created_at) < 7 * 864e5).length;

    // Deadline fit: nearest deadline project with hour estimates on open workstation tasks
    let fit = null;
    const dated = active.filter((p) => p.deadline && daysUntil(p.deadline, today) >= 0)
      .sort((a, b) => a.deadline.localeCompare(b.deadline));
    for (const p of dated) {
      const need = byProject[p.id].tasks.filter((t) => !t.done && t.compute === 'high' && t.est_hours).reduce((a, t) => a + Number(t.est_hours), 0);
      if (!need) continue;
      const n = daysUntil(p.deadline, today);
      const mins = clock.hour * 60 + clock.minute;
      const todayLeft = mins < HIGH_START * 60 ? 8 : mins >= HIGH_END * 60 ? 0 : (HIGH_END * 60 - mins) / 60;
      fit = { p, need: Math.ceil(need), avail: Math.floor(todayLeft + 8 * n), n };
      break;
    }

    const lanes = {};
    for (const t of open) { const l = proj[t.project_id].lane || 'Other'; lanes[l] = (lanes[l] || 0) + 1; }
    const laneList = Object.entries(lanes).sort((a, b) => b[1] - a[1]);

    const queue = open
      .filter((t) => qAll || t.compute === mode)
      .sort((a, b) => { const pa = proj[a.project_id], pb = proj[b.project_id];
        return pa.priority - pb.priority || (pa.deadline || '9999').localeCompare(pb.deadline || '9999') || a.sort - b.sort; })
      .slice(0, 6);

    return { proj, active, open, week, pct, dueSoon, updWeek, fit, laneList, queue };
  }, [ready, s, byProject, today, clock, mode, qAll]);

  const patchTask = (id, f) => setS((cur) => ({ ...cur, tasks: cur.tasks.map((t) => (t.id === id ? { ...t, ...f } : t)) }));
  const actions = {
    toggle: async (t) => {
      patchTask(t.id, { done: !t.done });
      try { await api(`/api/tasks/${t.id}`, { method: 'PATCH', body: { done: !t.done } }); if (!t.done) say(`Closed: ${t.title}`); load(); }
      catch (e) { setErr(e.message); }
    },
    flip: async (t) => { const c = t.compute === 'high' ? 'low' : 'high'; patchTask(t.id, { compute: c }); await api(`/api/tasks/${t.id}`, { method: 'PATCH', body: { compute: c } }).catch((e) => setErr(e.message)); },
    removeTask: async (t) => { if (!confirm(`Delete “${t.title}”?`)) return; setS((cur) => ({ ...cur, tasks: cur.tasks.filter((x) => x.id !== t.id) })); await api(`/api/tasks/${t.id}`, { method: 'DELETE' }).catch((e) => setErr(e.message)); },
    addTask: async (project_id, title, compute, est_hours) => {
      try { const row = await api('/api/tasks', { method: 'POST', body: { project_id, title, compute, est_hours } }); setS((cur) => ({ ...cur, tasks: [...cur.tasks, row] })); }
      catch (e) { setErr(e.message); }
    },
    patchProject: async (id, body) => { try { await api(`/api/projects/${id}`, { method: 'PATCH', body }); load(); } catch (e) { setErr(e.message); } },
  };

  async function newProject() {
    const name = prompt('Project name');
    if (!name) return;
    const lane = prompt('Lane (Strategy, Production, Hopamine, Business, or your own)') || null;
    try { const { id } = await api('/api/projects', { method: 'POST', body: { name, lane } }); await load(); setOpen((o) => ({ ...o, [id]: true })); }
    catch (e) { setErr(e.message); }
  }

  async function enablePush() {
    const standalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone;
    if (!('PushManager' in window) || !standalone) {
      alert('On iPhone, notifications only work from the Home Screen app. In Safari tap Share, then Add to Home Screen, then open Board from there.');
      return;
    }
    const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!key) { setErr('Add the VAPID keys in Vercel to turn on notifications.'); return; }
    setPushState('working');
    try {
      if ((await Notification.requestPermission()) !== 'granted') { setPushState('idle'); return; }
      const reg = await navigator.serviceWorker.ready;
      const sub = (await reg.pushManager.getSubscription()) || (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToBytes(key) }));
      await api('/api/push/subscribe', { method: 'POST', body: sub.toJSON() });
      await api('/api/push/test', { method: 'POST' });
      setPushState('on');
    } catch (e) { setErr(e.message); setPushState('idle'); }
  }

  if (!clock) return null;

  if (s?.needsSetup) {
    return (
      <main className="empty">
        <h1>Cutting Board</h1>
        <p>The database is connected but empty. Set it up with your current projects loaded in.</p>
        <button className="btn" onClick={async () => { try { await api('/api/setup', { method: 'POST' }); load(); } catch (e) { setErr(e.message); } }}>Set up board</button>
        {err && <p className="err" role="alert">{err}</p>}
      </main>
    );
  }

  const d = derived;
  return (
    <>
      <Band clock={clock} mode={mode} onLog={(t) => setComposer(t)} onNotify={enablePush} pushState={pushState} />

      <main className="wrap main">
        {err && <p className="err banner" role="alert">{err}<button className="x" aria-label="Dismiss" onClick={() => setErr('')}>×</button></p>}
        {!d && !err && <p className="loading">Loading board…</p>}

        {d && (
          <div className="grid">
            <section className="card c-week"><WeekChart week={d.week} /></section>

            <div className="c-kpi">
              <div className="card fog kpi"><div className="k-l">Open tasks</div><div className="k-v">{d.open.length}</div></div>
              <div className="card fog kpi"><div className="k-l">Due in 72h</div><div className="k-v">{d.dueSoon}</div></div>
              <div className="card fog kpi"><div className="k-l">Updates this week</div><div className="k-v">{d.updWeek}</div></div>
            </div>

            <section className="card c-ring">
              <div className="head"><div><h2>Board progress</h2><div className="sub">All active projects</div></div></div>
              <div className="ring-wrap">
                <div className="ring">
                  <svg width="132" height="132" viewBox="0 0 132 132" aria-hidden="true">
                    <circle cx="66" cy="66" r="56" fill="none" stroke="var(--fog)" strokeWidth="16" />
                    <circle cx="66" cy="66" r="56" fill="none" stroke="var(--btn)" strokeWidth="16" strokeDasharray={`${(2 * Math.PI * 56 * d.pct) / 100} ${2 * Math.PI * 56}`} />
                  </svg>
                  <div className="ring-c"><b>{d.pct}%</b><span>complete</span></div>
                </div>
                <ul className="mini">
                  {d.active.filter((p) => p.priority <= 1).slice(0, 4).map((p) => (
                    <li key={p.id}><span>{p.name}</span><b>{byProject[p.id].tasks.filter((t) => t.done).length}/{byProject[p.id].tasks.length}</b></li>
                  ))}
                </ul>
              </div>
            </section>

            <section className="card fog c-dots">
              {d.fit ? (
                <>
                  <div className="head"><div><h2>Deadline fit</h2><div className="sub">{d.fit.p.name}: workstation hours left before {d.fit.n === 0 ? '3 pm today' : `${shortDay(d.fit.p.deadline)} 3 pm`}</div></div></div>
                  <div className="big">{d.fit.avail}h</div>
                  <div className="dots" aria-hidden="true">
                    {Array.from({ length: Math.min(48, Math.max(d.fit.avail, d.fit.need)) }, (_, i) => (
                      <span key={i} className={i < Math.min(d.fit.need, d.fit.avail) ? 'need' : i < d.fit.avail ? 'spare' : 'over'} />
                    ))}
                  </div>
                  <p className="fit">
                    {d.fit.need <= d.fit.avail
                      ? <>Remaining steps need about <b>{d.fit.need}h</b>, leaving {d.fit.avail - d.fit.need}h of workstation time for everything else.</>
                      : <>Remaining steps need about <b>{d.fit.need}h</b>, {d.fit.need - d.fit.avail}h more than you have. Move something or start earlier.</>}
                  </p>
                </>
              ) : (
                <>
                  <div className="head"><div><h2>Deadline fit</h2><div className="sub">Workstation hours vs remaining work</div></div></div>
                  <p className="fit">Add hour estimates to workstation tasks on a project with a deadline, and this card shows whether the work fits the time left.</p>
                </>
              )}
            </section>

            <section className="card c-lane">
              <div className="head"><div><h2>Open work by lane</h2><div className="sub">Where the load sits</div></div></div>
              <div className="big">{d.open.length}</div>
              <div className="lanebar">{d.laneList.map(([l, c]) => <span key={l} style={{ flex: c, background: laneColor(l) }} title={`${l}: ${c}`} />)}</div>
              <ul className="lanes">
                {d.laneList.map(([l, c]) => (
                  <li key={l}><span><i style={{ background: laneColor(l) }} />{l}</span><span>{c} · {Math.round((c / d.open.length) * 100)}%</span></li>
                ))}
              </ul>
            </section>

            <section className="card c-proj">
              <div className="head">
                <div><h2>Projects</h2><div className="sub">Tap one to open its tasks</div></div>
                <button className="btn sm out" onClick={newProject}>New project</button>
              </div>
              {s.projects.map((p) => (
                <ProjectRow key={p.id} p={p} tasks={byProject[p.id].tasks} today={today} mode={mode}
                  open={!!open[p.id]} onOpen={() => setOpen((o) => ({ ...o, [p.id]: !o[p.id] }))} actions={actions} />
              ))}
            </section>

            <div className="c-side">
              <section className="card">
                <div className="head">
                  <div><h2>Up next</h2><div className="sub">{mode === 'high' ? 'Workstation block' : 'Laptop block'}</div></div>
                  <div className="tabs" role="group" aria-label="Block filter">
                    <button aria-pressed={!qAll} onClick={() => setQAll(false)}>This block</button>
                    <button aria-pressed={qAll} onClick={() => setQAll(true)}>Both</button>
                  </div>
                </div>
                <ul className="tasks">
                  {d.queue.length
                    ? d.queue.map((t) => <TaskRow key={t.id} t={t} actions={actions} sub={d.proj[t.project_id].name} />)
                    : <li className="task"><span className="t-title">Nothing queued for this block.</span></li>}
                </ul>
              </section>

              <section className="card">
                <div className="head"><div><h2>Activity</h2><div className="sub">Logged updates</div></div></div>
                {s.updates.length === 0
                  ? <p className="fit">Updates you log appear here.</p>
                  : <ul className="feed">
                      {s.updates.slice(0, 6).map((u) => {
                        const p = d.proj[u.project_id];
                        if (!p) return null;
                        return (
                          <li key={u.id}>
                            <span className="mark" style={{ background: laneColor(p.lane) }}>{initials(p.name)}</span>
                            <div><p>{u.body}</p><small>{p.name}</small></div>
                            <time>{ago(u.created_at)}</time>
                          </li>
                        );
                      })}
                    </ul>}
              </section>
            </div>
          </div>
        )}
      </main>

      {composer !== null && s?.projects && (
        <Composer initial={composer} projects={s.projects.filter((p) => p.status !== 'done')} ai={s.ai}
          onClose={() => setComposer(null)} onSaved={(m) => { setComposer(null); load(); say(m); }} />
      )}

      <div className={`toast ${toast ? 'on' : ''}`} role="status" aria-live="polite">{toast}</div>
    </>
  );
}
