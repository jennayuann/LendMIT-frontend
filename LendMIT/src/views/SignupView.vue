<script setup lang="ts">
import { ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const auth = useAuthStore()
const { loading, error, info, user } = storeToRefs(auth)

const firstName = ref('')
const lastName = ref('')
const email = ref('')
const password = ref('')

async function onSignup(e: Event) {
  e.preventDefault()
  await auth.signup(
    firstName.value.trim(),
    lastName.value.trim(),
    email.value.trim(),
    password.value,
  )
  // After signup, redirect to verify page and pass user/email via query if present
  const userId = auth.user?.id || ''
  router.push({ path: '/verify', query: { user: userId, email: email.value.trim() } })
}
</script>

<template>
  <div class="page">
    <div class="card">
      <h1>Create your account</h1>
      <p v-if="info" class="info">{{ info }}</p>
      <p v-if="error" class="error">{{ error }}</p>
      <form @submit="onSignup">
        <div class="row">
          <label>First name<input type="text" v-model="firstName" required /></label>
          <label>Last name<input type="text" v-model="lastName" required /></label>
        </div>
        <label
          >MIT Email
          <input
            type="email"
            v-model="email"
            required
            placeholder="kerb@mit.edu"
            pattern="^[A-Za-z0-9._%+-]+@mit\.edu$"
          />
        </label>
        <label>Password<input type="password" v-model="password" required /></label>
        <button type="submit" :disabled="loading">
          {{ loading ? 'Creating…' : 'Create account' }}
        </button>
      </form>
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
.row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
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
.error {
  color: #b00020;
}
.info {
  color: #385898;
}
</style>
