import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useState } from 'react'
import Login from './components/Auth/Login/Login'
import Register from './components/Auth/Register/Register'
import Dashboard from './components/Dashboard/Dashboard'
import NotesFlow from './components/Notes/NotesFlow' // Editör bileşeni
import { TOKEN_KEY } from './config/apiConfig'

// 🛡️ Güvenlik Bileşeni (Giriş yapmamışsa Login'e atar)
const RequireAuth = ({ children }) => {
  const token = localStorage.getItem(TOKEN_KEY);
  const location = useLocation();

  if (!token) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }
  return children;
};

function App() {
  const [showRegister, setShowRegister] = useState(false)

  return (
    <BrowserRouter>
      <Routes>
        {/* PUBLIC ROTALAR (Herkes girebilir) */}
        <Route 
          path="/" 
          element={
            showRegister ? (
              <Register onSwitchToLogin={() => setShowRegister(false)} />
            ) : (
              <Login onSwitchToRegister={() => setShowRegister(true)} />
            )
          } 
        />

        {/* PRIVATE ROTALAR (Sadece Token'ı olan girebilir) */}
        
        {/* 1. Ana Dashboard */}
        <Route 
          path="/dashboard" 
          element={
            <RequireAuth>
              <Dashboard />
            </RequireAuth>
          } 
        />

        {/* 2. Editör Sayfası (Yeni veya Düzenleme) */}
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

        {/* Hatalı URL girilirse başa dön */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App