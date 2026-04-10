import { useNavigate } from 'react-router-dom';
import type { ReactNode } from 'react';

interface Props {
  left?: ReactNode;
  right?: ReactNode;
}

/**
 * Shared page header.
 * Logo (with built-in "STORM BURGER" text) pinned to the LEFT.
 * right slot holds nav buttons.
 */
export default function AppHeader({ left, right }: Props) {
  const navigate = useNavigate();

  return (
    <header style={s.header}>
      {/* Logo — left-aligned, big */}
      <button style={s.logoBtn} onClick={() => navigate('/stores')}>
        <img src="/StormLogo.png" alt="StormBurger" style={s.logo} />
      </button>

      {/* Extra left content (back buttons, chips, etc.) */}
      {left && <div style={s.leftExtra}>{left}</div>}

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Right slot — nav buttons */}
      {right && <div style={s.rightSlot}>{right}</div>}
    </header>
  );
}

const s: Record<string, React.CSSProperties> = {
  header: {
    display: 'flex',
    alignItems: 'center',
    padding: '8px 24px',
    paddingTop: 'calc(8px + env(safe-area-inset-top, 0px))',
    paddingLeft: 'calc(24px + env(safe-area-inset-left, 0px))',
    paddingRight: 'calc(24px + env(safe-area-inset-right, 0px))',
    background: '#fff',
    borderBottom: '1px solid var(--border)',
    position: 'sticky',
    top: 0,
    zIndex: 50,
    boxShadow: '0 1px 4px rgba(0,0,0,0.07)',
    minHeight: 68,
  },
  logoBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '0 12px 0 0',
    display: 'flex',
    alignItems: 'center',
    flexShrink: 0,
  },
  logo: {
    height: 52,
    width: 'auto',
    display: 'block',
    objectFit: 'contain',
  },
  leftExtra: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginLeft: 8,
  },
  rightSlot: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
};

/** Reusable ghost nav button style */
export const navBtnStyle: React.CSSProperties = {
  background: 'transparent',
  border: '1px solid var(--border)',
  color: 'var(--text-muted)',
  cursor: 'pointer',
  fontSize: 13,
  fontWeight: 500,
  padding: '7px 13px',
  borderRadius: 8,
  whiteSpace: 'nowrap',
};
