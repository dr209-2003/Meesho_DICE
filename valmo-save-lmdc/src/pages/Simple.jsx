import { PageHead } from '../components/ui/Primitives';
import TasksPanel from '../components/panels/TasksPanel';
import NotificationsPanel from '../components/panels/NotificationsPanel';

export function TasksPage() {
  return (
    <div className="page" style={{ maxWidth: 1000 }}>
      <PageHead crumbs={[{ label: 'Overview', to: '/' }, { label: 'Tasks' }]} title="Tasks for this shift" sub="Tick a task when it is done · click a task to open the screen where it happens" />
      <TasksPanel title="Shift A · 06:00 – 22:00" />
    </div>
  );
}

export function NotificationsPage() {
  return (
    <div className="page" style={{ maxWidth: 1000 }}>
      <PageHead crumbs={[{ label: 'Overview', to: '/' }, { label: 'Notifications' }]} title="Notifications" sub="Every update for LMDC-DL-07 today, newest first" />
      <NotificationsPanel full />
    </div>
  );
}
