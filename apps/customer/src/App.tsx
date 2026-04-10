import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useNotifications } from './hooks/useNotifications';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { CartProvider } from './contexts/CartContext';
import AuthPage from './pages/AuthPage';
import StoreSelectorPage from './pages/StoreSelectorPage';
import MenuPage from './pages/MenuPage';
import ItemDetailPage from './pages/ItemDetailPage';
import CheckoutPage from './pages/CheckoutPage';
import OrderConfirmPage from './pages/OrderConfirmPage';
import OrderHistoryPage from './pages/OrderHistoryPage';
import FavoritesPage from './pages/FavoritesPage';
import AccountPage from './pages/AccountPage';
import type { ReactNode } from 'react';

// AuthGuard: hard wall — must be signed in
function Guard({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div style={{ display:'flex', justifyContent:'center', alignItems:'center', minHeight:'100vh', background:'var(--bg)', color:'var(--text-muted)', fontSize:14 }}>
      Loading…
    </div>
  );
  if (!user) return <Navigate to="/auth" replace />;
  return <>{children}</>;
}

// BrowseGuard: allows guests to browse; only blocks at checkout/account actions
function BrowseGuard({ children }: { children: ReactNode }) {
  const { loading } = useAuth();
  if (loading) return (
    <div style={{ display:'flex', justifyContent:'center', alignItems:'center', minHeight:'100vh', background:'var(--bg)', color:'var(--text-muted)', fontSize:14 }}>
      Loading…
    </div>
  );
  return <>{children}</>;
}

function Shell() {
  const { user } = useAuth();
  useNotifications(user?.id ?? null);
  return (
    <Routes>
      <Route path="/auth" element={user ? <Navigate to="/stores" replace /> : <AuthPage />} />
      {/* Guest-accessible: browse stores and menu */}
      <Route path="/stores" element={<BrowseGuard><CartProvider><StoreSelectorPage /></CartProvider></BrowseGuard>} />
      <Route path="/menu/:storeId" element={<BrowseGuard><CartProvider><MenuPage /></CartProvider></BrowseGuard>} />
      <Route path="/menu/:storeId/item/:itemId" element={<BrowseGuard><CartProvider><ItemDetailPage /></CartProvider></BrowseGuard>} />
      {/* Auth required: checkout and account actions */}
      <Route path="/checkout/:storeId" element={<Guard><CartProvider><CheckoutPage /></CartProvider></Guard>} />
      <Route path="/order/:orderId" element={<Guard><CartProvider><OrderConfirmPage /></CartProvider></Guard>} />
      <Route path="/orders" element={<Guard><CartProvider><OrderHistoryPage /></CartProvider></Guard>} />
      <Route path="/favorites" element={<Guard><FavoritesPage /></Guard>} />
      <Route path="/account" element={<Guard><AccountPage /></Guard>} />
      <Route path="*" element={<Navigate to="/stores" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Shell />
      </BrowserRouter>
    </AuthProvider>
  );
}
