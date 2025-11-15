import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import apiClient from '../services/ApiClient';
import { globalEventBus } from '../utils/EventBus';

const AuthContext = createContext(null);

const TOKEN_STORAGE_KEY = 'society-connect-token';
const USER_STORAGE_KEY = 'society-connect-user';

const normalizeUser = (rawUser) => {
  if (!rawUser) return null;
  return {
    ...rawUser,
    id: rawUser.id || rawUser._id,
  };
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const storedUser = localStorage.getItem(USER_STORAGE_KEY);
    return storedUser ? normalizeUser(JSON.parse(storedUser)) : null;
  });
  const [loading, setLoading] = useState(true);

  const logout = useCallback(async () => {
    try {
      await apiClient.request('/auth/logout', { method: 'POST' });
    } catch (error) {
      // ignore
    } finally {
      apiClient.clearToken();
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      localStorage.removeItem(USER_STORAGE_KEY);
      setUser(null);
      globalEventBus.emit('notify', { type: 'info', message: 'Logged out' });
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    try {
      const { data } = await apiClient.request('/auth/me');
      const normalized = normalizeUser(data.user);
      setUser(normalized);
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(normalized));
    } catch (error) {
      logout();
    } finally {
      setLoading(false);
    }
  }, [logout]);

  useEffect(() => {
    const storedToken = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (storedToken) {
      apiClient.setToken(storedToken);
      refreshProfile();
    } else {
      setLoading(false);
    }
  }, [refreshProfile]);

  const login = useCallback(async (email, password) => {
    const { data } = await apiClient.request('/auth/login', {
      method: 'POST',
      body: { email, password },
    });

    apiClient.setToken(data.token);
    localStorage.setItem(TOKEN_STORAGE_KEY, data.token);
    const normalized = normalizeUser(data.user);
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(normalized));
    setUser(normalized);
    globalEventBus.emit('notify', { type: 'success', message: 'Logged in successfully' });
    return data.user;
  }, []);

  const hasRole = useMemo(
    () => (roles = []) => {
      if (!user) return false;
      if (Array.isArray(roles)) {
        return roles.includes(user.role);
      }
      return user.role === roles;
    },
    [user],
  );

  const value = useMemo(
    () => ({
      user,
      setUser,
      loading,
      login,
      logout,
      refreshProfile,
      isAuthenticated: Boolean(user),
      hasRole,
    }),
    [user, loading, login, logout, refreshProfile, hasRole],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}

