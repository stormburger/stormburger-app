import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { MenuItem, MenuResponse } from '../services/api';
import { getMenu } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import CartDrawer from '../components/CartDrawer';
import Logo from '../components/Logo';
import AppHeader, { navBtnStyle } from '../components/AppHeader';

function formatCat(cat: string) { return cat.replace(/[_-]/g, ' ').replace(/\b\w/g, c => c.toUpperCase()); }

// Minimal SVG icons — no emoji, no childish symbols
const CAT_ICON: Record<string, React.ReactNode> = {
  burgers:       <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 8h16M4 12h16M4 16h16" strokeLinecap="round"/><rect x="2" y="6" width="20" height="12" rx="3"/></svg>,
  chicken:       <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 3C8 3 5 6 5 10c0 2 1 4 3 5l-1 4h10l-1-4c2-1 3-3 3-5 0-4-3-7-7-7z" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  'fried-chicken': <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 3C8 3 5 6 5 10c0 2 1 4 3 5l-1 4h10l-1-4c2-1 3-3 3-5 0-4-3-7-7-7z" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  combos:        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="8" height="8" rx="1.5"/><rect x="13" y="3" width="8" height="8" rx="1.5"/><rect x="3" y="13" width="8" height="8" rx="1.5"/><rect x="13" y="13" width="8" height="8" rx="1.5"/></svg>,
  sides:         <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M5 6h14l-1.5 9H6.5L5 6z" strokeLinecap="round" strokeLinejoin="round"/><path d="M3 6h18" strokeLinecap="round"/><path d="M10 6V4h4v2" strokeLinecap="round"/></svg>,
  drinks:        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M7 3h10l-2 14H9L7 3z" strokeLinecap="round" strokeLinejoin="round"/><path d="M9 7h6" strokeLinecap="round"/><path d="M12 17v3M9 20h6" strokeLinecap="round"/></svg>,
  desserts:      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 3a5 5 0 0 1 5 5c0 3-2 5-5 7-3-2-5-4-5-7a5 5 0 0 1 5-5z" strokeLinecap="round" strokeLinejoin="round"/><path d="M12 20v-5" strokeLinecap="round"/><path d="M9 20h6" strokeLinecap="round"/></svg>,
  sandwiches:    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 9h16M4 15h16" strokeLinecap="round"/><path d="M3 9c0-2 1.5-3 9-3s9 1 9 3" strokeLinecap="round"/><path d="M3 15c0 2 1.5 3 9 3s9-1 9-3" strokeLinecap="round"/></svg>,
  salads:        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 3C8 3 4 6 4 10h16c0-4-4-7-8-7z" strokeLinecap="round" strokeLinejoin="round"/><path d="M4 10l1 7h14l1-7" strokeLinecap="round"/></svg>,
  breakfast:     <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r="9"/></svg>,
  pizza:         <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 3L3 20h18L12 3z" strokeLinecap="round" strokeLinejoin="round"/><path d="M9 14l1.5-1.5M13 11l1.5-1.5" strokeLinecap="round"/></svg>,
  'hot-dogs':    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M7 12c0-2.8 2.2-5 5-5s5 2.2 5 5-2.2 5-5 5-5-2.2-5-5z"/><path d="M3 12h4M17 12h4" strokeLinecap="round"/></svg>,
  wraps:         <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 6c0 0 2-2 8-2s8 2 8 2l-2 12H6L4 6z" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  'kids-meals':  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="8" height="8" rx="1.5"/><rect x="13" y="3" width="8" height="8" rx="1.5"/><rect x="3" y="13" width="8" height="8" rx="1.5"/><rect x="13" y="13" width="8" height="8" rx="1.5"/></svg>,
};
const DEFAULT_ICON = <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="9"/><path d="M8 12h8M12 8v8" strokeLinecap="round"/></svg>;

