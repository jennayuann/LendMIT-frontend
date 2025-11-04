<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { api } from '../api/axiosInstance'
import { useAuthStore } from '../stores/auth'
import NavBar from '../components/NavBar.vue'
import EditPostModal from '../components/EditPostModal.vue'
import NotificationsDrawer from '../components/NotificationsDrawer.vue'
import PostCard from '../components/PostCard.vue'

const auth = useAuthStore()
type Res = {
  id: string
  owner: string
  name: string
  category: string | null
  description: string | null
  intent?: string | null
  from?: string | null
  until?: string | null
}
const items = ref<Res[]>([])
const open = ref(false)
const editing = ref<Partial<Res> | null>(null)
const showDrawer = ref(false)
const loading = ref(false)
const initialLoaded = ref(false)
const error = ref<string | null>(null)

async function fetchResourcesByIds(ids: string[]): Promise<Res[]> {
  const results = await Promise.all(
    ids.map(async (id) => {
      try {
        let r: any = null
        try {
          const gr = await api.post('/Resource/getResource', { resourceID: id })
          r = gr.data?.resource
        } catch (_) {
          r = null
        }
        if (r && r.id) {
          const ownerId =
            (typeof r.owner === 'string' && r.owner) ||
            (r.owner && typeof r.owner === 'object' && r.owner.id) ||
            r.ownerID ||
            r.ownerId ||
            r.user ||
            null
          if (!ownerId || typeof ownerId !== 'string') return null
          // Ensure id is always a string, not an object
          const idStr = typeof r.id === 'string' ? r.id : String(r.id)
          return {
            id: idStr,
            owner: ownerId as string,
            name: r.name as string,
            category: (r.category ?? null) as string | null,
            description: (r.description ?? null) as string | null,
          } as Res
        }
      } catch (_) {}
      return null
    }),
  )
  return results.filter((x): x is Res => !!x)
}

async function tryListByOwner(ownerId: string): Promise<Res[] | null> {
  try {
    let data: any
    try {
      const resp = await api.post('/Resource/listResourcesByOwner', { owner: ownerId })
      data = resp.data
    } catch (_) {
      data = null
    }
    if (Array.isArray(data)) {
      if (data.length && typeof data[0] === 'string')
        return await fetchResourcesByIds(data as string[])
      if (data.length && typeof data[0] === 'object' && data[0].id) {
        return (data as any[])
          .map((r) => {
            const oid =
              (typeof r.owner === 'string' && r.owner) ||
              (r.owner && typeof r.owner === 'object' && r.owner.id) ||
              r.ownerID ||
              r.ownerId ||
              r.user ||
              null
            if (!oid || typeof oid !== 'string') return null
            // Ensure id is always a string, not an object
            const idStr = typeof r.id === 'string' ? r.id : String(r.id)
            return {
              id: idStr,
              owner: oid as string,
              name: r.name as string,
              category: (r.category ?? null) as string | null,
              description: (r.description ?? null) as string | null,
            } as Res
          })
          .filter((x): x is Res => !!x)
      }
    }
    if (Array.isArray(data?.resourceIDs))
      return await fetchResourcesByIds(data.resourceIDs as string[])
    if (Array.isArray(data?.resources)) {
      const arr: any[] = data.resources
      if (arr.length && typeof arr[0] === 'string')
        return await fetchResourcesByIds(arr as string[])
      if (arr.length && typeof arr[0] === 'object' && arr[0].id) {
        return arr
          .map((r) => {
            const oid =
              (typeof r.owner === 'string' && r.owner) ||
              (r.owner && typeof r.owner === 'object' && r.owner.id) ||
              r.ownerID ||
              r.ownerId ||
              r.user ||
              null
            if (!oid || typeof oid !== 'string') return null
            // Ensure id is always a string, not an object
            const idStr = typeof r.id === 'string' ? r.id : String(r.id)
            return {
              id: idStr,
              owner: oid as string,
              name: r.name as string,
              category: (r.category ?? null) as string | null,
              description: (r.description ?? null) as string | null,
            } as Res
          })
          .filter((x): x is Res => !!x)
      }
    }
  } catch (e: any) {
    // 404 or not implemented -> signal fallback
  }
  return null
}

