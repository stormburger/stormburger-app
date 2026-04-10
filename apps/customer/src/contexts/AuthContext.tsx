import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { getMe, signout, clearTokens, getToken } from '../services/api';

interface User { id: string; email: string; role: string; display_name: string; }
interface AuthCtx { user: User | null; setUser: (u: User | null) => void; logout: () => Promise<void>; loading: boolean; }

const Ctx = createContext<AuthCtx>({} as AuthCtx);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!getToken()) { setLoading(false); return; }
    getMe().then(data => {
      if (data?.user) setUser({ id: data.user.id, email: data.user.email, role: data.user.role ?? 'customer', display_name: data.display_name ?? data.profile?.display_name ?? data.user.email });
    }).catch(() => clearTokens()).finally(() => setLoading(false));
  }, []);

  const logout = async () => { await signout(); setUser(null); };
  return <Ctx.Provider value={{ user, setUser, logout, loading }}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);
