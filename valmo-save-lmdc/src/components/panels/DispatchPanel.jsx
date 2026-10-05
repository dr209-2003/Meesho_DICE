import { Link } from 'react-router-dom';
import { FEATURED, DISPATCH_STATES, RESOLD_TODAY } from '../../data/dispatch';
import { useApp } from '../../state/AppState';
import { Card, Bar } from '../ui/Primitives';
import { ShuttleStrip } from '../charts/SkuCharts';
import { IconTruck } from '../ui/Icons';
import { NOW, toMin, hm } from '../../lib/format';

export function DispatchCard({ f }) {
  const { state, dispatch, toast } = useApp();
  const st = state.dispatch[f.id];
  const S = DISPATCH_STATES[st];
  const doneSteps = st === 'sent' ? (f.atLmsc ? 3 : 2) : st === 'loading' ? 1 : 0;
  const steps = [f.rack, f.shuttle, 'Delhi S. LMSC', f.lmdc.replace('LMDC-', 'LMDC '), 'Buyer'];
  const cut = toMin(f.departs) - 15;
  const left = cut - NOW.minutes;
  const total = cut - toMin(f.ordered);
  const timeTxt = st === 'sent' ? (f.sentNote || `Loaded just now · leaves ${f.departs} on ${f.shuttle}`) : `Send by ${hm(cut)} · ${left} min left`;

  return (
    <div className={'dcard' + (st === 'sent' ? ' sent' : '')} style={{ '--c': f.color }}>
      <div className="row">
        <span className="swatch" style={{ background: f.color }}>{f.ini}</span>
        <div className="grow">
          <Link to={`/sku/${f.skuId}`} className="ell" style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>{f.name}</Link>
          <div className="sub ell">{f.awb} · {f.rack} · retained {f.retainedOn} (2 days)</div>
        </div>
        <span className="pill" style={{ background: S.bg, color: S.fg }}>{S.label.toUpperCase()}</span>
      </div>
      <div className="ell" style={{ fontSize: 12 }}><b>{f.order}</b> · {f.area} · {f.km} km · ordered {f.ordered}</div>
      <div className="route" aria-label="Route">
        {steps.map((s, j) => (
          <span key={j} style={{ display: 'contents' }}>
            <span className={'step' + (j < doneSteps ? ' done' : j === doneSteps ? ' cur' : '')}>{s}</span>
            {j < steps.length - 1 && <span className={'sep' + (j < doneSteps ? ' done' : '')}>›</span>}
          </span>
        ))}
      </div>
      <div className="row">
        <div className="grow" style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span className="ell" style={{ fontSize: 12, fontWeight: 700, color: st === 'sent' ? 'var(--green)' : left <= 30 ? '#b4325b' : '#8a5a00' }}>{timeTxt}</span>
          <Bar value={st === 'sent' ? 1 : (total - left) / total} height={6} color={st === 'sent' ? 'var(--green)' : 'linear-gradient(90deg, var(--amber), var(--rose))'} />
        </div>
        {st === 'sent' ? (
          <Link to={`/sku/${f.skuId}`} className="btn btn-ghost btn-sm" style={{ color: 'var(--green)', borderColor: '#bfe5d2' }}>Track</Link>
        ) : (
          <button className="btn btn-primary btn-sm" onClick={() => { dispatch({ type: 'advance', id: f.id }); toast(`${f.name.split(' · ')[0]}: ${S.action.replace('Mark ', '')}`); }}>{S.action}</button>
        )}
      </div>
    </div>
  );
}

export default function DispatchPanel({ compact = false }) {
  const { sent, due } = useApp();
  return (
    <Card style={{ border: '2px solid var(--brand-pink)' }}
      title={<span className="row" style={{ gap: 10 }}><span className="kpi-ico" style={{ background: 'linear-gradient(135deg, var(--brand-pink), var(--brand))', color: '#fff' }}><IconTruck /></span>Re-sold today → send to Delhi South LMSC</span>}
      sub={`${RESOLD_TODAY} re-sold today · ${sent} sent · ${due ? due + ' left for the 14:30 shuttle' : 'all sent'}`}
    >
      <div style={{ padding: '10px 14px 8px', borderRadius: 12, background: 'var(--bg)', border: '1px solid var(--line)' }}>
        <div className="row" style={{ justifyContent: 'space-between', fontSize: 11, fontWeight: 600, color: 'var(--ink-2)', marginBottom: 6 }}>
          <span>Shuttle LMDC ⇄ LMSC · every 2 h</span><span style={{ color: '#9c2148' }}>cut-off = departure − 15 min</span>
        </div>
        <ShuttleStrip />
      </div>
      <span className="lbl" style={{ color: 'var(--brand-dark)' }}>Retained 02 Oct (2 days ago) · re-ordered today</span>
      {FEATURED.map((f) => <DispatchCard key={f.id} f={f} />)}
      {compact && <Link to="/dispatch" className="sub" style={{ color: 'var(--brand)', fontWeight: 600 }}>Open dispatch board ›</Link>}
    </Card>
  );
}
