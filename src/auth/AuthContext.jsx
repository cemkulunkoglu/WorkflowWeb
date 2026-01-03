import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
import { jwtDecode } from "jwt-decode";
import { authStorage } from "./authStorage";
import { AuthService } from "./authService";

const AuthContext = createContext(null);

function truthyFlag(v) {
  if (v === true) return true;
  if (v === 1) return true;
  const s = String(v ?? "").trim().toLowerCase();
  return s === "true" || s === "1";
}

function computeIsAdmin(token) {
  if (!token) return false;

  try {
    const decoded = jwtDecode(token);

    // Backend custom claim'leri: isAdmin / isDesigner (True/False)
    const rawIsAdmin = decoded?.isAdmin ?? decoded?.["isAdmin"];
    const rawIsDesigner = decoded?.isDesigner ?? decoded?.["isDesigner"];

    if (truthyFlag(rawIsAdmin) || truthyFlag(rawIsDesigner)) return true;

    const role =
      decoded?.role ||
      decoded?.roles ||
      decoded?.["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"];

    const roles = Array.isArray(role) ? role : role ? [role] : [];
    return roles.some((r) => String(r).toLowerCase() === "admin");
  } catch {
    return false;
  }
}

function computeIsDesigner(token) {
  if (!token) return false;
  try {
    const decoded = jwtDecode(token);
    const rawIsDesigner = decoded?.isDesigner ?? decoded?.["isDesigner"];
    return truthyFlag(rawIsDesigner);
  } catch {
    return false;
  }
}

function readInitialState() {
  const token = authStorage.getToken();
  const user = authStorage.getUser();
  // Eski kayıtlar USER_KEY altında isVerified taşımıyor olabilir.
  // Kural: sadece açıkça false geldiyse verified değildir; aksi durumda verified kabul et.
  // (Unverified gate zaten login response'unda isVerified=false ile çalışır.)
  const isVerified = token ? user?.isVerified !== false : false;
  const isAdmin = computeIsAdmin(token);
  const isDesigner = computeIsDesigner(token);
  return { token, user, isVerified, isAdmin, isDesigner };
}

export function AuthProvider({ children }) {
  const initial = useMemo(() => readInitialState(), []);
  const [token, setToken] = useState(initial.token);
  const [user, setUser] = useState(initial.user);
  const [isVerified, setIsVerified] = useState(initial.isVerified);
  const [isAdmin, setIsAdmin] = useState(initial.isAdmin);
  const [isDesigner, setIsDesigner] = useState(initial.isDesigner);

  const logout = useCallback(() => {
    authStorage.clearAll();
    setToken("");
    setUser(null);
    setIsVerified(false);
    setIsAdmin(false);
    setIsDesigner(false);
  }, []);

  const login = useCallback(async ({ userNameOrEmail, password, rememberMe }) => {
    const data = await AuthService.login({ userNameOrEmail, password });

    authStorage.setToken(data.token, rememberMe);
    authStorage.setUser(
      {
        userId: data.userId,
        email: data.email,
        fullName: data.fullName,
        isVerified: data.isVerified,
      },
      rememberMe
    );

    setToken(data.token);
    setUser({
      userId: data.userId,
      email: data.email,
      fullName: data.fullName,
      isVerified: data.isVerified,
    });
    setIsVerified(Boolean(data.isVerified));
    setIsAdmin(computeIsAdmin(data.token));
    setIsDesigner(computeIsDesigner(data.token));

    return data;
  }, []);

  const value = useMemo(
    () => ({
      token,
      user,
      isVerified,
      isAdmin,
      isDesigner,
      login,
      logout,
    }),
    [token, user, isVerified, isAdmin, isDesigner, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}


