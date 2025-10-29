<script setup lang="ts">
import { ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const auth = useAuthStore()
const { loading, error, info, user } = storeToRefs(auth)

// Login form state
const loginEmail = ref('')
const loginPassword = ref('')

async function onLogin(e: Event) {
  e.preventDefault()
  try {
    await auth.login(loginEmail.value.trim(), loginPassword.value)
    // On success, go back to landing (or replace with your app home route)
    router.push('/match')
  } catch (_) {
    // Stay on page; message is shown via store's error
  }
}
</script>

<template>
  <div class="page">
    <div class="card">
      <div class="brand-header">
        <h1 class="brand">LendMIT</h1>
        <p class="subtitle">Welcome back</p>
      </div>
      <p v-if="info" class="info-msg">{{ info }}</p>
      <p v-if="error" class="text-error">{{ error }}</p>
      <section>
        <form @submit="onLogin">
          <label>
            <span class="label-text">MIT Email</span>
            <input
              type="email"
              v-model="loginEmail"
              placeholder="kerb@mit.edu"
              required
              pattern="^[A-Za-z0-9._%+-]+@mit\\.edu$"
            />
          </label>
          <label>
            <span class="label-text">Password</span>
            <input type="password" v-model="loginPassword" required placeholder="••••••••" />
          </label>
          <button type="submit" class="primary full-width" :disabled="loading">
            {{ loading ? 'Logging in…' : 'Login' }}
          </button>
        </form>
      </section>
      <p class="footer-link">
        Don't have an account?
        <a href="/signup" @click.prevent="router.push('/signup')">Sign up</a>
      </p>
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
  background: white;
  padding: 2.5rem 2rem;
  border-radius: var(--radius-4);
  box-shadow: var(--shadow-2);
  border: 1px solid var(--color-border);
}
.brand-header {
  text-align: center;
  margin-bottom: 2rem;
}
.brand {
  font-family: 'Neue Haas Grotesk Display', var(--font-sans);
  margin: 0 0 0.25rem;
  font-size: 2.25rem;
  font-weight: 900;
  letter-spacing: -0.3px;
  /* Use the accent purple for the brand title */
  color: var(--color-accent-2);
}
.subtitle {
  margin: 0;
  color: var(--color-text-secondary);
  font-size: 0.95rem;
}
.info-msg {
  color: var(--color-accent-2);
  background: rgba(62, 0, 107, 0.05);
  padding: 0.6rem 0.75rem;
  border-radius: var(--radius-2);
  margin-bottom: 1rem;
}
form {
  display: grid;
  gap: 1rem;
  /* Constrain form width and center it so inputs appear balanced under the brand */
  max-width: 480px;
  margin: 0 auto;
  /* Add symmetric horizontal padding so input fields have equal margins on both sides */
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
  padding: 0.65rem 0.85rem;
  font-size: 0.95rem;
  box-sizing: border-box;
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
.footer-link {
  margin-top: 1.5rem;
  text-align: center;
  font-size: 0.9rem;
  color: var(--color-text-secondary);
}
</style>
