import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [streakPopup, setStreakPopup] = useState(null); // { streak, coinsAwarded } | null

  const refreshProfile = useCallback(async () => {
    try {
      const { user, inventory } = await api.me();
      setUser(user);
      setInventory(inventory);
      return user;
    } catch (e) {
      setUser(null);
      setInventory([]);
      return null;
    }
  }, []);

  useEffect(() => {
    (async () => {
      const token = localStorage.getItem('arcade_token');
      if (token) {
        const u = await refreshProfile();
        if (u) {
          // fire the daily streak check-in once we know who's logged in
          try {
            const result = await api.checkin();
            if (!result.alreadyCheckedInToday) {
              setStreakPopup(result);
            }
            setUser((prev) => (prev ? { ...prev, coins: result.coins, currentStreak: result.streak } : prev));
          } catch (e) {
            // non-fatal — streak check-in failing shouldn't block the app
          }
        }
      }
      setLoading(false);
    })();
  }, [refreshProfile]);

  async function login(email, password) {
    const { token, user } = await api.login({ email, password });
    localStorage.setItem('arcade_token', token);
    setUser(user);
    await refreshProfile();
  }

  async function register(username, email, password) {
    const { token, user } = await api.register({ username, email, password });
    localStorage.setItem('arcade_token', token);
    setUser(user);
    await refreshProfile();
  }

  function logout() {
    localStorage.removeItem('arcade_token');
    setUser(null);
    setInventory([]);
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        inventory,
        loading,
        login,
        register,
        logout,
        refreshProfile,
        streakPopup,
        clearStreakPopup: () => setStreakPopup(null),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
