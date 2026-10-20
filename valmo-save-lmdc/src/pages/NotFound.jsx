import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="page" style={{ alignItems: 'center', textAlign: 'center', paddingTop: 80 }}>
      <div style={{ fontSize: 64, fontWeight: 800, color: 'var(--brand)' }}>404</div>
      <h1 style={{ fontSize: 22 }}>This page isn’t on the hub map</h1>
      <p className="muted">The link may be old, or the SKU is not among today’s failed deliveries.</p>
      <div className="actions" style={{ justifyContent: 'center' }}>
        <Link to="/" className="btn btn-primary">Go to overview</Link>
        <Link to="/rto" className="btn btn-outline">See failed SKUs</Link>
      </div>
    </div>
  );
}
