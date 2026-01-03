import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { AuthService } from "../../../auth/authService";
import { useAuth } from "../../../auth/AuthContext";
import "../auth.css";

export default function ChangePassword() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuth();

  const flash = location.state?.message;

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setInfo("");
    setIsLoading(true);
    try {
      const res = await AuthService.changePassword({ currentPassword, newPassword });
      if (res?.forceReLogin) {
        logout();
        navigate("/login", {
          replace: true,
          state: { message: "Şifre değişti. Lütfen yeniden giriş yapın." },
        });
        return;
      }
      setInfo(res?.message || "Şifre değiştirildi.");
    } catch (err) {
      setError(err?.message || "Şifre değiştirilemedi.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-grid-pattern opacity-5" />

      <div className="relative bg-white/95 backdrop-blur-sm rounded-xl shadow-2xl p-8 max-w-md w-full border border-slate-200">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-slate-800 mb-1">Şifre Değiştir</h1>
          <p className="text-slate-500 text-sm">Hesabınızı doğrulamak için şifrenizi güncelleyin.</p>
        </div>

        {flash ? (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 text-blue-700 rounded-lg text-sm">
            {flash}
          </div>
        ) : null}

        {error ? (
          <div className="mb-4 p-3 bg-red-100 border border-red-200 text-red-700 rounded-lg text-sm">
            {error}
          </div>
        ) : null}

        {info ? (
          <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg text-sm">
            {info}
          </div>
        ) : null}

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Mevcut Şifre</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-none bg-white"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Yeni Şifre</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-none bg-white"
              required
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className={`w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold py-3 rounded-lg shadow-lg transition-all duration-200 flex justify-center items-center gap-2 ${
              isLoading ? "opacity-70 cursor-not-allowed" : "hover:from-blue-700 hover:to-blue-800"
            }`}
          >
            {isLoading ? "Kaydediliyor..." : "Şifreyi Güncelle"}
          </button>
        </form>
      </div>
    </div>
  );
}


