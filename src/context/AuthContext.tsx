import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserAccount } from '../types';

interface AuthContextType {
  user: UserAccount;
  isDemo: boolean;
  login: (email: string, password?: string) => void;
  signup: (name: string, email: string, password?: string) => void;
  logout: () => void;
  toggleWatchlist: (symbol: string) => void;
  isInWatchlist: (symbol: string) => boolean;
  openAuthModal: (mode?: 'login' | 'signup') => void;
  closeAuthModal: () => void;
  authModalOpen: boolean;
  authModalTab: 'login' | 'signup';
}

const STORAGE_KEY = 'sentrune_user_session_v1';

const GUEST_DEMO_USER: UserAccount = {
  id: 'guest_demo',
  name: 'Guest Trader (Demo)',
  email: 'guest@demo.sentrune',
  role: 'guest',
  tier: 'demo',
  watchlist: ['AAPL', 'BTC'],
  createdAt: new Date().toISOString()
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserAccount>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {}
    return GUEST_DEMO_USER;
  });

  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalTab, setAuthModalTab] = useState<'login' | 'signup'>('signup');

  const isDemo = user.tier === 'demo' || user.role === 'guest';

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    } catch {}
  }, [user]);

  const login = (email: string, _password?: string) => {
    const registeredUser: UserAccount = {
      id: `usr_${Date.now()}`,
      name: email.split('@')[0] || 'Trader',
      email: email.trim(),
      role: 'registered',
      tier: 'full',
      watchlist: user.watchlist.length > 0 ? user.watchlist : ['AAPL', 'MSFT', 'BTC', 'ETH'],
      createdAt: new Date().toISOString()
    };
    setUser(registeredUser);
    setAuthModalOpen(false);
  };

  const signup = (name: string, email: string, _password?: string) => {
    const newUser: UserAccount = {
      id: `usr_${Date.now()}`,
      name: name.trim() || email.split('@')[0],
      email: email.trim(),
      role: 'registered',
      tier: 'full',
      watchlist: ['AAPL', 'MSFT', 'BTC', 'ETH', 'NVDA'],
      createdAt: new Date().toISOString()
    };
    setUser(newUser);
    setAuthModalOpen(false);
  };

  const logout = () => {
    setUser(GUEST_DEMO_USER);
  };

  const toggleWatchlist = (symbol: string) => {
    setUser(prev => {
      const exists = prev.watchlist.includes(symbol);
      const updated = exists
        ? prev.watchlist.filter(s => s !== symbol)
        : [...prev.watchlist, symbol];
      return { ...prev, watchlist: updated };
    });
  };

  const isInWatchlist = (symbol: string) => user.watchlist.includes(symbol);

  const openAuthModal = (mode: 'login' | 'signup' = 'signup') => {
    setAuthModalTab(mode);
    setAuthModalOpen(true);
  };

  const closeAuthModal = () => {
    setAuthModalOpen(false);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isDemo,
        login,
        signup,
        logout,
        toggleWatchlist,
        isInWatchlist,
        openAuthModal,
        closeAuthModal,
        authModalOpen,
        authModalTab
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
