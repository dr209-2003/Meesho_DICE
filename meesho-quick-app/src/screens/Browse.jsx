import { useMemo } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useShared } from '../shared/SharedStore';
import { CATEGORIES, PRODUCTS, QUICK_HUB, RADIUS_KM, TABS, inQuickZone } from '../shared/catalog';
import { availableFor } from '../shared/ops';
import { useBack, useCartView, useQuick } from './App';
import { CartBtn, Empty, Ic, LocationRow, ProductCard, QuickLogo, SkeletonGrid, TopBar, fmtTime } from './ui';

const match = (p, q) => !q || (p.id + ' ' + p.title + ' ' + p.tab + ' ' + p.catId + ' ' + p.short).toLowerCase().includes(q.toLowerCase().trim());

function useCards() {
  const { avail } = useShared();
  const { area, customer, toggleWish, toast } = useQuick();
  const zone = inQuickZone(area);
  return (p, extra = {}) => (
    <ProductCard key={p.id} p={p} left={availableFor(avail, p.id)} quickArea={zone} wish={(customer.wish || []).includes(p.id)}
      onWish={() => { toggleWish(p.id); toast((customer.wish || []).includes(p.id) ? 'Removed from wishlist' : 'Saved to wishlist'); }} {...extra} />
  );
}

export function Home() {
  const { area, openLocation } = useQuick();
  const { count } = useCartView();
  const { avail, mode } = useShared();
  const navigate = useNavigate();
  const card = useCards();
  const zone = inQuickZone(area);
  const near = PRODUCTS.filter((p) => availableFor(avail, p.id) > 0);
  return (
    <>
      <header className="top">
        <div className="bar">
          <span className="logo" style={{ flex: 1 }}>meesho</span>
          <Link to="/account#wishlist" className="ib" aria-label="Wishlist"><Ic.heart /></Link>
          <CartBtn count={count} />
        </div>
        <button className="search" onClick={() => navigate('/search')} aria-label="Search">
          <Ic.search width={20} height={20} /><span>Search by Keyword or Product ID</span><Ic.camera className="cam" width={20} height={20} />
        </button>
      </header>

      {mode === 'loading' ? <div className="sk" style={{ height: 150, margin: '0 14px 14px', borderRadius: 18 }} /> : zone ? (
        <Link to="/quick" className="hero" aria-label="Meesho Quick: shop products near you">
          <QuickLogo size={27} />
          <p>Same products. Near you.<br />Get it in 1–2 days.</p>
          <span className="go">Shop Now <Ic.chev width={16} height={16} /></span>
          <img src="/img/banner-art.jpg" alt="" />
        </Link>
      ) : (
        <button className="hero off" style={{ width: 'calc(100% - 28px)', textAlign: 'left' }} onClick={openLocation}>
          <QuickLogo size={27} />
          <p>Not available in {area.name} yet. Quick delivers within {RADIUS_KM} km of our Delhi hub.</p>
          <span className="go">Change location <Ic.chev width={16} height={16} /></span>
        </button>
      )}

      <nav className="cats" aria-label="Categories">
        {CATEGORIES.map((c) => (
          <Link key={c.id} to={c.id === 'all' ? '/categories' : `/category/${c.id}`} className={'cat' + (c.id === 'all' ? ' on' : '')}>
            <img src={c.icon} alt="" />{c.name}
          </Link>
        ))}
      </nav>

      <div className="trust" aria-label="Why shop on Meesho">
        <div><i><Ic.percent width={18} height={18} /></i>Lowest<br />Prices</div>
        <div><i><Ic.truck width={18} height={18} /></i>Cash on<br />Delivery</div>
        <div><i><Ic.shield width={18} height={18} /></i>7 Days<br />Return</div>
        <div><i><Ic.badge width={18} height={18} /></i>100%<br />Original</div>
      </div>

      <div className="sec-h"><h2>Deals for You</h2><Link to="/quick" className="see">See All <Ic.chev width={14} height={14} /></Link></div>
      <div className="deals">
        {PRODUCTS.map((p) => (
          <Link key={p.id} to={`/p/${p.id}`} className="deal" aria-label={`${p.title}, ${p.off}% off`}>
            <img src={p.img} alt="" loading="lazy" /><span>{p.off}% OFF</span>
          </Link>
        ))}
      </div>

      {zone && near.length > 0 && (
        <>
          <div className="sec-h"><h2><Ic.boltF width={16} height={16} style={{ color: '#f7a600', verticalAlign: '-2px' }} /> Available near you</h2><Link to="/quick" className="see">See All <Ic.chev width={14} height={14} /></Link></div>
          {mode === 'loading' ? <SkeletonGrid n={2} /> : <div className="grid">{near.slice(0, 4).map((p) => card(p))}</div>}
        </>
      )}
      <div className="div" />
      <div className="sec-h"><h2>Products for You</h2></div>
      {mode === 'loading' ? <SkeletonGrid /> : <div className="grid">{PRODUCTS.map((p) => card(p))}</div>}
    </>
  );
}

