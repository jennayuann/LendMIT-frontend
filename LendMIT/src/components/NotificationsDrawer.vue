<script setup lang="ts">
import { ref, watch, onMounted, computed } from 'vue'
import { api } from '../api/axiosInstance'
import { useAuthStore } from '../stores/auth'
import { useRouter } from 'vue-router'

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ (e: 'close'): void }>()

const auth = useAuthStore()
const router = useRouter()

type UINotification = {
  id: string
  type?: string
  category?: string
  resourceID?: string
  name?: string
  description?: string
  sentAt: string
  delivered: boolean
}

const notifications = ref<UINotification[]>([])
const loading = ref(false)
const error = ref<string | null>(null)

const hasItems = computed(() => notifications.value.length > 0)
const subtitle = computed(() => (hasItems.value ? 'Recent' : 'No notifications yet'))

async function refresh() {
  if (!auth.user) return
  try {
    loading.value = true
    error.value = null
    const res = await api.post('/NotificationLog/listNotificationsWithContent', {
      recipient: auth.user.id,
      // Intentionally omit delivered/dismissed to avoid filtering; backend treats undefined as "no filter"
    })
    const data = res.data
    const list = Array.isArray(data?.notifications) ? data.notifications : []
    notifications.value = list.map((n: any) => {
      const c = n.content || {}
      return {
        id: String(n.id),
        type: String(c.type || ''),
        category: c.category ? String(c.category) : undefined,
        resourceID: c.resourceID ? String(c.resourceID) : undefined,
        name: c.name ? String(c.name) : undefined,
        description: c.description ? String(c.description) : undefined,
        sentAt: n.sentAt,
        delivered: !!n.delivered,
      } as UINotification
    })
    // If rich endpoint returns empty, opportunistically fall back to the IDs-only route
    if (notifications.value.length === 0) {
      try {
        const res2 = await api.post('/NotificationLog/getNotifications', {
          recipient: auth.user.id,
        })
        const ids = Array.isArray(res2.data)
          ? res2.data?.[0]?.notificationIDs || []
          : res2.data?.notificationIDs || []
        if (ids.length > 0) {
          notifications.value = ids.map((id: string) => ({
            id,
            sentAt: new Date().toISOString(),
            delivered: false,
          }))
        }
      } catch (_) {
        // ignore; keep empty
      }
    }
  } catch (e: any) {
    // Fallback to IDs-only API if the rich endpoint is not available in the running server
    try {
      const res = await api.post('/NotificationLog/getNotifications', {
        recipient: auth.user.id,
      })
      const ids = Array.isArray(res.data)
        ? res.data?.[0]?.notificationIDs || []
        : res.data?.notificationIDs || []
      notifications.value = ids.map((id: string) => ({
        id,
        sentAt: new Date().toISOString(),
        delivered: false,
      }))
      error.value = null
    } catch (fallbackErr: any) {
      error.value = fallbackErr?.message || e?.message || 'Failed to load notifications'
      notifications.value = []
    }
  } finally {
    loading.value = false
  }
}

async function clearDismissed() {
  if (!auth.user) return
  try {
    // First dismiss all currently listed notifications (so they become eligible to clear)
    const ids = notifications.value.map((n) => n.id)
    if (ids.length > 0) {
      await Promise.allSettled(
        ids.map((id) => api.post('/NotificationLog/dismissNotification', { notificationID: id })),
      )
    }
    // Then clear all dismissed notifications for this user
    await api.post('/NotificationLog/clearDismissedNotifications', { recipient: auth.user.id })
  } finally {
    await refresh()
  }
}

const showDetail = ref(false)
const detailLoading = ref(false)
const detailError = ref<string | null>(null)
const detail = ref<any | null>(null)
const activeNotificationId = ref<string | null>(null)

async function openNotification(n: UINotification) {
  detailLoading.value = true
  detailError.value = null
  detail.value = null
  activeNotificationId.value = n.id
  try {
    // Ensure we have a resourceID; if not, try to resolve via the rich list endpoint
    let resourceID = n.resourceID
    if (!resourceID && auth.user) {
      try {
        // First try a direct lookup by notification ID
        const one = await api.post('/NotificationLog/getNotificationWithContent', {
          notificationID: n.id,
        })
        let c = one?.data?.notification?.content || null
        // Fallback: try listing if direct lookup is not available
        if (!c) {
          const list = await api.post('/NotificationLog/listNotificationsWithContent', {
            recipient: auth.user.id,
          })
          const items = Array.isArray(list.data?.notifications) ? list.data.notifications : []
          const match = items.find((it: any) => String(it.id) === String(n.id))
          c = match?.content || null
        }
        if (c && c.resourceID) {
          resourceID = String(c.resourceID)
          // Update local notification so subsequent clicks are richer
          n.resourceID = resourceID
          n.type = c.type ? String(c.type) : n.type
          n.category = c.category ? String(c.category) : n.category
          n.name = c.name ? String(c.name) : n.name
          n.description = c.description ? String(c.description) : n.description
        } else if (c && (c.resourceId || c.resource)) {
          // Be resilient to minor key variants
          const candidate = String(c.resourceId || c.resource)
          if (candidate) {
            resourceID = candidate
            n.resourceID = candidate
          }
        }
      } catch (_) {
        // ignore; we'll surface a friendly error below if still missing
      }
    }

    if (!resourceID) {
      throw new Error(
        'This notification does not link to a specific post yet. Try refreshing the panel.',
      )
    }

    // mark delivered best-effort
    await api.post('/NotificationLog/markAsDelivered', { notificationID: n.id }).catch(() => {})
    // Navigate to the board with deep-link so we show the exact same details UI
    await router.push({ path: '/match', query: { post: resourceID } })
    // Keep the drawer open behind the modal (no close emit)
    return
  } catch (e: any) {
    detailError.value = e?.message || 'Failed to load posting'
  } finally {
    detailLoading.value = false
  }
}

