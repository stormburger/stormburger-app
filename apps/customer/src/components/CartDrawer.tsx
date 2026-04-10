import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';

export default function CartDrawer({ storeId }: { storeId: string }) {
  const { cart, cartOpen, setCartOpen, updateItem, removeItem, refreshCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  useEffect(() => { if (cartOpen && user) refreshCart(storeId); }, [cartOpen]);
  const subtotal = cart?.subtotal ?? 0;
  const count = cart?.item_count ?? 0;

  return (
    <>
      {cartOpen && <div style={s.overlay} onClick={() => setCartOpen(false)} />}
      <div style={{ ...s.drawer, transform: cartOpen ? 'translateX(0)' : 'translateX(100%)' }}>
        <div style={s.header}>
          <div>
            <h2 style={s.title}>Your Order</h2>
            {count > 0 && <p style={s.countLine}>{count} item{count !== 1 ? 's' : ''}</p>}
          </div>
          <button style={s.closeBtn} onClick={() => setCartOpen(false)}>✕</button>
        </div>
        <div style={s.items}>
          {!cart || cart.items.length === 0 ? (
            <div style={s.empty}>
              <div style={s.emptyEmoji}>🛒</div>
              <p style={s.emptyTitle}>Cart is empty</p>
              <p style={s.emptySub}>Add items from the menu to get started</p>
            </div>
          ) : cart.items.map(item => (
            <div key={item.id} style={s.item}>
              <div style={s.itemTop}>
                <span style={s.itemName}>{item.menu_item?.name ?? ''}</span>
                <span style={s.itemPrice}>${((item.line_total ?? 0) / 100).toFixed(2)}</span>
              </div>
              {item.modifiers.length > 0 && <p style={s.mods}>{item.modifiers.map(m => m.name).join(', ')}</p>}
              {item.special_instructions && <p style={s.note}>📝 {item.special_instructions}</p>}
              <div style={s.qtyRow}>
                <button style={s.qtyBtn} onClick={() => item.quantity <= 1 ? removeItem(storeId, item.id) : updateItem(storeId, item.id, item.quantity - 1)}>−</button>
                <span style={s.qtyVal}>{item.quantity}</span>
                <button style={s.qtyBtn} onClick={() => updateItem(storeId, item.id, item.quantity + 1)}>+</button>
                <button style={s.removeBtn} onClick={() => removeItem(storeId, item.id)}>Remove</button>
              </div>
            </div>
          ))}
        </div>
        {cart && cart.items.length > 0 && (
          <div style={s.footer}>
            <div style={s.subtotalRow}>
              <span style={s.subtotalLabel}>Subtotal</span>
              <span style={s.subtotalAmt}>${(subtotal / 100).toFixed(2)}</span>
            </div>
            <p style={s.taxNote}>Tax + tip calculated at checkout</p>
            <button style={s.checkoutBtn} onClick={() => { setCartOpen(false); navigate(user ? `/checkout/${storeId}` : '/auth'); }}>
              {user ? `Checkout · $${(subtotal / 100).toFixed(2)}` : 'Sign In to Order'}
            </button>
          </div>
        )}
      </div>
    </>
  );
}

const s: Record<string, React.CSSProperties> = {
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 99 },
  drawer: { position: 'fixed', right: 0, top: 0, bottom: 0, width: 400, background: '#fff', borderLeft: '1px solid var(--border)', zIndex: 100, display: 'flex', flexDirection: 'column', transition: 'transform .3s cubic-bezier(0.4,0,0.2,1)', boxShadow: '-8px 0 32px rgba(0,0,0,0.12)' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '20px 18px 16px', borderBottom: '1px solid var(--border)' },
  title: { fontSize: 19, fontWeight: 800, letterSpacing: '-0.3px', color: 'var(--text)' },
  countLine: { fontSize: 12, color: 'var(--text-muted)', marginTop: 3, fontWeight: 600 },
  closeBtn: { background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text-muted)', width: 32, height: 32, borderRadius: '50%', cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  items: { flex: 1, overflowY: 'auto', padding: '12px 14px' },
  empty: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 240, textAlign: 'center' },
  emptyEmoji: { fontSize: 42, marginBottom: 14 },
  emptyTitle: { fontSize: 15, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 5 },
  emptySub: { fontSize: 13, color: 'var(--text-dim)', lineHeight: 1.5 },
  item: { background: 'var(--bg)', borderRadius: 12, padding: '13px 14px', marginBottom: 10, border: '1px solid var(--border)' },
  itemTop: { display: 'flex', justifyContent: 'space-between', marginBottom: 5 },
  itemName: { fontSize: 14, fontWeight: 700, flex: 1, marginRight: 8, color: 'var(--text)' },
  itemPrice: { fontSize: 14, fontWeight: 800, color: 'var(--primary)', flexShrink: 0 },
  mods: { fontSize: 12, color: 'var(--text-muted)', marginBottom: 4, lineHeight: 1.4 },
  note: { fontSize: 12, color: 'var(--text-dim)', marginBottom: 8 },
  qtyRow: { display: 'flex', alignItems: 'center', gap: 10, marginTop: 10 },
  qtyBtn: { background: '#fff', border: '1px solid var(--border)', color: 'var(--text)', width: 30, height: 30, borderRadius: 8, cursor: 'pointer', fontSize: 17, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  qtyVal: { fontSize: 14, fontWeight: 800, minWidth: 22, textAlign: 'center' },
  removeBtn: { marginLeft: 'auto', background: 'transparent', border: 'none', color: 'var(--red)', cursor: 'pointer', fontSize: 12, fontWeight: 600 },
  footer: { padding: '16px 18px 22px', borderTop: '1px solid var(--border)' },
  subtotalRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 },
  subtotalLabel: { fontSize: 14, fontWeight: 700, color: 'var(--text)' },
  subtotalAmt: { fontSize: 18, fontWeight: 900, color: 'var(--text)', letterSpacing: '-0.5px' },
  taxNote: { fontSize: 12, color: 'var(--text-dim)', marginBottom: 14 },
  checkoutBtn: { width: '100%', background: 'var(--primary)', border: 'none', color: '#fff', padding: '14px', borderRadius: 12, fontSize: 15, fontWeight: 800, cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.3px' },
};
