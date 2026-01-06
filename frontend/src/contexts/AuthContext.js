import React, { createContext, useState, useEffect, useContext } from 'react';
import api from '../api/axios';
import toast from 'react-hot-toast';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem('token'));

  useEffect(() => {
    if (token) {
      verifyToken();
    } else {
      setLoading(false);
    }
  }, [token]);

  const verifyToken = async () => {
    try {
      const res = await api.get('/api/auth/verify', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.data.valid) {
        setUser(res.data.user);
      } else {
        logout();
      }
    } catch {
      logout();
    } finally {
      setLoading(false);
    }
  };

  const register = async () => {
    try {
      const res = await api.post('/api/auth/register');
      const { token: newToken, user } = res.data;

      setToken(newToken);
      setUser(user);
      localStorage.setItem('token', newToken);

      return { success: true };
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed');
      return { success: false };
    }
  };

  const login = async (anonymousId) => {
    try {
      const res = await api.post('/api/auth/login', { anonymousId });
      const { token: newToken, user } = res.data;

      setToken(newToken);
      setUser(user);
      localStorage.setItem('token', newToken);

      return { success: true };
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed');
      return { success: false };
    }
  };

  const adminLogin = async (email, password) => {
    try {
      const res = await api.post('/api/auth/admin/login', { email, password });
      const { token: newToken, admin } = res.data;

      setToken(newToken);
      setUser({ ...admin, role: 'admin' });
      localStorage.setItem('token', newToken);

      return { success: true };
    } catch (err) {
      toast.error(err.response?.data?.message || 'Admin login failed');
      return { success: false };
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        register,
        login,
        adminLogin,
        logout,
        isAuthenticated: !!user,
        isAdmin: user?.role === 'admin'
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
