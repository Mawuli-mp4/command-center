'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';

const TZ = 'America/Toronto'; // Montreal
const HIGH_START = 7;
const HIGH_END = 15;

function montreal() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(new Date());
  const g = (t) => parts.find((p) => p.type === t).value;
  return { date: `${g('year')}-${g('month')}-${g('day')}`, hour: Number(g('hour')) % 24, minute: Number(g('minute')) };
}
const daysUntil = (d, today) => Math.round((Date.parse(d) - Date.parse(today)) / 864e5);
function dueText(n) {
  if (n < 0) return `${-n}d overdue`;
  if (n === 0) return 'Due today';
  if (n === 1) return 'Due tomorrow';
  return `${n} days`;
}
function ago(ts) {
  const m = Math.round((Date.now() - Date.parse(ts)) / 6e4);
  if (m < 60) return `${Math.max(m, 1)}m ago`;
  if (m < 1440) return `${Math.round(m / 60)}h ago`;
  return `${Math.round(m / 1440)}d ago`;
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
  if (!r.ok) throw new Error(j.error || 'Something went wrong. Pull to refresh and try again.');
  return j;
}

/* ---------- Day timeline: the one loud element ---------- */
function DayStrip({ clock }) {
  const pos = ((clock.hour * 60 + clock.minute) / 1440) * 100;
  const high = clock.hour >= HIGH_START && clock.hour < HIGH_END;
  const endH = high ? HIGH_END : clock.hour >= HIGH_END ? 24 + HIGH_START : HIGH_START;
  const left = endH * 60 - (clock.hour * 60 + clock.minute);
  const h = Math.floor(left / 60), m = left % 60;
  return (
    <header className="day">
      <div className="day-head">
        <h1>{high ? 'Workstation block' : 'Laptop block'}</h1>
        <p className="day-sub">
          {high ? 'Edits, renders, back-end work' : 'Decks, outreach, social edits'}
          <span className="day-left">{h}h {String(m).padStart(2, '0')}m left</span>
        </p>
      </div>
      <div className="strip" role="img" aria-label={`Current time ${clock.hour}:${String(clock.minute).padStart(2, '0')}. High compute runs 7 am to 3 pm.`}>
        <div className="strip-track">
          <span className="seg low" style={{ left: 0, width: `${(HIGH_START / 24) * 100}%` }} />
          <span className="seg high" style={{ left: `${(HIGH_START / 24) * 100}%`, width: `${((HIGH_END - HIGH_START) / 24) * 100}%` }} />
          <span className="seg low" style={{ left: `${(HIGH_END / 24) * 100}%`, right: 0 }} />
          <span className="playhead" style={{ left: `${pos}%` }}>
            <span className="tc">{String(clock.hour).padStart(2, '0')}:{String(clock.minute).padStart(2, '0')}</span>
          </span>
        </div>
        <div className="ticks" aria-hidden="true">
          {[0, 7, 15, 24].map((t) => <span key={t} style={{ left: `${(t / 24) * 100}%` }}>{t === 24 ? '' : `${t}:00`}</span>)}
        </div>
      </div>
    </header>
  );
}

function ComputeTag({ value, onClick }) {
  const label = value === 'high' ? 'Workstation' : 'Laptop';
  return (
    <button type="button" className={`tag ${value}`} onClick={onClick} title="Switch block" aria-label={`${label} block. Tap to switch.`}>
      {label}
    </button>
  );
}

function TaskRow({ t, onToggle, onCompute, onDelete, showProject }) {
  return (
    <li className={`task ${t.done ? 'done' : ''}`}>
      <label className="check">
        <input type="checkbox" checked={t.done} onChange={() => onToggle(t)} />
        <span className="box" aria-hidden="true" />
        <span className="task-title">
          {t.title}
          {showProject && <span className="task-proj">{showProject}</span>}
        </span>
      </label>
      {onCompute && <ComputeTag value={t.compute} onClick={() => onCompute(t)} />}
      {onDelete && <button type="button" className="x" aria-label={`Delete ${t.title}`} onClick={() => onDelete(t)}>×</button>}
    </li>
  );
}

