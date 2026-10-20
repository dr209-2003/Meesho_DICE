import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useShared } from '../shared/SharedStore';
import { CATEGORIES, PRODUCTS, RADIUS_KM, inQuickZone, productById } from '../shared/catalog';
import { availableFor } from '../shared/ops';
import { useBack, useCartView, useQuick } from './QuickApp';
import ProductArt from './ProductArt';
import { CartButton, Empty, Ic, LocationRow, LocationSheet, ProductCard, SkeletonGrid, TopBar, fmtTime } from './ui';

function useLocationSheet() {
  const { area, setArea, toast } = useQuick();
  const [open, setOpen] = useState(false);
  const sheet = (
    <LocationSheet open={open} area={area} onClose={() => setOpen(false)}
      onPick={(id) => { setArea(id); setOpen(false); toast('Delivery location updated'); }} />
  );
  return [() => setOpen(true), sheet];
}

function SearchBox({ value, onChange, autoFocus, placeholder = 'Search for kurtas, bedsheets, watches…' }) {
  return (
    <label className="mq-search">
      <Ic.search width={20} height={20} />
      <span className="sr-only">Search</span>
      <input type="search" value={value} autoFocus={autoFocus} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
      {value && <button type="button" onClick={() => onChange('')} aria-label="Clear search"><Ic.x width={18} height={18} /></button>}
    </label>
  );
}

const matches = (p, q) => !q || (p.title + ' ' + p.catName + ' ' + p.sub + ' ' + p.short).toLowerCase().includes(q.toLowerCase().trim());

