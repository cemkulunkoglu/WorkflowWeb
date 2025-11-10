import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useState } from 'react'
import Login from './components/Auth/Login/Login'
import Register from './components/Auth/Register/Register'
import Dashboard from './components/Dashboard/Dashboard'

function App() {
  const [showRegister, setShowRegister] = useState(false)

  return (
    <BrowserRouter>
      <Routes>
        <Route 
          path="/" 
          element={
            showRegister ? (
              <Register onSwitchToLogin={() => setShowRegister(false)} />
            ) : (
              <Login 
                onSwitchToRegister={() => setShowRegister(true)}
              />
            )
          } 
        />
        <Route 
          path="/dashboard" 
          element={<Dashboard />} 
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App

