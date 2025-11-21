import { useState } from 'react'
import { API_ROUTES } from '../../../config/apiConfig'

function Register({ onSwitchToLogin }) {
  // Backend DTO'su ile uyumlu form yapısı
  const [formData, setFormData] = useState({
    fullName: '', // Backend tek bir 'FullName' bekliyor
    email: '',
    password: '',
    confirmPassword: ''
  })

  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleRegister = async (e) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    // 1. İstemci Tarafı Doğrulamaları
    if (formData.password !== formData.confirmPassword) {
      setError('Şifreler birbiriyle eşleşmiyor!')
      return
    }

    if (formData.password.length < 6) {
        setError('Şifre en az 6 karakter olmalıdır.')
        return
    }

    setIsLoading(true)

    try {
      // 2. Backend'e İstek At (Merkezi Config'den URL alarak)
      const response = await fetch(API_ROUTES.AUTH.REGISTER, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fullName: formData.fullName, // Ad Soyad birleşik gidiyor
          email: formData.email,
          password: formData.password
          // confirmPassword'ü backend'e göndermiyoruz
        }),
      })

      // 3. Hata Kontrolü
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        
        // Identity'den gelen hata dizisini (errors) tek bir stringe çevirelim
        let errorMessage = errorData.message || 'Kayıt işlemi başarısız.'
        if (errorData.errors && Array.isArray(errorData.errors)) {
            errorMessage = errorData.errors.join(' ');
        }
        
        throw new Error(errorMessage)
      }

      // 4. Başarılı Kayıt
      setSuccess('Kayıt başarıyla tamamlandı! Giriş ekranına yönlendiriliyorsunuz...')
      
      // 2 saniye sonra otomatik olarak giriş ekranına geçiş
      setTimeout(() => {
        onSwitchToLogin()
      }, 2000)

    } catch (err) {
      console.error('Register hatası:', err)
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
            Hesap Oluştur
          </h1>
          <p className="text-slate-600 text-sm">
            Yeni hesap oluşturun ve başlayın
          </p>
        </div>

        {/* Hata Mesajı */}
        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-200 text-red-700 rounded-lg text-sm flex items-center gap-2">
             <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"/></svg>
             <span>{error}</span>
          </div>
        )}

        {/* Başarı Mesajı */}
        {success && (
          <div className="mb-4 p-3 bg-green-100 border border-green-200 text-green-700 rounded-lg text-sm flex items-center gap-2">
             <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/></svg>
             <span>{success}</span>
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-4">
          
          {/* Ad Soyad (Tek Alan) */}
          <div>
            <label 
              htmlFor="fullName" 
              className="block text-sm font-semibold text-slate-700 mb-2"
            >
              Ad Soyad
            </label>
            <input
              id="fullName"
              name="fullName"
              type="text"
              value={formData.fullName}
              onChange={handleChange}
              placeholder="Adınız ve Soyadınız"
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-none transition-all duration-200 bg-white"
              required
            />
          </div>

          {/* Email */}
          <div>
            <label 
              htmlFor="email" 
              className="block text-sm font-semibold text-slate-700 mb-2"
            >
              E-posta
            </label>
            <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" /></svg>
                </div>
                <input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="ornek@sirket.com"
                    className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-none transition-all duration-200 bg-white"
                    required
                />
            </div>
          </div>

          {/* Şifreler Yan Yana (Grid) */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label 
                htmlFor="password" 
                className="block text-sm font-semibold text-slate-700 mb-2"
              >
                Şifre
              </label>
              <input
                id="password"
                name="password"
                type="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="********"
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-none transition-all duration-200 bg-white"
                required
              />
            </div>

            <div>
              <label 
                htmlFor="confirmPassword" 
                className="block text-sm font-semibold text-slate-700 mb-2"
              >
                Şifre Tekrar
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="********"
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-none transition-all duration-200 bg-white"
                required
              />
            </div>
          </div>

          <div className="pt-2 space-y-3">
            <button
              type="submit"
              disabled={isLoading}
              className={`w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold py-3 rounded-lg shadow-lg transition-all duration-200 transform hover:scale-[1.02] hover:shadow-xl flex justify-center items-center gap-2 ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Kaydediliyor...
                </>
              ) : (
                'Hesap Oluştur'
              )}
            </button>
          </div>

          <div className="pt-4 border-t border-slate-200">
            <p className="text-xs text-center text-slate-500 mb-3">
              Zaten hesabınız var mı?
            </p>
            <button
              type="button"
              onClick={onSwitchToLogin}
              className="w-full text-blue-600 hover:text-blue-700 font-semibold text-sm transition-colors duration-200"
            >
              Giriş Yap
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default Register