const TILES = [
  ['today', 'Available Today', 'boltF'],
  ['fast', '1–2 Days', 'cal'],
  ['prepaid', 'Prepaid Only', 'minusC'],
  ['stock', 'Local Stock', 'store'],
];

export function QuickStore() {
  const { area, openLocation, customer, setPrepaid, toast } = useQuick();
  const { count } = useCartView();
  const { avail, mode, state, sync, retry } = useShared();
  const back = useBack('/');
  const card = useCards();
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') || 'All';
  const q = params.get('q') || '';
  const sort = params.get('sort') || 'rel';
  const tile = params.get('f') || 'fast';
  const set = (k, v) => { const p = new URLSearchParams(params); if (v) p.set(k, v); else p.delete(k); setParams(p, { replace: true }); };
  const zone = inQuickZone(area);
  const today = area.km <= 15;

  const { live, soldOut } = useMemo(() => {
    const live = PRODUCTS.filter((p) => availableFor(avail, p.id) > 0);
    const touched = new Set((state?.units || []).filter((u) => u.status === 'reserved' || u.status === 'sold').map((u) => u.skuId));
    return { live, soldOut: PRODUCTS.filter((p) => touched.has(p.id) && availableFor(avail, p.id) === 0) };
  }, [avail, state]);

  let list = live.filter((p) => (tab === 'All' || p.tab === tab) && match(p, q));
  if (tile === 'today' && !today) list = [];
  const by = { lo: (a, b) => a.price - b.price, hi: (a, b) => b.price - a.price, off: (a, b) => b.off - a.off, rating: (a, b) => b.rating - a.rating }[sort];
  if (by) list = [...list].sort(by);

  const pickTile = (k) => {
    if (k === 'prepaid') { setPrepaid(!customer.prepaid); toast(customer.prepaid ? 'Prepaid preference off' : 'Prepaid selected: pay online at checkout for faster delivery'); return; }
    set('f', k === 'fast' ? '' : k);
  };

  return (
    <>
      <header className="top line">
        <div className="bar back qbar">
          <button className="ib" onClick={back} aria-label="Back"><Ic.back /></button>
          <h1 style={{ textAlign: 'center' }}><QuickLogo size={22} /></h1>
          <CartBtn count={count} />
        </div>
        <LocationRow area={area} onOpen={openLocation} />
      </header>

      {!zone ? (
        <Empty icon="pin" title={`Quick isn’t in ${area.name} yet`} text={`Meesho Quick sells products already held at the Valmo hub in Delhi South. ${area.name} is ${area.km} km away; Quick covers ${RADIUS_KM} km.`}
          action={<button className="btn pri sm" onClick={openLocation}>Change location</button>} />
      ) : (
        <>
          <div className="tiles" role="group" aria-label="Quick filters" style={{ marginTop: 2 }}>
            {TILES.map(([k, label, icon]) => {
              const I = Ic[icon];
              const on = k === 'prepaid' ? customer.prepaid : k === 'stock' ? tile === 'stock' : tile === k;
              return <button key={k} className={'tile' + (on ? ' on' : '')} aria-pressed={on} onClick={() => pickTile(k)}><i><I width={18} height={18} /></i>{label}</button>;
            })}
          </div>
          <div className="tabs" role="tablist" aria-label="Category">
            {TABS.map((t) => <button key={t} role="tab" aria-selected={tab === t} className={tab === t ? 'on' : ''} onClick={() => set('tab', t === 'All' ? '' : t)}>{t}</button>)}
          </div>
          <div className="tools">
            <label className="sr" htmlFor="sort">Sort</label>
            <select id="sort" className="sel" value={sort} onChange={(e) => set('sort', e.target.value === 'rel' ? '' : e.target.value)}>
              <option value="rel">Relevance</option><option value="lo">Price: low to high</option><option value="hi">Price: high to low</option><option value="off">Discount</option><option value="rating">Rating</option>
            </select>
            {mode === 'shared' && !sync.error && sync.at && <span className="livetag"><i />Live stock · {fmtTime(sync.at)}</span>}
            {mode === 'local' && <span className="livetag local"><i />Demo stock</span>}
          </div>
          {tile === 'today' && today && <div className="note q" style={{ margin: '0 14px 10px' }}><Ic.boltF width={16} height={16} /><span>You are {area.km} km from the hub. Order before 2 PM to get it today.</span></div>}
          {tile === 'stock' && <div className="note i" style={{ margin: '0 14px 10px' }}><Ic.store width={16} height={16} /><span>Showing units held right now at {QUICK_HUB.name}.</span></div>}

          {mode === 'loading' ? <SkeletonGrid /> : mode === 'shared' && sync.error && !state ? (
            <Empty icon="refresh" title="Couldn’t load nearby stock" text="Check your connection and try again." action={<button className="btn pri sm" onClick={retry}>Retry</button>} />
          ) : list.length ? (
            <div className="grid">{list.map((p) => (
              <div key={p.id} style={{ position: 'relative' }}>
                {card(p)}
                {tile === 'stock' && <span className="badge" style={{ position: 'absolute', top: 8, left: 8, background: 'var(--green)', color: '#fff', zIndex: 3 }}>{availableFor(avail, p.id)} at hub</span>}
              </div>
            ))}</div>
          ) : tile === 'today' && !today ? (
            <Empty icon="clock" title="No same-day delivery here" text={`Same-day delivery needs a hub within 15 km. You are ${area.km} km away, so Quick items arrive in 1–2 days.`} action={<button className="btn out sm" onClick={() => set('f', '')}>Show 1–2 day items</button>} />
          ) : q || tab !== 'All' ? (
            <Empty icon="search" title={tab !== 'All' && !q ? `No ${tab.toLowerCase()} near you yet` : 'No matches near you'} text="New returned units arrive at the hub every day. Try another category." action={<button className="btn out sm" onClick={() => setParams({}, { replace: true })}>Show all</button>} />
          ) : (
            <Empty icon="bolt" title="All nearby stock is sold out" text="Browse everything with regular delivery in the meantime." action={<Link to="/" className="btn pri sm">Browse all</Link>} />
          )}

          {soldOut.length > 0 && tab === 'All' && !q && mode !== 'loading' && (
            <>
              <div className="sec-h"><h2 style={{ fontSize: 15 }}>Just sold out near you</h2></div>
              <div className="grid">{soldOut.map((p) => card(p, { left: 0, sold: true, quickArea: false }))}</div>
            </>
          )}
        </>
      )}
    </>
  );
}

