<script setup lang="ts">
import { useRouter } from 'vue-router'
const router = useRouter()
</script>

<template>
  <div class="landing">
    <h1 class="brand">LendMIT</h1>
    <div class="actions">
      <button @click="router.push('/login')">Login</button>
      <button class="primary" @click="router.push('/signup')">Sign up</button>
    </div>
  </div>
</template>

<style scoped>
.landing {
  min-height: 100dvh;
  display: grid;
  place-items: center;
}
.brand {
  font-size: 2.4rem;
  margin-bottom: 1rem;
}
.actions {
  display: flex;
  gap: 1rem;
}
button {
  padding: 0.6rem 1rem;
  border-radius: 8px;
  border: 1px solid #ccc;
  background: #fff;
  cursor: pointer;
}
.primary {
  background: #2a7dfb;
  color: #fff;
  border: none;
}
</style>
