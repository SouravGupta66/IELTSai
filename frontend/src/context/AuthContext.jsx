// frontend/src/context/AuthContext.jsx
import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

const API_URL = 'http://localhost:8000/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  // A token surviving a refresh (via localStorage) doesn't mean `user` does -
  // React state resets on every reload. Without this, isAuthenticated stays
  // true (token present) while `user` is null, and every page's
  // `user?.id || <placeholder>` silently falls back to the placeholder UUID.
  const [authLoading, setAuthLoading] = useState(!!localStorage.getItem('token'));

  const register = useCallback(async (name, email, password, target_Band) => {
    const response = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: name,
        email: email,
        password: password,
        target_band: target_Band  // Must match backend field name
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Register error:', errorData);
      throw new Error(
        errorData.detail?.[0]?.msg || 
        errorData.detail || 
        'Registration failed'
      );
    }

    const data = await response.json();
    
    // Optionally auto-login after register
    // setToken(data.access_token);
    // localStorage.setItem('token', data.access_token);
    // setUser(data.user);
    
    return data;
  }, []);

  const login = useCallback(async (email, password) => {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: email,
        password: password,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || 'Login failed');
    }

    const data = await response.json();
    setToken(data.access_token);
    localStorage.setItem('token', data.access_token);
    setUser(data.user);
    return data;
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
  }, []);

  const getMe = useCallback(async () => {
    if (!token) return;
    
    const response = await fetch(`${API_URL}/auth/me`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        logout();
      }
      throw new Error('Failed to get user');
    }

    const data = await response.json();
    setUser(data);
    return data;
  }, [token, logout]);

  // Restore the real user on mount / whenever a token exists but user isn't loaded yet
  // (e.g. after a page refresh, where only the token survives in localStorage).
  useEffect(() => {
    if (token && !user) {
      getMe()
        .catch(() => {})
        .finally(() => setAuthLoading(false));
    } else {
      setAuthLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const value = {
    user,
    token,
    register,
    login,
    logout,
    getMe,
    isAuthenticated: !!token,
    authLoading,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};