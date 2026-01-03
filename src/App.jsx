import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import Login from './pages/Auth/Login/Login'
import Register from './pages/Auth/Register/Register'
import Dashboard from './pages/Dashboard/Dashboard'
import NotesFlow from './components/Notes/NotesFlow'
import ChangePassword from './pages/Auth/ChangePassword/ChangePassword'
import ChatWidget from './components/chat/ChatWidget'
import { ChangePasswordGate, VerifiedRoute } from './auth/RouteGuards'

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
          <Route
            path="/login"
            element={
              showRegister ? (
                <Register onSwitchToLogin={() => setShowRegister(false)} />
              ) : (
                <Login onSwitchToRegister={() => setShowRegister(true)} />
              )
            }
          />

          <Route
            path="/"
            element={<Navigate to="/dashboard" replace />}
          />

          <Route element={<ChangePasswordGate />}>
            <Route path="/change-password" element={<ChangePassword />} />
          </Route>

          <Route element={<VerifiedRoute />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/editor/:id" element={<NotesFlow />} />
            <Route path="/editor/new" element={<NotesFlow />} />
          </Route>

          {/* Hatalı URL */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>

        <ChatWidget />
      </div>
    </BrowserRouter>
  )
}

export default App