function closeDetail() {
  showDetail.value = false
  detail.value = null
  activeNotificationId.value = null
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
        <button @click="refresh">Refresh</button>
        <button @click="clearDismissed">Clear</button>
        <button @click="emit('close')">Close</button>
      </header>
      <section class="content">
        <h4>{{ subtitle }}</h4>
        <div v-if="loading" class="state">Loading…</div>
        <div v-else-if="error" class="state error">{{ error }}</div>
        <ul class="list" v-else>
          <li v-for="n in notifications" :key="n.id" class="item" @click="openNotification(n)">
            <div class="avatar" aria-hidden="true">🔔</div>
            <div class="meta">
              <div class="title">
                <span v-if="!n.delivered" class="dot" aria-hidden="true"></span>
                <strong>{{ n.name || 'Notification' }}</strong>
                <span v-if="n.category" class="chip">{{ n.category }}</span>
              </div>
              <div class="desc" v-if="n.description">{{ n.description }}</div>
              <div class="time">{{ new Date(n.sentAt).toLocaleString() }}</div>
            </div>
            <button class="action primary" @click.stop="openNotification(n)">View</button>
          </li>
        </ul>
      </section>
    </aside>
    <div v-if="showDetail" class="detail-overlay" @click.self="closeDetail">
      <div class="detail-card">
        <header>
          <h3 v-if="detail">{{ detail.name }}</h3>
          <h3 v-else>Posting</h3>
          <div class="spacer" />
          <button @click="closeDetail">Close</button>
        </header>
        <section>
          <div v-if="detailLoading" class="state">Loading…</div>
          <div v-else-if="detailError" class="state error">{{ detailError }}</div>
          <div v-else-if="detail" class="resource">
            <div class="row">
              <span class="label">Category</span
              ><span class="value">{{ detail.category || '—' }}</span>
            </div>
            <div class="row">
              <span class="label">Description</span
              ><span class="value">{{ detail.description || '—' }}</span>
            </div>
            <div class="row">
              <span class="label">ID</span><span class="value mono">{{ detail.id }}</span>
            </div>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>

<style scoped>
.drawer {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.44);
  display: flex;
  justify-content: flex-end;
  z-index: 40; /* lower than Modal (50) so modal appears above; drawer remains open behind */
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
/* List styling */
.list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.item {
  display: grid;
  grid-template-columns: 36px 1fr auto;
  gap: 10px;
  align-items: center;
  background: var(--color-surface, #f8f9fb);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 10px;
  cursor: pointer;
  transition: background 0.15s ease-in-out;
}
.item:hover {
  background: var(--color-surface-hover, #f1f3f5);
}
.avatar {
  width: 36px;
  height: 36px;
  display: grid;
  place-items: center;
  font-size: 18px;
}
.meta {
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.title {
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 6px;
}
.dot {
  width: 8px;
  height: 8px;
  background: #750014;
  border-radius: 50%;
  display: inline-block;
}
.chip {
  background: #eef3ff;
  border: 1px solid #c7d6ff;
  color: #2d5bff;
  padding: 2px 6px;
  border-radius: 999px;
  font-size: 12px;
}
.desc {
  color: var(--color-text-secondary);
  font-size: 0.9rem;
  margin-top: 2px;
}
.time {
  color: var(--color-text-tertiary);
  font-size: 12px;
  margin-top: 4px;
}
.action {
  font-weight: 600;
}
/* Ensure primary buttons use the brand red in this scoped component */
button.primary {
  background: #750014;
  color: #fff;
  border: none;
}
button.primary:hover {
  background: #8a0018;
  box-shadow: var(--shadow-1);
}

.state {
  padding: 12px;
  color: var(--color-text-secondary);
}
.state.error {
  color: #b3261e;
}
button:not(.primary) {
  background: #fff;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-2);
  padding: 0.3rem 0.6rem;
  cursor: pointer;
}

/* Detail modal */
.detail-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: grid;
  place-items: center;
  z-index: 70;
}
.detail-card {
  width: min(560px, 92vw);
  background: var(--color-popup);
  color: var(--color-text-primary);
  border: 1px solid var(--color-border);
  border-radius: 10px;
  box-shadow: 0 12px 48px rgba(0, 0, 0, 0.25);
}
.detail-card header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border-bottom: 1px solid var(--color-border);
}
.detail-card section {
  padding: 12px;
}
.resource {
  display: grid;
  gap: 8px;
}
.row {
  display: grid;
  grid-template-columns: 110px 1fr;
  gap: 8px;
  align-items: baseline;
}
.label {
  font-weight: 700;
  color: var(--color-text-secondary);
}
.value {
  color: var(--color-text-primary);
}
.mono {
  font-family:
    ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New',
    monospace;
}
</style>
