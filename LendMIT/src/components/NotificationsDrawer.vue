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
  background: rgba(0, 0, 0, 0.25);
  display: flex;
  justify-content: flex-end;
  z-index: 60;
}
.panel {
  width: min(420px, 90vw);
  height: 100%;
  background: #fff;
  box-shadow: -4px 0 20px rgba(0, 0, 0, 0.15);
  display: flex;
  flex-direction: column;
}
.head {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid #eee;
}
.spacer {
  flex: 1;
}
.content {
  padding: 1rem;
  overflow: auto;
}
ul {
  padding-left: 1rem;
}
</style>