export function Categories() {
  const { count } = useCartView();
  const { avail } = useShared();
  const { area } = useQuick();
  const zone = inQuickZone(area);
  return (
    <>
      <TopBar title="Categories" right={<CartBtn count={count} />} />
      <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <Link to="/quick" className="hero" style={{ margin: 0, minHeight: 0, padding: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ flex: 1 }}><QuickLogo size={20} /><span style={{ display: 'block', fontSize: 12.5, marginTop: 4, color: 'var(--ink2)' }}>{zone ? 'Products near you, delivered in 1–2 days' : `Not available in ${area.name}`}</span></span>
          <Ic.chev />
        </Link>
        {CATEGORIES.filter((c) => c.id !== 'all').map((c) => {
          const items = PRODUCTS.filter((p) => p.catId === c.id);
          const n = items.reduce((s, p) => s + availableFor(avail, p.id), 0);
          return (
            <Link key={c.id} to={`/category/${c.id}`} className="box" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 10 }}>
              <img src={c.icon} alt="" style={{ width: 52, height: 52, borderRadius: '50%' }} />
              <span style={{ flex: 1 }}><b style={{ display: 'block' }}>{c.name}</b><span className="mut" style={{ fontSize: 12 }}>{items.length ? `${items.length} product${items.length > 1 ? 's' : ''}${zone && n ? ` · ${n} near you` : ''}` : 'Coming soon'}</span></span>
              <Ic.chev />
            </Link>
          );
        })}
      </div>
    </>
  );
}

