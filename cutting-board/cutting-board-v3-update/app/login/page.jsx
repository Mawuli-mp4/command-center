'use client';
import { useState } from 'react';

export default function Login() {
  const [key, setKey] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    const r = await fetch('/api/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ key }) });
    if (r.ok) location.href = '/';
    else { setErr((await r.json().catch(() => ({}))).error || 'Sign-in failed.'); setBusy(false); }
  }
  return (
    <div className="login-band">
      <main className="login">
        <h1>Cutting Board</h1>
        <form onSubmit={submit}>
          <label htmlFor="k">Passcode</label>
          <input id="k" type="password" autoComplete="current-password" value={key} onChange={(e) => setKey(e.target.value)} autoFocus />
          {err && <p className="err" role="alert">{err}</p>}
          <button className="btn full" type="submit" disabled={busy}>{busy ? 'Opening…' : 'Open board'}</button>
        </form>
      </main>
    </div>
  );
}
