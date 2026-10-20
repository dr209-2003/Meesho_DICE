// Bundled, offline product illustrations (no external image hosts, so nothing can break).
// view 0 = catalogue shot, 1 = close-up, 2 = styled shot.
const BG = ['#f6f1fa', '#fbf3e9', '#eef4f8'];

function Kurta({ c }) {
  return (
    <g>
      <path d="M78 34 L62 40 L40 70 L52 80 L64 64 L56 168 L144 168 L136 64 L148 80 L160 70 L138 40 L122 34 Q100 52 78 34Z" fill={c} />
      <path d="M86 36 Q100 50 114 36" fill="none" stroke="#d9b45a" strokeWidth="3" />
      <path d="M100 44 L100 66" stroke="#d9b45a" strokeWidth="2.5" />
      {[[80, 90], [100, 84], [120, 90], [72, 118], [92, 112], [112, 112], [130, 118], [68, 146], [88, 140], [108, 140], [128, 146], [100, 160]].map(([x, y], i) => (
        <g key={i} transform={`translate(${x} ${y})`} fill="#d9b45a"><circle r="3" /><circle cx="0" cy="-6" r="1.6" /><circle cx="0" cy="6" r="1.6" /><circle cx="-6" cy="0" r="1.6" /><circle cx="6" cy="0" r="1.6" /></g>
      ))}
      <path d="M56 164 L144 164" stroke="#d9b45a" strokeWidth="4" />
    </g>
  );
}

function Bedsheet({ c }) {
  const flower = (x, y, k) => (
    <g key={k} transform={`translate(${x} ${y})`}>
      {[0, 72, 144, 216, 288].map((a) => <ellipse key={a} rx="4" ry="7" fill="#fff" fillOpacity=".85" transform={`rotate(${a}) translate(0 -6)`} />)}
      <circle r="3" fill="#f5c542" />
    </g>
  );
  return (
    <g>
      <rect x="34" y="112" width="132" height="42" rx="8" fill={c} />
      <rect x="34" y="112" width="132" height="10" rx="5" fill="#000" fillOpacity=".08" />
      <rect x="40" y="76" width="120" height="40" rx="8" fill={c} />
      <rect x="40" y="104" width="120" height="6" fill="#000" fillOpacity=".08" />
      <rect x="62" y="40" width="80" height="38" rx="14" fill="#fff" stroke={c} strokeWidth="3" />
      {[[56, 92], [92, 96], [128, 90], [50, 136], [86, 140], [122, 134], [154, 140], [82, 58], [118, 60]].map(([x, y], i) => flower(x, y, i))}
      {flower(102, 59, 'p')}
    </g>
  );
}

function Serum() {
  return (
    <g>
      <rect x="86" y="30" width="28" height="30" rx="8" fill="#353543" />
      <rect x="92" y="18" width="16" height="16" rx="8" fill="#4f4f63" />
      <rect x="70" y="58" width="60" height="112" rx="16" fill="#e89a2c" />
      <rect x="70" y="58" width="60" height="112" rx="16" fill="url(#glass)" />
      <rect x="78" y="92" width="44" height="52" rx="6" fill="#fff8ec" />
      <text x="100" y="114" textAnchor="middle" fontSize="13" fontWeight="700" fill="#b4600c" fontFamily="Poppins, sans-serif">VIT C</text>
      <text x="100" y="130" textAnchor="middle" fontSize="8" fill="#8a5a00" fontFamily="Poppins, sans-serif">face serum</text>
      <text x="100" y="140" textAnchor="middle" fontSize="7" fill="#8a5a00" fontFamily="Poppins, sans-serif">30 ml</text>
      <rect x="76" y="64" width="8" height="96" rx="4" fill="#fff" fillOpacity=".35" />
      <circle cx="150" cy="150" r="10" fill="#f5a623" fillOpacity=".5" /><circle cx="44" cy="74" r="6" fill="#f5a623" fillOpacity=".35" />
    </g>
  );
}

