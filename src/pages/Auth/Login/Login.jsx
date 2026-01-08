import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../../auth/AuthContext'
import { Button } from '@mui/material'
import { Alert } from '@mui/material'
import '../auth.css'

function Login({ onSwitchToRegister }) {
  const [userNameOrEmail, setUserNameOrEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(true)
  const [error, setError] = useState(null) // Hata mesajları için state
  const [isLoading, setIsLoading] = useState(false) // Yükleniyor durumu
  
  const navigate = useNavigate()
  const location = useLocation()
  const { login } = useAuth()

  const flash = location.state?.message

  const handleLogin = async (e) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      const data = await login({ userNameOrEmail, password, rememberMe })

      if (data?.isVerified === false) {
        navigate('/change-password', { replace: true })
        return
      }

      navigate('/dashboard', { replace: true })

    } catch (err) {
      console.error('Login hatası:', err)
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
      
      <div className="relative bg-white/95 backdrop-blur-sm rounded-xl shadow-2xl p-8 max-w-md w-full border border-slate-200">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-800 mb-2">
            Workflow
          </h1>
          <p className="text-slate-500 text-sm">Giriş Yapın</p>
        </div>

        {flash && (
          <Alert severity="info" className="mb-4">
            {flash}
          </Alert>
        )}

        {/* Hata Mesajı Kutusu */}
        {error && (
          <Alert severity="error" className="mb-4">
            {error}
          </Alert>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label 
              htmlFor="email" 
              className="block text-sm font-semibold text-slate-700 mb-2"
            >
              Kullanıcı adı veya Email
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                </svg>
              </div>
              <input
                id="userNameOrEmail"
                type="text"
                value={userNameOrEmail}
                onChange={(e) => setUserNameOrEmail(e.target.value)}
                placeholder="kullaniciadi veya ornek@sirket.com"
                className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-none transition-all duration-200 bg-white"
                required
              />
            </div>
          </div>

          <div>
            <label 
              htmlFor="password" 
              className="block text-sm font-semibold text-slate-700 mb-2"
            >
              Şifre
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Şifrenizi girin"
                className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-none transition-all duration-200 bg-white"
                required
              />
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="h-4 w-4"
            />
            Beni hatırla
          </label>

          <div className="pt-2 space-y-3">
            <Button
              type="submit"
              variant="contained"
              fullWidth
              disabled={isLoading}
              className={`w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold py-3 rounded-lg shadow-lg transition-all duration-200 transform hover:scale-[1.02] hover:shadow-xl flex justify-center items-center gap-2 ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
              sx={{ textTransform: 'none' }}
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Giriş Yapılıyor...
                </>
              ) : (
                'Giriş Yap'
              )}
            </Button>
            
            <Button
              type="button"
              variant="outlined"
              fullWidth
              onClick={onSwitchToRegister}
              className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-3 rounded-lg shadow transition-all duration-200 transform hover:scale-[1.02] border border-slate-200"
              sx={{ textTransform: 'none' }}
            >
              Kayıt Ol
            </Button>
          </div>

          <div className="pt-4 border-t border-slate-200">
            <p className="text-xs text-center text-slate-500">
              Güvenli iş akışı yönetimi için tasarlandı
            </p>
          </div>
        </form>
      </div>
    </div>
  )
}

export default Login