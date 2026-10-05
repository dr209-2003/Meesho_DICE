import { Link } from 'react-router-dom';
import { Card, Kpi, Legend, PageHead } from '../components/ui/Primitives';
import { IconBox, IconCheck, IconDownload, IconLoop, IconTruck, IconX } from '../components/ui/Icons';
import { AgeBar, CategoryTreemap, ReasonsDonut, Sankey, ShelfGauge, TrendCombo, ZoneBars } from '../components/charts/OpsCharts';
import TasksPanel from '../components/panels/TasksPanel';
import NotificationsPanel from '../components/panels/NotificationsPanel';
import { HUB, TODAY, DAYS, delivered, failed, outForDelivery, received, resold, retained } from '../data/ops';
import { useApp } from '../state/AppState';
import { NOW, downloadCSV, fmt, rupee } from '../lib/format';

export default function Overview() {
  const { sent, due, toast } = useApp();
  const recDelta = ((received[13] - received[12]) / received[12]) * 100;

  const report = () => {
    downloadCSV('lmdc-dl-07_day-report_2026-10-04.csv', [
      ['Date', 'Received', 'Out for delivery', 'Delivered', 'Failed', 'Retained', 'RTO', 'Success %', 'Resold from shelf'],
      ...DAYS.map((d, i) => [d + ' 2026', received[i], outForDelivery[i], delivered[i], failed[i], retained[i], failed[i] - retained[i], ((delivered[i] / outForDelivery[i]) * 100).toFixed(1), resold[i]]),
    ]);
    toast('Day report downloaded (CSV)');
  };

  return (
    <div className="page">
      <PageHead title={`Good afternoon, Ritu — here’s ${HUB.id} today`}
        sub={`Live numbers for ${NOW.date} · last sync ${NOW.time} · Valmo-SAVE policy: resell within 70 km, hold up to 21 days`}>
        <button className="btn btn-ghost" onClick={report}><IconDownload width={16} height={16} />Download day report</button>
        <Link to="/rto" className="btn btn-pink">Review {TODAY.failed} failed units ›</Link>
      </PageHead>

      <div className="split">
        <div className="col">
          <section className="kpi-grid" aria-label="Today in numbers">
            <Kpi label="Received at hub" value={fmt(TODAY.received)} icon={<IconBox />} accent="#3D6CE0" tint="var(--blue-t)" series={received}
              sub={<><b style={{ color: '#b4325b' }}>▼ {Math.abs(recDelta).toFixed(1)}%</b> vs Sat · 4 line-hauls in</>} />
            <Kpi label="Out for delivery" value={fmt(TODAY.outForDelivery)} icon={<IconTruck />} accent="#2BA6DE" tint="var(--sky-t)" series={outForDelivery}
              sub={<><b>96.0%</b> of received · {TODAY.riders} riders</>} />
            <Kpi label="Delivered" value={fmt(TODAY.delivered)} icon={<IconCheck />} accent="#038D63" tint="var(--green-t)" series={delivered}
              sub={<><b style={{ color: 'var(--green)' }}>87.0%</b> success · <b style={{ color: '#b4325b' }}>▼ 0.4 pts</b></>} />
            <Kpi to="/rto" label="Failed" value={TODAY.failed} icon={<IconX />} accent="#E8396B" tint="var(--rose-t)" series={failed}
              extra={<div style={{ display: 'flex', height: 8, borderRadius: 4, overflow: 'hidden' }}><div style={{ width: (TODAY.rto / TODAY.failed) * 100 + '%', background: 'var(--orange)' }} /><div style={{ flex: 1, background: 'var(--teal)' }} /></div>}
              sub={<><span style={{ color: 'var(--orange)', fontWeight: 700 }}>● RTO {TODAY.rto}</span> &nbsp;<span style={{ color: 'var(--teal)', fontWeight: 700 }}>● Retained {TODAY.retained}</span></>} />
            <Kpi to="/dispatch" label="Resold from shelf" value={TODAY.resold} icon={<IconLoop />} accent="#7B3FE4" tint="var(--violet-t)" series={resold}
              sub={<><b style={{ color: '#4a23a3' }}>{sent} sent</b> to LMSC · {due ? `${due} due by 14:15` : 'all sent'}</>} />
          </section>

          <div className="charts">
            <Card title="Where today’s parcels went" sub="Hub inflow → riders → outcome"><Sankey /></Card>
            <Card title="Failed deliveries · last 14 days" sub="Bars: RTO + retained · line: success rate">
              <TrendCombo />
              <Legend items={[['var(--orange)', 'RTO'], ['var(--teal)', 'Retained'], ['var(--green)', 'Success rate']]} />
            </Card>
            <Card title="Why deliveries failed" sub="Today, by rider-reported reason">
              <ReasonsDonut />
              <div style={{ padding: '9px 12px', borderRadius: 10, background: 'var(--rose-t)', fontSize: 12, color: '#7a1f3d', fontWeight: 500 }}>
                COD issues are <b>284 of 602 (47%)</b> — most of these units are good candidates to retain.
              </div>
            </Card>
            <Card title="Failed by delivery zone" sub="Split of each zone’s failures">
              <ZoneBars />
              <div className="row wrap" style={{ justifyContent: 'space-between' }}>
                <Legend items={[['var(--orange)', 'RTO'], ['var(--teal)', 'Retained']]} />
                <span className="sub">~36% retained in every zone</span>
              </div>
            </Card>
            <Card title="Hold shelf · rack zone R-4" sub="Valmo-SAVE stock and today’s result" right={<Link to="/shelf" className="sub" style={{ color: 'var(--brand)', fontWeight: 600 }}>Open ›</Link>}>
              <div className="row wrap" style={{ gap: 14 }}>
                <ShelfGauge size={190} />
                <div className="grow" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, minWidth: 170 }}>
                  {[['Resold today', TODAY.resold, 'var(--violet-t)', '#4a23a3'], ['Hit 21-day cap', TODAY.capExpired, 'var(--orange-t)', '#8a3610'],
                    ['Resale rate', '48%', 'var(--teal-t)', '#0b5e54'], ['Net saving today', rupee(TODAY.netSavingToday), 'var(--green-t)', '#026a4b']].map(([l, v, bg, fg]) => (
                    <div key={l} style={{ padding: '8px 11px', borderRadius: 12, background: bg, color: fg }}>
                      <div style={{ fontSize: 11, fontWeight: 600 }}>{l}</div><b style={{ fontSize: 18 }}>{v}</b>
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-auto">
                <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Units by days on shelf <span className="muted" style={{ fontWeight: 400 }}>· 21-day limit</span></div>
                <AgeBar />
              </div>
            </Card>
            <Card title="Retained today by category" sub="214 units kept at the hub · click to filter"><CategoryTreemap /></Card>
          </div>
        </div>

        <aside className="col side-panels">
          <TasksPanel />
          <NotificationsPanel maxHeight={430} />
        </aside>
      </div>
    </div>
  );
}
