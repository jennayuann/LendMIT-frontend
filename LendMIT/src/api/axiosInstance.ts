import axios from 'axios'

// In production (Render), VITE_API_BASE_URL will be set to your deployed backend URL.
// In local dev, we default to '/api' so Vite's proxy (vite.config.ts) forwards to localhost:8000.
const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api'

export const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
})

// Attach the authenticated user id (if present) to every request for backend authorization checks
api.interceptors.request.use((config) => {
  try {
    const raw = localStorage.getItem('auth_user')
    if (raw) {
      const parsed = JSON.parse(raw)
      const id = typeof parsed?.id === 'string' ? parsed.id : null
      if (id && id.trim().length > 0) {
        // Use a simple custom header to pass the user id to the backend
        config.headers = config.headers || {}
        ;(config.headers as any)['X-Auth-User'] = id
      }
    }
  } catch (_) {
    // ignore failures to read localStorage or parse JSON
  }
  return config
})
