import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useState, useEffect } from 'react'
import Login from './pages/Auth/Login/Login'
import Register from './pages/Auth/Register/Register'
import Dashboard from './pages/Dashboard/Dashboard'
import NotesFlow from './components/Notes/NotesFlow'
import { TOKEN_KEY } from './config/apiConfig'
import ChatWidget from './components/chat/ChatWidget'

// 🛡️ Güvenlik Bileşeni
const RequireAuth = ({ children }) => {
  const token = localStorage.getItem(TOKEN_KEY);
  const location = useLocation();

  if (!token) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }
  return children;
};

// 🔄 Giriş Yapmış Kullanıcıyı Login Ekranından Uzak Tutma Bileşeni
const RedirectIfAuthenticated = ({ children }) => {
  const token = localStorage.getItem(TOKEN_KEY);
  
  if (token) {
    // Eğer token varsa, Login veya Register sayfasına girmesin, Dashboard'a gitsin
    return <Navigate to="/dashboard" replace />;
  }
  return children;
};

function App() {
  const [showRegister, setShowRegister] = useState(false)
  const [isAuthChecked, setIsAuthChecked] = useState(false) // Başlangıç kontrolü için

  // Uygulama ilk açıldığında sadece bir kere çalışır
  useEffect(() => {
    // Burada token geçerliliğini backend'e sorabilirsin (Opsiyonel ama önerilir)
    // Şimdilik sadece varlığına bakıyoruz.
    setIsAuthChecked(true);
  }, []);

  if (!isAuthChecked) {
    return <div className="flex items-center justify-center h-screen">Yükleniyor...</div>; // Basit bir loader
  }

  return (
    <BrowserRouter>
      <div className="relative min-h-screen">
        <Routes>
          {/* PUBLIC ROTALAR (Giriş yapmışsa Dashboard'a atar) */}
          <Route 
            path="/" 
            element={
              <RedirectIfAuthenticated>
                {showRegister ? (
                  <Register onSwitchToLogin={() => setShowRegister(false)} />
                ) : (
                  <Login onSwitchToRegister={() => setShowRegister(true)} />
                )}
              </RedirectIfAuthenticated>
            } 
          />

          {/* PRIVATE ROTALAR (Sadece Token'ı olan girebilir) */}
          <Route 
            path="/dashboard" 
            element={
              <RequireAuth>
                <Dashboard />
              </RequireAuth>
            } 
          />


          <Route 
            path="/editor/:id" 
            element={
              <RequireAuth>
                <NotesFlow />
              </RequireAuth>
            } 
          />
          <Route 
            path="/editor/new" 
            element={
              <RequireAuth>
                <NotesFlow />
              </RequireAuth>
            } 
          />

          {/* Hatalı URL */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>

        <ChatWidget />
      </div>
    </BrowserRouter>
  )
}

export default App