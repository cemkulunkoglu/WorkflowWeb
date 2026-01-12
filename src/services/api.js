import axios from 'axios'

function getJwtToken() {
  // İstek: localStorage.getItem("token") örneğini baz al.
  // Repo uyumluluğu için birkaç fallback da ekliyoruz.
  return (
    localStorage.getItem('token') ||
    localStorage.getItem('auth_token') ||
    localStorage.getItem('accessToken') ||
    localStorage.getItem('jwt') ||
    null
  )
}

function createApiClient(baseURL) {
  const client = axios.create({
    baseURL,
    headers: { 'Content-Type': 'application/json' },
  })

  client.interceptors.request.use(
    (config) => {
      const token = getJwtToken()
      if (token) {
        config.headers = config.headers || {}
        config.headers.Authorization = `Bearer ${token}`
      }
      return config
    },
    (error) => Promise.reject(error)
  )

  client.interceptors.response.use(
    (response) => response,
    (error) => {
      // ÖNEMLİ: 401'de /login'e yönlendirme yapmıyoruz.
      // Mevcut route guard (AdminRoute/VerifiedRoute) bu durumu zaten yönetiyor.
      return Promise.reject(error)
    }
  )

  return client
}

// Env isimleri:
// - İstek: VITE_AUTH_API_URL / VITE_WORKFLOW_API_URL
// - Repo'da ayrıca: VITE_WORKFLOW_API_BASE_URL kullanılıyor
export const workflowApi = createApiClient(
  import.meta.env.VITE_WORKFLOW_API_URL ||
    import.meta.env.VITE_WORKFLOW_API_BASE_URL ||
    'https://localhost:7071'
)

export const authApi = createApiClient(
  import.meta.env.VITE_AUTH_API_URL || 'https://localhost:7130'
)

