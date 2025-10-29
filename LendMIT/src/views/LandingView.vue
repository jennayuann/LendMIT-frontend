<script setup lang="ts">
import { useRouter } from 'vue-router'
const router = useRouter()
</script>

<template>
  <div class="landing">
    <div class="hero">
      <h1 class="brand">LendMIT</h1>
      <p class="tagline">Share resources with your MIT community</p>
      <div class="actions">
        <button class="primary large" @click="router.push('/signup')">Get Started</button>
        <button class="secondary large" @click="router.push('/login')">Login</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.landing {
  min-height: 100dvh;
  display: grid;
  place-items: center;
  background: linear-gradient(135deg, var(--color-bg) 0%, #e8ebf0 100%);
  padding: 2rem;
}
.hero {
  text-align: center;
  max-width: 540px;
}
.brand {
  font-family: 'Neue Haas Grotesk Display', var(--font-sans);
  font-size: 3.5rem;
  font-weight: 900;
  margin: 0 0 0.5rem;
  letter-spacing: -0.5px;
  background: linear-gradient(135deg, var(--color-accent-1) 0%, var(--color-accent-2) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
.tagline {
  font-size: 1.15rem;
  color: var(--color-text-secondary);
  margin: 0 0 2rem;
  font-weight: 500;
}
.actions {
  display: flex;
  gap: 1rem;
  justify-content: center;
  flex-wrap: wrap;
}
.large {
  padding: 0.7rem 1.5rem;
  font-size: 1rem;
  font-weight: 600;
}
</style>
