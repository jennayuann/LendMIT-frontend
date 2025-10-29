<script setup lang="ts">
import { computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()
const emit = defineEmits<{ (e: 'toggle-notifications'): void }>()
const isActive = (p: string) => computed(() => route.path === p)

function logout() {
  auth.logout()
  router.push('/login')
}
</script>

<template>
  <nav class="nav">
    <div class="left" style="cursor: pointer">
      <RouterLink to="/match" class="brand" style="text-decoration: none">LendMIT</RouterLink>
    </div>
    <div class="tabs">
      <RouterLink to="/match" active-class="active" exact-active-class="active"
        >MatchBoard</RouterLink
      >
      <RouterLink to="/myposts" active-class="active" exact-active-class="active"
        >My Postings</RouterLink
      >
      <RouterLink to="/subscriptions" active-class="active" exact-active-class="active"
        >Subscriptions</RouterLink
      >
      <RouterLink to="/profile" active-class="active" exact-active-class="active"
        >Profile</RouterLink
      >
    </div>
    <div class="right">
      <button class="bell" @click="emit('toggle-notifications')">🔔</button>
      <span v-if="auth.user" class="user">{{ auth.user.email }}</span>
      <button v-if="auth.user" class="logout" @click="logout">Logout</button>
    </div>
  </nav>
</template>

<style scoped>
.nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--color-border);
  background: var(--color-bg);
  position: sticky;
  top: 0;
  z-index: 10;
}
.brand {
  font-weight: 900;
  color: var(--color-accent-2);
  letter-spacing: 0.2px;
  font-size: 1.8rem; /* make it feel like the logo even more */
  line-height: 1;
  font-family: 'Neue Haas Grotesk Display', var(--font-sans);
  text-shadow: 0 1px 0 rgba(0, 0, 0, 0.06); /* subtle weight/contrast boost */
}
.tabs {
  display: flex;
  gap: 1rem;
}
a {
  color: var(--color-text-primary);
  text-decoration: none;
  cursor: pointer;
  padding: 0.25rem 0.5rem;
  border-radius: 6px;
  font-weight: 700;
}
.active {
  background: var(--color-popup);
  color: var(--color-accent-2);
}
.right {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}
.bell,
.logout {
  border: 1px solid var(--color-border);
  background: #fff;
  border-radius: 6px;
  padding: 0.4rem 0.7rem;
  cursor: pointer;
  font-weight: 700;
  font-size: 0.95rem;
}
.user {
  font-size: 0.9rem;
  color: var(--color-text-secondary);
  font-weight: 700;
}
</style>