export function Category() {
  const { catId } = useParams();
  const back = useBack('/categories');
  const { count } = useCartView();
  const { mode } = useShared();
  const card = useCards();
  const c = CATEGORIES.find((x) => x.id === catId);
  const items = PRODUCTS.filter((p) => catId === 'all' || p.catId === catId);
  if (!c) return (<><TopBar title="Category" onBack={back} /><Empty icon="grid" title="Category not found" action={<Link to="/categories" className="btn pri sm">All categories</Link>} /></>);
  return (
    <>
      <TopBar title={c.name} onBack={back} right={<CartBtn count={count} />} />
      <div style={{ height: 12 }} />
      {mode === 'loading' ? <SkeletonGrid n={2} /> : items.length ? <div className="grid">{items.map((p) => card(p))}</div> : (
        <Empty icon="grid" title={`No ${c.name.toLowerCase()} products yet`} text="This demo catalogue focuses on fashion and home products." action={<Link to="/quick" className="btn pri sm">Shop Meesho Quick</Link>} />
      )}
    </>
  );
}

export function Search() {
  const back = useBack('/');
  const [params, setParams] = useSearchParams();
  const q = params.get('q') || '';
  const { mode } = useShared();
  const card = useCards();
  const list = q ? PRODUCTS.filter((p) => match(p, q)) : [];
  return (
    <>
      <header className="top line">
        <div className="bar back">
          <button className="ib" onClick={back} aria-label="Back"><Ic.back /></button>
          <label className="search" style={{ margin: 0, flex: 1 }}>
            <Ic.search width={20} height={20} /><span className="sr">Search</span>
            <input type="search" autoFocus value={q} placeholder="Search by Keyword or Product ID" onChange={(e) => setParams(e.target.value ? { q: e.target.value } : {}, { replace: true })} />
            {q && <button onClick={() => setParams({}, { replace: true })} aria-label="Clear"><Ic.x width={18} height={18} /></button>}
          </label>
        </div>
      </header>
      {!q ? (
        <div style={{ padding: 14 }}>
          <div className="mut" style={{ fontSize: 12.5, marginBottom: 10 }}>Popular searches</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {['kurti', 'sneakers', 'kurta', 'cookware', 'polo', 'MQ-KUR-PINK'].map((t) => <button key={t} className="btn out sm" onClick={() => setParams({ q: t }, { replace: true })}>{t}</button>)}
          </div>
        </div>
      ) : mode === 'loading' ? <SkeletonGrid n={2} /> : list.length ? (
        <><div className="mut" style={{ padding: '12px 14px', fontSize: 12.5 }}>{list.length} result{list.length > 1 ? 's' : ''} for “{q}”</div><div className="grid">{list.map((p) => card(p))}</div></>
      ) : <Empty icon="search" title={`No results for “${q}”`} text="Try “kurti”, “sneakers” or “cookware”." />}
    </>
  );
}

