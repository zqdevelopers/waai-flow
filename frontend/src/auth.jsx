import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import api, { authStorageKey } from './api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(() => localStorage.getItem(authStorageKey));
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('waai.auth.user') || 'null');
    } catch {
      return null;
    }
  });

  useEffect(() => {
    const onExpired = () => {
      setToken(null);
      setUser(null);
    };
    window.addEventListener('waai:auth-expired', onExpired);
    return () => window.removeEventListener('waai:auth-expired', onExpired);
  }, []);

  const login = async (username, password) => {
    const res = await api.post('/auth/login', { username, password });
    localStorage.setItem(authStorageKey, res.data.token);
    localStorage.setItem('waai.auth.user', JSON.stringify(res.data.user));
    setToken(res.data.token);
    setUser(res.data.user);
    return res.data.user;
  };

  const logout = () => {
    localStorage.removeItem(authStorageKey);
    localStorage.removeItem('waai.auth.user');
    setToken(null);
    setUser(null);
  };

  const value = useMemo(() => ({ token, user, isAuthenticated: Boolean(token), login, logout }), [token, user]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);

export const RequireAuth = ({ children }) => {
  const auth = useAuth();
  const location = useLocation();
  if (!auth?.isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return children;
};