function AddTask({ projectId, defaultCompute, onAdd }) {
  const [title, setTitle] = useState('');
  const [compute, setCompute] = useState(defaultCompute);
  return (
    <form className="add-task" onSubmit={(e) => { e.preventDefault(); if (title.trim()) { onAdd(projectId, title, compute); setTitle(''); } }}>
      <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Add a task" aria-label="New task" />
      <ComputeTag value={compute} onClick={() => setCompute(compute === 'high' ? 'low' : 'high')} />
      <button className="btn small" type="submit">Add</button>
    </form>
  );
}

function ProjectTrack({ p, tasks, updates, today, open, onOpen, actions, mode }) {
  const done = tasks.filter((t) => t.done).length;
  const pct = tasks.length ? Math.round((done / tasks.length) * 100) : 0;
  const d = p.deadline ? daysUntil(p.deadline, today) : null;
  return (
    <article className={`track p${Math.min(p.priority, 3)} ${p.status}`}>
      <button type="button" className="track-head" aria-expanded={open} onClick={onOpen}>
        <span className="track-name">{p.name}</span>
        <span className="track-meta">
          <span>{p.lane}</span>
          {d !== null && p.status !== 'done' && <span className={`due ${d <= 1 ? 'hot' : ''}`}>{dueText(d)}</span>}
          {p.status !== 'active' && <span className="status">{p.status === 'done' ? 'Wrapped' : 'Paused'}</span>}
        </span>
        <span className="clip" aria-label={`${done} of ${tasks.length} tasks done`}>
          <span className="clip-fill" style={{ width: `${pct}%` }} />
          <span className="clip-label">{done}/{tasks.length}</span>
        </span>
      </button>
      {open && (
        <div className="track-body">
          {p.summary && <p className="summary">{p.summary}</p>}
          <ul className="tasks">
            {tasks.map((t) => (
              <TaskRow key={t.id} t={t} onToggle={actions.toggle} onCompute={actions.flip} onDelete={actions.removeTask} />
            ))}
          </ul>
          <AddTask projectId={p.id} defaultCompute={mode} onAdd={actions.addTask} />
          {updates.length > 0 && (
            <div className="log">
              <h3>Log</h3>
              <ul>
                {updates.slice(0, 4).map((u) => (
                  <li key={u.id}><time>{ago(u.created_at)}</time>{u.body}</li>
                ))}
              </ul>
            </div>
          )}
          <div className="track-actions">
            <label className="field">
              Deadline
              <input type="date" value={p.deadline || ''} onChange={(e) => actions.patchProject(p.id, { deadline: e.target.value })} />
            </label>
            <label className="field">
              Priority
              <select value={p.priority} onChange={(e) => actions.patchProject(p.id, { priority: e.target.value })}>
                <option value={0}>Now</option><option value={1}>Next</option><option value={2}>Soon</option><option value={3}>Later</option>
              </select>
            </label>
            {p.status === 'active'
              ? <><button className="btn small" onClick={() => actions.patchProject(p.id, { status: 'paused' })}>Pause</button>
                  <button className="btn small" onClick={() => actions.patchProject(p.id, { status: 'done' })}>Wrap</button></>
              : <button className="btn small" onClick={() => actions.patchProject(p.id, { status: 'active' })}>Reopen</button>}
          </div>
        </div>
      )}
    </article>
  );
}

