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
      <h1>Verify your email</h1>
      <p>Enter the verification code we sent to your email.</p>
      <p v-if="info" class="info">{{ info }}</p>
      <p v-if="error" class="error">{{ error }}</p>
      <form @submit="onVerify">
        <label>
          Verification code
          <input type="text" v-model="code" required autocomplete="one-time-code" />
        </label>
        <button type="submit" :disabled="loading || !userId">
          {{ loading ? 'Verifying…' : 'Verify' }}
        </button>
      </form>
      <div class="help">
        <span>Didn't get a code?</span>
        <button type="button" class="link" :disabled="loading" @click="resend">Resend code</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.page {
  min-height: 100dvh;
  display: grid;
  place-items: center;
  background: #f7f7fb;
}
.card {
  width: min(640px, 94vw);
  background: #fff;
  padding: 2rem;
  border-radius: 16px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.08);
}
label {
  display: grid;
  gap: 0.25rem;
}
input {
  padding: 0.6rem 0.75rem;
  border: 1px solid #d6d6e0;
  border-radius: 8px;
}
button {
  margin-top: 0.5rem;
  padding: 0.6rem 0.8rem;
  border-radius: 8px;
  border: none;
  background: #2a7dfb;
  color: #fff;
  font-weight: 600;
  cursor: pointer;
}
.help {
  margin-top: 0.75rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.link {
  background: transparent;
  color: #2a7dfb;
  border: none;
  padding: 0;
  cursor: pointer;
}
.error {
  color: #b00020;
}
.info {
  color: #385898;
}
</style>
