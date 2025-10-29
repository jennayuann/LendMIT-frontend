<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { api } from '../api/axiosInstance'
import { useAuthStore } from '../stores/auth'

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ (e: 'close'): void }>()

const auth = useAuthStore()
const notifications = ref<string[]>([])

async function refresh() {
  if (!auth.user) return
  try {
    const res = await api.post('/NotificationLog/getNotifications', {
      recipient: auth.user.id,
      delivered: null,
      dismissed: null,
    })
    notifications.value = res.data?.[0]?.notificationIDs || []
  } catch {}
}

async function clearDismissed() {
  if (!auth.user) return
  await api.post('/NotificationLog/clearDismissedNotifications', { recipient: auth.user.id })
  await refresh()
}

// Refresh when the drawer is opened
watch(
  () => props.open,
  async (o) => {
    if (o) await refresh()
  },
  { immediate: true },
)

onMounted(async () => {
  if (props.open) await refresh()
})
</script>

<template>
  <div v-if="open" class="drawer" @click.self="emit('close')">
    <aside class="panel">
      <header class="head">
        <h3>Notifications</h3>
        <div class="spacer" />
        <button @click="clearDismissed">Clear</button>
        <button @click="emit('close')">Close</button>
      </header>
      <section class="content">
        <h4>Recent</h4>
        <ul>
          <li v-for="id in notifications" :key="id">Notification {{ id }}</li>
        </ul>
      </section>
    </aside>
  </div>
</template>

<style scoped>
.drawer {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.44);
  display: flex;
  justify-content: flex-end;
  z-index: 60;
}
.panel {
  width: min(420px, 90vw);
  height: 100%;
  background: var(--color-popup);
  color: var(--color-text-primary);
  border-left: 1px solid var(--color-border);
  box-shadow: -4px 0 20px rgba(0, 0, 0, 0.15);
  display: flex;
  flex-direction: column;
}
.head {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  border-bottom: 1px solid var(--color-border);
}
.head h3 {
  margin: 0;
  font-weight: 800;
  letter-spacing: 0.2px;
  font-size: 1.25rem;
}
.spacer {
  flex: 1;
}
.content {
  padding: 0.75rem;
  overflow: auto;
}
.content h4 {
  margin: 0 0 0.5rem;
  font-weight: 700;
}
ul {
  list-style: none;
  padding-left: 0;
  margin: 0;
}
li {
  padding: 0.25rem 0;
  font-weight: 500;
}
button {
  background: #fff;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-2);
  padding: 0.3rem 0.6rem;
  cursor: pointer;
}
ul {
  padding-left: 1rem;
}
</style>
