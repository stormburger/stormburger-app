import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import AppHeader, { navBtnStyle } from '../components/AppHeader';
import {
  getFavorites,
  removeFavorite,
  renameFavorite,
  addToCart,
  getLocations,
  getMe,
  type Favorite,
} from '../services/api';

export default function FavoritesPage() {
  const navigate = useNavigate();
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [loading, setLoading] = useState(true);
  const [storeId, setStoreId] = useState<string | null>(null);
  const [addingId, setAddingId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const editRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function load() {
      // Prefer: sessionStorage → profile.preferred_store_id → first location
      const sessionStore = (() => {
        try { const s = sessionStorage.getItem('sb_store'); return s ? JSON.parse(s)?.id : null; } catch { return null; }
      })();

      const [favs, locs, me] = await Promise.all([
        getFavorites().catch(() => []),
        getLocations().catch(() => []),
        getMe().catch(() => null),
      ]);
      setFavorites(favs);
      const resolvedStoreId = sessionStore ?? (me as any)?.preferred_store_id ?? (locs[0]?.id ?? null);
      setStoreId(resolvedStoreId);
      setLoading(false);
    }
    load();
  }, []);

  function showToast(msg: string, ok = true) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 2800);
  }

  async function handleAddToCart(fav: Favorite) {
    if (!storeId) return;
    if (!fav.is_available) {
      showToast(
        fav.menu_item.is_active === false
          ? `${fav.menu_item.name} is no longer available`
          : `Some modifiers for ${fav.menu_item.name} are no longer available — item added without them`,
        false,
      );
      if (!fav.menu_item.is_active) return;
    }
    setAddingId(fav.id);
    try {
      // Use only active modifiers from saved list
      const validModIds = fav.modifiers.filter(m => m.is_active !== false).map(m => m.id);
      await addToCart(storeId, fav.menu_item.id, fav.quantity, validModIds);
      showToast(`${fav.custom_name ?? fav.menu_item.name} added to cart`);
      navigate(`/menu/${storeId}`);
    } catch (err: any) {
      showToast(err.message || 'Could not add to cart', false);
    } finally {
      setAddingId(null);
    }
  }

  async function handleRemove(fav: Favorite) {
    setRemovingId(fav.id);
    try {
      await removeFavorite(fav.id, fav.menu_item.id);
      setFavorites(prev => prev.filter(f => f.id !== fav.id));
      showToast(`Removed from favorites`);
    } catch {
      showToast('Could not remove favorite', false);
    } finally {
      setRemovingId(null);
    }
  }

  function startRename(fav: Favorite) {
    setEditingId(fav.id);
    setEditName(fav.custom_name ?? '');
    setTimeout(() => editRef.current?.focus(), 60);
  }

  async function commitRename(fav: Favorite) {
    if (editName.trim() === (fav.custom_name ?? '')) { setEditingId(null); return; }
    try {
      const result = await renameFavorite(fav.id, editName.trim());
      setFavorites(prev => prev.map(f => f.id === fav.id ? { ...f, custom_name: result.custom_name } : f));
      showToast('Name saved');
    } catch {
      showToast('Could not save name', false);
    } finally {
      setEditingId(null);
    }
  }

  const available = favorites.filter(f => f.is_available);
  const unavailable = favorites.filter(f => !f.is_available);

  return (
    <div style={s.page}>
      <AppHeader
        right={<>
          <button style={navBtnStyle} onClick={() => navigate('/stores')}>Locations</button>
          <button style={navBtnStyle} onClick={() => navigate('/orders')}>History</button>
          <button style={navBtnStyle} onClick={() => navigate('/account')}>Account</button>
        </>}
      />

      {toast && (
        <div style={{ ...s.toast, background: toast.ok ? 'var(--primary)' : 'var(--red)' }}>
          {toast.msg}
        </div>
      )}

      <main style={s.main}>
        <h1 style={s.title}>Your Favorites</h1>
        <p style={s.subtitle}>Saved items with your customizations</p>

        {loading && <p style={s.msg}>Loading…</p>}

        {!loading && favorites.length === 0 && (
          <div style={s.empty}>
            <div style={s.emptyIcon}>♡</div>
            <p style={s.emptyTitle}>No favorites yet</p>
            <p style={s.emptySub}>Open any menu item and tap ♡ to save it with your customizations</p>
            <button style={s.cta} onClick={() => navigate('/stores')}>Browse Menu →</button>
          </div>
        )}

        {available.length > 0 && (
          <section>
            {unavailable.length > 0 && <h2 style={s.sectionHead}>Available</h2>}
            <div style={s.grid}>
              {available.map(fav => <FavCard key={fav.id} fav={fav} storeId={storeId} editingId={editingId} editName={editName} editRef={editRef} onAdd={handleAddToCart} onRemove={handleRemove} onStartRename={startRename} onCommitRename={commitRename} setEditName={setEditName} addingId={addingId} removingId={removingId} />)}
            </div>
          </section>
        )}

        {unavailable.length > 0 && (
          <section style={{ marginTop: available.length > 0 ? 36 : 0 }}>
            <h2 style={{ ...s.sectionHead, color: 'var(--red)' }}>Unavailable</h2>
            <p style={s.unavailNote}>These items or their customizations are no longer on the menu.</p>
            <div style={s.grid}>
              {unavailable.map(fav => <FavCard key={fav.id} fav={fav} storeId={storeId} editingId={editingId} editName={editName} editRef={editRef} onAdd={handleAddToCart} onRemove={handleRemove} onStartRename={startRename} onCommitRename={commitRename} setEditName={setEditName} addingId={addingId} removingId={removingId} />)}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

function FavCard({ fav, storeId, editingId, editName, editRef, onAdd, onRemove, onStartRename, onCommitRename, setEditName, addingId, removingId }: {
  fav: Favorite; storeId: string | null; editingId: string | null; editName: string;
  editRef: React.RefObject<HTMLInputElement | null>;
  onAdd: (f: Favorite) => void; onRemove: (f: Favorite) => void;
  onStartRename: (f: Favorite) => void; onCommitRename: (f: Favorite) => void;
  setEditName: (v: string) => void; addingId: string | null; removingId: string | null;
}) {
  const isEditing = editingId === fav.id;
  const isAdding = addingId === fav.id;
  const isRemoving = removingId === fav.id;
  const unavailMods = fav.unavailable_modifiers ?? [];
  const itemUnavail = !fav.menu_item.is_active;

  return (
    <div style={{ ...s.card, ...(itemUnavail ? s.cardUnavail : {}) }}>
      {fav.menu_item.image_url && !itemUnavail && (
        <img src={fav.menu_item.image_url} alt={fav.menu_item.name} style={s.img} />
      )}
      {itemUnavail && (
        <div style={s.imgPlaceholder}>Unavailable</div>
      )}
      <div style={s.cardBody}>
        {/* Name row with inline rename */}
        <div style={s.nameRow}>
          {isEditing ? (
            <input
              ref={editRef}
              style={s.nameInput}
              value={editName}
              onChange={e => setEditName(e.target.value)}
              onBlur={() => onCommitRename(fav)}
              onKeyDown={e => { if (e.key === 'Enter') onCommitRename(fav); if (e.key === 'Escape') { setEditName(''); onCommitRename({ ...fav, custom_name: fav.custom_name }); } }}
              placeholder={fav.menu_item.name}
              maxLength={60}
            />
          ) : (
            <span style={s.itemName}>{fav.custom_name ?? fav.menu_item.name}</span>
          )}
          {!isEditing && (
            <button style={s.renameBtn} onClick={() => onStartRename(fav)} title="Rename">✏</button>
          )}
        </div>
        {fav.custom_name && <span style={s.origName}>{fav.menu_item.name}</span>}

        {/* Modifiers */}
        {fav.modifiers.length > 0 && (
          <div style={s.mods}>
            {fav.modifiers.map(m => (
              <span key={m.id} style={{ ...s.modChip, ...(m.is_active === false ? s.modChipDead : {}) }}>
                {m.name}{m.price_adjustment > 0 ? ` +$${(m.price_adjustment / 100).toFixed(2)}` : ''}
                {m.is_active === false && ' ✕'}
              </span>
            ))}
          </div>
        )}

        {/* Qty + base price */}
        <div style={s.meta}>
          {fav.quantity > 1 && <span style={s.metaItem}>×{fav.quantity}</span>}
          <span style={s.price}>${((fav.menu_item.price ?? 0) / 100).toFixed(2)}</span>
        </div>

        {/* Unavailable modifier warning */}
        {unavailMods.length > 0 && !itemUnavail && (
          <p style={s.warnNote}>Unavailable: {unavailMods.map(m => m.name).join(', ')} — will be skipped when added</p>
        )}

        {/* Actions */}
        <div style={s.actions}>
          <button
            style={{ ...s.addBtn, ...(isAdding || !storeId ? s.addBtnOff : {}) }}
            onClick={() => onAdd(fav)}
            disabled={isAdding || !storeId || itemUnavail}
          >
            {isAdding ? 'Adding…' : itemUnavail ? 'Unavailable' : 'Add to Cart'}
          </button>
          <button style={{ ...s.removeBtn, ...(isRemoving ? s.addBtnOff : {}) }} onClick={() => onRemove(fav)} disabled={isRemoving}>
            {isRemoving ? '…' : '✕'}
          </button>
        </div>
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  page: { minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)' },
  toast: { position: 'fixed', top: 68, left: '50%', transform: 'translateX(-50%)', color: '#fff', padding: '10px 22px', borderRadius: 10, fontSize: 14, fontWeight: 600, zIndex: 200, boxShadow: '0 4px 16px rgba(0,0,0,0.18)', pointerEvents: 'none', whiteSpace: 'nowrap' },
  main: { maxWidth: 860, margin: '0 auto', padding: '40px 22px 100px' },
  title: { fontSize: 30, fontWeight: 900, letterSpacing: '-1px', marginBottom: 6 },
  subtitle: { color: 'var(--text-muted)', fontSize: 15, marginBottom: 32 },
  msg: { color: 'var(--text-muted)', textAlign: 'center', padding: 40 },
  empty: { textAlign: 'center', padding: '80px 0' },
  emptyIcon: { fontSize: 52, marginBottom: 14, color: 'var(--text-dim)' },
  emptyTitle: { fontSize: 18, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8 },
  emptySub: { fontSize: 14, color: 'var(--text-dim)', marginBottom: 24, maxWidth: 300, margin: '0 auto 24px' },
  cta: { background: 'var(--primary)', color: '#fff', border: 'none', padding: '12px 28px', borderRadius: 10, cursor: 'pointer', fontSize: 15, fontWeight: 700 },
  sectionHead: { fontSize: 15, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 14 },
  unavailNote: { fontSize: 13, color: 'var(--text-dim)', marginBottom: 14 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 },
  card: { background: 'var(--bg-white)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden', display: 'flex', flexDirection: 'column' },
  cardUnavail: { opacity: 0.65, border: '1px solid #fca5a5' },
  img: { width: '100%', height: 140, objectFit: 'cover' },
  imgPlaceholder: { width: '100%', height: 70, background: '#FFF5F5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: 'var(--red)', letterSpacing: '0.5px' },
  cardBody: { padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 8, flex: 1 },
  nameRow: { display: 'flex', alignItems: 'center', gap: 6 },
  itemName: { fontWeight: 700, fontSize: 15, flex: 1, lineHeight: 1.3 },
  origName: { fontSize: 12, color: 'var(--text-dim)', marginTop: -4 },
  nameInput: { flex: 1, fontSize: 14, fontWeight: 700, border: '1.5px solid var(--primary)', borderRadius: 7, padding: '4px 8px', outline: 'none', background: '#F0F4FF', color: 'var(--text)' },
  renameBtn: { background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 14, color: 'var(--text-muted)', padding: '2px 4px', flexShrink: 0 },
  mods: { display: 'flex', flexWrap: 'wrap', gap: 5 },
  modChip: { fontSize: 11, background: '#F0F4FF', color: 'var(--primary)', padding: '3px 9px', borderRadius: 20, fontWeight: 600, border: '1px solid rgba(31,63,153,0.12)' },
  modChipDead: { background: '#FFF5F5', color: 'var(--red)', border: '1px solid #fca5a5', textDecoration: 'line-through' },
  meta: { display: 'flex', alignItems: 'center', gap: 10 },
  metaItem: { fontSize: 13, color: 'var(--text-muted)', fontWeight: 600 },
  price: { fontWeight: 800, fontSize: 15, color: 'var(--primary)' },
  warnNote: { fontSize: 12, color: '#d97706', background: '#fef3c7', padding: '6px 10px', borderRadius: 7, margin: 0, lineHeight: 1.4 },
  actions: { display: 'flex', gap: 8, marginTop: 'auto', paddingTop: 4 },
  addBtn: { flex: 1, background: 'var(--primary)', color: '#fff', border: 'none', padding: '9px 0', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 700 },
  addBtnOff: { opacity: 0.5, cursor: 'not-allowed' },
  removeBtn: { background: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--border)', padding: '9px 14px', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 700 },
};