async function tryListAllAndFilter(ownerId: string): Promise<Res[] | null> {
  try {
    let data: any
    try {
      const resp = await api.post('/Resource/listResources', {})
      data = resp.data
    } catch (_) {
      data = null
    }
    let list: Res[] | null = null
    if (Array.isArray(data)) {
      if (data.length && typeof data[0] === 'string') {
        const all = await fetchResourcesByIds(data as string[])
        list = all
      } else if (data.length && typeof data[0] === 'object' && data[0].id) {
        list = (data as any[])
          .map((r) => {
            const oid =
              (typeof r.owner === 'string' && r.owner) ||
              (r.owner && typeof r.owner === 'object' && r.owner.id) ||
              r.ownerID ||
              r.ownerId ||
              r.user ||
              null
            if (!oid || typeof oid !== 'string') return null
            // Ensure id is always a string, not an object
            const idStr = typeof r.id === 'string' ? r.id : String(r.id)
            return {
              id: idStr,
              owner: oid as string,
              name: r.name as string,
              category: (r.category ?? null) as string | null,
              description: (r.description ?? null) as string | null,
            } as Res
          })
          .filter((x): x is Res => !!x)
      }
    }
    if (Array.isArray(data?.resourceIDs)) {
      const all = await fetchResourcesByIds(data.resourceIDs as string[])
      list = all
    } else if (Array.isArray(data?.resources)) {
      const arr: any[] = data.resources
      if (arr.length && typeof arr[0] === 'string') {
        const all = await fetchResourcesByIds(arr as string[])
        list = all
      } else if (arr.length && typeof arr[0] === 'object' && arr[0].id) {
        list = arr
          .map((r) => {
            const oid =
              (typeof r.owner === 'string' && r.owner) ||
              (r.owner && typeof r.owner === 'object' && r.owner.id) ||
              r.ownerID ||
              r.ownerId ||
              r.user ||
              null
            if (!oid || typeof oid !== 'string') return null
            // Ensure id is always a string, not an object
            const idStr = typeof r.id === 'string' ? r.id : String(r.id)
            return {
              id: idStr,
              owner: oid as string,
              name: r.name as string,
              category: (r.category ?? null) as string | null,
              description: (r.description ?? null) as string | null,
            } as Res
          })
          .filter((x): x is Res => !!x)
      }
    }
    if (list && list.length) return list.filter((r) => r.owner === ownerId)
  } catch (_) {}
  return null
}

async function load(showSpinner = true) {
  if (!auth.user) return
  if (showSpinner && !initialLoaded.value) loading.value = true
  error.value = null
  try {
    let result: Res[] = []
    // Preferred: list by owner if server supports it
    const byOwner = await tryListByOwner(auth.user.id)
    if (byOwner && byOwner.length) {
      result = byOwner
    } else {
      // Secondary: list all and filter by owner if list-by-owner is missing
      const allMine = await tryListAllAndFilter(auth.user.id)
      if (allMine && allMine.length) {
        result = allMine
      } else {
        // Fallback to ResourceIntent indexing if listByOwner is unavailable
        let intents: string[] = []
        try {
          const resp = await api.post('/ResourceIntent/listIntents', {})
          if (Array.isArray(resp.data) && resp.data.length) intents = resp.data as string[]
          else if (Array.isArray(resp.data?.intentNames))
            intents = resp.data.intentNames as string[]
        } catch (_) {}
        if (!intents.length) intents = ['LEND', 'BORROW']
        // Ensure defaults exist server-side so setIntent/listResourcesByIntent work
        for (const def of ['LEND', 'BORROW']) {
          if (!intents.includes(def)) {
            try {
              try {
                await api.post('/ResourceIntent/defineIntent', { intentName: def })
              } catch (_) {
                await api.post('/ResourceIntentConcept/defineIntent', { intentName: def })
              }
              intents.push(def)
            } catch (_) {}
          }
        }
        const idSets = await Promise.all(
          intents.map(async (it) => {
            try {
              const r = await api.post('/ResourceIntent/listResourcesByIntent', { intent: it })
              if (Array.isArray(r.data)) return r.data as string[]
              if (Array.isArray(r.data?.resourceIDs)) return r.data.resourceIDs as string[]
            } catch (_) {}
            return [] as string[]
          }),
        )
        const allIds = Array.from(new Set(idSets.flat()))
        const resources = await fetchResourcesByIds(allIds)
        result = resources.filter((r) => r.owner === auth.user!.id)
      }
    }
    // Attach intents and time windows
    const withIntents = await attachIntents(result)
    const enriched = await attachTimeWindows(withIntents)
    // Use only server-provided results (no local cache)
    items.value = (enriched || []).sort(
      (a, b) => deriveEpochMsFromId(b.id) - deriveEpochMsFromId(a.id),
    )
  } catch (e: any) {
    error.value = e?.message || 'Failed to load your postings.'
    items.value = []
  } finally {
    loading.value = false
    initialLoaded.value = true
  }
}

