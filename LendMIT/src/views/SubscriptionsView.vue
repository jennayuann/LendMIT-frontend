<script setup lang="ts">
import { ref, onMounted } from 'vue'
import NavBar from '../components/NavBar.vue'
import NotificationsDrawer from '../components/NotificationsDrawer.vue'
import { useAuthStore } from '../stores/auth'
import { useSubscriptionsStore } from '../stores/subscriptions'
import { CATEGORIES } from '../constants/categories'

const auth = useAuthStore()
const subs = useSubscriptionsStore()
const showDrawer = ref(false)
const selectedCategory = ref<string>('')

onMounted(async () => {
  if (auth.user) await subs.refresh(auth.user.id)
})

async function addSub() {
  if (!auth.user) return
  const cat = selectedCategory.value
  if (!cat || !CATEGORIES.includes(cat as any)) return
  // Follow the raw category name
  const id = cat
  await subs.follow(auth.user.id, id)
  // Defensive refresh in view (store also refreshes)
  await subs.refresh(auth.user.id)
  selectedCategory.value = ''
}

async function removeSub(id: string) {
  if (!auth.user) return
  await subs.unfollow(auth.user.id, id)
}
</script>

<template>
  <NavBar @toggle-notifications="showDrawer = !showDrawer" />
  <NotificationsDrawer :open="showDrawer" @close="showDrawer = false" />
  <main class="wrap">
    <h2>Subscriptions</h2>
    <p v-if="!auth.user" class="error">Please log in to manage your subscriptions.</p>
    <p v-if="subs.info" class="info">{{ subs.info }}</p>
    <p v-if="subs.error" class="error">{{ subs.error }}</p>

    <section class="add">
      <label class="select-label">
        Category
        <select v-model="selectedCategory">
          <option value="" disabled>Select a category…</option>
          <option v-for="c in CATEGORIES" :key="c" :value="c">{{ c }}</option>
        </select>
      </label>
      <button class="primary" :disabled="subs.loading || !selectedCategory" @click="addSub">
        {{ subs.loading ? 'Adding…' : 'Subscribe' }}
      </button>
    </section>

    <section>
      <h3>Following</h3>
      <ul class="list">
        <li v-for="id in subs.followees" :key="id" class="row">
          <span class="mono">{{ CATEGORIES.includes(id as any) ? id + ' (category)' : id }}</span>
          <button class="danger" :disabled="subs.loading" @click="removeSub(id)">
            Unsubscribe
          </button>
        </li>
      </ul>
      <p v-if="!subs.followees.length && !subs.loading" style="color: #666">
        No subscriptions yet.
      </p>
    </section>
  </main>
</template>

<style scoped>
.wrap {
  padding: 1rem;
}
.add {
  display: flex;
  gap: 0.5rem;
  margin: 0.5rem 0 1rem;
}
input {
  flex: 1;
  padding: 0.6rem 0.75rem;
  border: 1px solid #e1e1ea;
  border-radius: 8px;
}
select {
  flex: 1;
  padding: 0.6rem 0.75rem;
  border: 1px solid #e1e1ea;
  border-radius: 8px;
  background: white;
}
.select-label {
  display: grid;
  gap: 0.25rem;
  flex: 1;
}
.primary {
  background: #2a7dfb;
  color: white;
  border: none;
  border-radius: 8px;
  padding: 0.5rem 0.75rem;
  cursor: pointer;
}
.danger {
  background: white;
  border: 1px solid #e8c1c1;
  color: #a33;
  border-radius: 8px;
  padding: 0.3rem 0.6rem;
  cursor: pointer;
}
.list {
  display: grid;
  gap: 0.5rem;
  padding: 0;
  list-style: none;
}
.row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border: 1px solid #eee;
  padding: 0.5rem 0.75rem;
  border-radius: 8px;
}
.mono {
  font-family: ui-monospace, Menlo, monospace;
}
.info {
  color: #385898;
}
.error {
  color: #b00020;
}
</style>
