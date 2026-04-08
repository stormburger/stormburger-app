import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import { OrdersDashboard } from './pages/OrdersDashboard';
import { MenuManager } from './pages/MenuManager';

function App() {
  return (
    <BrowserRouter>
      <div style={styles.layout}>
        <nav style={styles.nav}>
          <div style={styles.brand}>
            <span style={styles.brandStorm}>STORM</span>
            <span style={styles.brandBurger}>BURGER</span>
            <span style={styles.brandAdmin}>ADMIN</span>
          </div>
          <div style={styles.navLinks}>
            <NavLink
              to="/"
              style={({ isActive }: { isActive: boolean }) => ({
                ...styles.navLink,
                backgroundColor: isActive ? '#1F3F99' : 'transparent',
                color: isActive ? '#fff' : '#374151',
              })}
            >
              🍳 Orders
            </NavLink>
            <NavLink
              to="/menu"
              style={({ isActive }: { isActive: boolean }) => ({
                ...styles.navLink,
                backgroundColor: isActive ? '#1F3F99' : 'transparent',
                color: isActive ? '#fff' : '#374151',
              })}
            >
              📋 Menu
            </NavLink>
          </div>
        </nav>

        <main style={styles.main}>
          <Routes>
            <Route path="/" element={<OrdersDashboard />} />
            <Route path="/menu" element={<MenuManager />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

const styles: Record<string, React.CSSProperties> = {
  layout: { display: 'flex', minHeight: '100vh' },
  nav: {
    width: 220,
    backgroundColor: '#fff',
    borderRight: '1px solid #E5E7EB',
    padding: '24px 16px',
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  brand: {
    marginBottom: 32,
    textAlign: 'center',
  },
  brandStorm: {
    fontSize: 22,
    fontWeight: 800,
    color: '#1F3F99',
  },
  brandBurger: {
    fontSize: 22,
    fontWeight: 800,
    color: '#E53E3E',
  },
  brandAdmin: {
    display: 'block',
    fontSize: 11,
    fontWeight: 600,
    color: '#9CA3AF',
    letterSpacing: 3,
    marginTop: 4,
  },
  navLinks: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  navLink: {
    padding: '10px 14px',
    borderRadius: 8,
    textDecoration: 'none',
    fontSize: 15,
    fontWeight: 500,
  },
  main: { flex: 1, overflow: 'auto' },
};

export default App;
