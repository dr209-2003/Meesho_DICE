// Client side of the shared store. Two honest modes:
//  • shared — state lives in /api/state (Upstash Redis); every device polls it, so a unit retained in the
//    dashboard on one machine appears in the app on another within a few seconds.
//  • local  — /api/state is not configured (or not deployed). State lives in this browser's localStorage and
//    is shared only between tabs of this browser. The UI says so everywhere it matters.
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { OpError, applyOp, availability, normalize, seed } from './ops.js';

const LS_KEY = 'meesho-quick-shared-v1';
const POLL_MS = 4000;
const Ctx = createContext(null);

function readLocal() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  const s = seed();
  try { localStorage.setItem(LS_KEY, JSON.stringify(s)); } catch { /* ignore */ }
  return s;
}

export class StoreError extends Error {
  constructor(message, code, details) { super(message); this.code = code; this.details = details; }
}

export function SharedStoreProvider({ children }) {
  const [mode, setMode] = useState('loading'); // loading | shared | local
  const [state, setState] = useState(null);
  const [sync, setSync] = useState({ at: null, error: null });
  const [tick, setTick] = useState(Date.now());
  const chan = useRef(null);
  const modeRef = useRef('loading');

  const adopt = useCallback((s) => setState((prev) => (prev && prev.rev > s.rev && modeRef.current === 'shared' ? prev : s)), []);

  const fetchShared = useCallback(async () => {
    const res = await fetch('/api/state', { cache: 'no-store', headers: { Accept: 'application/json' } });
    const type = res.headers.get('content-type') || '';
    if (!type.includes('application/json')) return { unavailable: true };
    const json = await res.json();
    if (res.status === 503 && json.mode === 'unconfigured') return { unavailable: true };
    if (!res.ok || json.mode !== 'shared') throw new Error(json.error || 'Server error ' + res.status);
    return json;
  }, []);

  // decide the mode once
  useEffect(() => {
    let dead = false;
    (async () => {
      let json = null;
      try { json = await fetchShared(); } catch { json = { unavailable: true }; }
      if (dead) return;
      if (json.unavailable) {
        modeRef.current = 'local';
        setMode('local');
        setState(normalize(readLocal()));
        setSync({ at: Date.now(), error: null });
      } else {
        modeRef.current = 'shared';
        setMode('shared');
        setState(json.state);
        setSync({ at: Date.now(), error: null });
      }
    })();
    return () => { dead = true; };
  }, [fetchShared]);

  // shared: poll; local: listen to other tabs
  useEffect(() => {
    if (mode === 'shared') {
      let stop = false;
      const poll = async () => {
        if (document.hidden) return;
        try {
          const json = await fetchShared();
          if (stop) return;
          if (json.unavailable) throw new Error('Shared store unavailable');
          adopt(json.state);
          setSync({ at: Date.now(), error: null });
        } catch (e) {
          if (!stop) setSync((x) => ({ ...x, error: e.message || 'Connection lost' }));
        }
      };
      const id = setInterval(poll, POLL_MS);
      const vis = () => !document.hidden && poll();
      document.addEventListener('visibilitychange', vis);
      window.addEventListener('focus', vis);
      return () => { stop = true; clearInterval(id); document.removeEventListener('visibilitychange', vis); window.removeEventListener('focus', vis); };
    }
    if (mode === 'local') {
      const onStorage = (e) => { if (e.key === LS_KEY && e.newValue) setState(normalize(JSON.parse(e.newValue))); };
      window.addEventListener('storage', onStorage);
      try {
        chan.current = new BroadcastChannel(LS_KEY);
        chan.current.onmessage = () => setState(normalize(readLocal()));
      } catch { /* no BroadcastChannel */ }
      return () => { window.removeEventListener('storage', onStorage); chan.current?.close(); };
    }
    return undefined;
  }, [mode, fetchShared, adopt]);

  // re-render every 30 s so countdowns and expiries stay current
  useEffect(() => { const id = setInterval(() => setTick(Date.now()), 30000); return () => clearInterval(id); }, []);

  const run = useCallback(async (op) => {
    if (modeRef.current === 'shared') {
      let res;
      try {
        res = await fetch('/api/state', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ op }) });
      } catch {
        throw new StoreError('No connection. Check your network and try again.', 'NETWORK');
      }
      const json = await res.json().catch(() => ({}));
      if (json.state) adopt(json.state);
      if (!res.ok) throw new StoreError(json.error || 'Something went wrong', json.code || 'SERVER', json.details);
      setSync({ at: Date.now(), error: null });
      return json.result;
    }
    if (modeRef.current === 'local') {
      const cur = readLocal();
      try {
        const out = applyOp(cur, op);
        const next = { ...out.state, rev: (cur.rev || 0) + 1 };
        localStorage.setItem(LS_KEY, JSON.stringify(next));
        chan.current?.postMessage('changed');
        setState(next);
        return out.result;
      } catch (e) {
        setState(normalize(cur));
        if (e instanceof OpError) throw new StoreError(e.message, e.code, e.details);
        throw new StoreError('Could not save on this device', 'LOCAL');
      }
    }
    throw new StoreError('Still connecting, try again in a moment', 'LOADING');
  }, [adopt]);

  const retry = useCallback(async () => {
    try {
      const json = await fetchShared();
      if (!json.unavailable) { adopt(json.state); setSync({ at: Date.now(), error: null }); }
    } catch (e) { setSync((x) => ({ ...x, error: e.message })); }
  }, [fetchShared, adopt]);

  const value = useMemo(() => ({
    mode, state, sync, run, retry, now: tick,
    avail: state ? availability(state) : {},
  }), [mode, state, sync, run, retry, tick]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useShared = () => useContext(Ctx);
