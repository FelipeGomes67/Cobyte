import { useCallback, useMemo, useState } from 'react';
import { getSessionUser, registerUser, signIn, signOut } from '../services/authService';
import { AuthContext } from './authContext';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(getSessionUser);
  const [loading, setLoading] = useState(false);

  const login = useCallback(async (email, password) => {
    setLoading(true);
    try {
      const nextUser = await signIn(email, password);
      setUser(nextUser);
      return nextUser;
    } finally {
      setLoading(false);
    }
  }, []);

  const register = useCallback(async details => {
    setLoading(true);
    try {
      const nextUser = await registerUser(details);
      setUser(nextUser);
      return nextUser;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    signOut();
    setUser(null);
  }, []);

  const value = useMemo(() => ({ user, loading, login, register, logout }), [user, loading, login, register, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
