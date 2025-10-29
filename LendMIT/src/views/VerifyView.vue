<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useAuthStore } from '../stores/auth'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const { loading, error, info } = storeToRefs(auth)

const userId = ref('')
const code = ref('')
const email = ref('')

onMounted(() => {
  userId.value = String(route.query.user || auth.user?.id || '')
  email.value = String(route.query.email || auth.user?.email || '')
  // We do NOT auto-resend anymore; a code was already sent during signup.
  // Show a friendly hint instead.
  if (userId.value && email.value) {
    auth.info = `We sent a verification code to ${email.value}. Enter it below. If you didn't get it, tap Resend.`
  }
})

async function onVerify(e: Event) {
  e.preventDefault()
  const ok = await auth.verifyCode(userId.value.trim(), code.value.trim())
  if (ok) {
    router.push('/login')
  }
}

async function resend() {
  const u = userId.value.trim() || auth.user?.id || ''
  const em = email.value.trim() || auth.user?.email || ''
  if (!u || !em) {
    // Surface a friendly hint via store info
    auth.info =
      'Missing user id or email. Please open the verification link from your email or sign up again.'
    return
  }
  try {
    await auth.resendVerification(u, em)
  } catch (e: any) {
    // If the backend refuses because an unexpired code exists, convert to info
    const msg = e?.response?.data?.error || String(e?.message || '')
    if (/unexpired verification code already exists/i.test(msg)) {
      auth.error = null
      auth.info =
        'A code was already sent recently. Please use it or wait a minute before requesting a new one.'
    } else {
      throw e
    }
  }
}
</script>

<template>
  <div class="page">
    <div class="card">
      <div class="brand-header">
        <h1 class="brand">LendMIT</h1>
        <p class="subtitle">Verify your email</p>
      </div>
      <p class="instructions">Enter the verification code we sent to your email.</p>
      <p v-if="info" class="info-msg">{{ info }}</p>
      <p v-if="error" class="text-error">{{ error }}</p>
      <form @submit="onVerify">
        <label>
          <span class="label-text">Verification code</span>
          <input
            type="text"
            v-model="code"
            required
            autocomplete="one-time-code"
            placeholder="Enter 6-digit code"
          />
        </label>
        <button type="submit" class="primary full-width" :disabled="loading || !userId">
          {{ loading ? 'Verifying…' : 'Verify' }}
        </button>
      </form>
      <div class="help">
        <span>Didn't get a code?</span>
        <button type="button" class="link-btn" :disabled="loading" @click="resend">
          Resend code
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.page {
  min-height: 100dvh;
  display: grid;
  place-items: center;
  background: linear-gradient(135deg, var(--color-bg) 0%, #e8ebf0 100%);
  padding: 1rem;
}
.card {
  width: min(440px, 94vw);
  background: #fff;
  padding: 2.5rem 2rem;
  border-radius: var(--radius-4);
  box-shadow: var(--shadow-2);
  border: 1px solid var(--color-border);
}
.brand-header {
  text-align: center;
  margin-bottom: 1.5rem;
}
.brand {
  font-family: 'Neue Haas Grotesk Display', var(--font-sans);
  margin: 0 0 0.25rem;
  font-size: 2.25rem;
  font-weight: 900;
  letter-spacing: -0.3px;
  background: linear-gradient(135deg, var(--color-accent-1) 0%, var(--color-accent-2) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
.subtitle {
  margin: 0;
  color: var(--color-text-secondary);
  font-size: 0.95rem;
}
.instructions {
  color: var(--color-text-secondary);
  margin: 0 0 1rem;
  text-align: center;
  font-size: 0.9rem;
}
.info-msg {
  color: var(--color-accent-2);
  background: rgba(62, 0, 107, 0.05);
  padding: 0.6rem 0.75rem;
  border-radius: var(--radius-2);
  margin-bottom: 1rem;
  font-size: 0.9rem;
}
form {
  display: grid;
  gap: 1rem;
}
/* Constrain and center the form so the verification input aligns under the brand */
form {
  max-width: 420px;
  margin: 0 auto;
  padding: 0 1.25rem;
}
label {
  display: grid;
  gap: 0.35rem;
}
.label-text {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--color-text-primary);
}
input {
  width: 100%;
  box-sizing: border-box;
  padding: 0.65rem 0.85rem;
  font-size: 0.95rem;
  text-align: center;
  letter-spacing: 0.5px;
}
.full-width {
  width: 100%;
  margin-top: 0.5rem;
}
.primary {
  /* Slightly larger, touch-friendly primary button for auth pages */
  padding: 0.85rem 1rem;
  font-size: 1rem;
  min-height: 48px;
  border-radius: var(--radius-4);
}
.help {
  margin-top: 1.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  font-size: 0.9rem;
  color: var(--color-text-secondary);
}
.link-btn {
  background: transparent;
  color: var(--color-accent-2);
  border: none;
  padding: 0;
  cursor: pointer;
  font-weight: 600;
  text-decoration: underline;
}
.link-btn:hover:not(:disabled) {
  color: var(--color-accent-1);
}
</style>