function Tee({ x, y, c, r }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${r})`}>
      <path d="M-22 -34 L-40 -26 L-48 -6 L-34 0 L-30 -8 L-30 34 L30 34 L30 -8 L34 0 L48 -6 L40 -26 L22 -34 Q0 -22 -22 -34Z" fill={c} />
      <path d="M-14 -32 Q0 -22 14 -32" fill="none" stroke="#fff" strokeOpacity=".6" strokeWidth="2.5" />
      <circle cx="0" cy="6" r="9" fill="#fff" fillOpacity=".8" /><path d="M-4 4 L0 8 L5 2" stroke={c} strokeWidth="2.4" fill="none" strokeLinecap="round" />
    </g>
  );
}
const Tees = () => <g><Tee x={66} y={96} c="#0e9f8e" r={-10} /><Tee x={134} y={96} c="#e8396b" r={10} /><Tee x={100} y={118} c="#f5a623" r={0} /></g>;

function Watch({ c }) {
  return (
    <g>
      <rect x="84" y="14" width="32" height="56" rx="8" fill="#6b4226" />
      <rect x="84" y="130" width="32" height="56" rx="8" fill="#6b4226" />
      {[28, 42, 152, 166].map((y) => <rect key={y} x="84" y={y} width="32" height="2" fill="#000" fillOpacity=".25" />)}
      <circle cx="100" cy="100" r="44" fill="#c9c9d6" />
      <circle cx="100" cy="100" r="38" fill={c} />
      {Array.from({ length: 12 }, (_, i) => <rect key={i} x="99" y="66" width="2" height={i % 3 ? 4 : 8} fill="#fff" transform={`rotate(${i * 30} 100 100)`} />)}
      <path d="M100 100 L100 76" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
      <path d="M100 100 L118 108" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
      <path d="M100 100 L84 122" stroke="#f43397" strokeWidth="1.5" />
      <circle cx="100" cy="100" r="3" fill="#fff" />
      <rect x="143" y="95" width="8" height="10" rx="2" fill="#a3a3b8" />
    </g>
  );
}

function Pot({ x, w, h, c, leaf }) {
  return (
    <g>
      {leaf.map(([dx, dy, r], i) => <ellipse key={i} cx={x + dx} cy={170 - h - dy} rx="7" ry="16" fill={i % 2 ? '#0e9f8e' : '#038d63'} transform={`rotate(${r} ${x + dx} ${170 - h - dy})`} />)}
      <path d={`M${x - w / 2} ${170 - h} L${x + w / 2} ${170 - h} L${x + w / 2 - 6} 170 L${x - w / 2 + 6} 170Z`} fill={c} />
      <rect x={x - w / 2 - 3} y={170 - h - 6} width={w + 6} height="9" rx="3" fill={c} />
      <rect x={x - w / 2 - 3} y={170 - h - 6} width={w + 6} height="9" rx="3" fill="#000" fillOpacity=".06" />
    </g>
  );
}
const Planters = ({ c }) => (
  <g>
    <Pot x={54} w={34} h={44} c={c} leaf={[[-6, 10, -20], [6, 12, 20]]} />
    <Pot x={100} w={44} h={62} c={c} leaf={[[-10, 12, -28], [0, 20, 0], [10, 12, 28]]} />
    <Pot x={148} w={38} h={52} c={c} leaf={[[-8, 10, -24], [8, 10, 24], [0, 18, 4]]} />
    <rect x="24" y="170" width="152" height="4" rx="2" fill="#000" fillOpacity=".08" />
  </g>
);

const Mouse = ({ c }) => (
  <g>
    <path d="M100 34 C140 34 146 70 146 110 C146 150 126 172 100 172 C74 172 54 150 54 110 C54 70 60 34 100 34Z" fill={c} />
    <path d="M100 34 L100 88 M54 92 Q100 100 146 92" stroke="#fff" strokeOpacity=".25" strokeWidth="2" fill="none" />
    <rect x="95" y="50" width="10" height="20" rx="5" fill="#f43397" />
    <path d="M70 60 Q78 44 96 40" stroke="#fff" strokeOpacity=".35" strokeWidth="4" fill="none" strokeLinecap="round" />
    <rect x="150" y="150" width="20" height="10" rx="3" fill="#353543" />
  </g>
);

const Rack = ({ c }) => (
  <g stroke={c} strokeWidth="5" strokeLinecap="round">
    <path d="M50 30 V176 M150 30 V176" />
    {[62, 110, 158].map((y) => <g key={y}><path d={`M46 ${y} H154`} /><path d={`M52 ${y + 6} H148`} strokeWidth="2" /></g>)}
    <g stroke="none">
      <rect x="62" y="40" width="16" height="22" rx="3" fill="#e8396b" /><rect x="84" y="46" width="14" height="16" rx="3" fill="#f5a623" /><rect x="104" y="36" width="12" height="26" rx="4" fill="#0e9f8e" />
      <circle cx="78" cy="96" r="12" fill="#f5a623" /><circle cx="104" cy="98" r="10" fill="#e86c2c" /><rect x="118" y="88" width="22" height="22" rx="4" fill="#3d6ce0" />
      <rect x="64" y="138" width="40" height="20" rx="6" fill="#7b3fe4" /><rect x="112" y="142" width="26" height="16" rx="4" fill="#038d63" />
    </g>
  </g>
);

const Clock = ({ c }) => (
  <g>
    <circle cx="100" cy="100" r="70" fill={c} />
    <circle cx="100" cy="100" r="70" fill="none" stroke="#000" strokeOpacity=".15" strokeWidth="6" />
    {[0, 1, 2].map((i) => <path key={i} d={`M${48 + i * 4} ${70 + i * 30} Q100 ${60 + i * 34} ${152 - i * 4} ${72 + i * 30}`} stroke="#000" strokeOpacity=".08" strokeWidth="3" fill="none" />)}
    <circle cx="100" cy="100" r="54" fill="#f6ead8" />
    {Array.from({ length: 12 }, (_, i) => <circle key={i} cx="100" cy="54" r={i % 3 ? 2 : 3.5} fill="#5a3418" transform={`rotate(${i * 30} 100 100)`} />)}
    <path d="M100 100 L100 66" stroke="#5a3418" strokeWidth="4" strokeLinecap="round" />
    <path d="M100 100 L126 112" stroke="#5a3418" strokeWidth="4" strokeLinecap="round" />
    <path d="M100 100 L80 132" stroke="#e8396b" strokeWidth="1.6" />
    <circle cx="100" cy="100" r="4" fill="#5a3418" />
  </g>
);

const Cover = ({ c }) => (
  <g>
    <rect x="58" y="22" width="84" height="160" rx="18" fill={c} />
    <rect x="66" y="30" width="34" height="40" rx="10" fill="#353543" />
    <circle cx="78" cy="42" r="7" fill="#22222e" stroke="#4f4f63" strokeWidth="2" /><circle cx="78" cy="60" r="7" fill="#22222e" stroke="#4f4f63" strokeWidth="2" /><circle cx="92" cy="50" r="3" fill="#f5c542" />
    {[[86, 104, 16, '#f5a623'], [116, 126, 12, '#fde6ee'], [84, 146, 10, '#ffffff'], [118, 88, 8, '#ffd27a']].map(([x, y, r, f], i) => <circle key={i} cx={x} cy={y} r={r} fill={f} fillOpacity=".9" />)}
    <path d="M70 168 Q100 150 130 168" stroke="#fff" strokeOpacity=".7" strokeWidth="3" fill="none" />
  </g>
);

const ART = { kurta: Kurta, bedsheet: Bedsheet, serum: Serum, tees: Tees, watch: Watch, planters: Planters, mouse: Mouse, rack: Rack, clock: Clock, cover: Cover };

export default function ProductArt({ product, variant, view = 0, className, label }) {
  const A = ART[product.art];
  const c = product.tone[variant || product.options[0]] || '#9f2089';
  const t = view === 1 ? 'translate(-62 -50) scale(1.6)' : view === 2 ? 'translate(20 24) scale(.8)' : '';
  return (
    <svg viewBox="0 0 200 200" className={className} role="img" aria-label={label || `${product.short}${variant ? ', ' + variant : ''}`} preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id="glass" x1="0" x2="1"><stop offset="0" stopColor="#fff" stopOpacity=".15" /><stop offset=".5" stopColor="#fff" stopOpacity="0" /><stop offset="1" stopColor="#000" stopOpacity=".12" /></linearGradient>
      </defs>
      <rect width="200" height="200" fill={BG[view]} />
      {view === 2 && <><rect y="150" width="200" height="50" fill="#e4dccf" /><circle cx="168" cy="40" r="22" fill="#fff" fillOpacity=".7" /></>}
      <ellipse cx="100" cy="182" rx="62" ry="6" fill="#000" fillOpacity=".06" />
      <g transform={t}><A c={c} /></g>
    </svg>
  );
}
