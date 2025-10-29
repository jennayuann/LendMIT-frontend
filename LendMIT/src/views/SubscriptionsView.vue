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
    <p v-if="!auth.user" class="text-error">Please log in to manage your subscriptions.</p>
    <p v-if="subs.info" style="color: var(--color-accent-2)">{{ subs.info }}</p>
    <p v-if="subs.error" class="text-error">{{ subs.error }}</p>

    <section class="add">
      <label class="select-label">Category</label>
      <div class="select-btn-row">
        <select v-model="selectedCategory">
          <option value="" disabled>Select a category…</option>
          <option v-for="c in CATEGORIES" :key="c" :value="c">{{ c }}</option>
        </select>
        <button class="primary" :disabled="subs.loading || !selectedCategory" @click="addSub">
          {{ subs.loading ? 'Adding…' : 'Subscribe' }}
        </button>
      </div>
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
      <p v-if="!subs.followees.length && !subs.loading" style="color: var(--color-text-secondary)">
        No subscriptions yet.
      </p>
    </section>
  </main>
</template>

<style scoped>
.wrap {
  padding: 1.25rem;
  max-width: 1000px;
  margin: 0 auto;
}
/* Use grid for label, flex for controls */
.add {
  display: grid;
  gap: 0.25rem;
  margin: 1.5rem 0 1.25rem;
}
.select-btn-row {
  display: flex;
  gap: 0.5rem;
  align-items: stretch; /* ensure both controls share height */
}
select {
  flex: 1;
  padding: 0.6rem 0.75rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-2);
  background: white;
  font-size: 1rem;
  line-height: 1.35;
  height: 2.75rem;
  box-sizing: border-box;
}

/* Modernized select styling */
select {
  -webkit-appearance: none;
  appearance: none;
  background-color: #ffffff;
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='14' height='10' viewBox='0 0 14 10' fill='none'><path d='M1 1l6 6 6-6' stroke='%23626A9A' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/></svg>");
  background-repeat: no-repeat;
  background-position: right 12px center;
  padding-right: 2.6rem; /* room for arrow */
  border-radius: 10px;
  border: 1px solid rgba(16, 24, 40, 0.08);
  box-shadow: 0 1px 6px rgba(16, 24, 40, 0.04);
  transition:
    box-shadow 0.15s ease,
    border-color 0.12s ease,
    transform 0.08s ease;
}
select:hover {
  box-shadow: 0 4px 18px rgba(16, 24, 40, 0.06);
}
select:focus {
  outline: none;
  border-color: var(--color-accent-2);
  box-shadow: 0 6px 20px rgba(62, 0, 107, 0.12);
}
select option {
  padding: 0.35rem 0.5rem;
  font-size: 0.98rem;
}
.select-label {
  font-weight: 700;
  line-height: 1.2;
}
.danger {
  background: white;
  border: 1px solid rgba(220, 38, 38, 0.25);
  color: var(--color-error);
  border-radius: var(--radius-2);
  padding: 0.3rem 0.6rem;
  cursor: pointer;
}
.add button.primary {
  padding: 0.6rem 0.75rem;
  font-size: 1rem;
  border: 1px solid transparent;
  box-sizing: border-box;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 2.75rem; /* match select height */
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
  border: 1px solid var(--color-border);
  padding: 0.5rem 0.75rem;
  border-radius: var(--radius-2);
}
.mono {
  font-family: ui-monospace, Menlo, monospace;
}
</style>
