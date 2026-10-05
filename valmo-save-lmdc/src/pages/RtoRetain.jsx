import { useSearchParams } from 'react-router-dom';
import { PageHead, Ring, Tile, Card, Legend } from '../components/ui/Primitives';
import { IconSearch, IconDownload } from '../components/ui/Icons';
import { SkuTable, SkuSidePanel, useDecisions } from '../components/panels/SkuPanels';
import DispatchPanel from '../components/panels/DispatchPanel';
import { TODAY, SHELF } from '../data/ops';
import { useApp } from '../state/AppState';
import { downloadCSV, fmt, rupee } from '../lib/format';

const FILTERS = ['All', 'Retain', 'RTO'];

export default function RtoRetain() {
  const [params, setParams] = useSearchParams();
  const all = useDecisions();
  const { state, dispatch, toast } = useApp();
  const filter = FILTERS.includes(params.get('filter')) ? params.get('filter') : 'All';
  const q = params.get('q') || '';
  const selId = params.get('sku') || all[0].sku.id;
  const set = (patch) => {
    const p = new URLSearchParams(params);
    Object.entries(patch).forEach(([k, v]) => (v ? p.set(k, v) : p.delete(k)));
    setParams(p, { replace: true });
  };

  const counts = { All: all.length, Retain: all.filter((x) => x.d.retain > 0).length, RTO: all.filter((x) => x.d.rto > 0).length };
  const rows = all
    .filter((x) => filter === 'All' || (filter === 'Retain' ? x.d.retain > 0 : x.d.rto > 0))
    .filter((x) => !q || (x.sku.name + ' ' + x.sku.id + ' ' + x.sku.cat).toLowerCase().includes(q.toLowerCase()));
  const sel = all.find((x) => x.sku.id === selId) || all[0];

  const exportCsv = () => {
    downloadCSV('valmo-save_sku-decisions_2026-10-04.csv', [
      ['SKU', 'Product', 'Category', 'Failed', 'Retain', 'RTO', 'Decision', 'Max hold days', '50% sold by day', 'Resale chance', 'Shelf after today', 'Cap', 'Expected cost', 'Saving per unit'],
      ...all.map(({ sku, d }) => [sku.id, sku.name, sku.cat, sku.failed, d.retain, d.rto, d.decision, d.hold ? d.Ts : '', d.median || '', Math.round(d.p * 100) + '%', sku.shelf + d.retain, d.cap, Math.round(d.cost), Math.round(d.saving)]),
    ]);
    toast('SKU decisions exported (CSV)');
  };

  return (
    <div className="page">
      <PageHead crumbs={[{ label: 'Overview', to: '/' }, { label: 'RTO & Retain' }]} title="Failed deliveries · return to origin or retain for local resale">
        <button className="btn btn-ghost" onClick={exportCsv}><IconDownload width={16} height={16} />Export CSV</button>
        <button className="btn btn-pink" disabled={state.applied} onClick={() => { dispatch({ type: 'applyAll' }); toast('Recommendations applied to all 412 SKUs'); }}>
          {state.applied ? 'Recommendations applied ✓' : 'Apply all recommendations'}
        </button>
      </PageHead>

      <section className="policy" aria-label="Valmo-SAVE policy">
        <b style={{ marginRight: 4 }}>Valmo-SAVE policy</b>
        <span className="chip">◎ Resell within <b>70 km</b></span>
        <span className="chip">◷ Hold at most <b>21 days</b> · inside 45-day rule</span>
        <span className="chip">↩ Return costs <b>₹170</b> (₹50 + ₹120)</span>
        <span className="chip">▤ Holding <b>₹25 + ₹0.33/day</b></span>
        <span className="chip">✓ Retain only if expected cost &lt; ₹170</span>
      </section>

      <section className="kpi-grid six" aria-label="Today in numbers">
        <Tile label="Failed today" value={TODAY.failed} sub={`across ${TODAY.skusFailed} SKUs · 13.0% of OFD`} tint="var(--rose-t)" deep="#8e1d43" to="/rto"
          visual={<svg width="56" height="44" viewBox="0 0 56 44" aria-hidden="true">{[30, 34, 26, 32, 38, 30, 36].map((h, i) => <rect key={i} x={i * 8} y={44 - h} width="5.5" height={h} rx="2" fill="#E8396B" fillOpacity={i < 6 ? 0.45 : 1} />)}</svg>} />
        <Tile label="Retain at hub" value={TODAY.retained} sub="35.5% of failed units" tint="var(--teal-t)" deep="#0b5e54" visual={<Ring value={TODAY.retained / TODAY.failed} color="var(--teal)" />} />
        <Tile label="Return to origin" value={TODAY.rto} sub="low demand or stock cap full" tint="var(--orange-t)" deep="#7a3410" visual={<Ring value={TODAY.rto / TODAY.failed} color="var(--orange)" />} />
        <Tile label="Expected to resell" value={'~' + TODAY.expectedResell} sub="48% of today’s retained" tint="var(--violet-t)" deep="#3d2591" visual={<Ring value={0.48} color="var(--violet)" />} />
        <Tile label="Expected saving" value={rupee(TODAY.expectedSaving)} sub="₹27.5 per retained unit" tint="var(--green-t)" deep="#026a4b"
          visual={<span style={{ width: 50, height: 50, borderRadius: 25, background: '#fff', display: 'grid', placeItems: 'center', fontSize: 22, fontWeight: 700, color: 'var(--green)', flex: 'none' }}>₹</span>} />
        <Tile label="Hold shelf R-4" value={fmt(SHELF.used)} sub={`of ${fmt(SHELF.slots)} slots · alert at 90%`} tint="var(--amber-t)" deep="#7a5200" to="/shelf" visual={<Ring value={SHELF.used / SHELF.slots} color="#D99A1B" />} />
      </section>

      <div className="rto-layout">
        <Card title="Decision for each SKU" sub={`Top 10 of ${TODAY.skusFailed} SKUs by failed units · click a row for the reasoning, the name to open the SKU`}>
          <div className="row wrap" style={{ justifyContent: 'space-between' }}>
            <div className="tabs" role="tablist" aria-label="Filter">
              {FILTERS.map((f) => (
                <button key={f} role="tab" aria-selected={filter === f} className={filter === f ? 'on' : ''} onClick={() => set({ filter: f === 'All' ? null : f })}>{f} ({counts[f]})</button>
              ))}
            </div>
            <label className="search">
              <IconSearch width={15} height={15} />
              <span style={{ position: 'absolute', left: -9999 }}>Search</span>
              <input type="search" placeholder="Search SKU, product or category" value={q} onChange={(e) => set({ q: e.target.value })} />
            </label>
          </div>
          <SkuTable rows={rows} selected={sel.sku.id} onSelect={(id) => set({ sku: id })} />
          <div className="row wrap" style={{ justifyContent: 'space-between' }}>
            <Legend items={[['var(--teal)', '≥ 80% resale chance'], ['var(--blue)', '60–80%'], ['var(--amber)', '30–60%'], ['var(--orange)', 'below 30%']]} />
            <span className="sub">Shelf / cap: units held after today / most units worth holding at once</span>
          </div>
        </Card>

        <SkuSidePanel sku={sel.sku} d={sel.d} />

        <div className="dispatch-col"><DispatchPanel compact /></div>
      </div>
    </div>
  );
}
