import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import type { Order } from '../services/api';
import { getOrder } from '../services/api';
import Logo from '../components/Logo';
import AppHeader, { navBtnStyle } from '../components/AppHeader';

const STEPS = ['pending', 'confirmed', 'preparing', 'ready', 'completed'];
const LABEL: Record<string, string> = { pending: 'Order received', confirmed: 'Confirmed', preparing: 'Being prepared', ready: 'Ready for pickup!', completed: 'Completed' };
const ICON: Record<string, string> = { pending: '📋', confirmed: '✅', preparing: '👨‍🍳', ready: '🔔', completed: '🎉' };

function requestNotifPermission() {
  if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
    Notification.requestPermission().catch(() => null);
  }
}

function sendBrowserNotif(title: string, body: string) {
  if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
    try { new Notification(title, { body, icon: '/StormLogo.png' }); } catch { /* ignore */ }
  }
}

export default function OrderConfirmPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const stateResult = (location.state as any)?.result;
  const initialOrder = stateResult?.order ?? stateResult ?? null;
  const [order, setOrder] = useState<Order | null>(initialOrder);
  const [loading, setLoading] = useState(!initialOrder);
  const prevStatusRef = useRef<string | null>(initialOrder?.status ?? null);

  useEffect(() => { requestNotifPermission(); }, []);

  useEffect(() => {
    if (!orderId) return;
    const doFetch = () => getOrder(orderId).then(fetched => {
      setOrder(fetched);
      const prev = prevStatusRef.current;
      const next = fetched.status;
      if (prev && prev !== next) {
        if (next === 'ready') sendBrowserNotif('Order Ready!', `Your StormBurger order #${fetched.order_number} is ready for pickup!`);
        else if (next === 'confirmed') sendBrowserNotif('Order Confirmed', `Order #${fetched.order_number} has been confirmed.`);
        else if (next === 'preparing') sendBrowserNotif('Order Being Prepared', `Your order #${fetched.order_number} is being prepared.`);
      }
      prevStatusRef.current = next;
    }).catch(() => {});
    if (!initialOrder) { doFetch(); setLoading(false); }
    const id = setInterval(doFetch, 10000);
    return () => clearInterval(id);
  }, [orderId]);

  if (loading) return <div style={s.splash}><Logo size={44} /><p style={{ color: 'var(--text-muted)', marginTop: 16 }}>Loading order…</p></div>;
  if (!order) return <div style={s.splash}>Order not found</div>;

  const stepIdx = STEPS.indexOf(order.status);

  return (
    <div style={s.page}>
      <AppHeader
        left={<button style={navBtnStyle} onClick={() => navigate('/orders')}>← Orders</button>}
        right={<button style={navBtnStyle} onClick={() => navigate('/stores')}>New Order</button>}
      />
      <div style={s.wrap}>
        <div style={s.statusCard}>
          <div style={s.shine} />
          <div style={s.heroEmoji}>{ICON[order.status] ?? '🍔'}</div>
          <h1 style={s.statusTitle}>{LABEL[order.status] ?? order.status}</h1>
          <p style={s.orderNum}>Order #{order.order_number}</p>
          {order.location && <p style={s.storeName}>{order.location.name}</p>}
        </div>
        <div style={s.progressCard}>
          <div style={s.shine} />
          <div style={s.steps}>
            {STEPS.slice(0, 4).map((step, i) => (
              <div key={step} style={s.stepCol}>
                <div style={s.stepTop}>
                  <div style={{ ...s.stepDot, ...(i <= stepIdx ? s.stepDotOn : {}) }}>
                    {i <= stepIdx && <span style={s.stepCheck}>✓</span>}
                  </div>
                  {i < 3 && <div style={{ ...s.stepLine, ...(i < stepIdx ? s.stepLineOn : {}) }} />}
                </div>
                <span style={{ ...s.stepLabel, ...(i === stepIdx ? s.stepLabelOn : {}) }}>{LABEL[step]}</span>
              </div>
            ))}
          </div>
        </div>
        {order.order_items && order.order_items.length > 0 && (
          <div style={s.card}>
            <div style={s.shine} />
            <div style={s.cardLabel}>Items</div>
            {order.order_items.map((item: any) => (
              <div key={item.id} style={s.lineItem}>
                <span style={s.lineItemName}>{item.quantity}× {item.menu_item_name}</span>
                <span style={s.lineItemPrice}>${((item.total_price ?? 0) / 100).toFixed(2)}</span>
              </div>
            ))}
            <div style={s.divider} />
            <div style={s.priceRow}><span style={s.priceLabel}>Subtotal</span><span>${((order.subtotal ?? 0) / 100).toFixed(2)}</span></div>
            <div style={s.priceRow}><span style={s.priceLabel}>Tax</span><span>${((order.tax_amount ?? 0) / 100).toFixed(2)}</span></div>
            {(order.tip_amount ?? 0) > 0 && <div style={s.priceRow}><span style={s.priceLabel}>Tip</span><span>${((order.tip_amount ?? 0) / 100).toFixed(2)}</span></div>}
            <div style={s.totalRow}><span>Total</span><span>${((order.total ?? 0) / 100).toFixed(2)}</span></div>
          </div>
        )}
        <div style={s.actions}>
          <button style={s.secondaryBtn} onClick={() => navigate('/orders')}>View All Orders</button>
          <button style={s.primaryBtn} onClick={() => navigate('/stores')}>Order Again</button>
        </div>
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  page: { minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)', paddingBottom: 60 },
  splash: { display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: 'var(--bg)', color: 'var(--text-muted)' },
  header: { display: 'flex', alignItems: 'center', padding: '14px 24px', background: 'rgba(7,7,15,0.8)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, zIndex: 50 },
  logoRow: { display: 'flex', alignItems: 'center', gap: 10 },
  storm: { fontSize: 18, fontWeight: 900, color: '#1547E8', letterSpacing: '-0.5px' },
  burgerWord: { fontSize: 18, fontWeight: 900, color: '#E8192C', letterSpacing: '-0.5px' },
  wrap: { maxWidth: 520, margin: '0 auto', padding: '34px 20px 0' },
  statusCard: { position: 'relative', overflow: 'hidden', textAlign: 'center', background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', border: '1px solid var(--border)', borderRadius: 24, padding: '34px 24px 26px', marginBottom: 12, boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.07)' },
  shine: { position: 'absolute', top: 0, left: '8%', right: '8%', height: 1, background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.25), transparent)', pointerEvents: 'none' },
  heroEmoji: { fontSize: 60, marginBottom: 14 },
  statusTitle: { fontSize: 28, fontWeight: 900, letterSpacing: '-0.5px', marginBottom: 7 },
  orderNum: { fontSize: 15, color: 'var(--text-muted)', marginBottom: 4 },
  storeName: { fontSize: 13, color: 'var(--text-dim)' },
  progressCard: { position: 'relative', overflow: 'hidden', background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', border: '1px solid var(--border)', borderRadius: 20, padding: '18px 18px 16px', marginBottom: 12, boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.07)' },
  steps: { display: 'flex', alignItems: 'flex-start' },
  stepCol: { display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 },
  stepTop: { display: 'flex', alignItems: 'center', width: '100%', justifyContent: 'center', position: 'relative', marginBottom: 8 },
  stepDot: { width: 22, height: 22, borderRadius: '50%', background: 'rgba(255,255,255,0.08)', border: '2px solid var(--border-strong)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1 },
  stepDotOn: { background: 'linear-gradient(135deg, #E8192C, #b8111f)', borderColor: '#E8192C', boxShadow: '0 0 10px rgba(232,25,44,0.5)' },
  stepCheck: { fontSize: 10, color: '#fff', fontWeight: 900 },
  stepLine: { position: 'absolute', left: '50%', right: '-50%', height: 2, background: 'var(--border)', top: '50%', transform: 'translateY(-50%)', zIndex: 0 },
  stepLineOn: { background: '#E8192C' },
  stepLabel: { fontSize: 10, color: 'var(--text-dim)', textAlign: 'center', lineHeight: 1.3, maxWidth: 66 },
  stepLabelOn: { color: '#E8192C', fontWeight: 700 },
  card: { position: 'relative', overflow: 'hidden', background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', border: '1px solid var(--border)', borderRadius: 20, padding: '17px 19px', marginBottom: 12, boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.07)' },
  cardLabel: { fontSize: 11, fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: 13 },
  lineItem: { display: 'flex', justifyContent: 'space-between', marginBottom: 8, gap: 12 },
  lineItemName: { fontSize: 14, color: 'var(--text-muted)', flex: 1 },
  lineItemPrice: { fontSize: 14, fontWeight: 700, flexShrink: 0 },
  divider: { borderTop: '1px solid var(--border)', margin: '13px 0' },
  priceRow: { display: 'flex', justifyContent: 'space-between', fontSize: 14, color: 'var(--text-muted)', marginBottom: 8 },
  priceLabel: { color: 'var(--text-dim)' },
  totalRow: { display: 'flex', justifyContent: 'space-between', fontSize: 20, fontWeight: 900, letterSpacing: '-0.3px', paddingTop: 4 },
  actions: { display: 'flex', gap: 11, marginTop: 4 },
  secondaryBtn: { flex: 1, background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border)', color: 'var(--text-muted)', padding: '14px', borderRadius: 14, fontSize: 14, fontWeight: 600, cursor: 'pointer' },
  primaryBtn: { flex: 1, background: 'linear-gradient(135deg, #E8192C, #b8111f)', border: 'none', color: '#fff', padding: '14px', borderRadius: 14, fontSize: 14, fontWeight: 800, cursor: 'pointer', boxShadow: '0 6px 20px rgba(232,25,44,0.35)' },
};
