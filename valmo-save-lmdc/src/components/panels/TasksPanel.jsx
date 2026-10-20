import { Link } from 'react-router-dom';
import { TASKS } from '../../data/feed';
import { RESOLD_TODAY } from '../../data/dispatch';
import { useApp } from '../../state/AppState';
import { Card, Bar } from '../ui/Primitives';
import { IconList } from '../ui/Icons';
import { NOW, toMin } from '../../lib/format';

const PAL = {
  urgent: ['var(--rose)', 'var(--rose-t)', '#9c2148', 'Due soon'],
  progress: ['var(--amber)', 'var(--amber-t)', '#8a5a00', 'In progress'],
  pending: ['var(--grey)', '#f2f2f7', '#4f4f63', 'Pending'],
  done: ['var(--green)', 'var(--green-t)', '#026a4b', 'Done'],
};

export function useTasks() {
  const { state, sent, due } = useApp();
  return TASKS.map((t) => {
    const isDone = !!state.tasksDone[t.id];
    let sub = t.sub, progress = t.progress;
    if (t.derived === 'dispatch') {
      progress = sent / RESOLD_TODAY;
      sub = due > 0 ? `${sent} / ${RESOLD_TODAY} sent · ${due} still to load for VH-DS-12` : `${sent} / ${RESOLD_TODAY} sent · all handed over`;
    }
    const kind = isDone ? 'done' : t.kind === 'done' ? 'pending' : t.kind;
    return { ...t, isDone, sub: isDone && t.kind !== 'done' ? 'Marked done this shift' : sub, progress, kind };
  });
}

export default function TasksPanel({ limit, title = 'Tasks for this shift' }) {
  const { dispatch, toast } = useApp();
  const tasks = useTasks();
  const done = tasks.filter((t) => t.isDone).length;
  const list = limit ? tasks.slice(0, limit) : tasks;
  const nextDue = tasks.filter((t) => !t.isDone).sort((a, b) => toMin(a.due) - toMin(b.due))[0];

  return (
    <Card
      title={<span className="row" style={{ gap: 10 }}><span className="kpi-ico" style={{ '--tint': 'var(--brand-tint)', '--accent': 'var(--brand)' }}><IconList /></span>{title}</span>}
      sub={nextDue ? `${tasks.length - done} open · next due ${nextDue.due}` : 'All tasks done'}
      right={
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 5, width: 140 }}>
          <b style={{ fontSize: 13 }}>{done} of {tasks.length} done</b>
          <Bar value={done / tasks.length} color="linear-gradient(90deg, var(--brand-pink), var(--green))" style={{ width: 140 }} />
        </div>
      }
    >
      <div>
        {list.map((t) => {
          const [c, tint, fg, label] = PAL[t.kind];
          const late = !t.isDone && toMin(t.due) - NOW.minutes <= 30 && toMin(t.due) >= NOW.minutes;
          return (
            <div key={t.id} className={'task' + (t.isDone ? ' is-done' : '')}>
              <button
                className={'check' + (t.isDone ? ' done' : t.kind === 'urgent' ? ' urgent' : '')}
                style={{ '--c': c }}
                aria-label={(t.isDone ? 'Mark not done: ' : 'Mark done: ') + t.title}
                onClick={() => { dispatch({ type: 'toggleTask', id: t.id }); toast(t.isDone ? 'Task re-opened' : 'Task marked done'); }}
              >
                {t.isDone ? '✓' : t.kind === 'urgent' ? '!' : ''}
              </button>
              <div className="grow" style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <Link to={t.link} className="task-title ell" style={{ color: 'inherit' }}>{t.title}</Link>
                <div className="row" style={{ gap: 8 }}>
                  {!t.isDone && t.progress > 0 && t.progress < 1 && <Bar value={t.progress} color={c} height={5} style={{ width: 70, flex: 'none' }} />}
                  <span className="ell sub" style={{ fontSize: 11.5 }}>{t.sub}</span>
                </div>
              </div>
              <span className={'due' + (late ? ' hot' : '')}>{t.isDone ? t.due : 'by ' + t.due}</span>
              <span className="pill status" style={{ background: tint, color: fg }}>{label}</span>
            </div>
          );
        })}
      </div>
      {limit && limit < tasks.length && <Link to="/tasks" className="sub" style={{ color: 'var(--brand)', fontWeight: 600 }}>View all {tasks.length} tasks ›</Link>}
    </Card>
  );
}
