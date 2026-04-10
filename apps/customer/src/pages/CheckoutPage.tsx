import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { CheckoutPreview } from '../services/api';
import { checkoutPreview, checkout } from '../services/api';
import Logo from '../components/Logo';
import AppHeader, { navBtnStyle } from '../components/AppHeader';

function genKey() { return `${Date.now()}-${Math.random().toString(36).slice(2)}`; }
function cap(s: string) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }

export default function CheckoutPage() {
  const { storeId } = useParams<{ storeId: string }>();
  const navigate = useNavigate();
  const [preview, setPreview] = useState<CheckoutPreview | null>(null);
  const [tip, setTip] = useState(0);
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(true);
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState('');
  const [idemKey] = useState(genKey);

  useEffect(() => { if (storeId) loadPreview(0); }, [storeId]);

  const loadPreview = async (tipAmt: number) => {
    if (!storeId) return;
    setLoading(true); setError('');
    try { setPreview(await checkoutPreview(storeId, tipAmt)); }
    catch (err: any) { setError(err.message || 'Could not load checkout'); }
    finally { setLoading(false); }
  };

  const handleTip = (t: number) => { setTip(t); loadPreview(t); };

  const handlePlace = async () => {
    if (!storeId) return;
    setPlacing(true); setError('');
    try {
      const result = await checkout(storeId, idemKey, tip, note || undefined);
      navigate(`/order/${result.order.id}`, { state: { result } });
    }
    catch (err: any) { setError(err.message || 'Order failed. Please try again.'); }
    finally { setPlacing(false); }
  };

  if (loading) return (
    <div style={s.splash}>
      <Logo size={44} />
      <p style={{ color: 'var(--text-muted)', marginTop: 16, fontSize: 14 }}>Preparing checkout…</p>
    </div>
  );

  if (!preview && error) return (
    <div style={s.splash}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
        <h2 style={{ color: 'var(--text)', marginBottom: 12, fontSize: 20, fontWeight: 800 }}>{cap(error)}</h2>
        <button style={s.backGhost} onClick={() => navigate(-1)}>← Go back</button>
      </div>
    </div>
  );

  const pricing = preview?.pricing;
  const subtotalCents = pricing?.subtotal ?? 0;
  const taxCents = pricing?.tax_amount ?? 0;
  const totalCents = pricing?.total ?? 0;
  const storeName = preview?.store?.name ?? '';
  const pickupTime = preview?.store?.estimated_pickup_at;

  return (
    <div style={s.page}>
      <AppHeader
        left={<button style={navBtnStyle} onClick={() => navigate(-1 as any)}>← Back</button>}
      />

      <div style={s.wrap}>
        <div style={s.pageHead}>
          <h1 style={s.title}>Checkout</h1>
          {storeName && <p style={s.storeSub}>{storeName}</p>}
          {pickupTime && (
            <div style={s.pickupPill}>
              ⏱ Ready around {new Date(pickupTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
            </div>
          )}
        </div>

        <div style={s.card}>
          <div style={s.cardLabel}>Order Summary</div>
          {(preview?.items ?? []).map((item, i) => (
            <div key={i} style={s.lineRow}>
              <span style={s.lineItem}>{item.quantity}× {item.name}</span>
              <span style={s.lineAmt}>${((item.line_total ?? 0) / 100).toFixed(2)}</span>
            </div>
          ))}
        </div>

        <div style={s.card}>
          <div style={s.cardLabel}>Add a Tip</div>
          <div style={s.tipRow}>
            {[0, 100, 200, 300].map(t => (
              <button key={t} style={{ ...s.tipChip, ...(tip === t ? s.tipChipOn : {}) }} onClick={() => handleTip(t)}>
                {t === 0 ? 'No tip' : `$${(t / 100).toFixed(2)}`}
              </button>
            ))}
          </div>
        </div>

        <div style={s.card}>
          <div style={s.cardLabel}>Special Instructions</div>
          <textarea style={s.textarea} placeholder="Notes for the kitchen… (optional)" value={note} onChange={e => setNote(e.target.value)} rows={3} maxLength={500} />
        </div>

        <div style={s.card}>
          <div style={s.priceRow}><span style={s.priceLabel}>Subtotal</span><span>${(subtotalCents / 100).toFixed(2)}</span></div>
          <div style={s.priceRow}><span style={s.priceLabel}>Tax</span><span>${(taxCents / 100).toFixed(2)}</span></div>
          {tip > 0 && <div style={s.priceRow}><span style={s.priceLabel}>Tip</span><span>${(tip / 100).toFixed(2)}</span></div>}
          <div style={s.totalRow}><span>Total</span><span>${(totalCents / 100).toFixed(2)}</span></div>
        </div>

        {error && <div style={s.errBox}>{cap(error)}</div>}
        <button style={{ ...s.placeBtn, ...(placing ? s.placeBtnOff : {}) }} onClick={handlePlace} disabled={placing}>
          {placing ? 'Placing Order…' : `Place Order · $${(totalCents / 100).toFixed(2)}`}
        </button>
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  page: { minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)', paddingBottom: 60 },
  splash: { display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: 'var(--bg)' },
  topBar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '13px 22px', background: '#fff', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, zIndex: 50, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' },
  backBtn: { background: 'transparent', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: 14, fontWeight: 600, padding: '6px 0' },
  backGhost: { display: 'block', margin: '20px auto 0', background: '#fff', border: '1px solid var(--border)', color: 'var(--text-muted)', padding: '10px 24px', borderRadius: 10, cursor: 'pointer', fontSize: 14 },
  logoRow: { display: 'flex', alignItems: 'center', gap: 8 },
  brandBlue: { fontSize: 17, fontWeight: 900, color: 'var(--primary)', letterSpacing: '-0.5px' },
  brandRed: { fontSize: 17, fontWeight: 900, color: 'var(--red)', letterSpacing: '-0.5px' },
  wrap: { maxWidth: 540, margin: '0 auto', padding: '28px 20px 0' },
  pageHead: { marginBottom: 22 },
  title: { fontSize: 28, fontWeight: 900, letterSpacing: '-0.8px', marginBottom: 4, color: 'var(--text)' },
  storeSub: { fontSize: 14, color: 'var(--text-muted)', marginBottom: 10 },
  pickupPill: { display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(31,63,153,0.08)', border: '1px solid rgba(31,63,153,0.2)', borderRadius: 20, padding: '5px 14px', fontSize: 13, color: 'var(--primary)', fontWeight: 600 },
  card: { background: '#fff', border: '1px solid var(--border)', borderRadius: 14, padding: '17px 18px', marginBottom: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' },
  cardLabel: { fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: 12 },
  lineRow: { display: 'flex', justifyContent: 'space-between', fontSize: 14, marginBottom: 7, gap: 12 },
  lineItem: { color: 'var(--text)' },
  lineAmt: { fontWeight: 600, color: 'var(--text)' },
  tipRow: { display: 'flex', gap: 8, flexWrap: 'wrap' },
  tipChip: { padding: '8px 16px', border: '1.5px solid var(--border-strong)', borderRadius: 10, background: '#fff', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 13, fontWeight: 600 },
  tipChipOn: { borderColor: 'var(--primary)', background: 'rgba(31,63,153,0.07)', color: 'var(--primary)' },
  textarea: { width: '100%', background: '#fff', border: '1px solid var(--border-strong)', borderRadius: 10, color: 'var(--text)', padding: '11px 13px', fontSize: 14, resize: 'none', boxSizing: 'border-box' },
  priceRow: { display: 'flex', justifyContent: 'space-between', fontSize: 14, color: 'var(--text-muted)', marginBottom: 8 },
  priceLabel: { color: 'var(--text-dim)' },
  totalRow: { display: 'flex', justifyContent: 'space-between', fontSize: 20, fontWeight: 900, letterSpacing: '-0.5px', borderTop: '1px solid var(--border)', paddingTop: 12, marginTop: 4, color: 'var(--text)' },
  errBox: { background: '#FFF5F5', color: '#C53030', padding: '12px 15px', borderRadius: 10, fontSize: 14, marginBottom: 14, border: '1px solid #FEB2B2' },
  placeBtn: { width: '100%', background: 'var(--red)', border: 'none', color: '#fff', padding: '16px', borderRadius: 14, fontSize: 16, fontWeight: 800, cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.5px' },
  placeBtnOff: { opacity: 0.65, cursor: 'not-allowed' },
};
