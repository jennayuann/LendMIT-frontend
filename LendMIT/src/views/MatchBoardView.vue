<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import NavBar from '../components/NavBar.vue'
import Modal from '../components/Modal.vue'
import PostCard from '../components/PostCard.vue'
import NotificationsDrawer from '../components/NotificationsDrawer.vue'
import { api } from '../api/axiosInstance'

type Post = {
  id: string
  title: string
  owner: string
  description: string
  from?: string | null
  until?: string | null
  urgent?: boolean
}
const posts = ref<Post[]>([])
const q = ref('')
const showDetails = ref(false)
const selected = ref<Post | null>(null)
const showDrawer = ref(false)
const loading = ref(false)
const error = ref<string | null>(null)

const filtered = computed(() => {
  const term = q.value.trim().toLowerCase()
  const list = posts.value
    .slice()
    .sort((a, b) => deriveEpochMsFromId(b.id) - deriveEpochMsFromId(a.id))
  if (!term) return list
  return list.filter((p) => `${p.title} ${p.description}`.toLowerCase().includes(term))
})

function getOwnerId(raw: any): string | null {
  if (typeof raw === 'string' && raw) return raw
  if (raw && typeof raw === 'object') {
    if (typeof raw.id === 'string') return raw.id
    if (typeof raw.user === 'string') return raw.user
    if (typeof raw.owner === 'string') return raw.owner
  }
  return null
}

async function fetchByIds(ids: string[]) {
  const results = await Promise.all(
    ids.map(async (id) => {
      try {
        let r: any = null
        try {
          const gr = await api.post('/Resource/getResource', { resourceID: id })
          r = gr.data?.resource
        } catch (_) {
          const gr2 = await api.post('/ResourceConcept/getResource', { resourceID: id })
          r = gr2.data?.resource
        }
        if (r && r.id) {
          const ownerId = getOwnerId(r.owner) || r.ownerID || r.ownerId || r.user || null
          if (!ownerId || typeof ownerId !== 'string') return null
          return {
            id: r.id as string,
            title: r.name as string,
            owner: ownerId,
            description: (r.description ?? '') as string,
          } as Post
        }
      } catch (_) {}
      return null
    }),
  )
  return results.filter((x): x is Post => !!x)
}

async function tryListAll(): Promise<Post[] | null> {
  try {
    let data: any
    try {
      const resp = await api.post('/Resource/listResources', {})
      data = resp.data
    } catch (_) {
      const resp2 = await api.post('/ResourceConcept/listResources', {})
      data = resp2.data
    }
    if (Array.isArray(data)) {
      if (data.length && typeof data[0] === 'string') return await fetchByIds(data as string[])
      if (data.length && typeof data[0] === 'object' && data[0].id) {
        return (data as any[])
          .map((r) => {
            const ownerId = getOwnerId(r.owner) || r.ownerID || r.ownerId || r.user || null
            if (!ownerId || typeof ownerId !== 'string') return null
            return {
              id: r.id as string,
              title: r.name as string,
              owner: ownerId,
              description: (r.description ?? '') as string,
            } as Post
          })
          .filter((x): x is Post => !!x)
      }
    }
    if (Array.isArray((data as any)?.resourceIDs))
      return await fetchByIds((data as any).resourceIDs as string[])
    if (Array.isArray((data as any)?.resources)) {
      const arr: any[] = (data as any).resources
      if (arr.length && typeof arr[0] === 'string') return await fetchByIds(arr as string[])
      if (arr.length && typeof arr[0] === 'object' && arr[0].id) {
        return arr
          .map((r) => {
            const ownerId = getOwnerId(r.owner) || r.ownerID || r.ownerId || r.user || null
            if (!ownerId || typeof ownerId !== 'string') return null
            return {
              id: r.id as string,
              title: r.name as string,
              owner: ownerId,
              description: (r.description ?? '') as string,
            } as Post
          })
          .filter((x): x is Post => !!x)
      }
    }
  } catch (_) {}
  return null
}

// Load feed from API spec: prefer Resource list endpoint, then fall back to intents
onMounted(async () => {
  loading.value = true
  error.value = null
  try {
    const all = await tryListAll()
    if (all && all.length) {
      posts.value = await withOwnerNames(all)
    } else {
      let intents: string[] = []
      try {
        const li = await api.post('/ResourceIntent/listIntents', {})
        if (Array.isArray(li.data) && li.data.length) intents = li.data as string[]
        else if (Array.isArray(li.data?.intentNames)) intents = li.data.intentNames as string[]
      } catch (_) {}
      if (!intents.length) intents = ['LEND', 'BORROW']
      // Ensure defaults exist server-side so setIntent/listResourcesByIntent work
      for (const def of ['LEND', 'BORROW']) {
        if (!intents.includes(def)) {
          try {
            await api.post('/ResourceIntent/defineIntent', { intentName: def })
            intents.push(def)
          } catch (_) {}
        }
      }

      const idGroups = await Promise.all(
        intents.map(async (it) => {
          try {
            const lr = await api.post('/ResourceIntent/listResourcesByIntent', { intent: it })
            if (Array.isArray(lr.data)) return lr.data as string[]
            if (Array.isArray(lr.data?.resourceIDs)) return lr.data.resourceIDs as string[]
          } catch (_) {}
          return [] as string[]
        }),
      )
      const ids = Array.from(new Set(idGroups.flat()))

      posts.value = await withOwnerNames(await fetchByIds(ids))
    }
  } catch (e: any) {
    error.value = e?.message || 'Failed to load postings.'
    posts.value = []
  } finally {
    loading.value = false
  }
})