export function Home() {
  const { area } = useQuick();
  const { count } = useCartView();
  const { avail, mode } = useShared();
  const navigate = useNavigate();
  const [openLoc, sheet] = useLocationSheet();
  const zone = inQuickZone(area);
  const near = PRODUCTS.filter((p) => availableFor(avail, p.id) > 0);
  const nearUnits = near.reduce((n, p) => n + availableFor(avail, p.id), 0);

  return (
    <>
      <header className="mq-top">
        <div className="mq-bar">
          <span className="mq-logo">meesho</span>
          <span className="mq-qtag"><Ic.boltF width={11} height={11} />Quick</span>
          <span style={{ flex: 1 }} />
          <Link to="/quick/account" className="mq-ib" aria-label="Account"><Ic.user /></Link>
          <CartButton count={count} />
        </div>
        <button className="mq-search" style={{ cursor: 'text' }} onClick={() => navigate('/quick/search')}>
          <Ic.search width={20} height={20} /><span>Search for kurtas, bedsheets, watches…</span>
        </button>
        <LocationRow area={area} onOpen={openLoc} />
      </header>

      {mode === 'loading' ? (
        <div style={{ padding: 16 }}><div className="mq-skel" style={{ height: 150, borderRadius: 16 }} /></div>
      ) : zone ? (
        <Link to="/quick/near-you" className="mq-banner" style={{ marginTop: 12 }}>
          <span className="k"><Ic.boltF width={11} height={11} />MEESHO QUICK</span>
          <h3>Get it within 1 day</h3>
          <p>{nearUnits > 0 ? `${nearUnits} products are already at a hub near ${area.name}. Same price, no extra charge.` : 'Nearby stock is sold out right now. New products arrive here every day.'}</p>
          <span className="go">Shop near you <Ic.chev width={14} height={14} /></span>
          {near[0] && <span className="art"><ProductArt product={near[0]} label="" /></span>}
        </Link>
      ) : (
        <button className="mq-banner off" style={{ marginTop: 12, width: 'calc(100% - 32px)', textAlign: 'left' }} onClick={openLoc}>
          <span className="k" style={{ background: '#fff', color: 'var(--ink)' }}>MEESHO QUICK</span>
          <h3>Not in {area.name} yet</h3>
          <p>Quick delivers within {RADIUS_KM} km of our Okhla hub. Regular delivery still reaches you in 5–7 days.</p>
          <span className="go" style={{ color: 'var(--ink)' }}>Change location <Ic.chev width={14} height={14} /></span>
        </button>
      )}

      <section className="mq-sec" style={{ paddingLeft: 0, paddingRight: 0 }} aria-label="Categories">
        <div className="mq-cats">
          <Link to="/quick/near-you" className="mq-cat">
            <span className="ic" style={{ background: 'linear-gradient(135deg,#ffd23f,#ffb400)', display: 'grid', placeItems: 'center', color: '#3a2a00' }}><Ic.boltF width={28} height={28} /></span>Quick
          </Link>
          {CATEGORIES.map((c) => (
            <Link key={c.id} to={`/quick/category/${c.id}`} className="mq-cat">
              <span className="ic" style={{ background: c.tint }}><ProductArt product={productById(c.skus[0])} label="" /></span>{c.name}
            </Link>
          ))}
        </div>
      </section>

      {zone && near.length > 0 && (
        <section style={{ paddingBottom: 16 }}>
          <div className="mq-h" style={{ padding: '0 16px' }}>
            <h2><Ic.boltF width={16} height={16} style={{ color: '#f5a623', verticalAlign: '-2px' }} /> Available near you</h2>
            <Link to="/quick/near-you" className="mq-link">See all</Link>
          </div>
          <div className="mq-row">
            {near.map((p) => <ProductCard key={p.id} p={p} left={availableFor(avail, p.id)} quickArea from="quick" />)}
          </div>
        </section>
      )}

      <div className="mq-div" />
      <section>
        <div className="mq-h" style={{ padding: '16px 16px 0' }}><h2>Products for you</h2></div>
        {mode === 'loading' ? <SkeletonGrid /> : (
          <div className="mq-grid">
            {PRODUCTS.map((p) => <ProductCard key={p.id} p={p} left={availableFor(avail, p.id)} quickArea={zone} />)}
          </div>
        )}
      </section>
      {sheet}
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
      <TopBar title="Categories" right={<CartButton count={count} />} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, padding: 16 }}>
        <Link to="/quick/near-you" style={{ gridColumn: '1 / -1', borderRadius: 14, padding: 14, background: 'linear-gradient(135deg,#fff3c4,#ffe08a)', display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ width: 48, height: 48, borderRadius: 12, background: '#fff', display: 'grid', placeItems: 'center', color: '#b07a00' }}><Ic.boltF /></span>
          <span style={{ flex: 1 }}><b style={{ display: 'block' }}>Meesho Quick</b><span className="mq-sub" style={{ color: '#5a4300' }}>{zone ? 'Delivered within 1 day from a hub near you' : `Not available in ${area.name}`}</span></span>
          <Ic.chev />
        </Link>
        {CATEGORIES.map((c) => {
          const q = c.skus.reduce((n, id) => n + availableFor(avail, id), 0);
          return (
            <Link key={c.id} to={`/quick/category/${c.id}`} style={{ borderRadius: 14, overflow: 'hidden', border: '1px solid var(--line)', display: 'flex', flexDirection: 'column' }}>
              <span style={{ aspectRatio: '4 / 3', background: c.tint, display: 'block' }}><ProductArt product={productById(c.skus[0])} className="" label="" /></span>
              <span style={{ padding: '10px 12px' }}>
                <b style={{ display: 'block', fontSize: 14 }}>{c.name}</b>
                <span className="mq-sub">{c.skus.length} product{c.skus.length > 1 ? 's' : ''}{zone && q > 0 ? ` · ${q} near you` : ''}</span>
              </span>
            </Link>
          );
        })}
      </div>
    </>
  );
}

