import { createContext, useContext, useEffect, useState } from "react";
import api from "../api/axios";

const AuthContext = createContext(null);

const STORAGE_KEY = "shopnest_user";

function loadUser() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return stored?.token ? stored : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(loadUser);

  useEffect(() => {
    try {
      if (user) localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
      else localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* storage blocked — session lasts until the tab closes */
    }
  }, [user]);

  // A stored token can expire (30 days) or be revoked; drop it when the API says so.
  useEffect(() => {
    const id = api.interceptors.response.use(undefined, (err) => {
      const msg = err.response?.data?.message || "";
      if (err.response?.status === 401 && msg.startsWith("Not authorized")) setUser(null);
      return Promise.reject(err);
    });
    return () => api.interceptors.response.eject(id);
  }, []);

  const login = async (email, password) => {
    const { data } = await api.post("/auth/login", { email, password });
    setUser(data);
    return data;
  };

  const register = async ({ firstName, lastName, email, password, acceptsMarketing }) => {
    const { data } = await api.post("/auth/register", { firstName, lastName, email, password, acceptsMarketing });
    setUser(data);
    return data;
  };

  const requestPasswordReset = (email) => api.post("/auth/forgot-password", { email }).then((res) => res.data);

  const resetPassword = async (token, password) => {
    const { data } = await api.post("/auth/reset-password", { token, password });
    setUser(data);
    return data;
  };

  const logout = () => setUser(null);

  // Keep the cached session in sync after profile edits (e.g. name change).
  const updateUser = (patch) => setUser((u) => (u ? { ...u, ...patch } : u));

  return (
    <AuthContext.Provider value={{ user, login, register, requestPasswordReset, resetPassword, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
