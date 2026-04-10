import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Location } from '../services/api';
import { getLocations, updateProfile } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import AppHeader, { navBtnStyle } from '../components/AppHeader';
import Logo from '../components/Logo';

export default function StoreSelectorPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { getLocations().then(setLocations).finally(() => setLoading(false)); }, []);

  const pick = (loc: Location) => { sessionStorage.setItem('sb_store', JSON.stringify(loc)); if (user) updateProfile({ preferred_store_id: loc.id }).catch(() => null); navigate(`/menu/${loc.id}`); };

  return (
    <div style={s.page}>
      <AppHeader
        right={user ? <>
          <button style={navBtnStyle} onClick={() => navigate('/orders')}>My Orders</button>
          <button style={navBtnStyle} onClick={logout}>Sign out</button>
        </> : <>
          <button style={navBtnStyle} onClick={() => navigate('/auth')}>Sign In</button>
        </>}
      />

      <main style={s.main}>
        <div style={s.hero}>
          <h1 style={s.heroTitle}>Pick Your Location</h1>
          <p style={s.heroSub}>{user ? `Hey ${user.display_name?.split(' ')[0] ?? 'there'} — select` : 'Select'} your nearest StormBurger.</p>
        </div>
        <div style={s.grid}>
          {loading ? [1, 2].map(i => <div key={i} style={s.skel} />) : locations.map((loc) => (
            <button key={loc.id} style={s.card} onClick={() => pick(loc)}>
              <div style={s.cardTop}>
                <div style={s.iconWrap}>
                  <img src="/StormLogo.png" alt="" style={{ width: 36, height: 36, objectFit: 'contain' }} />
                </div>
                <div style={s.cardBody}>
                  <h2 style={s.storeName}>{loc.name}</h2>
                  <p style={s.addr}>{loc.address}</p>
                  <p style={s.city}>{loc.city}, {loc.state} </p>
                </div>
              </div>
              <div style={s.cardFoot}>
                <span style={s.openDot} /><span style={s.openTxt}>Open Now</span>
                <span style={s.orderNow}>Order →</span>
              </div>
            </button>
          ))}
        </div>
      </main>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  page: { minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 32px', background: '#fff', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, zIndex: 50, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' },
  logoRow: { display: 'flex', alignItems: 'center', gap: 10 },
  brandBlue: { fontSize: 20, fontWeight: 900, color: 'var(--primary)', letterSpacing: '-0.5px' },
  brandRed: { fontSize: 20, fontWeight: 900, color: 'var(--red)', letterSpacing: '-0.5px' },
  nav: { display: 'flex', alignItems: 'center', gap: 8 },
  navBtn: { background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-muted)', padding: '7px 16px', cursor: 'pointer', fontSize: 13, fontWeight: 500, borderRadius: 8 },
  main: { maxWidth: 860, margin: '0 auto', padding: '56px 24px 80px' },
  hero: { marginBottom: 40 },
  heroTitle: { fontSize: 40, fontWeight: 900, letterSpacing: '-1.5px', color: 'var(--text)', marginBottom: 10 },
  heroSub: { fontSize: 16, color: 'var(--text-muted)', lineHeight: 1.6 },
  skel: { height: 140, background: '#EDF2F7', borderRadius: 16, border: '1px solid var(--border)', animation: 'fadeIn 1s ease infinite alternate' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 16 },
  card: { background: '#fff', border: '2px solid var(--border)', borderRadius: 16, padding: '22px 22px 16px', cursor: 'pointer', textAlign: 'left', color: 'var(--text)', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' },
  cardTop: { display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 16 },
  iconWrap: { width: 54, height: 54, borderRadius: 12, background: 'var(--bg)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  cardBody: { flex: 1 },
  storeName: { fontSize: 18, fontWeight: 800, marginBottom: 5, letterSpacing: '-0.3px' },
  addr: { fontSize: 13, color: 'var(--text-muted)', marginBottom: 2 },
  city: { fontSize: 12, color: 'var(--text-dim)' },
  cardFoot: { display: 'flex', alignItems: 'center', gap: 6, paddingTop: 14, borderTop: '1px solid var(--border)' },
  openDot: { width: 8, height: 8, borderRadius: '50%', background: '#38A169', flexShrink: 0 },
  openTxt: { fontSize: 12, color: '#38A169', fontWeight: 600 },
  orderNow: { marginLeft: 'auto', fontSize: 13, fontWeight: 700, color: 'var(--primary)' },
};