/* ---------- Composer: dictate with the keyboard mic ---------- */
function Composer({ projects, ai, onClose, onSaved }) {
  const [text, setText] = useState('');
  const [target, setTarget] = useState(ai ? 'auto' : String(projects[0]?.id || ''));
  const [busy, setBusy] = useState(false);
  const [proposal, setProposal] = useState(null);
  const [err, setErr] = useState('');
  const name = (id) => projects.find((p) => p.id === id)?.name || 'Unknown project';

  async function submit() {
    if (!text.trim()) return;
    setBusy(true); setErr('');
    try {
      if (target === 'auto') setProposal((await api('/api/parse', { method: 'POST', body: { text } })).items);
      else { await api('/api/updates', { method: 'POST', body: { project_id: Number(target), body: text } }); onSaved(); }
    } catch (e) { setErr(e.message); }
    setBusy(false);
  }
  async function apply() {
    setBusy(true);
    try { await api('/api/apply', { method: 'POST', body: { items: proposal } }); onSaved(); }
    catch (e) { setErr(e.message); setBusy(false); }
  }

  return (
    <div className="sheet-wrap" role="dialog" aria-modal="true" aria-label="Log an update">
      <div className="sheet-scrim" onClick={onClose} />
      <div className="sheet">
        <div className="sheet-head">
          <h2>Log an update</h2>
          <button className="x" aria-label="Close" onClick={onClose}>×</button>
        </div>
        {!proposal ? (
          <>
            <textarea autoFocus rows={6} value={text} onChange={(e) => setText(e.target.value)}
              placeholder="Tap the mic on your keyboard and talk it through." />
            <label className="field wide">
              File under
              <select value={target} onChange={(e) => setTarget(e.target.value)}>
                {ai && <option value="auto">Let AI sort it across projects</option>}
                {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </label>
            {err && <p className="err" role="alert">{err}</p>}
            <button className="btn primary" disabled={busy || !text.trim()} onClick={submit}>
              {busy ? 'Working…' : target === 'auto' ? 'Sort update' : 'Save update'}
            </button>
          </>
        ) : (
          <>
            {proposal.length === 0 && <p className="summary">Nothing matched a project. Go back and pick one.</p>}
            {proposal.map((i, k) => (
              <div className="proposal" key={k}>
                <h3>{name(i.project_id)}</h3>
                {i.update && <p>{i.update}</p>}
                {i.complete_task_ids.length > 0 && <p className="pmeta">Marks {i.complete_task_ids.length} task{i.complete_task_ids.length > 1 ? 's' : ''} done</p>}
                {i.new_tasks.map((t, j) => <p className="pmeta" key={j}>New task: {t.title} ({t.compute === 'high' ? 'workstation' : 'laptop'})</p>)}
              </div>
            ))}
            {err && <p className="err" role="alert">{err}</p>}
            <div className="row">
              <button className="btn" onClick={() => setProposal(null)}>Edit memo</button>
              <button className="btn primary" disabled={busy || proposal.length === 0} onClick={apply}>{busy ? 'Saving…' : 'Save all'}</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function Board() {
  const [s, setS] = useState(null);
  const [err, setErr] = useState('');
  const [clock, setClock] = useState(null);
  const [open, setOpen] = useState({});
  const [composer, setComposer] = useState(false);
  const [bothBlocks, setBothBlocks] = useState(false);
  const [pushState, setPushState] = useState('idle');

  const load = useCallback(async () => {
    try { setS(await api('/api/state')); setErr(''); } catch (e) { setErr(e.message); }
  }, []);

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

  const byProject = useMemo(() => {
    const m = {};
    for (const p of s?.projects || []) m[p.id] = { tasks: [], updates: [] };
    for (const t of s?.tasks || []) m[t.project_id]?.tasks.push(t);
    for (const u of s?.updates || []) m[u.project_id]?.updates.push(u);
    return m;
  }, [s]);

  const queue = useMemo(() => {
    if (!s) return [];
    const proj = Object.fromEntries(s.projects.map((p) => [p.id, p]));
    return s.tasks
      .filter((t) => !t.done && proj[t.project_id]?.status === 'active' && (bothBlocks || t.compute === mode))
      .sort((a, b) => {
        const pa = proj[a.project_id], pb = proj[b.project_id];
        return pa.priority - pb.priority
          || (pa.deadline || '9999').localeCompare(pb.deadline || '9999')
          || a.sort - b.sort;
      })
      .slice(0, 6)
      .map((t) => ({ ...t, projectName: proj[t.project_id].name }));
  }, [s, mode, bothBlocks]);

  const patchTask = (id, fields) => setS((cur) => ({ ...cur, tasks: cur.tasks.map((t) => (t.id === id ? { ...t, ...fields } : t)) }));
  const actions = {
    toggle: async (t) => { patchTask(t.id, { done: !t.done }); await api(`/api/tasks/${t.id}`, { method: 'PATCH', body: { done: !t.done } }).catch((e) => setErr(e.message)); },
    flip: async (t) => { const c = t.compute === 'high' ? 'low' : 'high'; patchTask(t.id, { compute: c }); await api(`/api/tasks/${t.id}`, { method: 'PATCH', body: { compute: c } }).catch((e) => setErr(e.message)); },
    removeTask: async (t) => { if (!confirm(`Delete “${t.title}”?`)) return; setS((cur) => ({ ...cur, tasks: cur.tasks.filter((x) => x.id !== t.id) })); await api(`/api/tasks/${t.id}`, { method: 'DELETE' }).catch((e) => setErr(e.message)); },
    addTask: async (project_id, title, compute) => { try { const row = await api('/api/tasks', { method: 'POST', body: { project_id, title, compute } }); setS((cur) => ({ ...cur, tasks: [...cur.tasks, row] })); } catch (e) { setErr(e.message); } },
    patchProject: async (id, body) => { try { await api(`/api/projects/${id}`, { method: 'PATCH', body }); load(); } catch (e) { setErr(e.message); } },
  };

  async function newProject() {
    const name = prompt('Project name');
    if (!name) return;
    try { const { id } = await api('/api/projects', { method: 'POST', body: { name } }); await load(); setOpen((o) => ({ ...o, [id]: true })); }
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
      <main className="empty" data-mode={mode}>
        <h1>Cutting Board</h1>
        <p>The database is connected but empty. Set it up with your current projects loaded in.</p>
        <button className="btn primary" onClick={async () => { await api('/api/setup', { method: 'POST' }); load(); }}>Set up board</button>
      </main>
    );
  }

  const deadlines = (s?.projects || []).filter((p) => p.status === 'active' && p.deadline).slice(0, 4);

  return (
    <div className="app" data-mode={mode}>
      <DayStrip clock={clock} />

      {err && <p className="err banner" role="alert">{err} <button className="x" aria-label="Dismiss" onClick={() => setErr('')}>×</button></p>}

      {!s && !err && <p className="loading">Loading board…</p>}

      {s && (
        <main>
          {deadlines.length > 0 && (
            <section className="deadlines" aria-label="Upcoming deadlines">
              {deadlines.map((p) => {
                const d = daysUntil(p.deadline, today);
                return (
                  <div key={p.id} className={`dl ${d <= 1 ? 'hot' : ''}`}>
                    <span className="dl-n">{d < 0 ? `−${-d}` : d}</span>
                    <span className="dl-u">{Math.abs(d) === 1 ? 'day' : 'days'}</span>
                    <span className="dl-name">{p.name}</span>
                  </div>
                );
              })}
            </section>
          )}

          <section className="queue">
            <div className="section-head">
              <h2>Up next</h2>
              <button className="link" onClick={() => setBothBlocks(!bothBlocks)}>{bothBlocks ? 'This block only' : 'Show both blocks'}</button>
            </div>
            {queue.length === 0
              ? <p className="summary">Nothing queued for the {mode === 'high' ? 'workstation' : 'laptop'} block. Pull something forward or add a task.</p>
              : <ul className="tasks">{queue.map((t) => <TaskRow key={t.id} t={t} onToggle={actions.toggle} showProject={t.projectName} />)}</ul>}
          </section>

          <section className="tracks">
            <div className="section-head">
              <h2>Projects</h2>
              <button className="link" onClick={newProject}>New project</button>
            </div>
            {s.projects.map((p) => (
              <ProjectTrack key={p.id} p={p} today={today} mode={mode}
                tasks={byProject[p.id]?.tasks || []} updates={byProject[p.id]?.updates || []}
                open={!!open[p.id]} onOpen={() => setOpen((o) => ({ ...o, [p.id]: !o[p.id] }))} actions={actions} />
            ))}
          </section>

          <footer className="foot">
            <button className="link" onClick={enablePush} disabled={pushState === 'working'}>
              {pushState === 'on' ? 'Notifications on. Send a test' : pushState === 'working' ? 'Turning on…' : 'Turn on notifications'}
            </button>
          </footer>
        </main>
      )}

      {s && (
        <button className="fab" onClick={() => setComposer(true)} aria-label="Log an update">
          <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="currentColor" d="M12 15a3 3 0 0 0 3-3V6a3 3 0 1 0-6 0v6a3 3 0 0 0 3 3Zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.92V21h2v-2.08A7 7 0 0 0 19 12h-2Z" /></svg>
          Log update
        </button>
      )}

      {composer && (
        <Composer projects={s.projects.filter((p) => p.status !== 'done')} ai={s.ai}
          onClose={() => setComposer(false)} onSaved={() => { setComposer(false); load(); }} />
      )}
    </div>
  );
}
