import { useState } from 'react';
import { useApp } from '../state';
import { Badge, Modal } from './ui';

export const SEV = { high: ['High', 'red'], med: ['Medium', 'amber'], low: ['Low', 'blue'] };

export function useAlertAction() {
  const { resolve, reopen, toast } = useApp();
  const [a, setA] = useState(null);
  const [note, setNote] = useState('');
  const openFor = (x) => { setA(x); setNote(''); };
  const modal = (
    <Modal open={!!a} title={a ? a.action : ''} onClose={() => setA(null)}>
      {a && (
        <div className="modal-b">
          <div className="row" style={{ gap: 8, marginBottom: 6 }}><Badge c={SEV[a.sev][1]}>{SEV[a.sev][0]}</Badge><span className="muted">{a.kind} · {a.where}</span></div>
          <p className="strong" style={{ margin: '6px 0' }}>{a.title}</p>
          <p className="muted" style={{ margin: '0 0 14px', lineHeight: 1.55 }}><b style={{ color: 'var(--ink)' }}>Recommended:</b> {a.detail}</p>
          {a.resolved ? (
            <>
              <p className="note ok">Resolved {new Date(a.resolved.at).toLocaleString('en-IN')}{a.resolved.note ? ` · “${a.resolved.note}”` : ''}</p>
              <div className="row end"><button className="btn btn-out" onClick={() => { reopen(a.id); toast('Alert reopened'); setA(null); }}>Reopen alert</button></div>
            </>
          ) : (
            <>
              <label className="lbl" htmlFor="note">Note for the LMDC team (optional)</label>
              <textarea id="note" rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Spoke to shift lead, moving units on the 14:30 line-haul" />
              <div className="row end" style={{ marginTop: 12 }}>
                <button className="btn btn-ghost" onClick={() => setA(null)}>Cancel</button>
                <button className="btn btn-pri" onClick={() => { resolve(a.id, note.trim()); toast(`${a.action}: sent to ${a.where.split('– ')[1] || a.where} and marked resolved`); setA(null); }}>Confirm and resolve</button>
              </div>
            </>
          )}
        </div>
      )}
    </Modal>
  );
  return [openFor, modal];
}
