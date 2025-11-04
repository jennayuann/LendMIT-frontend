import axios from 'axios'

// In production (Render), VITE_API_BASE_URL will be set to your deployed backend URL.
// In local dev, we default to '/api' so Vite's proxy (vite.config.ts) forwards to localhost:8000.
const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api'

export const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
})
