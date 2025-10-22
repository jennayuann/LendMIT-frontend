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
  await auth.login(loginEmail.value.trim(), loginPassword.value)
  // On success, go back to landing (or replace with your app home route)
  router.push('/match')
}
</script>

<template>
  <div class="page">
    <div class="card">
      <h1 class="brand">LendMIT</h1>
      <p v-if="info" class="info">{{ info }}</p>
      <p v-if="error" class="error">{{ error }}</p>
      <section>
        <h2>Login</h2>
        <form @submit="onLogin">
          <label>
            MIT Email
            <input
              type="email"
              v-model="loginEmail"
              placeholder="kerb@mit.edu"
              required
              pattern="^[A-Za-z0-9._%+-]+@mit\\.edu$"
            />
          </label>
          <label>
            Password
            <input type="password" v-model="loginPassword" required />
          </label>
          <button type="submit" :disabled="loading">{{ loading ? 'Logging in…' : 'Login' }}</button>
        </form>
      </section>
      <p style="margin-top: 1rem">
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
  background: #f7f7fb;
}
.card {
  width: min(960px, 94vw);
  background: white;
  padding: 2rem;
  border-radius: 16px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.08);
}
.brand {
  margin: 0 0 1rem 0;
  font-size: 2rem;
  letter-spacing: 0.5px;
}
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 2rem;
}
form {
  display: grid;
  gap: 0.75rem;
}
.row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
}
label {
  display: grid;
  gap: 0.25rem;
  font-size: 0.9rem;
}
input {
  padding: 0.6rem 0.75rem;
  border: 1px solid #d6d6e0;
  border-radius: 8px;
  font-size: 0.95rem;
}
button {
  margin-top: 0.5rem;
  padding: 0.6rem 0.8rem;
  border-radius: 8px;
  border: none;
  background: #2a7dfb;
  color: white;
  font-weight: 600;
  cursor: pointer;
}
button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.error {
  color: #b00020;
}
.success {
  color: #0f7a37;
}
.info {
  color: #385898;
}
</style>
