import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { MenuItem, ModifierGroup } from '../services/api';
import { getMenuItem, isFavorite, saveFavoriteId, removeFavoriteId, saveFavorite, getFavorites, removeFavorite } from '../services/api';
import { useCart } from '../contexts/CartContext';

function fmtName(s: string) { return s.replace(/[_-]/g, ' ').replace(/\b\w/g, c => c.toUpperCase()); }

export default function ItemDetailPage() {
  const { storeId, itemId } = useParams<{ storeId: string; itemId: string }>();
  const navigate = useNavigate();
  const { addItem } = useCart();
  const [item, setItem] = useState<MenuItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [qty, setQty] = useState(1);
  const [selectedMods, setSelectedMods] = useState<Record<string, string[]>>({});
  const [note, setNote] = useState('');
  const [adding, setAdding] = useState(false);
  const [faved, setFaved] = useState(false);
  const [favId, setFavId] = useState<string | null>(null);
  const [favSaving, setFavSaving] = useState(false);

  useEffect(() => {
    if (!itemId) return;
    // Seed heart state from cache immediately, then verify from server
    setFaved(isFavorite(itemId));
    getFavorites().then(favs => {
      const match = favs.find(f => f.menu_item.id === itemId);
      if (match) { setFaved(true); setFavId(match.id); saveFavoriteId(itemId); }
      else { setFaved(false); setFavId(null); removeFavoriteId(itemId); }
    }).catch(() => { /* keep cache state */ });
  }, [itemId]);

  async function toggleFavorite() {
    if (!itemId || favSaving) return;
    setFavSaving(true);
    try {
      if (faved && favId) {
        await removeFavorite(favId, itemId);
        setFaved(false);
        setFavId(null);
        removeFavoriteId(itemId);
      } else if (!faved) {
        const currentModIds = Object.values(selectedMods).flat();
        const result = await saveFavorite(itemId, currentModIds, qty);
        setFaved(true);
        setFavId(result.id);
        saveFavoriteId(itemId);
      }
    } catch (err: any) {
      // Already favorited (conflict) — treat as already saved
      if (err.message?.includes('already')) { setFaved(true); }
    } finally {
      setFavSaving(false);
    }
  }

  useEffect(() => {
    if (!itemId || !storeId) return;
    getMenuItem(itemId, storeId).then(it => {
      setItem(it);
      const defaults: Record<string, string[]> = {};
      (it.modifier_groups ?? []).forEach((g: ModifierGroup) => {
        defaults[g.id] = g.min_selections > 0 && g.type === 'single' && g.modifiers.length > 0 ? [g.modifiers[0].id] : [];
      });
      setSelectedMods(defaults);
    }).catch(() => setError('Could not load item')).finally(() => setLoading(false));
  }, [itemId, storeId]);

  const toggleMod = (group: ModifierGroup, modId: string) => {
    setSelectedMods(prev => {
      const cur = prev[group.id] ?? [];
      if (group.type === 'single') return { ...prev, [group.id]: [modId] };
      if (cur.includes(modId)) return { ...prev, [group.id]: cur.filter(id => id !== modId) };
      if (cur.length >= group.max_selections) return prev;
      return { ...prev, [group.id]: [...cur, modId] };
    });
  };

  const totalPrice = () => {
    if (!item) return 0;
    const modExtra = (item.modifier_groups ?? []).reduce((sum, g) =>
      sum + (selectedMods[g.id] ?? []).reduce((s, mid) => s + (g.modifiers.find(m => m.id === mid)?.price_adjustment ?? 0), 0), 0);
    return ((item.price ?? 0) + modExtra) * qty;
  };

  const handleAdd = async () => {
    if (!storeId || !item) return;
    setAdding(true);
    try { await addItem(storeId, item.id, qty, Object.values(selectedMods).flat(), note || undefined); navigate(`/menu/${storeId}`); }
    catch (err: any) { setError(err.message || 'Could not add to cart'); }
    finally { setAdding(false); }
  };

  if (loading) return <div style={s.splash}>Loading…</div>;
  if (error || !item) return <div style={s.splash}>{error || 'Item not found'}</div>;

  return (
    <div style={s.page}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button style={s.backBtn} onClick={() => navigate(`/menu/${storeId}`)}>← Back to menu</button>
        <button style={{ ...s.favBtn, opacity: favSaving ? 0.5 : 1 }} onClick={toggleFavorite} disabled={favSaving} title={faved ? 'Remove from favorites' : 'Save with current customizations'}>
          {faved ? '♥' : '♡'}
        </button>
      </div>
      <div style={s.wrap}>
        {item.image_url
          ? <img src={item.image_url} alt={item.name} style={s.hero} onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
          : <div style={s.heroFallback}>🍔</div>}
        <h1 style={s.itemName}>{item.name}</h1>
        {item.description && <p style={s.desc}>{item.description}</p>}
        <div style={s.basePrice}>${((item.price ?? 0) / 100).toFixed(2)}</div>

        {(item.modifier_groups ?? []).map((group: ModifierGroup) => (
          <div key={group.id} style={s.group}>
            <div style={s.groupHead}>
              <span style={s.groupName}>{fmtName(group.display_name || group.name)}</span>
              <span style={s.groupBadge}>
                {group.min_selections > 0 ? 'Required' : 'Optional'}
                {group.max_selections > 1 ? ` · up to ${group.max_selections}` : ''}
              </span>
            </div>
            <div style={s.modRow}>
              {group.modifiers.map(mod => {
                const sel = (selectedMods[group.id] ?? []).includes(mod.id);
                return (
                  <button key={mod.id} style={{ ...s.modChip, ...(sel ? s.modChipOn : {}) }} onClick={() => toggleMod(group, mod.id)}>
                    {sel && <span style={s.checkMark}>✓</span>}
                    <span>{mod.name}</span>
                    {(mod.price_adjustment ?? 0) !== 0 && <span style={s.modPrice}>+${((mod.price_adjustment ?? 0) / 100).toFixed(2)}</span>}
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        <div style={s.group}>
          <div style={s.groupName}>Special Instructions</div>
          <textarea style={s.textarea} placeholder="Allergies, preferences… (optional)" value={note} onChange={e => setNote(e.target.value)} maxLength={500} rows={3} />
        </div>
        {error && <div style={s.err}>{error}</div>}
      </div>

      <div style={s.footer}>
        <div style={s.qtyWrap}>
          <button style={s.qtyBtn} onClick={() => setQty(q => Math.max(1, q - 1))}>−</button>
          <span style={s.qtyVal}>{qty}</span>
          <button style={s.qtyBtn} onClick={() => setQty(q => q + 1)}>+</button>
        </div>
        <button style={{ ...s.addBtn, ...(adding ? s.addBtnOff : {}) }} onClick={handleAdd} disabled={adding}>
          {adding ? 'Adding…' : `Add to Cart · $${(totalPrice() / 100).toFixed(2)}`}
        </button>
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  page: { minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)', paddingBottom: 100 },
  splash: { display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', color: 'var(--text-muted)', background: 'var(--bg)' },
  backBtn: { display: 'block', background: 'transparent', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: 14, padding: '20px 24px', fontWeight: 600 },
  favBtn: { background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 26, color: 'var(--red)', padding: '20px 24px', lineHeight: 1 },
  wrap: { maxWidth: 680, margin: '0 auto', padding: '0 22px' },
  hero: { width: '100%', borderRadius: 16, maxHeight: 320, objectFit: 'cover', marginBottom: 24, display: 'block', boxShadow: '0 4px 24px rgba(0,0,0,0.12)' },
  heroFallback: { width: '100%', height: 160, borderRadius: 16, background: '#EDF2F7', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 60, marginBottom: 24 },
  itemName: { fontSize: 30, fontWeight: 900, letterSpacing: '-0.8px', marginBottom: 10, color: 'var(--text)' },
  desc: { color: 'var(--text-muted)', fontSize: 15, lineHeight: 1.6, marginBottom: 10 },
  basePrice: { fontSize: 22, fontWeight: 800, color: 'var(--primary)', marginBottom: 28 },
  group: { marginBottom: 14, background: '#fff', border: '1px solid var(--border)', borderRadius: 14, padding: '16px 18px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' },
  groupHead: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  groupName: { fontSize: 14, fontWeight: 700, color: 'var(--text)' },
  groupBadge: { fontSize: 11, color: 'var(--text-muted)', background: 'var(--bg)', padding: '3px 10px', borderRadius: 20, border: '1px solid var(--border)', fontWeight: 600 },
  modRow: { display: 'flex', flexWrap: 'wrap', gap: 8 },
  modChip: { padding: '8px 14px', border: '1.5px solid var(--border-strong)', borderRadius: 10, background: '#fff', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 13, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6 },
  modChipOn: { borderColor: 'var(--primary)', background: 'rgba(31,63,153,0.07)', color: 'var(--primary)' },
  checkMark: { fontSize: 11, color: 'var(--primary)', fontWeight: 900 },
  modPrice: { color: 'var(--text-dim)', fontSize: 11, fontWeight: 600 },
  textarea: { width: '100%', background: '#fff', border: '1px solid var(--border-strong)', borderRadius: 10, color: 'var(--text)', padding: '11px 13px', fontSize: 14, resize: 'none', boxSizing: 'border-box' },
  err: { background: '#FFF5F5', color: '#C53030', padding: '10px 14px', borderRadius: 8, fontSize: 13, marginBottom: 16, border: '1px solid #FEB2B2' },
  footer: { position: 'fixed', bottom: 0, left: 0, right: 0, padding: '14px 22px', display: 'flex', gap: 12, alignItems: 'center', background: '#fff', borderTop: '1px solid var(--border)', boxShadow: '0 -4px 16px rgba(0,0,0,0.08)' },
  qtyWrap: { display: 'flex', alignItems: 'center', gap: 16, background: 'var(--bg)', padding: '10px 18px', borderRadius: 12, border: '1px solid var(--border)', flexShrink: 0 },
  qtyBtn: { background: 'transparent', border: 'none', color: 'var(--text)', fontSize: 22, cursor: 'pointer', lineHeight: 1, fontWeight: 400 },
  qtyVal: { fontSize: 16, fontWeight: 800, minWidth: 22, textAlign: 'center' },
  addBtn: { flex: 1, background: 'var(--red)', border: 'none', color: '#fff', padding: '14px 24px', borderRadius: 12, fontSize: 16, fontWeight: 800, cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.3px' },
  addBtnOff: { opacity: 0.6, cursor: 'not-allowed' },
};
