import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getLoyalty, getNotificationPreferences, updateNotificationPreferences, type LoyaltyInfo } from '../services/api';
import AppHeader, { navBtnStyle } from '../components/AppHeader';

const TIER_COLOR: Record<string, string> = {
  bronze: '#cd7f32',
  silver: '#9ca3af',
  gold: '#d97706',
  platinum: '#7c3aed',
};

export default function AccountPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth() as any;
  const [loyalty, setLoyalty] = useState<LoyaltyInfo | null>(null);
  const [loyaltyLoading, setLoyaltyLoading] = useState(true);

  // Notification preferences state
  const [notifPrefs, setNotifPrefs] = useState<{ order_updates: boolean; promotions: boolean; loyalty_updates: boolean } | null>(null);
  const [notifLoading, setNotifLoading] = useState(true);
  const [notifSaving, setNotifSaving] = useState(false);

  useEffect(() => {
    getLoyalty()
      .then(setLoyalty)
      .catch(() => null)
      .finally(() => setLoyaltyLoading(false));

    getNotificationPreferences()
      .then(setNotifPrefs)
      .catch(() => null)
      .finally(() => setNotifLoading(false));
  }, []);

  async function handleSignout() {
    await logout();
    navigate('/auth');
  }

  async function toggleNotif(key: 'order_updates' | 'promotions' | 'loyalty_updates') {
    if (!notifPrefs || notifSaving) return;
    const updated = { ...notifPrefs, [key]: !notifPrefs[key] };
    setNotifPrefs(updated);
    setNotifSaving(true);
    try {
      await updateNotificationPreferences({ [key]: updated[key] });
    } catch { setNotifPrefs(notifPrefs); }
    finally { setNotifSaving(false); }
  }

  // Progress bar: how many points toward next 100-pt reward cycle
  // points_balance mod 100 = current cycle progress
  const cycleProgress = loyalty ? loyalty.points_balance % 100 : 0;
  const progressPct = cycleProgress;

  const tierColor = loyalty ? (TIER_COLOR[loyalty.tier] ?? '#1d4ed8') : '#1d4ed8';

  return (
    <div style={s.page}>
      <AppHeader
        right={<>
          <button style={navBtnStyle} onClick={() => navigate('/stores')}>Locations</button>
          <button style={navBtnStyle} onClick={() => navigate('/orders')}>Order History</button>
          <button style={navBtnStyle} onClick={() => navigate('/favorites')}>Favorites</button>
        </>}
      />

      <main style={s.main}>
        {/* Profile */}
        <div style={s.section}>
          <div style={s.avatar}>
            {user?.display_name?.charAt(0)?.toUpperCase() ?? 'U'}
          </div>
          <div>
            <p style={s.displayName}>{user?.display_name ?? 'Customer'}</p>
            <p style={s.email}>{user?.email}</p>
          </div>
        </div>

        {/* Loyalty Card */}
        <div style={s.loyaltyCard}>
          <div style={s.loyaltyHeader}>
            <span style={s.loyaltyTitle}>Storm Rewards</span>
            <span style={{ ...s.loyaltyBadge, background: `${tierColor}33`, color: tierColor, border: `1px solid ${tierColor}66` }}>
              ⚡ {loyalty?.tier ? loyalty.tier.charAt(0).toUpperCase() + loyalty.tier.slice(1) : 'Member'}
            </span>
          </div>

          {loyaltyLoading ? (
            <p style={s.loyaltyLoading}>Loading points…</p>
          ) : loyalty ? (
            <>
              <div style={s.pointsRow}>
                <div>
                  <p style={s.pointsNumber}>{loyalty.points_balance.toLocaleString()}</p>
                  <p style={s.pointsLabel}>Points Balance</p>
                </div>
                {loyalty.reward_dollars > 0 && (
                  <div style={s.rewardBadge}>
                    <p style={s.rewardAmount}>${loyalty.reward_dollars}.00</p>
                    <p style={s.rewardLabel}>Available Reward</p>
                  </div>
                )}
              </div>

              {/* Progress bar to next reward */}
              <div style={s.progressSection}>
                <div style={s.progressLabelRow}>
                  <span style={s.progressText}>Progress to next $1 reward</span>
                  <span style={s.progressText}>{cycleProgress}/100 pts</span>
                </div>
                <div style={s.progressBar}>
                  <div style={{ ...s.progressFill, width: `${progressPct}%` }} />
                </div>
                <p style={s.progressSub}>{100 - cycleProgress} more points needed</p>
              </div>

              <div style={s.loyaltyStats}>
                <div style={s.stat}>
                  <p style={s.statNum}>{loyalty.lifetime_points.toLocaleString()}</p>
                  <p style={s.statLabel}>Lifetime Points</p>
                </div>
                <div style={s.stat}>
                  <p style={s.statNum}>{loyalty.orders_counted}</p>
                  <p style={s.statLabel}>Orders Counted</p>
                </div>
                <div style={s.stat}>
                  <p style={s.statNum}>$1 / 100 pts</p>
                  <p style={s.statLabel}>Earn Rate</p>
                </div>
              </div>

              {loyalty.next_tier && (
                <p style={s.progressSub}>
                  {loyalty.points_to_next_tier} pts to {loyalty.next_tier.charAt(0).toUpperCase() + loyalty.next_tier.slice(1)} tier
                </p>
              )}

              {loyalty.recent_transactions.length > 0 && (
                <div style={s.txSection}>
                  <p style={s.txTitle}>Recent Activity</p>
                  {loyalty.recent_transactions.map((tx, i) => (
                    <div key={i} style={s.txRow}>
                      <span style={s.txDesc}>{tx.description}</span>
                      <span style={{ ...s.txPoints, color: tx.type === 'earn' ? '#34d399' : '#f87171' }}>
                        {tx.type === 'earn' ? '+' : '-'}{tx.points} pts
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <p style={s.loyaltyLoading}>Place your first order to start earning rewards!</p>
          )}
        </div>

        {/* Notification Settings */}
        <div style={s.notifCard}>
          <p style={s.notifTitle}>Notification Settings</p>
          {notifLoading ? (
            <p style={s.notifHint}>Loading…</p>
          ) : notifPrefs ? (
            <div style={s.notifList}>
              {([
                { key: 'order_updates', label: 'Order Status Updates', desc: 'Get notified when your order is confirmed, ready, etc.' },
                { key: 'promotions', label: 'Promotions & Deals', desc: 'Special offers and new menu items' },
                { key: 'loyalty_updates', label: 'Loyalty & Rewards', desc: 'Points earned and reward availability' },
              ] as const).map(({ key, label, desc }) => (
                <div key={key} style={s.notifRow}>
                  <div style={s.notifText}>
                    <p style={s.notifLabel}>{label}</p>
                    <p style={s.notifDesc}>{desc}</p>
                  </div>
                  <button
                    style={{ ...s.toggle, ...(notifPrefs[key] ? s.toggleOn : s.toggleOff) }}
                    onClick={() => toggleNotif(key)}
                    disabled={notifSaving}
                    aria-label={label}
                  >
                    <span style={{ ...s.toggleKnob, ...(notifPrefs[key] ? s.toggleKnobOn : {}) }} />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p style={s.notifHint}>Could not load notification settings.</p>
          )}
        </div>

        {/* Quick Links */}
        <div style={s.links}>
          <button style={s.link} onClick={() => navigate('/orders')}>
            <span>📋</span> Order History
          </button>
          <button style={s.link} onClick={() => navigate('/favorites')}>
            <span>♡</span> Saved Favorites
          </button>
        </div>

        {/* Sign out */}
        <button style={s.signoutBtn} onClick={handleSignout}>Sign Out</button>
      </main>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  page: { minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)' },
  main: { maxWidth: 560, margin: '0 auto', padding: '40px 22px 80px', display: 'flex', flexDirection: 'column', gap: 20 },
  section: {
    background: 'var(--bg-white)', border: '1px solid var(--border)', borderRadius: 14,
    padding: '20px', display: 'flex', alignItems: 'center', gap: 16,
  },
  avatar: {
    width: 56, height: 56, borderRadius: '50%', background: 'var(--primary)',
    color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 22, fontWeight: 900, flexShrink: 0,
  },
  displayName: { fontWeight: 800, fontSize: 18, margin: '0 0 4px' },
  email: { color: 'var(--text-muted)', fontSize: 14, margin: 0 },

  loyaltyCard: {
    background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%)',
    borderRadius: 16, padding: '22px 20px', color: '#fff',
  },
  loyaltyHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 },
  loyaltyTitle: { fontSize: 16, fontWeight: 800, letterSpacing: '-0.3px' },
  loyaltyBadge: {
    padding: '4px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700,
  },
  loyaltyLoading: { fontSize: 14, opacity: 0.8, margin: 0 },
  pointsRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  pointsNumber: { fontSize: 40, fontWeight: 900, letterSpacing: '-2px', margin: 0, lineHeight: 1 },
  pointsLabel: { fontSize: 12, opacity: 0.75, margin: '4px 0 0' },
  rewardBadge: {
    background: 'rgba(255,255,255,0.15)', borderRadius: 12,
    padding: '10px 16px', textAlign: 'right',
  },
  rewardAmount: { fontSize: 22, fontWeight: 900, margin: 0 },
  rewardLabel: { fontSize: 11, opacity: 0.75, margin: '2px 0 0' },
  progressSection: { marginBottom: 20 },
  progressLabelRow: { display: 'flex', justifyContent: 'space-between', marginBottom: 8 },
  progressText: { fontSize: 12, opacity: 0.8 },
  progressBar: { background: 'rgba(255,255,255,0.2)', borderRadius: 99, height: 6, overflow: 'hidden' },
  progressFill: { background: '#fff', height: '100%', borderRadius: 99, transition: 'width 0.6s ease' },
  progressSub: { fontSize: 11, opacity: 0.7, margin: '6px 0 0' },
  loyaltyStats: { display: 'flex', gap: 0, borderTop: '1px solid rgba(255,255,255,0.15)', paddingTop: 16, marginBottom: 4 },
  stat: { flex: 1, textAlign: 'center' },
  statNum: { fontSize: 16, fontWeight: 800, margin: 0 },
  statLabel: { fontSize: 11, opacity: 0.7, margin: '3px 0 0' },
  txSection: { marginTop: 16, borderTop: '1px solid rgba(255,255,255,0.15)', paddingTop: 14 },
  txTitle: { fontSize: 12, fontWeight: 700, opacity: 0.8, marginBottom: 10 },
  txRow: { display: 'flex', justifyContent: 'space-between', marginBottom: 6 },
  txDesc: { fontSize: 13, opacity: 0.85 },
  txPoints: { fontSize: 13, fontWeight: 700 },

  notifCard: {
    background: 'var(--bg-white)', border: '1px solid var(--border)', borderRadius: 14, padding: '20px',
  },
  notifTitle: { fontWeight: 800, fontSize: 15, margin: '0 0 14px' },
  notifHint: { fontSize: 13, color: 'var(--text-muted)', margin: 0 },
  notifList: { display: 'flex', flexDirection: 'column', gap: 16 },
  notifRow: { display: 'flex', alignItems: 'center', gap: 12 },
  notifText: { flex: 1 },
  notifLabel: { fontWeight: 600, fontSize: 14, margin: '0 0 2px' },
  notifDesc: { fontSize: 12, color: 'var(--text-muted)', margin: 0 },
  toggle: {
    width: 44, height: 24, borderRadius: 99, border: 'none', cursor: 'pointer',
    position: 'relative', flexShrink: 0, transition: 'background 0.2s',
  },
  toggleOn: { background: 'var(--primary)' },
  toggleOff: { background: 'var(--border-strong)' },
  toggleKnob: {
    position: 'absolute', top: 3, left: 3, width: 18, height: 18,
    borderRadius: '50%', background: '#fff', transition: 'left 0.2s',
  },
  toggleKnobOn: { left: 23 },

  links: { display: 'flex', flexDirection: 'column', gap: 8 },
  link: {
    background: 'var(--bg-white)', border: '1px solid var(--border)', borderRadius: 12,
    padding: '14px 18px', cursor: 'pointer', textAlign: 'left', color: 'var(--text)',
    fontSize: 15, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 10,
  },
  signoutBtn: {
    background: 'transparent', border: '1px solid var(--border)', color: 'var(--red)',
    padding: '12px', borderRadius: 10, cursor: 'pointer', fontSize: 14, fontWeight: 600,
    width: '100%',
  },
};