// Heuristic to derive creation time from IDs (UUIDv7/ObjectId/ULID-like)
function deriveEpochMsFromId(id: string): number {
  // UUIDv7: first 12 hex chars (48 bits) are timestamp in ms
  const hex = id.replace(/-/g, '')
  if (/^[0-9a-fA-F]{32}$/.test(hex) && hex.length >= 12) {
    const msHex = hex.slice(0, 12)
    const ms = Number.parseInt(msHex, 16)
    if (!Number.isNaN(ms)) return ms
  }
  // Mongo ObjectId: first 8 hex chars are seconds
  if (/^[0-9a-fA-F]{24}$/.test(id)) {
    const secHex = id.slice(0, 8)
    const sec = Number.parseInt(secHex, 16)
    if (!Number.isNaN(sec)) return sec * 1000
  }
  // Fallback: compare lexicographically
  return 0
}

async function withOwnerNames(list: Post[]): Promise<Post[]> {
  const owners = Array.from(new Set(list.map((p) => p.owner)))
  const nameMap = new Map<string, string>()
  await Promise.all(
    owners.map(async (u) => {
      try {
        let prof: any = null
        try {
          const res = await api.post('/UserProfile/getProfile', { user: u })
          prof = res.data?.profile ?? (Array.isArray(res.data) ? res.data?.[0]?.profile : null)
          if (!prof && res.data && typeof res.data === 'object' && res.data.firstName) {
            prof = res.data
          }
        } catch (_) {
          // Try concept-suffixed route as fallback
          try {
            const res2 = await api.post('/UserProfileConcept/getProfile', { user: u })
            prof = res2.data?.profile ?? (Array.isArray(res2.data) ? res2.data?.[0]?.profile : null)
            if (!prof && res2.data && typeof res2.data === 'object' && res2.data.firstName) {
              prof = res2.data
            }
          } catch (_) {}
        }
        if (prof) {
          const full = [prof.firstName, prof.lastName].filter(Boolean).join(' ').trim()
          nameMap.set(u, full || u)
        } else {
          nameMap.set(u, u)
        }
      } catch (_) {
        nameMap.set(u, u)
      }
    }),
  )
  return list.map((p) => ({ ...p, owner: nameMap.get(p.owner) || p.owner }))
}

function openDetails(p: Post) {
  selected.value = p
  showDetails.value = true
}
</script>

<template>
  <NavBar @toggle-notifications="showDrawer = !showDrawer" />
  <NotificationsDrawer :open="showDrawer" @close="showDrawer = false" />

  <main class="wrap">
    <div class="tools">
      <input class="search" v-model="q" placeholder="Search" />
      <!-- Tag filters placeholder -->
    </div>
    <div class="list">
      <p v-if="loading" style="color: #666; margin: 0.5rem 0">Loading…</p>
      <p v-else-if="error" style="color: #c00; margin: 0.5rem 0">{{ error }}</p>
      <p v-else-if="filtered.length === 0" style="color: #666; margin: 0.5rem 0">
        No postings yet.
      </p>
      <PostCard
        v-for="p in filtered"
        :key="p.id"
        :title="p.title"
        :owner="p.owner"
        :description="p.description"
        :time-window="p.from && p.until ? `${p.from} – ${p.until}` : p.from || p.until || null"
        :urgent="p.urgent"
        @open="openDetails(p)"
      />
    </div>
  </main>

  <Modal
    :open="showDetails"
    :title="`Posting Details${selected?.urgent ? ' (URGENT)' : ''}`"
    @close="showDetails = false"
  >
    <template v-if="selected">
      <h2 style="margin: 0.25rem 0 0">{{ selected.title }}</h2>
      <p style="color: #666; margin: 0 0 0.5rem 0">{{ selected.owner }}</p>
      <p>{{ selected.description }}</p>
      <p v-if="selected.from || selected.until" style="color: #666">
        {{ selected.from }}<span v-if="selected.until"> – {{ selected.until }}</span>
      </p>
      <div style="margin-top: 1rem">
        <button>Contact to lend</button>
      </div>
    </template>
  </Modal>
</template>

<style scoped>
.wrap {
  padding: 1rem;
}
.tools {
  display: flex;
  gap: 1rem;
  margin-bottom: 1rem;
}
.search {
  flex: 1;
  padding: 0.6rem 0.75rem;
  border: 1px solid #e1e1ea;
  border-radius: 8px;
}
.list {
  display: grid;
  gap: 0.75rem;
}
</style>
