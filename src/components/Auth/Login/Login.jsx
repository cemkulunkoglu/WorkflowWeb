import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

function Login({ onSwitchToRegister }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const navigate = useNavigate()

  const handleLogin = (e) => {
    e.preventDefault()
    // Giriş yap işlemi buraya eklenecek
    console.log('Giriş yapılıyor:', { username, password })
    // Dashboard'a yönlendir
    navigate('/dashboard')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
      
      <div className="relative bg-white/95 backdrop-blur-sm rounded-xl shadow-2xl p-8 max-w-md w-full border border-slate-200">
        {/* Logo/Icon Alanı */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-800 mb-2">
            Workflow
          </h1>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label 
              htmlFor="username" 
              className="block text-sm font-semibold text-slate-700 mb-2"
            >
              Kullanıcı Adı
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg 
                  className="h-5 w-5 text-slate-400" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" 
                  />
                </svg>
              </div>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Kullanıcı adınızı girin"
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
                <svg 
                  className="h-5 w-5 text-slate-400" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" 
                  />
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

          <div className="pt-2 space-y-3">
            <button
              type="submit"
              className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold py-3 rounded-lg shadow-lg transition-all duration-200 transform hover:scale-[1.02] hover:shadow-xl"
            >
              Giriş Yap
            </button>
            
            <button
              type="button"
              onClick={onSwitchToRegister}
              className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-3 rounded-lg shadow transition-all duration-200 transform hover:scale-[1.02] border border-slate-200"
            >
              Kayıt Ol
            </button>
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

