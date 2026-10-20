import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { DEFAULT_SETTINGS, alerts as buildAlerts, resolveLoc, resolvePeriod } from './data/model';

const KEY = 'valmo-save-hq-v1';
const Ctx = createContext(null);

function load() {
  try { const raw = localStorage.getItem(KEY); if (raw) return JSON.parse(raw); } catch { /* ignore */ }
  return { resolved: {}, settings: DEFAULT_SETTINGS };
}

export function AppProvider({ children }) {
  const [st, setSt] = useState(load);
  const [toasts, setToasts] = useState([]);
  const tid = useRef(0);
  useEffect(() => { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch { /* ignore */ } }, [st]);

  const toast = useCallback((msg) => {
    const id = ++tid.current;
    setToasts((t) => [...t, { id, msg }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3400);
  }, []);

  const settings = { ...DEFAULT_SETTINGS, ...st.settings };
  const all = useMemo(() => buildAlerts(settings), [JSON.stringify(settings)]); // eslint-disable-line react-hooks/exhaustive-deps
  const value = useMemo(() => ({
    settings,
    setSettings: (s) => setSt((x) => ({ ...x, settings: s })),
    alerts: all.map((a) => ({ ...a, resolved: st.resolved[a.id] || null })),
    openCount: all.filter((a) => !st.resolved[a.id]).length,
    resolve: (id, note) => setSt((x) => ({ ...x, resolved: { ...x.resolved, [id]: { at: new Date().toISOString(), note } } })),
    reopen: (id) => setSt((x) => { const r = { ...x.resolved }; delete r[id]; return { ...x, resolved: r }; }),
    resetAll: () => setSt({ resolved: {}, settings: DEFAULT_SETTINGS }),
    toast,
  }), [st, all, toast]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Ctx.Provider value={value}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {toasts.map((t) => <div key={t.id} className="toast"><span className="tick">✓</span>{t.msg}</div>)}
      </div>
    </Ctx.Provider>
  );
}
export const useApp = () => useContext(Ctx);

/** Location + period live in the URL so any view can be shared as a link. */
export function useFilters() {
  const [params, setParams] = useSearchParams();
  const loc = resolveLoc(params.get('loc') || 'okhla');
  const period = resolvePeriod(params.get('period') || 'sep-2026', params.get('from'), params.get('to'));
  const set = useCallback((patch) => {
    const p = new URLSearchParams(params);
    Object.entries(patch).forEach(([k, v]) => (v == null || v === '' ? p.delete(k) : p.set(k, v)));
    setParams(p, { replace: true });
  }, [params, setParams]);
  const qs = params.toString();
  return { loc, period, set, qs: qs ? '?' + qs : '' };
}
