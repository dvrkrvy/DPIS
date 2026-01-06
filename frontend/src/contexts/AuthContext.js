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

  const register = async (username) => {
    try {
      if (!username || username.trim().length < 3) {
        toast.error('Username must be at least 3 characters');
        return { success: false };
      }

      console.log('Attempting registration with username:', username);
      const res = await api.post('/api/auth/register', { username: username.trim() });
      console.log('Registration response:', res.data);
      
      const { token: newToken, user } = res.data;

      if (!newToken || !user) {
        console.error('Invalid response:', res.data);
        toast.error('Invalid response from server');
        return { success: false };
      }

      setToken(newToken);
      setUser(user);
      localStorage.setItem('token', newToken);
      console.log('Registration successful, token saved');

      return { success: true };
    } catch (err) {
      console.error('Registration error details:', {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status,
        config: {
          url: err.config?.url,
          baseURL: err.config?.baseURL
        }
      });
      
      const errorMessage = err.response?.data?.message || err.message || 'Registration failed';
      
      if (err.response?.status === 0 || err.message?.includes('Network Error') || err.message?.includes('CORS')) {
        toast.error('Cannot connect to server. Check your internet connection.');
      } else if (err.response?.status === 500) {
        toast.error(`Server error: ${errorMessage}`);
      } else {
        toast.error(errorMessage);
      }
      
      return { success: false };
    }
  };

  const login = async (username) => {
    try {
      if (!username || username.trim() === '') {
        toast.error('Please enter your username');
        return { success: false };
      }

      const res = await api.post('/api/auth/login', { username: username.trim() });
      const { token: newToken, user } = res.data;

      if (!newToken || !user) {
        toast.error('Invalid response from server');
        return { success: false };
      }

      setToken(newToken);
      setUser(user);
      localStorage.setItem('token', newToken);

      return { success: true };
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Login failed';
      console.error('Login error:', err);
      
      if (err.response?.status === 404) {
        toast.error('Username not found. Please check your username or create a new account.');
      } else if (err.response?.status === 403) {
        toast.error('Account is inactive. Please contact support.');
      } else {
        toast.error(errorMessage);
      }
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