export function Category() {
  const { catId } = useParams();
  const back = useBack('/quick/categories');
  const { count } = useCartView();
  const { avail, mode } = useShared();
  const { area } = useQuick();
  const [quickOnly, setQuickOnly] = useState(false);
  const cat = CATEGORIES.find((c) => c.id === catId);
  const zone = inQuickZone(area);
  if (!cat) return (<><TopBar title="Category" onBack={back} /><Empty icon="grid" title="Category not found" action={<Link to="/quick/categories" className="mq-btn pri sm">All categories</Link>} /></>);
  const list = cat.skus.map(productById).filter((p) => !quickOnly || (zone && availableFor(avail, p.id) > 0));
  return (
    <>
      <TopBar title={cat.name} onBack={back} right={<CartButton count={count} />} />
      <div className="mq-chips" style={{ paddingTop: 12 }}>
        <button className={'mq-chip' + (quickOnly ? ' on' : '')} onClick={() => setQuickOnly((v) => !v)} aria-pressed={quickOnly} disabled={!zone}>
          <Ic.boltF width={12} height={12} />Quick delivery only
        </button>
      </div>
      {mode === 'loading' ? <SkeletonGrid n={2} /> : list.length ? (
        <div className="mq-grid">{list.map((p) => <ProductCard key={p.id} p={p} left={availableFor(avail, p.id)} quickArea={zone} />)}</div>
      ) : (
        <Empty icon="bolt" title="Nothing near you in this category" text="Turn off the Quick filter to see everything with regular delivery." action={<button className="mq-btn out sm" onClick={() => setQuickOnly(false)}>Show all</button>} />
      )}
    </>
  );
}

const SORTS = [['rel', 'Relevance'], ['lo', 'Price: low to high'], ['hi', 'Price: high to low'], ['off', 'Discount'], ['left', 'Fewest left']];

