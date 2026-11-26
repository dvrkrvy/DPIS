import { createContext, useContext, useState } from 'react';
import { authApi } from '../services/api';

const AuthContext = createContext(null);

const readStoredUser = () => {
  try {
    const raw = localStorage.getItem('dpis_user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('dpis_token'));
  const [user, setUser] = useState(readStoredUser);

  const login = async (email, password) => {
    const data = await authApi.login({ email, password });
    localStorage.setItem('dpis_token', data.token);
    localStorage.setItem('dpis_user', JSON.stringify(data.user));
    setToken(data.token);
    setUser(data.user);
    return data.user;
  };

  const register = async (payload) => {
    return authApi.register(payload);
  };

  const logout = () => {
    localStorage.removeItem('dpis_token');
    localStorage.removeItem('dpis_user');
    setToken(null);
    setUser(null);
  };

  const updateSession = ({ token: nextToken, user: nextUser }) => {
    if (nextToken) {
      localStorage.setItem('dpis_token', nextToken);
      setToken(nextToken);
    }
    if (nextUser) {
      localStorage.setItem('dpis_user', JSON.stringify(nextUser));
      setUser(nextUser);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: Boolean(token && user),
        login,
        register,
        logout,
        updateSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};
