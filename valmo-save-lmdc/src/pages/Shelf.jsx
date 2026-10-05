import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, PageHead, Tile, Bar, Pill } from '../components/ui/Primitives';
import { AgeBar, ShelfGauge } from '../components/charts/OpsCharts';
import { useDecisions, pillOf } from '../components/panels/SkuPanels';
import { SHELF, SHELF_AGES, TODAY } from '../data/ops';
import { dayLabel } from '../lib/units';
import { useApp } from '../state/AppState';
import { fmt } from '../lib/format';

// Units nearest the 21-day limit (sample of the 280 units in the 15–21 day bucket)
const NEAR_LIMIT = [
  ['VL7712044-0311', 'Printed cotton saree', 'Women ethnic', 20], ['VL7712187-0145', 'Men’s slim jeans · 32', 'Men western', 20],
  ['VL7712390-0472', 'Non-stick tawa 28 cm', 'Kitchen', 19], ['VL7712511-0068', 'Kids’ school bag', 'Kids', 19],
  ['VL7712674-0233', 'Hair straightener', 'Beauty appliances', 18], ['VL7712802-0390', 'Bedside lamp · wooden', 'Decor', 18],
  ['VL7712966-0127', 'Yoga mat 6 mm', 'Sports', 17], ['VL7713050-0418', 'Women’s sling bag', 'Accessories', 16],
];

export default function Shelf() {
  const all = useDecisions();
  const { dispatch, toast, state } = useApp();
  const [bucket, setBucket] = useState('15–21 d');
  const [moved, setMoved] = useState({});

  return (
    <div className="page">
      <PageHead crumbs={[{ label: 'Overview', to: '/' }, { label: 'Hold Shelf' }]} title={`Hold shelf · rack zone ${SHELF.zone}`}
        sub="Every retained unit waits here for a buyer within 70 km — at most 21 days, always inside the 45-day rule" />

      <section className="kpi-grid" aria-label="Shelf summary">
        <Tile label="Units on shelf" value={fmt(SHELF.used)} sub={`${fmt(SHELF.slots - SHELF.used)} free slots`} tint="var(--violet-t)" deep="#3d2591" />
        <Tile label="Occupancy" value={Math.round((SHELF.used / SHELF.slots) * 100) + '%'} sub="alert at 90%" tint="var(--amber-t)" deep="#7a5200" />
        <Tile label="Added today" value={TODAY.retained} sub={state.tasksDone['t-shelve'] ? 'all shelved ✓' : '132 shelved · 82 to go'} tint="var(--teal-t)" deep="#0b5e54" />
        <Tile label="Left today" value={TODAY.resold + TODAY.capExpired} sub={`${TODAY.resold} re-sold · ${TODAY.capExpired} hit cap`} tint="var(--blue-t)" deep="#2648a6" />
        <Tile label="Near the limit" value={SHELF_AGES[3].units} sub="15–21 days on shelf" tint="var(--rose-t)" deep="#8e1d43" />
      </section>

      <div className="two">
        <Card title="Capacity and age" sub="Units by days on shelf">
          <div className="row wrap" style={{ gap: 20 }}>
            <ShelfGauge size={240} />
            <div className="grow" style={{ display: 'flex', flexDirection: 'column', gap: 10, minWidth: 220 }}>
              {SHELF_AGES.map((a) => (
                <div key={a.label}>
                  <div className="row" style={{ justifyContent: 'space-between', fontSize: 12.5 }}><span className="row" style={{ gap: 6 }}><span className="dot" style={{ background: a.color }} />{a.label}</span><b>{fmt(a.units)}</b></div>
                  <Bar value={a.units / SHELF_AGES[0].units} color={a.color} style={{ marginTop: 4 }} />
                </div>
              ))}
            </div>
          </div>
          <AgeBar />
        </Card>

        <Card title="Units closest to the 21-day limit" sub="If no buyer orders in time, the unit returns to the seller"
          right={<div className="tabs">{['15–21 d', 'All'].map((b) => <button key={b} className={bucket === b ? 'on' : ''} onClick={() => setBucket(b)}>{b}</button>)}</div>}>
          <div className="table-wrap">
            <table className="data" style={{ minWidth: 520 }}>
              <thead><tr><th>AWB</th><th>Product</th><th>Days</th><th>Return by</th><th></th></tr></thead>
              <tbody>
                {NEAR_LIMIT.filter((r) => bucket === 'All' || r[3] >= 15).map(([awb, name, cat, days]) => (
                  <tr key={awb}>
                    <td><b style={{ fontSize: 12 }}>{awb}</b></td>
                    <td><div className="ell" style={{ fontWeight: 500, maxWidth: 200 }}>{name}</div><div className="sub">{cat}</div></td>
                    <td><Pill bg={days >= 19 ? 'var(--rose-t)' : 'var(--amber-t)'} fg={days >= 19 ? '#8e1d43' : '#7a5200'}>day {days}</Pill></td>
                    <td style={{ fontSize: 12 }}>{dayLabel(21 - days)}</td>
                    <td className="num">
                      <button className="btn btn-ghost btn-sm" disabled={moved[awb]} onClick={() => { setMoved((m) => ({ ...m, [awb]: true })); toast(`${awb} moved to the seller return bay`); }}>
                        {moved[awb] ? 'Moved ✓' : 'Move to RTO'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <Card title="Top SKUs on the shelf" sub="Units held after today against each SKU’s stock cap · click to open">
        <div className="table-wrap">
          <table className="data" style={{ minWidth: 760 }}>
            <thead><tr><th>Product</th><th>Rack</th><th>On shelf / cap</th><th>Fill</th><th>Decision today</th><th className="num">Orders ≤ 70 km (30 d)</th></tr></thead>
            <tbody>
              {all.filter(({ d }) => d.hold).map(({ sku, d }) => {
                const held = state.returned[sku.id] ? 0 : sku.shelf + d.retain;
                return (
                  <tr key={sku.id}>
                    <td><div className="row"><span className="swatch" style={{ background: sku.color, width: 30, height: 30, fontSize: 11 }}>{sku.ini}</span><Link to={`/sku/${sku.id}`} className="ell" style={{ fontWeight: 600, color: 'var(--ink)' }}>{sku.name}</Link></div></td>
                    <td>{sku.rack}</td>
                    <td><b>{held}</b> / {d.cap}</td>
                    <td style={{ width: 160 }}><Bar value={d.cap ? held / d.cap : 0} color={held >= d.cap ? 'var(--rose)' : 'var(--teal)'} /></td>
                    <td><Pill {...pillOf(d.decision)}>{d.decision}</Pill></td>
                    <td className="num">{d.orders30}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <button className="btn btn-outline" style={{ alignSelf: 'flex-start' }} disabled={!!state.tasksDone['t-capacity']}
          onClick={() => { dispatch({ type: 'toggleTask', id: 't-capacity' }); toast('Capacity check recorded · task done'); }}>
          {state.tasksDone['t-capacity'] ? 'Capacity check done ✓' : 'Record R-4 capacity check'}
        </button>
      </Card>
    </div>
  );
}