export function QuickStore() {
  const { area } = useQuick();
  const { count } = useCartView();
  const { avail, mode, state, sync, retry } = useShared();
  const [openLoc, sheet] = useLocationSheet();
  const [params, setParams] = useSearchParams();
  const q = params.get('q') || '';
  const cat = params.get('cat') || '';
  const sort = params.get('sort') || 'rel';
  const under = params.get('under') === '1';
  const set = (k, v) => { const p = new URLSearchParams(params); if (v) p.set(k, v); else p.delete(k); setParams(p, { replace: true }); };
  const zone = inQuickZone(area);

  const { live, soldOut } = useMemo(() => {
    const live = PRODUCTS.filter((p) => availableFor(avail, p.id) > 0);
    const touched = new Set((state?.units || []).filter((u) => u.status === 'reserved' || u.status === 'sold').map((u) => u.skuId));
    return { live, soldOut: PRODUCTS.filter((p) => touched.has(p.id) && availableFor(avail, p.id) === 0) };
  }, [avail, state]);

  let list = live.filter((p) => matches(p, q) && (!cat || p.catId === cat) && (!under || p.price < 300));
  const by = { lo: (a, b) => a.price - b.price, hi: (a, b) => b.price - a.price, off: (a, b) => b.off - a.off, left: (a, b) => availableFor(avail, a.id) - availableFor(avail, b.id) }[sort];
  if (by) list = [...list].sort(by);
  const cats = [...new Set(live.map((p) => p.catId))];
  const filtered = q || cat || under;

  return (
    <>
      <TopBar title={<span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><Ic.boltF width={18} height={18} style={{ color: '#f5a623' }} />Meesho Quick</span>} right={<CartButton count={count} />}>
        <LocationRow area={area} onOpen={openLoc} />
      </TopBar>

      {!zone ? (
        <Empty icon="pin" title={`Quick isn’t in ${area.name} yet`} text={`Meesho Quick sells products already held at a hub within ${RADIUS_KM} km of you. ${area.name} is ${area.km} km from the Okhla hub.`}
          action={<button className="mq-btn pri sm" onClick={openLoc}>Change location</button>} />
      ) : (
        <>
          <div className="mq-qhero">
            <div className="tl">Available near you</div>
            <p>Returned-to-hub products that passed quality checks, held at {QUICK_HUB_NAME}. Same price as the regular listing.</p>
            <div className="mq-pills">
              <span className="mq-pill"><Ic.boltF width={12} height={12} />Get it within 1 day</span>
              <span className="mq-pill"><Ic.shield width={13} height={13} />Quality checked</span>
              <span className="mq-pill"><Ic.pin width={13} height={13} />{area.km} km away</span>
            </div>
            {mode === 'shared' && !sync.error && sync.at && <span className="mq-live"><i />Live stock · updated {fmtTime(sync.at)}</span>}
            {mode === 'local' && <span className="mq-live local"><i />Demo stock on this device</span>}
          </div>
          <SearchBox value={q} onChange={(v) => set('q', v)} placeholder="Search products near you" />
          <div className="mq-chips">
            <label className="sr-only" htmlFor="sort">Sort</label>
            <select id="sort" className="mq-select" value={sort} onChange={(e) => set('sort', e.target.value === 'rel' ? '' : e.target.value)}>
              {SORTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
            <button className={'mq-chip' + (under ? ' on' : '')} aria-pressed={under} onClick={() => set('under', under ? '' : '1')}>Under ₹300</button>
            {cats.map((id) => {
              const c = CATEGORIES.find((x) => x.id === id);
              return <button key={id} className={'mq-chip' + (cat === id ? ' on' : '')} aria-pressed={cat === id} onClick={() => set('cat', cat === id ? '' : id)}>{c.name}</button>;
            })}
          </div>

          {mode === 'loading' ? <SkeletonGrid /> : mode === 'shared' && sync.error && !state ? (
            <Empty icon="refresh" title="Couldn’t load nearby stock" text="Check your connection and try again." action={<button className="mq-btn pri sm" onClick={retry}>Retry</button>} />
          ) : list.length ? (
            <div className="mq-grid">{list.map((p) => <ProductCard key={p.id} p={p} left={availableFor(avail, p.id)} quickArea from="quick" />)}</div>
          ) : filtered ? (
            <Empty icon="search" title="No matches near you" text="Try a different search or clear the filters." action={<button className="mq-btn out sm" onClick={() => setParams({}, { replace: true })}>Clear filters</button>} />
          ) : (
            <Empty icon="bolt" title="All nearby stock is sold out" text="New products arrive at the hub every day. Browse regular delivery in the meantime." action={<Link to="/quick" className="mq-btn pri sm">Browse all products</Link>} />
          )}

          {!filtered && soldOut.length > 0 && mode !== 'loading' && (
            <section style={{ marginTop: 16 }}>
              <div className="mq-h" style={{ padding: '0 16px' }}><h2 style={{ fontSize: 15 }}>Just sold out near you</h2></div>
              <div className="mq-grid">{soldOut.map((p) => <ProductCard key={p.id} p={p} left={0} sold />)}</div>
            </section>
          )}
        </>
      )}
      {sheet}
    </>
  );
}
const QUICK_HUB_NAME = 'Valmo LMDC, Okhla';

export function Search() {
  const back = useBack('/quick');
  const [params, setParams] = useSearchParams();
  const q = params.get('q') || '';
  const { avail, mode } = useShared();
  const { area } = useQuick();
  const zone = inQuickZone(area);
  const list = q ? PRODUCTS.filter((p) => matches(p, q)) : [];
  return (
    <>
      <header className="mq-top">
        <div className="mq-bar" style={{ paddingLeft: 4 }}>
          <button className="mq-ib" onClick={back} aria-label="Back"><Ic.back /></button>
          <div style={{ flex: 1 }}><SearchBox value={q} onChange={(v) => setParams(v ? { q: v } : {}, { replace: true })} autoFocus /></div>
        </div>
      </header>
      <style>{'.mq-bar .mq-search{margin:0;width:100%}'}</style>
      {!q ? (
        <div className="mq-sec">
          <div className="mq-sub" style={{ marginBottom: 10 }}>Popular searches</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {['kurta', 'bedsheet', 'serum', 'watch', 'kids', 'planters', 'mouse'].map((t) => <button key={t} className="mq-chip" onClick={() => setParams({ q: t }, { replace: true })}>{t}</button>)}
          </div>
        </div>
      ) : mode === 'loading' ? <SkeletonGrid n={2} /> : list.length ? (
        <>
          <div className="mq-sub" style={{ padding: '12px 16px' }}>{list.length} result{list.length > 1 ? 's' : ''} for “{q}”</div>
          <div className="mq-grid">{list.map((p) => <ProductCard key={p.id} p={p} left={availableFor(avail, p.id)} quickArea={zone} />)}</div>
        </>
      ) : (
        <Empty icon="search" title={`No results for “${q}”`} text="Check the spelling or try a broader word like “kurta” or “home”." />
      )}
    </>
  );
}