function createNew() {
  editing.value = null
  open.value = true
}
function editPost(p: Res) {
  editing.value = { id: p.id, name: p.name, category: p.category, description: p.description }
  open.value = true
}
async function delPost(p: Res) {
  try {
    // Extract string ID: handle both plain strings and branded ID objects
    let resourceID = p.id
    if (typeof resourceID !== 'string') {
      console.warn('ID is not a string, attempting to convert:', resourceID)
      resourceID = String(resourceID)
    }

    // 1. Clear intent entry (ignore errors if intent doesn't exist)
    try {
      await api.post('/ResourceIntent/clearIntent', { resource: resourceID })
    } catch (e) {
      console.debug('Could not clear intent (may not exist):', e)
    }

    // 1.5 Delete associated TimeBoundedResource entry (API spec)
    try {
      await api.post('/TimeBoundedResource/deleteTimeWindow', { resource: resourceID })
    } catch (e) {
      console.debug('Could not delete time window (may not exist):', e)
    }

    // 2. Delete resource entry
    await api.post('/Resource/deleteResource', { resourceID: resourceID })
  } catch (e) {
    console.warn('Delete failed', e)
  } finally {
    await load()
  }
}

onMounted(load)

function onSaved(r: Res) {
  const idx = items.value.findIndex((x) => x.id === r.id)
  if (idx >= 0) items.value[idx] = r
  else items.value.unshift(r)
  // If modal provided intent, keep it; otherwise best-effort fetch
  if (!r.intent) {
    getIntentFor(r.id).then((it) => {
      const i = items.value.findIndex((x) => x.id === r.id)
      if (i >= 0) items.value[i] = { ...(items.value[i] as Res), intent: it } as Res
    })
  }
  items.value.sort((a, b) => deriveEpochMsFromId(b.id) - deriveEpochMsFromId(a.id))
  // If it's a temp item, wait for reconciliation; otherwise do a quick reload
  if (!isTempId(r.id)) {
    setTimeout(() => {
      load(false) // silent refresh; don't show Loading…
    }, 200)
  }
}

function onReconciled(payload: { oldId: string; resource: Res }) {
  const idx = items.value.findIndex((x) => x.id === payload.oldId)
  if (idx >= 0) items.value[idx] = payload.resource
  else {
    const j = items.value.findIndex((x) => x.id === payload.resource.id)
    if (j >= 0) items.value[j] = payload.resource
    else items.value.unshift(payload.resource)
  }
  if (!payload.resource.intent) {
    getIntentFor(payload.resource.id).then((it) => {
      const i = items.value.findIndex((x) => x.id === payload.resource.id)
      if (i >= 0) items.value[i] = { ...(items.value[i] as Res), intent: it } as Res
    })
  }
  // De-dup and sort
  items.value = items.value.filter((v, i, arr) => arr.findIndex((w) => w.id === v.id) === i)
  items.value.sort((a, b) => deriveEpochMsFromId(b.id) - deriveEpochMsFromId(a.id))
  setTimeout(() => {
    load(false) // silent refresh
  }, 150)
}

function deriveEpochMsFromId(id: string): number {
  const hex = id.replace(/-/g, '')
  if (/^[0-9a-fA-F]{32}$/.test(hex) && hex.length >= 12) {
    const msHex = hex.slice(0, 12)
    const ms = Number.parseInt(msHex, 16)
    if (!Number.isNaN(ms)) return ms
  }
  if (/^[0-9a-fA-F]{24}$/.test(id)) {
    const secHex = id.slice(0, 8)
    const sec = Number.parseInt(secHex, 16)
    if (!Number.isNaN(sec)) return sec * 1000
  }
  return 0
}

function isTempId(id: string) {
  return id.startsWith('tmp_')
}

