import { Link } from 'react-router-dom';
import { Card, PageHead, Tile, Pill } from '../components/ui/Primitives';
import { DispatchCard } from '../components/panels/DispatchPanel';
import { ShuttleStrip } from '../components/charts/SkuCharts';
import { FEATURED, SHUTTLES, CUTOFF_MIN, RESOLD_TODAY } from '../data/dispatch';
import { useApp } from '../state/AppState';
import { NOW, toMin, hm } from '../lib/format';

export default function Dispatch() {
  const { sent, due, state } = useApp();
  const next = SHUTTLES.find((s) => toMin(s.time) > NOW.minutes);
  const pendingNext = FEATURED.filter((f) => f.departs === next.time && state.dispatch[f.id] !== 'sent').length;
  const loadedNext = FEATURED.filter((f) => f.departs === next.time && state.dispatch[f.id] === 'sent').length;

  return (
    <div className="page">
      <PageHead crumbs={[{ label: 'Overview', to: '/' }, { label: 'LMSC Dispatch' }]} title="Re-sold units → Delhi South LMSC"
        sub="Retained units that a new buyer ordered today go out on the 2-hourly LMDC ⇄ LMSC shuttle, then to the buyer’s LMDC">
        <Link to="/rto" className="btn btn-ghost">RTO & Retain</Link>
      </PageHead>

      <section className="kpi-grid" aria-label="Dispatch summary">
        <Tile label="Re-sold today" value={RESOLD_TODAY} sub="orders matched to shelf units" tint="var(--violet-t)" deep="#3d2591" />
        <Tile label="Sent to LMSC" value={sent} sub={sent > 101 ? `incl. ${sent - 101} loaded for ${next.time}` : 'on the 08:30, 10:30, 12:30 shuttles'} tint="var(--green-t)" deep="#026a4b" />
        <Tile label="Still to send" value={due} sub={due ? `cut-off ${hm(toMin(next.time) - CUTOFF_MIN)}` : 'all handed over'} tint={due ? 'var(--rose-t)' : 'var(--teal-t)'} deep={due ? '#8e1d43' : '#0b5e54'} />
        <Tile label="Next shuttle" value={next.time} sub={`${next.vehicle} · in ${toMin(next.time) - NOW.minutes} min`} tint="var(--amber-t)" deep="#7a5200" />
        <Tile label="Avg LMDC → buyer" value="~1 day" sub="LMSC sort + line-haul to buyer’s LMDC" tint="var(--blue-t)" deep="#2648a6" />
      </section>

      <Card title="Shuttle timeline · today" sub={`Cut-off = departure − ${CUTOFF_MIN} min · hatched = time left before the next cut-off`}>
        <ShuttleStrip />
      </Card>

      <div className="two">
        <Card title="Retained 02 Oct (2 days ago) · re-ordered today" sub="Mark each unit as it moves: picked → loaded → sent">
          {FEATURED.map((f) => <DispatchCard key={f.id} f={f} />)}
        </Card>

        <div className="col">
          <Card title="Shuttle schedule" sub="Vehicles run to and fro between LMDC-DL-07 and Delhi South LMSC">
            <div className="table-wrap">
              <table className="data">
                <thead><tr><th>Departs</th><th>Vehicle</th><th>Cut-off</th><th className="num">Re-sold units</th><th>Status</th></tr></thead>
                <tbody>
                  {SHUTTLES.map((s) => {
                    const m = toMin(s.time);
                    const gone = m <= NOW.minutes;
                    const isNext = s === next;
                    const units = isNext ? loadedNext + pendingNext : s.units;
                    return (
                      <tr key={s.id} className={isNext ? 'sel' : ''}>
                        <td><b>{s.time}</b></td>
                        <td>{s.vehicle}</td>
                        <td>{hm(m - CUTOFF_MIN)}</td>
                        <td className="num">{units || '—'}{isNext && ` (${loadedNext} loaded)`}</td>
                        <td>
                          {gone ? <Pill bg="var(--green-t)" fg="#026a4b">Departed</Pill>
                            : isNext ? <Pill bg="var(--amber)" fg="#353543">Next · loading</Pill>
                              : <Pill bg="#f2f2f7" fg="#4f4f63">Scheduled</Pill>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          <Card title="How a re-sold unit travels" sub="Same network as any forward order — only the first mile changes">
            <div className="route" style={{ '--c': 'var(--brand)', gap: 6 }}>
              {['Hold shelf R-4', 'Dock D-2', 'Shuttle', 'Delhi South LMSC', 'Buyer’s LMDC', 'Buyer'].map((s, i, a) => (
                <span key={s} style={{ display: 'contents' }}>
                  <span className="step done" style={{ fontSize: 12, padding: '6px 10px' }}>{s}</span>
                  {i < a.length - 1 && <span className="sep done">›</span>}
                </span>
              ))}
            </div>
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12.5, lineHeight: 1.7, color: 'var(--ink-2)' }}>
              <li>The oldest shelf unit of the SKU is matched first (FIFO), so units never pass the 21-day limit unnecessarily.</li>
              <li>A new AWB is created for the new order; the LMSC sorts it like any forward parcel.</li>
              <li>Buyers within this LMDC’s own pincodes skip the LMSC and go straight out with riders.</li>
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}
