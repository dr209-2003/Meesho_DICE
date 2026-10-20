export const fmt = (n) => Number(n).toLocaleString('en-IN');
export const rupee = (n) => '₹' + Math.round(n).toLocaleString('en-IN');
export const pct = (x, d = 0) => (x * 100).toFixed(d) + '%';

/** Simulated "now" for the prototype: Sun 04 Oct 2026, 13:45 IST */
export const NOW = { date: 'Sun, 04 Oct 2026', time: '13:45', minutes: 13 * 60 + 45 };
export const toMin = (hm) => {
  const [h, m] = hm.split(':').map(Number);
  return h * 60 + m;
};

export const hm = (m) => String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');

/** Trigger a CSV download in the browser */
export function downloadCSV(filename, rows) {
  const esc = (v) => {
    const s = String(v ?? '');
    return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  const csv = rows.map((r) => r.map(esc).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