async function attachIntents(list: Res[]): Promise<Res[]> {
  try {
    const res = await Promise.all(
      list.map(async (r) => ({ ...r, intent: await getIntentFor(r.id) })),
    )
    return res
  } catch (_) {
    return list
  }
}

async function getIntentFor(resourceId: string): Promise<string | null> {
  try {
    const resp = await api.post('/ResourceIntent/getIntent', { resource: resourceId })
    const data: any = resp.data
    if (Array.isArray(data) && data.length) {
      const row = data[0]
      if (row && typeof row.intent === 'string') return row.intent
    }
    if (data && typeof data === 'object') {
      if (typeof data.intent === 'string') return data.intent
      if (Array.isArray(data?.entries) && data.entries[0]?.intent)
        return String(data.entries[0].intent)
    }
  } catch (_) {}
  return 'N/A'
}

async function getTimeWindow(
  resourceId: string,
): Promise<{ from: string | null; until: string | null }> {
  try {
    const r = await api.post('/TimeBoundedResource/getTimeWindow', { resource: resourceId })
    const data: any = r.data
    let entry: any = null
    if (Array.isArray(data) && data.length) entry = data[0]
    else if (data && typeof data === 'object') entry = data
    const af = entry?.availableFrom ?? entry?.from ?? null
    const au = entry?.availableUntil ?? entry?.until ?? null
    return {
      from: typeof af === 'string' ? af : null,
      until: typeof au === 'string' ? au : null,
    }
  } catch (_) {
    return { from: null, until: null }
  }
}

function formatReadable(iso: string): string {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso
  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function formatTimeWindowText(from: string | null | undefined, until: string | null | undefined) {
  const now = Date.now()
  const fromMs = from ? new Date(from).getTime() : NaN
  const untilMs = until ? new Date(until).getTime() : NaN
  const hasFrom = from && !Number.isNaN(fromMs)
  const hasUntil = until && !Number.isNaN(untilMs)

  // If start is in the past, treat as no start and don't show its date/time
  const effectiveHasFrom = hasFrom && fromMs > now

  if (effectiveHasFrom && hasUntil) return `${formatReadable(from!)} – ${formatReadable(until!)}`
  if (!effectiveHasFrom && hasUntil) return `Until ${formatReadable(until!)}`
  if (effectiveHasFrom && !hasUntil) return `From ${formatReadable(from!)}`
  return 'From now'
}

async function attachTimeWindows(list: Res[]): Promise<Res[]> {
  try {
    const res = await Promise.all(
      list.map(async (r) => {
        const tw = await getTimeWindow(r.id)
        return { ...r, from: tw.from, until: tw.until }
      }),
    )
    return res
  } catch (_) {
    return list
  }
}
</script>

<template>
  <NavBar @toggle-notifications="showDrawer = !showDrawer" />
  <NotificationsDrawer :open="showDrawer" @close="showDrawer = false" />
  <main class="wrap">
    <div class="toolbar">
      <h2>My Postings</h2>
      <button class="primary" @click="createNew">Create new posting</button>
    </div>
    <div class="list">
      <div v-if="loading" class="loading">Loading your postings...</div>
      <p v-else-if="error" class="text-error" style="margin: 0.5rem 0">{{ error }}</p>
      <div v-else-if="!items.length" class="empty-state">
        <p>You have no postings yet.</p>
        <p style="font-size: 0.85rem">Click "Create new posting" to get started!</p>
      </div>
      <div v-for="p in items" :key="p.id" class="row">
        <PostCard
          :title="p.name"
          :owner="'me'"
          :owner-id="p.owner"
          :description="p.description || ''"
          :intent="p.intent || null"
          :time-window="formatTimeWindowText(p.from || null, p.until || null)"
        />
        <div class="actions">
          <button @click="editPost(p)">Edit</button>
          <button @click="delPost(p)">Delete</button>
        </div>
      </div>
    </div>
  </main>

  <EditPostModal
    :open="open"
    :post="editing"
    @close="open = false"
    @saved="onSaved"
    @reconciled="onReconciled"
  />
</template>

<style scoped>
.wrap {
  padding: 1.25rem;
  max-width: 1000px;
  margin: 0 auto;
}
.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}
.list {
  display: grid;
  gap: 1rem;
}
.row {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 0.5rem;
  align-items: start;
}
.actions {
  display: flex;
  gap: 0.5rem;
}
</style>
