import { type FormEvent, useState } from 'react';
import { signin, signup } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import Logo from '../components/Logo';

export default function AuthPage() {
  const { setUser } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault(); setError(''); setLoading(true);
    try {
      const data = mode === 'signin'
        ? await signin(email.trim(), password)
        : await signup(email.trim(), password, name.trim());
      const raw = data?.user ?? {};
      setUser({ id: raw.id ?? '', email: raw.email ?? email.trim(), role: raw.role ?? 'customer', display_name: data?.display_name ?? data?.profile?.display_name ?? (name.trim() || raw.email) });
    } catch (err: any) { setError(err.message || 'Something went wrong'); }
    finally { setLoading(false); }
  };

  return (
    <div style={s.page}>
      <div style={s.card}>
        <div style={s.logoRow}>
          <Logo size={96} />
        </div>
        <p style={s.tagline}>Hot. Fast. Legendary.</p>
        <div style={s.tabs}>
          <button style={{ ...s.tab, ...(mode === 'signin' ? s.tabActive : {}) }} onClick={() => setMode('signin')}>Sign In</button>
          <button style={{ ...s.tab, ...(mode === 'signup' ? s.tabActive : {}) }} onClick={() => setMode('signup')}>Create Account</button>
        </div>
        <form onSubmit={handleSubmit} style={s.form}>
          {error && <div style={s.error}>{error}</div>}
          {mode === 'signup' && (
            <div style={s.field}>
              <label style={s.label}>Full Name</label>
              <input style={s.input} type="text" placeholder="John Doe" value={name} onChange={e => setName(e.target.value)} required />
            </div>
          )}
          <div style={s.field}>
            <label style={s.label}>Email</label>
            <input style={s.input} type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required autoFocus />
          </div>
          <div style={s.field}>
            <label style={s.label}>Password</label>
            <input style={s.input} type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required minLength={8} />
          </div>
          <button style={{ ...s.btn, ...(loading ? s.btnOff : {}) }} type="submit" disabled={loading}>
            {loading ? 'Loading…' : (mode === 'signin' ? 'Sign In' : 'Create Account')}
          </button>
        </form>
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  page: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', padding: 24 },
  card: { width: '100%', maxWidth: 420, background: '#fff', borderRadius: 16, padding: '44px 40px', border: '1px solid var(--border)', boxShadow: '0 4px 24px rgba(0,0,0,0.08)' },
  logoRow: { display: 'flex', justifyContent: 'center', marginBottom: 16 },
  brand: { textAlign: 'center', fontSize: 34, fontWeight: 900, letterSpacing: '-1px', marginBottom: 4 },
  brandBlue: { color: 'var(--primary)' },
  brandRed: { color: 'var(--red)' },
  tagline: { textAlign: 'center', fontSize: 13, color: 'var(--text-muted)', fontWeight: 500, marginBottom: 32, letterSpacing: '0.3px', textTransform: 'uppercase' },
  tabs: { display: 'flex', gap: 0, marginBottom: 28, border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' },
  tab: { flex: 1, padding: '10px 0', border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 500, background: '#fff', color: 'var(--text-muted)' },
  tabActive: { background: 'var(--primary)', color: '#fff', fontWeight: 700 },
  form: { display: 'flex', flexDirection: 'column', gap: 18 },
  field: { display: 'flex', flexDirection: 'column', gap: 6 },
  label: { fontSize: 13, fontWeight: 600, color: 'var(--text)' },
  error: { background: '#FFF5F5', color: '#C53030', padding: '11px 14px', borderRadius: 8, fontSize: 13, border: '1px solid #FEB2B2' },
  input: { padding: '11px 14px', background: '#fff', border: '1px solid var(--border-strong)', borderRadius: 10, fontSize: 15, color: 'var(--text)', outline: 'none' },
  btn: { marginTop: 4, padding: '13px', cursor: 'pointer', background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 700 },
  btnOff: { opacity: 0.65, cursor: 'not-allowed' },
};
