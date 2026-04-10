import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Order } from '../services/api';
import { getMyOrders, addToCart, clearCart, getMenuItem } from '../services/api';
import Logo from '../components/Logo';
import AppHeader, { navBtnStyle } from '../components/AppHeader';

const STATUS: Record<string, { color: string; bg: string; label: string }> = {
  pending:   { color: '#d97706', bg: '#fef3c7', label: 'Pending' },
  confirmed: { color: 'var(--primary)', bg: '#eff6ff', label: 'Confirmed' },
  preparing: { color: '#7c3aed', bg: '#f5f3ff', label: 'Preparing' },
  ready:     { color: '#059669', bg: '#ecfdf5', label: 'Ready!' },
  completed: { color: 'var(--text-muted)', bg: 'var(--bg)', label: 'Completed' },
  picked_up: { color: 'var(--text-muted)', bg: 'var(--bg)', label: 'Picked Up' },
  cancelled: { color: 'var(--red)', bg: '#fff5f5', label: 'Cancelled' },
};

export default function OrderHistoryPage() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reordering, setReordering] = useState<string | null>(null);
  const [reorderResult, setReorderResult] = useState<{ added: string[]; skipped: string[] } | null>(null);

  useEffect(() => {
    getMyOrders().then(setOrders).catch(() => setError('Could not load orders')).finally(() => setLoading(false));
  }, []);

  async function handleReorder(order: Order) {
    if (!order.order_items?.length) return;
    const locationId = (order as any).location_id;
    if (!locationId) { alert('Location not available for reorder'); return; }
    setReordering(order.id);
    setReorderResult(null);
    const added: string[] = [];
    const skipped: string[] = [];
    try {
      await clearCart(locationId);
      for (const item of order.order_items) {
        // Check availability before adding
        try {
          const menuItem = await getMenuItem(item.menu_item_id, locationId);
          if (!menuItem || menuItem.is_active === false) {
            skipped.push(item.menu_item_name);
            continue;
          }
          const modifierIds = item.order_item_modifiers?.map((m: any) => m.modifier_id) || [];
          await addToCart(locationId, item.menu_item_id, item.quantity, modifierIds, item.special_instructions);
          added.push(item.menu_item_name);
        } catch {
          skipped.push(item.menu_item_name);
        }
      }
      if (added.length === 0) {
        setReorderResult({ added, skipped });
        return;
      }
      if (skipped.length > 0) {
        setReorderResult({ added, skipped });
        // Give user a moment to see the result before navigating
        setTimeout(() => navigate('/menu/' + locationId), 2200);
      } else {
        navigate('/menu/' + locationId);
      }
    } catch { alert('Could not reorder. Please try again.'); }
    finally { setReordering(null); }
  }

  return (
    <div style={s.page}>
      <AppHeader
        right={<>
          <button style={navBtnStyle} onClick={() => navigate('/favorites')}>Favorites</button>
          <button style={navBtnStyle} onClick={() => navigate('/account')}>Account</button>
          <button style={navBtnStyle} onClick={() => navigate('/stores')}>Locations</button>
        </>}
      />
      <main style={s.main}>
        <h1 style={s.title}>Your Orders</h1>
        {reorderResult && (
          <div style={reorderResult.added.length === 0 ? s.reorderBanner : s.reorderBannerPartial}>
            {reorderResult.added.length > 0 && <p style={s.reorderLine}><strong>Added:</strong> {reorderResult.added.join(', ')}</p>}
            {reorderResult.skipped.length > 0 && <p style={s.reorderLine}><strong>Unavailable (skipped):</strong> {reorderResult.skipped.join(', ')}</p>}
            {reorderResult.added.length === 0 && <p style={s.reorderLine}>None of the original items are currently available.</p>}
          </div>
        )}
        {loading && <p style={s.msg}>Loading…</p>}
        {error && <p style={{ ...s.msg, color: 'var(--red)' }}>{error}</p>}
        {!loading && orders.length === 0 && (
          <div style={s.empty}>
            <div style={{ fontSize: 54, marginBottom: 14 }}>🧾</div>
            <p style={s.emptyTitle}>No orders yet</p>
            <p style={s.emptySub}>Your order history will appear here</p>
            <button style={s.startBtn} onClick={() => navigate('/stores')}>Order now →</button>
          </div>
        )}
        <div style={s.list}>
          {orders.map(order => {
            const st = STATUS[order.status] ?? STATUS.completed;
            const canReorder = !!(order.order_items?.length && (order as any).location_id);
            return (
              <div key={order.id} style={s.card}>
                <div style={s.cardTop}>
                  <div style={s.cardTopLeft}>
                    <span style={s.orderNum}>#{order.order_number}</span>
                    {order.location && <span style={s.storeName}>{order.location.name}</span>}
                  </div>
                  <span style={{ ...s.badge, color: st.color, background: st.bg }}>{st.label}</span>
                </div>
                {order.order_items && order.order_items.length > 0 && (
                  <p style={s.items}>{order.order_items.slice(0, 3).map((i: any) => i.menu_item_name).join(', ')}{order.order_items.length > 3 ? ` +${order.order_items.length - 3} more` : ''}</p>
                )}
                <div style={s.cardBot}>
                  <span style={s.date}>{new Date(order.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                  <span style={s.total}>${(order.total / 100).toFixed(2)}</span>
                </div>
                <div style={s.cardActions}>
                  <button style={s.detailBtn} onClick={() => navigate('/order/' + order.id)}>View Details</button>
                  {canReorder && (
                    <button style={reordering === order.id ? s.reorderBtnDisabled : s.reorderBtn} onClick={() => handleReorder(order)} disabled={!!reordering}>
                      {reordering === order.id ? 'Adding…' : 'Reorder'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  page: { minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 24px', background: 'var(--bg-white)', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, zIndex: 50 },
  logoRow: { display: 'flex', alignItems: 'center', gap: 10 },
  storm: { fontSize: 18, fontWeight: 900, color: 'var(--primary)', letterSpacing: '-0.5px' },
  burgerWord: { fontSize: 18, fontWeight: 900, color: 'var(--red)', letterSpacing: '-0.5px' },
  nav: { display: 'flex', gap: 8 },
  navBtn: { background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 13, fontWeight: 500, padding: '7px 13px', borderRadius: 8 },
  main: { maxWidth: 640, margin: '0 auto', padding: '40px 22px 80px' },
  title: { fontSize: 30, fontWeight: 900, letterSpacing: '-1px', marginBottom: 30 },
  msg: { color: 'var(--text-muted)', textAlign: 'center', padding: 40 },
  empty: { textAlign: 'center', padding: '80px 0' },
  emptyTitle: { color: 'var(--text-muted)', fontSize: 18, fontWeight: 700, margin: '0 0 8px' },
  emptySub: { color: 'var(--text-dim)', fontSize: 14, margin: '0 0 22px' },
  startBtn: { background: 'var(--red)', border: 'none', color: '#fff', padding: '13px 28px', borderRadius: 10, cursor: 'pointer', fontSize: 15, fontWeight: 700 },
  list: { display: 'flex', flexDirection: 'column', gap: 12 },
  card: { background: 'var(--bg-white)', border: '1px solid var(--border)', borderRadius: 14, padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 10 },
  cardTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  cardTopLeft: { display: 'flex', flexDirection: 'column', gap: 2 },
  orderNum: { fontWeight: 800, fontSize: 15 },
  storeName: { fontSize: 12, color: 'var(--text-muted)' },
  badge: { padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 700, border: '1px solid transparent' },
  items: { fontSize: 13, color: 'var(--text-muted)', margin: 0, lineHeight: 1.4 },
  cardBot: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  date: { fontSize: 12, color: 'var(--text-dim)' },
  total: { fontSize: 17, fontWeight: 900 },
  cardActions: { display: 'flex', gap: 8, paddingTop: 4 },
  detailBtn: { flex: 1, background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-muted)', padding: '8px 0', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 500 },
  reorderBtn: { flex: 1, background: 'var(--primary)', color: '#fff', border: 'none', padding: '8px 0', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 700 },
  reorderBtnDisabled: { flex: 1, background: 'var(--border-strong)', color: 'var(--text-muted)', border: 'none', padding: '8px 0', borderRadius: 8, cursor: 'not-allowed', fontSize: 13, fontWeight: 700 },
  reorderBanner: { background: '#fff5f5', border: '1px solid #fca5a5', borderRadius: 10, padding: '12px 16px', marginBottom: 16 },
  reorderBannerPartial: { background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: 10, padding: '12px 16px', marginBottom: 16 },
  reorderLine: { margin: '0 0 4px', fontSize: 13, color: 'var(--text)' },
};