export default function MenuPage() {
  const { storeId } = useParams<{ storeId: string }>();
  const { user, logout } = useAuth();
  const { cart, setCartOpen, refreshCart } = useCart();
  const navigate = useNavigate();
  const [menu, setMenu] = useState<MenuResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [storeName, setStoreName] = useState('');
  const [activeCategory, setActiveCategory] = useState('');
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    const stored = sessionStorage.getItem('sb_store');
    if (stored) setStoreName(JSON.parse(stored).name);
  }, []);

  useEffect(() => {
    if (!storeId) return;
    getMenu(storeId).then(m => { setMenu(m); const first = Object.keys(m.categories)[0]; if (first) setActiveCategory(first); })
      .catch(() => navigate('/stores')).finally(() => setLoading(false));
    refreshCart(storeId);
  }, [storeId]);

  const categories = menu ? Object.keys(menu.categories) : [];
  const cartCount = cart?.item_count ?? 0;
  const scrollTo = (cat: string) => { setActiveCategory(cat); sectionRefs.current[cat]?.scrollIntoView({ behavior: 'smooth', block: 'start' }); };

  if (loading) return (
    <div style={s.splash}>
      <Logo size={48} />
      <p style={{ color: 'var(--text-muted)', marginTop: 16, fontSize: 14 }}>Loading menu…</p>
    </div>
  );

  return (
    <div style={s.page}>
      <AppHeader
        left={storeName ? <div style={s.storeChip}>{storeName}</div> : undefined}
        right={<>
          <button style={navBtnStyle} onClick={() => navigate('/stores')}>Locations</button>
          <button style={navBtnStyle} onClick={() => navigate('/orders')}>Orders</button>
          <button style={navBtnStyle} onClick={logout}>Sign out</button>
          <button style={s.cartBtn} onClick={() => setCartOpen(true)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" strokeLinecap="round" strokeLinejoin="round"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0" strokeLinecap="round"/></svg>
            <span>Cart</span>
            {cartCount > 0 && <span style={s.badge}>{cartCount}</span>}
          </button>
        </>}
      />
      <div style={s.body}>
        <nav style={s.nav}>
          <div style={s.greeting}>Menu</div>
          {categories.map(cat => (
            <button key={cat} style={{ ...s.catBtn, ...(activeCategory === cat ? s.catBtnOn : {}) }} onClick={() => scrollTo(cat)}>
              <span style={s.catIcon} aria-hidden>{CAT_ICON[cat] ?? DEFAULT_ICON}</span>
              <span>{formatCat(cat)}</span>
            </button>
          ))}
        </nav>
        <main style={s.main}>
          {categories.map(cat => (
            <div key={cat} ref={el => { sectionRefs.current[cat] = el; }} style={s.section}>
              <div style={s.catHead}>
                <span style={s.catIconBig}>{CAT_ICON[cat] ?? DEFAULT_ICON}</span>
                <h2 style={s.catTitle}>{formatCat(cat)}</h2>
              </div>
              <div style={s.grid}>
                {(menu!.categories[cat] ?? []).map((item: MenuItem) => (
                  <button key={item.id} style={s.card} onClick={() => navigate(`/menu/${storeId}/item/${item.id}`)}>
                    {item.image_url
                      ? <img src={item.image_url} alt={item.name} style={s.img} onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                      : <div style={s.imgFallback}><span style={s.imgFallbackIcon}>{CAT_ICON[cat] ?? DEFAULT_ICON}</span></div>}
                    <div style={s.cardBody}>
                      <h3 style={s.itemName}>{item.name}</h3>
                      {item.description && <p style={s.itemDesc}>{item.description}</p>}
                      <div style={s.cardFoot}>
                        <span style={s.price}>${((item.price ?? 0) / 100).toFixed(2)}</span>
                        <span style={s.addCircle}>+</span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </main>
      </div>
      <CartDrawer storeId={storeId!} />
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  page: { minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)', display: 'flex', flexDirection: 'column' },
  splash: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--bg)' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 22px', background: '#fff', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, zIndex: 50, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' },
  headerLeft: { display: 'flex', alignItems: 'center', gap: 12 },
  brandBlue: { fontSize: 18, fontWeight: 900, color: 'var(--primary)', letterSpacing: '-0.5px' },
  brandRed: { fontSize: 18, fontWeight: 900, color: 'var(--red)', letterSpacing: '-0.5px' },
  storeChip: { background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 20, padding: '3px 12px', fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 },
  headerRight: { display: 'flex', alignItems: 'center', gap: 6 },
  ghostBtn: { background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-muted)', padding: '7px 13px', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 500 },
  cartBtn: { display: 'flex', alignItems: 'center', gap: 7, background: 'var(--primary)', border: 'none', color: '#fff', padding: '8px 16px', borderRadius: 9, cursor: 'pointer', fontSize: 13, fontWeight: 700, position: 'relative' },
  badge: { background: 'var(--red)', color: '#fff', borderRadius: '50%', width: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 900 },
  body: { display: 'flex', flex: 1 },
  nav: { width: 210, padding: '22px 10px', borderRight: '1px solid var(--border)', position: 'sticky', top: 61, height: 'calc(100vh - 61px)', overflowY: 'auto', flexShrink: 0, background: '#fff' },
  greeting: { color: 'var(--text-dim)', fontSize: 11, fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: 14, padding: '0 8px' },
  catBtn: { display: 'flex', alignItems: 'center', gap: 9, width: '100%', textAlign: 'left', padding: '9px 10px', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', borderRadius: 8, fontSize: 13, fontWeight: 500, marginBottom: 2 },
  catBtnOn: { background: 'rgba(31,63,153,0.08)', color: 'var(--primary)', fontWeight: 700, borderLeft: '3px solid var(--primary)' },
  catIcon: { width: 16, height: 16, flexShrink: 0, opacity: 0.7 },
  main: { flex: 1, padding: '28px 26px', overflowY: 'auto' },
  section: { marginBottom: 48 },
  catHead: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 },
  catIconBig: { width: 26, height: 26, flexShrink: 0, color: 'var(--primary)' },
  catTitle: { fontSize: 22, fontWeight: 800, letterSpacing: '-0.3px', color: 'var(--text)' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14 },
  card: { background: '#fff', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden', cursor: 'pointer', textAlign: 'left', padding: 0, color: 'var(--text)', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' },
  img: { width: '100%', height: 140, objectFit: 'cover', display: 'block' },
  imgFallback: { width: '100%', height: 110, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F7F8FA', borderBottom: '1px solid var(--border)' },
  imgFallbackIcon: { width: 36, height: 36, color: 'var(--border-strong)', opacity: 0.6 },
  cardBody: { padding: '12px 14px' },
  itemName: { fontSize: 14, fontWeight: 700, marginBottom: 4, letterSpacing: '-0.1px' },
  itemDesc: { fontSize: 12, color: 'var(--text-muted)', marginBottom: 10, lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' },
  cardFoot: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  price: { fontSize: 15, fontWeight: 800, color: 'var(--primary)' },
  addCircle: { width: 26, height: 26, background: 'var(--red)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700, color: '#fff' },
};
