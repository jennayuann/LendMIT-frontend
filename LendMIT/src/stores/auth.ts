import { defineStore } from 'pinia'
import { api } from '../api/axiosInstance'

type User = {
  id: string
  email: string
  firstName?: string | null
  lastName?: string | null
}

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null as User | null,
    loading: false as boolean,
    error: null as string | null,
    info: null as string | null,
  }),
  actions: {
    // Initialize user from localStorage on store creation
    init() {
      const stored = localStorage.getItem('auth_user')
      if (stored) {
        try {
          this.user = JSON.parse(stored)
        } catch {
          localStorage.removeItem('auth_user')
        }
      }
    },
    resetMessages() {
      this.error = null
      this.info = null
    },
    async login(email: string, password: string) {
      this.loading = true
      this.resetMessages()
      try {
        const res = await api.post('/UserAuthentication/login', { email, password })
        const data = res?.data || {}
        const apiError: string | undefined = data?.error
        if (apiError) {
          // If backend signals unverified status in an error, convert to a friendly message
          if (/status\s+is\s+UNVERIFIED|requires[^.]*VERIFIED/i.test(apiError)) {
            this.error = 'Your account is not verified yet. Please verify your email to log in.'
          } else if (/invalid\s+credentials/i.test(apiError)) {
            this.error = 'Invalid credentials'
          } else {
            this.error = apiError
          }
          throw new Error(this.error)
        }
        const userId = (data?.user ?? '') as string
        // Must have a concrete user id to treat as logged in
        if (typeof userId !== 'string' || userId.trim().length === 0) {
          this.error = 'Invalid credentials'
          throw new Error(this.error)
        }
        // If server includes a status, enforce VERIFIED-only
        const status: string | undefined = (data?.status ?? data?.accountStatus) as any
        if (status && String(status).toUpperCase() !== 'VERIFIED') {
          this.error = 'Your account is not verified yet. Please verify your email to log in.'
          throw new Error(this.error)
        }
        this.user = { id: userId, email }
        // Persist to localStorage
        localStorage.setItem('auth_user', JSON.stringify(this.user))
        this.info = 'Logged in successfully.'
      } catch (err: any) {
        const msg = err?.response?.data?.error || err?.message || 'Login failed'
        // Normalize generic backend message to concise copy where appropriate
        if (/invalid\s+credentials/i.test(msg)) {
          this.error = 'Invalid credentials'
        } else {
          this.error = msg
        }
        throw err
      } finally {
        this.loading = false
      }
    },
    async signup(email: string, password: string, firstName: string, lastName: string) {
      this.loading = true
      this.resetMessages()
      try {
        // 1) Create the auth user (status likely UNVERIFIED per spec)
        const reg = await api.post('/UserAuthentication/registerUser', { email, password })
        const userId = reg.data?.user as string

        // 2) Create the user profile with names
        await api.post('/UserProfile/createProfile', {
          user: userId,
          firstName,
          lastName,
          bio: null,
          thumbnail: null,
        })

        // 3) Optionally send a verification code so they can verify later
        try {
          await api.post('/UserAuthentication/sendVerificationCode', { user: userId, email })
        } catch (_) {
          // Non-fatal for initial signup UX
        }

        this.user = { id: userId, email, firstName, lastName }
        // Persist to localStorage
        localStorage.setItem('auth_user', JSON.stringify(this.user))
        this.info = 'Account created. Please check your email for a verification code.'
      } catch (err: any) {
        const msg = err?.response?.data?.error || err?.message || 'Sign up failed'
        this.error = msg
        throw err
      } finally {
        this.loading = false
      }
    },
    async resendVerification(userId: string, email: string) {
      this.loading = true
      this.resetMessages()
      try {
        // Try to revoke any existing active codes first (best-effort)
        try {
          await api.post('/UserAuthentication/revokeVerification', { user: userId })
        } catch (_) {
          // ignore; if none existed, that's fine
        }
        await api.post('/UserAuthentication/sendVerificationCode', { user: userId, email })
        this.info = 'Verification code sent.'
      } catch (err: any) {
        const msg: string =
          err?.response?.data?.error || err?.message || 'Failed to send verification code'
        // If backend says a code already exists and is unexpired, surface as info not error
        if (/unexpired verification code already exists/i.test(msg)) {
          this.info =
            'A code was already sent recently. Please use it or wait a minute before requesting a new one.'
          this.error = null
          return
        }
        this.error = msg
        throw err
      } finally {
        this.loading = false
      }
    },
    async verifyCode(userId: string, code: string) {
      this.loading = true
      this.resetMessages()
      try {
        const res = await api.post('/UserAuthentication/verifyCode', { user: userId, code })
        const verified = !!res.data?.verified
        if (verified) {
          this.info = 'Email verified. You can now log in.'
        } else {
          this.error = 'Invalid or expired verification code.'
        }
        return verified
      } catch (err: any) {
        const msg = err?.response?.data?.error || err?.message || 'Verification failed'
        this.error = msg
        throw err
      } finally {
        this.loading = false
      }
    },
    logout() {
      this.user = null
      localStorage.removeItem('auth_user')
      this.info = 'Logged out'
    },
  },
})
