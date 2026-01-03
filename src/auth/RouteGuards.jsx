import React from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "./AuthContext";

export function ProtectedRoute() {
  const { token } = useAuth();
  const location = useLocation();
  if (!token) return <Navigate to="/login" replace state={{ from: location }} />;
  return <Outlet />;
}

export function VerifiedRoute() {
  const { token, isVerified } = useAuth();
  const location = useLocation();
  if (!token) return <Navigate to="/login" replace state={{ from: location }} />;
  if (!isVerified) return <Navigate to="/change-password" replace state={{ from: location }} />;
  return <Outlet />;
}

export function AdminRoute() {
  const { token, isVerified, isAdmin } = useAuth();
  const location = useLocation();
  if (!token) return <Navigate to="/login" replace state={{ from: location }} />;
  if (!isVerified) return <Navigate to="/change-password" replace state={{ from: location }} />;
  if (!isAdmin) return <Navigate to="/dashboard" replace />;
  return <Outlet />;
}

export function ChangePasswordGate() {
  // Bu ekran sadece token var ama verified değilken anlamlı.
  const { token, isVerified } = useAuth();
  const location = useLocation();
  if (!token) return <Navigate to="/login" replace state={{ from: location }} />;
  if (isVerified) return <Navigate to="/dashboard" replace />;
  return <Outlet />;
}


