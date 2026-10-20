import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { NOTIF_KINDS } from '../../data/feed';
import { useApp } from '../../state/AppState';
import { Card } from '../ui/Primitives';
import { IconBell } from '../ui/Icons';

const GROUPS = {
  All: () => true,
  Dispatch: (k) => k === 'Dispatch' || k === 'Alert',
  Retain: (k) => k === 'Retain',
  RTO: (k) => k === 'RTO',
  Shelf: (k) => k === 'Shelf',
  Ops: (k) => k === 'Ops',
};

export default function NotificationsPanel({ maxHeight = 420, full = false }) {
  const { notifications, unread, dispatch } = useApp();
  const [tab, setTab] = useState('All');
  const nav = useNavigate();
  const items = notifications.filter((n) => GROUPS[tab](n.kind));

  return (
    <Card
      title={<span className="row" style={{ gap: 10 }}><span className="kpi-ico" style={{ '--tint': 'var(--rose-t)', '--accent': 'var(--rose)' }}><IconBell /></span>Notifications</span>}
      sub="Live feed from riders, shelf and shuttles · click to open"
      right={
        <div className="row" style={{ gap: 8 }}>
          <span className="pill" style={{ background: unread ? 'var(--brand-pink)' : 'var(--green-t)', color: unread ? '#fff' : 'var(--green)' }}>{unread ? `${unread} new` : 'All read'}</span>
          <button className="btn btn-ghost btn-sm" onClick={() => dispatch({ type: 'readAll' })} disabled={!unread}>Mark all read</button>
        </div>
      }
      style={full ? undefined : { minHeight: 0 }}
    >
      <div className="tabs" role="tablist" aria-label="Filter notifications" style={{ alignSelf: 'flex-start' }}>
        {Object.keys(GROUPS).map((g) => (
          <button key={g} role="tab" aria-selected={tab === g} className={tab === g ? 'on' : ''} onClick={() => setTab(g)}>
            {g} {notifications.filter((n) => GROUPS[g](n.kind)).length}
          </button>
        ))}
      </div>
      <div className="notif-list" style={{ maxHeight: full ? 'none' : maxHeight }}>
        {items.length === 0 && <div className="empty">Nothing here yet.</div>}
        {items.map((n) => {
          const k = NOTIF_KINDS[n.kind];
          return (
            <div key={n.id} role="link" tabIndex={0} className={'notif' + (n.unread ? ' unread' : '')}
              onClick={() => { dispatch({ type: 'read', id: n.id }); nav(n.link); }}
              onKeyDown={(e) => { if (e.key === 'Enter') { dispatch({ type: 'read', id: n.id }); nav(n.link); } }}>
              <span className="notif-ico" style={{ background: k.tint, color: k.color }}>{k.glyph}</span>
              <div className="grow">
                <div className="notif-text">{n.text}</div>
                <div className="notif-meta">
                  {n.fresh ? 'Just now' : n.time}
                  <span className="pill" style={{ background: k.tint, color: k.color, padding: '1px 7px', fontSize: 10.5 }}>{k.tag}</span>
                </div>
              </div>
              {n.unread && <span className="unread-dot" />}
            </div>
          );
        })}
      </div>
      {!full && <Link to="/notifications" className="sub" style={{ color: 'var(--brand)', fontWeight: 600 }}>Open all notifications ›</Link>}
    </Card>
  );
}
