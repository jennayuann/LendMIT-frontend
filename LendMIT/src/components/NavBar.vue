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
  border-bottom: 1px solid #eee;
  background: #fff;
  position: sticky;
  top: 0;
  z-index: 10;
}
.brand {
  font-weight: 800;
  color: #2a7dfb;
  letter-spacing: 0.5px;
}
.tabs {
  display: flex;
  gap: 1rem;
}
a {
  color: #333;
  text-decoration: none;
  cursor: pointer;
  padding: 0.25rem 0.5rem;
  border-radius: 6px;
}
.active {
  background: #e8f0fe;
  color: #174ea6;
}
.right {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}
.bell,
.logout {
  border: 1px solid #ddd;
  background: #fff;
  border-radius: 6px;
  padding: 0.25rem 0.5rem;
  cursor: pointer;
}
.user {
  font-size: 0.9rem;
  color: #555;
}
</style>
