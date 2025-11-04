<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useAuthStore } from '../stores/auth'
import NavBar from '../components/NavBar.vue'
import Modal from '../components/Modal.vue'
import PostCard from '../components/PostCard.vue'
import NotificationsDrawer from '../components/NotificationsDrawer.vue'
import { api } from '../api/axiosInstance'
import { useRoute } from 'vue-router'

type Post = {
  id: string
  title: string
  ownerId: string
  ownerName: string
  description: string
  from?: string | null
  until?: string | null
  urgent?: boolean
  intent?: string | null
}
const posts = ref<Post[]>([])
const q = ref('')
const intentFilter = ref<'ALL' | 'LEND' | 'BORROW'>('ALL')
const showDetails = ref(false)
const selected = ref<Post | null>(null)
const showDrawer = ref(false)
const loading = ref(false)
const error = ref<string | null>(null)
const contacting = ref(false)
const showOwnerProfile = ref(false)
const ownerProfileLoading = ref(false)
const ownerProfile = ref<{
  id: string | null
  displayName: string
  email: string | null
  bio: string | null
  thumbnail: string | null
} | null>(null)
const activeRequest = ref<symbol | null>(null)
const auth = useAuthStore()
const route = useRoute()

function normalizeResourceId(entry: any): string | null {
  if (!entry) return null
  if (typeof entry === 'string' && entry.trim()) return entry
  if (typeof entry === 'number' && Number.isFinite(entry)) return String(entry)
  if (typeof entry === 'object') {
    if (entry instanceof Date) return entry.toISOString()
    if (typeof entry._id === 'string' && entry._id.trim()) return entry._id
    if (entry._id && typeof entry._id === 'object') return normalizeResourceId(entry._id)
    if (typeof entry.resource === 'string' && entry.resource.trim()) return entry.resource
    if (entry.resource && typeof entry.resource === 'object') {
      const nested = normalizeResourceId(entry.resource)
      if (nested) return nested
    }
    if (typeof entry.resourceID === 'string' && entry.resourceID.trim()) return entry.resourceID
    if (entry.resourceID && typeof entry.resourceID === 'object') {
      const nested = normalizeResourceId(entry.resourceID)
      if (nested) return nested
    }
    if (typeof entry.resourceId === 'string' && entry.resourceId.trim()) return entry.resourceId
    if (entry.resourceId && typeof entry.resourceId === 'object') {
      const nested = normalizeResourceId(entry.resourceId)
      if (nested) return nested
    }
    if (typeof entry.id === 'string' && entry.id.trim()) return entry.id
    if (entry.id && typeof entry.id === 'object') {
      const nested = normalizeResourceId(entry.id)
      if (nested) return nested
    }
    if (typeof entry.value === 'string' && entry.value.trim()) return entry.value
    if (typeof entry.$oid === 'string' && entry.$oid.trim()) return entry.$oid
  }
  return null
}

function normalizeResource(entry: any): {
  id: string
  owner: any
  name?: string | null
  description?: string | null
} | null {
  if (!entry || typeof entry !== 'object') return null
  if (typeof entry.id === 'string' && entry.id.trim()) {
    return {
      id: entry.id,
      owner: entry.owner ?? entry.ownerId ?? entry.ownerID ?? entry.user ?? null,
      name: entry.name ?? entry.title ?? entry.resourceName ?? null,
      description: entry.description ?? entry.details ?? entry.summary ?? null,
    }
  }
  if (typeof entry._id === 'string' && entry._id.trim()) {
    return {
      id: entry._id,
      owner: entry.owner ?? entry.ownerId ?? entry.ownerID ?? entry.user ?? null,
      name: entry.name ?? entry.title ?? entry.resourceName ?? null,
      description: entry.description ?? entry.details ?? entry.summary ?? null,
    }
  }
  const nested = normalizeResource(
    entry.resource ?? entry.resourceID ?? entry.resourceId ?? entry.value ?? entry.item,
  )
  if (nested) return nested
  return null
}

const contactActionLabel = computed(() => {
  const it = selected.value?.intent?.toString().toUpperCase()
  if (it === 'BORROW') return 'Contact to lend'
  if (it === 'LEND') return 'Contact to borrow'
  return 'Contact'
})

function isExpired(p: Post): boolean {
  if (!p.until) return false
  const untilMs = new Date(p.until).getTime()
  if (Number.isNaN(untilMs)) return false
  return untilMs <= Date.now()
}

const filtered = computed(() => {
  const term = q.value.trim().toLowerCase()
  const list = posts.value
    .slice()
    .filter((p) => !isExpired(p))
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
    if (typeof raw._id === 'string') return raw._id
    if (raw.owner && typeof raw.owner === 'object') return getOwnerId(raw.owner)
    if (raw.user && typeof raw.user === 'object') return getOwnerId(raw.user)
  }
  return null
}

async function fetchByIds(ids: string[]) {
  const results = await Promise.all(
    ids.map(async (id) => {
      if (!id || typeof id !== 'string') return null
      try {
        const routes = ['/Resource/getResource', '/ResourceConcept/getResource']
        const bodies = [{ resourceID: id }, { resourceId: id }, { resource: id }, { id }]
        for (const route of routes) {
          for (const body of bodies) {
            try {
              const resp = await api.post(route, body)
              const payload = resp.data
              const candidates: any[] = []
              if (payload) {
                if (Array.isArray(payload)) candidates.push(...payload)
                if (payload.resource) candidates.push(payload.resource)
                if (Array.isArray(payload.resources)) candidates.push(...payload.resources)
                candidates.push(payload)
              }
              for (const candidate of candidates) {
                const resource = normalizeResource(candidate)
                if (!resource) continue
                const ownerId = getOwnerId(resource.owner) || null
                if (!ownerId || typeof ownerId !== 'string') continue
                const title = resource.name ? String(resource.name) : 'Untitled Resource'
                return {
                  id: resource.id,
                  title,
                  ownerId,
                  ownerName: ownerId,
                  description: resource.description ? String(resource.description) : '',
                } as Post
              }
            } catch (_) {
              continue
            }
          }
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
            const idStr = typeof r.id === 'string' ? r.id : String(r.id)
            return {
              id: idStr,
              title: r.name as string,
              ownerId: ownerId,
              ownerName: ownerId,
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
            const idStr = typeof r.id === 'string' ? r.id : String(r.id)
            return {
              id: idStr,
              title: r.name as string,
              ownerId: ownerId,
              ownerName: ownerId,
              description: (r.description ?? '') as string,
            } as Post
          })
          .filter((x): x is Post => !!x)
      }
    }
  } catch (_) {}
  return null
}

async function listIntentNames(): Promise<string[]> {
  try {
    const res = await api.post('/ResourceIntent/listIntents', {})
    if (Array.isArray(res.data) && res.data.length)
      return (res.data as any[]).map((name) => String(name))
    if (Array.isArray(res.data?.intentNames))
      return (res.data.intentNames as any[]).map((name) => String(name))
  } catch (_) {
    try {
      const res2 = await api.post('/ResourceIntentConcept/listIntents', {})
      if (Array.isArray(res2.data) && res2.data.length)
        return (res2.data as any[]).map((name) => String(name))
      if (Array.isArray(res2.data?.intentNames))
        return (res2.data.intentNames as any[]).map((name) => String(name))
    } catch (_) {}
  }
  return []
}

async function ensureIntentDefined(intent: string) {
  try {
    await api.post('/ResourceIntent/defineIntent', { intentName: intent })
  } catch (_) {
    try {
      await api.post('/ResourceIntentConcept/defineIntent', { intentName: intent })
    } catch (_) {}
  }
}

async function ensureDefaultIntents(intents: string[]): Promise<string[]> {
  const upper = new Set(intents.map((name) => name.toUpperCase()))
  const result = [...intents]
  for (const def of ['LEND', 'BORROW']) {
    if (!upper.has(def)) {
      await ensureIntentDefined(def)
      upper.add(def)
      result.push(def)
    }
  }
  return result
}

const INTENT_SYNONYMS: Record<'LEND' | 'BORROW', string[]> = {
  LEND: ['LEND', 'LENDING', 'LENDS', 'LOAN', 'LOANING', 'SHARE'],
  BORROW: ['BORROW', 'BORROWING', 'BORROWER', 'NEED', 'REQUEST', 'WANT'],
}

function resolveIntentAliasNames(names: string[], intent: string): string[] {
  const canonical = intent.toUpperCase()
  const pairs = names.map((name) => [name, name.toUpperCase()] as const)
  const matches = new Set<string>()
  for (const [original, upper] of pairs) {
    if (upper === canonical) matches.add(original)
  }
  const synonyms = INTENT_SYNONYMS[canonical as 'LEND' | 'BORROW']
  if (synonyms) {
    for (const syn of synonyms) {
      const synUpper = syn.toUpperCase()
      for (const [original, upper] of pairs) {
        if (upper === synUpper || upper.includes(synUpper)) matches.add(original)
      }
    }
  } else {
    for (const [original, upper] of pairs) {
      if (upper.includes(canonical)) matches.add(original)
    }
  }
  if (!matches.size) {
    for (const [original, upper] of pairs) {
      if (upper.includes(canonical)) {
        matches.add(original)
      }
    }
  }
  return Array.from(matches)
}

function extractResourceIds(payload: any): string[] {
  const collected = new Set<string>()
  const stack: any[] = []
  if (payload !== undefined) stack.push(payload)

  while (stack.length) {
    const value = stack.pop()
    if (value == null) continue
    if (typeof value === 'string' || typeof value === 'number') {
      const id = normalizeResourceId(value)
      if (id) collected.add(id)
      continue
    }
    if (Array.isArray(value)) {
      for (const entry of value) stack.push(entry)
      continue
    }
    if (typeof value === 'object') {
      const id = normalizeResourceId(value)
      if (id) collected.add(id)
      for (const key of ['resourceIDs', 'resources', 'ids', 'items', 'values']) {
        const inner = (value as Record<string, unknown>)[key]
        if (Array.isArray(inner)) stack.push(inner)
      }
      for (const key of Object.keys(value)) {
        const inner = (value as Record<string, unknown>)[key]
        if (Array.isArray(inner) || (typeof inner === 'object' && inner !== null)) stack.push(inner)
      }
    }
  }

  return Array.from(collected)
}

async function listResourceIdsByIntent(intent: string): Promise<string[]> {
  const routes = [
    '/ResourceIntent/listResourcesByIntent',
    '/ResourceIntentConcept/listResourcesByIntent',
  ]
  const bodies = [{ intent }, { intentName: intent }, { name: intent }, { intent_label: intent }]
  let lastParsed: string[] | null = null
  for (const route of routes) {
    for (const body of bodies) {
      try {
        const res = await api.post(route, body)
        const ids = extractResourceIds(res.data)
        if (ids.length) return ids
        if (lastParsed === null) lastParsed = ids
      } catch (_) {
        continue
      }
    }
  }
  return lastParsed ?? []
}

async function postsForIntent(intent: string): Promise<Post[]> {
  let ids = await listResourceIdsByIntent(intent)
  if (!ids.length) {
    const names = await listIntentNames()
    const candidates = resolveIntentAliasNames(names, intent).filter((name) => name !== intent)
    if (candidates.length) {
      const groups = await Promise.all(candidates.map((name) => listResourceIdsByIntent(name)))
      ids = groups.flat()
    }
  }
  const uniqueIds = Array.from(new Set(ids.filter((id) => typeof id === 'string' && id)))
  if (!uniqueIds.length) return []
  return await fetchByIds(uniqueIds)
}

async function postsForAllIntents(): Promise<Post[]> {
  let names = await listIntentNames()
  if (!names.length) names = ['LEND', 'BORROW']
  names = await ensureDefaultIntents(names)
  const idGroups = await Promise.all(names.map((name) => listResourceIdsByIntent(name)))
  const ids = Array.from(
    new Set(
      idGroups
        .flat()
        .map((id) => (typeof id === 'string' && id ? id : null))
        .filter((id): id is string => !!id),
    ),
  )
  if (!ids.length) return []
  return await fetchByIds(ids)
}

async function loadPosts() {
  const token = Symbol('load')
  activeRequest.value = token
  loading.value = true
  error.value = null
  try {
    let base: Post[] = []
    if (intentFilter.value === 'ALL') {
      const all = await tryListAll()
      if (all && all.length) {
        base = all
      } else {
        base = await postsForAllIntents()
      }
    } else {
      base = await postsForIntent(intentFilter.value)
    }
    const enriched = await withOwnerNames(await attachTimeWindows(await attachIntents(base)))
    if (activeRequest.value === token) {
      posts.value = enriched
    }
  } catch (e: any) {
    if (activeRequest.value === token) {
      error.value = e?.message || 'Failed to load postings.'
      posts.value = []
    }
  } finally {
    if (activeRequest.value === token) {
      loading.value = false
      activeRequest.value = null
    }
  }
}

function setIntentFilter(next: 'ALL' | 'LEND' | 'BORROW') {
  if (intentFilter.value === next) return
  intentFilter.value = next
}

watch(
  intentFilter,
  () => {
    void loadPosts()
  },
  { immediate: true },
)

// Deep-link: open details if URL contains ?post=<id>
watch(
  () => route.query.post,
  async (val) => {
    const id = typeof val === 'string' ? val.trim() : ''
    if (!id) return
    await openDetailsById(id)
  },
  { immediate: true },
)

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
  const owners = Array.from(new Set(list.map((p) => p.ownerId)))
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
  return list.map((p) => ({ ...p, ownerName: nameMap.get(p.ownerId) || p.ownerName }))
}

async function getProfileRecord(userId: string): Promise<any | null> {
  try {
    const res = await api.post('/UserProfile/getProfile', { user: userId })
    const data = res.data
    const candidate =
      data?.profile ??
      (Array.isArray(data)
        ? (data[0]?.profile ?? (typeof data[0] === 'object' ? data[0] : null))
        : data)
    if (candidate && typeof candidate === 'object') return candidate
  } catch (_) {
    // fall through to concept route
  }
  try {
    const res2 = await api.post('/UserProfileConcept/getProfile', { user: userId })
    const data2 = res2.data
    const candidate =
      data2?.profile ??
      (Array.isArray(data2)
        ? (data2[0]?.profile ?? (typeof data2[0] === 'object' ? data2[0] : null))
        : data2)
    if (candidate && typeof candidate === 'object') return candidate
  } catch (_) {
    // ignore
  }
  return null
}

async function resolveOwnerProfile(
  ownerId: string | null,
  fallbackName: string,
): Promise<{
  id: string | null
  displayName: string
  email: string | null
  bio: string | null
  thumbnail: string | null
}> {
  const trimmedFallback = fallbackName?.trim() || ''
  let profileRecord: any = null
  if (ownerId) profileRecord = await getProfileRecord(ownerId)

  const composedName = [profileRecord?.firstName, profileRecord?.lastName]
    .filter((part) => typeof part === 'string' && part.trim())
    .map((part: string) => part.trim())
    .join(' ')

  const displayName =
    composedName ||
    trimmedFallback ||
    (ownerId && !ownerId.includes('@') ? ownerId : '') ||
    'LendMIT member'

  let email: string | null = null
  if (ownerId) email = await fetchOwnerEmail(ownerId)
  if (!email && ownerId && ownerId.includes('@')) email = ownerId
  if (!email && trimmedFallback.includes('@')) email = trimmedFallback

  const bio =
    typeof profileRecord?.bio === 'string' && profileRecord.bio.trim()
      ? profileRecord.bio.trim()
      : null
  const thumbnail =
    typeof profileRecord?.thumbnail === 'string' && profileRecord.thumbnail
      ? profileRecord.thumbnail
      : null

  return {
    id: ownerId,
    displayName,
    email,
    bio,
    thumbnail,
  }
}

function openDetails(p: Post) {
  selected.value = p
  showDetails.value = true
}

async function openDetailsById(resourceId: string) {
  try {
    const fromList = posts.value.find((p) => p.id === resourceId)
    if (fromList) {
      openDetails(fromList)
      return
    }
    const fetched = await fetchByIds([resourceId])
    if (!fetched.length) return
    const enriched = await withOwnerNames(await attachTimeWindows(await attachIntents(fetched)))
    if (enriched.length && enriched[0]) openDetails(enriched[0] as Post)
  } catch (_) {}
}

async function fetchOwnerContact(
  resourceId: string,
): Promise<{ id: string | null; email: string | null }> {
  try {
    let r: any = null
    try {
      const gr = await api.post('/Resource/getResource', { resourceID: resourceId })
      r = gr.data?.resource
    } catch (_) {
      const gr2 = await api.post('/ResourceConcept/getResource', { resourceID: resourceId })
      r = gr2.data?.resource
    }
    if (r) {
      // Try extracting email directly from owner field if present in any shape
      if (typeof r.owner === 'string') {
        const o = r.owner
        if (o.includes('@')) return { id: o, email: o }
      } else if (r.owner && typeof r.owner === 'object') {
        const em = r.owner.email || r.owner.emailAddress || r.owner.mail || r.owner.username || null
        if (typeof em === 'string' && em.includes('@'))
          return { id: r.owner.id || r.owner.user || null, email: em }
      }
      // Otherwise return ids for subsequent lookup
      const ownerId =
        (typeof r.owner === 'string' && r.owner) ||
        (r.owner && typeof r.owner === 'object' && (r.owner.id || r.owner.user || r.owner.owner)) ||
        r.ownerID ||
        r.ownerId ||
        r.user ||
        null
      return { id: typeof ownerId === 'string' ? ownerId : null, email: null }
    }
  } catch (_) {}
  return { id: null, email: null }
}

async function fetchOwnerEmail(userId: string): Promise<string | null> {
  // If the user id already looks like an email, use it directly
  if (userId && /@/.test(userId)) return userId
  // Preferred: dedicated endpoint per API spec
  try {
    const resp = await api.post('/UserAuthentication/getEmail', { user: userId })
    const email = resp?.data?.email
    if (typeof email === 'string' && email.includes('@')) return email
  } catch (_) {}
  // Fallback: profile endpoints (legacy paths and concept variant)
  try {
    let prof: any = null
    try {
      const res = await api.post('/UserProfile/getProfile', { user: userId })
      prof = res.data?.profile ?? (Array.isArray(res.data) ? res.data?.[0]?.profile : res.data)
    } catch (_) {
      try {
        const res2 = await api.post('/UserProfileConcept/getProfile', { user: userId })
        prof =
          res2.data?.profile ?? (Array.isArray(res2.data) ? res2.data?.[0]?.profile : res2.data)
      } catch (_) {}
    }
    const email =
      prof?.email ||
      prof?.emailAddress ||
      prof?.mail ||
      prof?.primaryEmail ||
      prof?.contactEmail ||
      (typeof prof?.username === 'string' && prof.username.includes('@') ? prof.username : null)
    if (typeof email === 'string' && email.includes('@')) return email
  } catch (_) {}
  return null
}

function buildSubject(p: Post): string {
  const it = p.intent?.toString().toUpperCase()
  const action = it === 'BORROW' ? 'lend' : it === 'LEND' ? 'borrow' : 'connect'
  return `LendMIT: Interested to ${action} — "${p.title}"`
}

function normalizeIntentPhrase(intent?: string | null): string {
  const it = intent?.toString().toUpperCase()
  if (it === 'LEND') return 'lending'
  if (it === 'BORROW') return 'borrowing'
  return 'discussing'
}

function oppositeIntent(intent?: string | null): string | null {
  const it = intent?.toString().toUpperCase()
  if (it === 'LEND') return 'BORROW'
  if (it === 'BORROW') return 'LEND'
  return null
}

async function fetchOwnerFirstName(userId: string | null): Promise<string | null> {
  if (!userId) return null
  try {
    let prof: any = null
    try {
      const res = await api.post('/UserProfile/getProfile', { user: userId })
      prof = res.data?.profile ?? (Array.isArray(res.data) ? res.data?.[0]?.profile : res.data)
    } catch (_) {
      try {
        const res2 = await api.post('/UserProfileConcept/getProfile', { user: userId })
        prof =
          res2.data?.profile ?? (Array.isArray(res2.data) ? res2.data?.[0]?.profile : res2.data)
      } catch (_) {}
    }
    const maybeName =
      prof?.firstName ||
      prof?.givenName ||
      (typeof prof?.displayName === 'string' ? prof.displayName.split(' ')[0] : null) ||
      (typeof prof?.name === 'string' ? prof.name.split(' ')[0] : null)
    if (typeof maybeName === 'string' && maybeName.trim()) return maybeName.trim()
  } catch (_) {}
  return null
}

function buildBody(
  p: Post,
  firstName: string | null | undefined,
  senderFullName: string | null | undefined,
): string {
  const greetingName = firstName && firstName.trim() ? ` ${firstName.trim()}` : ''
  const intentPhrase = normalizeIntentPhrase(oppositeIntent(p.intent))
  // Per request: greeting + single sentence body
  const lines = [
    `Hi${greetingName},`,
    '',
    `I'm reaching out via LendMIT about ${intentPhrase} the item in the post titled "${p.title}".`,
    '',
    senderFullName && senderFullName.trim() ? `Best,\n${senderFullName.trim()}` : 'Best,',
  ]
  return lines.join('\n')
}

async function getCurrentUserFullName(): Promise<string | null> {
  try {
    const u = auth.user
    if (!u) return null
    const fn = (u.firstName || '').trim()
    const ln = (u.lastName || '').trim()
    if (fn || ln) return [fn, ln].filter(Boolean).join(' ').trim()
    // Fallback: fetch profile
    try {
      const res = await api.post('/UserProfile/getProfile', { user: u.id })
      const prof =
        res.data?.profile ?? (Array.isArray(res.data) ? res.data?.[0]?.profile : res.data)
      const full = [prof?.firstName, prof?.lastName].filter(Boolean).join(' ').trim()
      return full || null
    } catch (_) {
      try {
        const res2 = await api.post('/UserProfileConcept/getProfile', { user: u.id })
        const prof =
          res2.data?.profile ?? (Array.isArray(res2.data) ? res2.data?.[0]?.profile : res2.data)
        const full = [prof?.firstName, prof?.lastName].filter(Boolean).join(' ').trim()
        return full || null
      } catch (_) {}
    }
  } catch (_) {}
  return null
}

async function contactOwner() {
  if (!selected.value) return
  // Open a new tab immediately to preserve the user gesture and avoid popup blocking
  const newTab = window.open('', '_blank')
  if (newTab) newTab.opener = null
  contacting.value = true
  try {
    const ownerId = selected.value.ownerId
    const [resolvedTo, firstName, senderFullName] = await Promise.all([
      fetchOwnerEmail(ownerId),
      fetchOwnerFirstName(ownerId),
      getCurrentUserFullName(),
    ])
    const subject = encodeURIComponent(buildSubject(selected.value))
    const body = encodeURIComponent(buildBody(selected.value, firstName, senderFullName))

    // Outlook web compose URL (works for M365 accounts). If no email, leave blank 'to' field.
    const outlookUrl = `https://outlook.office.com/mail/deeplink/compose?to=${encodeURIComponent(
      resolvedTo || '',
    )}&subject=${subject}&body=${body}`

    if (newTab) {
      newTab.location.href = outlookUrl
    }
  } finally {
    contacting.value = false
  }
}

async function viewOwnerProfile(payload: { ownerId: string | null; ownerName: string }) {
  showOwnerProfile.value = true
  ownerProfileLoading.value = true
  ownerProfile.value = null
  try {
    ownerProfile.value = await resolveOwnerProfile(payload.ownerId, payload.ownerName)
  } finally {
    ownerProfileLoading.value = false
  }
}

async function attachIntents(list: Post[]): Promise<Post[]> {
  try {
    const res = await Promise.all(
      list.map(async (p) => ({ ...p, intent: await getIntentFor(p.id) })),
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

function formatTimeWindowText(from?: string | null, until?: string | null): string | null {
  const now = Date.now()
  const fromMs = from ? new Date(from).getTime() : NaN
  const untilMs = until ? new Date(until).getTime() : NaN
  const hasFrom = from && !Number.isNaN(fromMs)
  const hasUntil = until && !Number.isNaN(untilMs)

  const effectiveHasFrom = hasFrom && fromMs > now

  if (effectiveHasFrom && hasUntil) return `${formatReadable(from!)} – ${formatReadable(until!)}`
  if (!effectiveHasFrom && hasUntil) return `Until ${formatReadable(until!)}`
  if (effectiveHasFrom && !hasUntil) return `From ${formatReadable(from!)}`
  return 'From now'
}

async function attachTimeWindows(list: Post[]): Promise<Post[]> {
  try {
    const res = await Promise.all(
      list.map(async (p) => {
        const tw = await getTimeWindow(p.id)
        return { ...p, from: tw.from, until: tw.until }
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
    <div class="tools">
      <input class="search" v-model="q" placeholder="Search postings..." />
      <div class="intent-filters" role="group" aria-label="Filter by intent">
        <button
          class="intent-chip"
          :class="{
            'intent-chip--active': intentFilter === 'ALL',
            'intent-chip--all': intentFilter === 'ALL',
          }"
          type="button"
          @click="setIntentFilter('ALL')"
        >
          All
        </button>
        <button
          class="intent-chip"
          :class="{
            'intent-chip--active': intentFilter === 'LEND',
            'intent-chip--lend': intentFilter === 'LEND',
          }"
          type="button"
          @click="setIntentFilter('LEND')"
        >
          Lend
        </button>
        <button
          class="intent-chip"
          :class="{
            'intent-chip--active': intentFilter === 'BORROW',
            'intent-chip--borrow': intentFilter === 'BORROW',
          }"
          type="button"
          @click="setIntentFilter('BORROW')"
        >
          Borrow
        </button>
      </div>
    </div>
    <div class="list">
      <div v-if="loading" class="loading">Loading postings...</div>
      <p v-else-if="error" class="text-error" style="margin: 0.5rem 0">{{ error }}</p>
      <div v-else-if="filtered.length === 0" class="empty-state">
        <p>No postings yet.</p>
        <p style="font-size: 0.85rem">Check back later or create your own!</p>
      </div>
      <PostCard
        v-for="p in filtered"
        :key="p.id"
        :title="p.title"
        :owner="p.ownerName"
        :owner-id="p.ownerId"
        :description="p.description"
        :intent="p.intent || null"
        :time-window="formatTimeWindowText(p.from, p.until)"
        :urgent="p.urgent"
        @open="openDetails(p)"
        @view-owner="viewOwnerProfile"
      />
    </div>
  </main>

  <Modal
    :open="showDetails"
    :title="`Posting Details${selected?.urgent ? ' (URGENT)' : ''}`"
    :max-width="520"
    @close="showDetails = false"
  >
    <template v-if="selected">
      <div class="details-panel">
        <header class="details-header">
          <div class="details-badge" v-if="selected.intent">
            <span
              class="badge"
              :class="selected.intent ? selected.intent.toUpperCase() : 'DEFAULT'"
            >
              {{ (selected.intent || 'N/A').toString().toUpperCase() }}
            </span>
          </div>
          <h2 class="details-title">{{ selected.title }}</h2>
          <button
            class="details-owner"
            type="button"
            @click="
              viewOwnerProfile({
                ownerId: selected?.ownerId ?? null,
                ownerName: selected?.ownerName ?? '',
              })
            "
          >
            {{ selected.ownerName }}
          </button>
        </header>
        <p class="details-description">{{ selected.description }}</p>
        <p class="details-window">
          {{ formatTimeWindowText(selected?.from, selected?.until) }}
        </p>
        <button
          class="details-action"
          :class="{
            'intent-borrow':
              selected.intent && selected.intent.toString().toUpperCase() === 'BORROW',
            'intent-lend': selected.intent && selected.intent.toString().toUpperCase() === 'LEND',
          }"
          @click="contactOwner"
          :disabled="contacting"
        >
          {{ contactActionLabel }}
        </button>
      </div>
    </template>
  </Modal>

  <Modal
    :open="showOwnerProfile"
    title="Member Profile"
    :max-width="420"
    @close="showOwnerProfile = false"
  >
    <div v-if="ownerProfileLoading" class="profile-loading">Loading profile…</div>
    <template v-else-if="ownerProfile">
      <div class="profile-card">
        <div
          class="profile-avatar"
          :style="
            ownerProfile.thumbnail ? { backgroundImage: `url(${ownerProfile.thumbnail})` } : {}
          "
        >
          <span v-if="!ownerProfile.thumbnail" class="profile-initials">
            {{ ownerProfile.displayName.charAt(0).toUpperCase() }}
          </span>
        </div>
        <div class="profile-details">
          <h3>{{ ownerProfile.displayName }}</h3>
          <p v-if="ownerProfile.email" class="profile-email">
            <a :href="`mailto:${ownerProfile.email}`">{{ ownerProfile.email }}</a>
          </p>
          <p v-else class="profile-email profile-email--muted">Email unavailable</p>
          <p v-if="ownerProfile.bio" class="profile-bio">{{ ownerProfile.bio }}</p>
          <p v-else class="profile-bio profile-bio--muted">No bio provided.</p>
        </div>
      </div>
    </template>
    <div v-else class="profile-loading">Profile unavailable.</div>
  </Modal>
</template>

<style scoped>
.wrap {
  padding: 1.25rem;
  max-width: 1000px;
  margin: 0 auto;
}
.tools {
  display: flex;
  gap: 1rem;
  margin-bottom: 1rem;
}
.search {
  flex: 1;
  padding: 0.6rem 0.75rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-2);
  background: #fff;
  box-shadow: var(--shadow-0);
}
.intent-filters {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}
.intent-chip {
  padding: 0.45rem 0.85rem;
  border-radius: 999px;
  border: 1px solid var(--color-border);
  background: #fff;
  color: var(--color-text-secondary);
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition:
    background 0.2s ease,
    color 0.2s ease,
    box-shadow 0.2s ease;
}
.intent-chip:hover,
.intent-chip:focus-visible {
  color: #11161f;
  background: #f5f7fa;
  box-shadow: 0 2px 7px rgba(13, 22, 35, 0.12);
}
.intent-chip--active {
  /* default active style (kept for fallback) */
  background: #3e006b;
  border-color: #3e006b;
  color: #fff;
  box-shadow: 0 2px 10px rgba(62, 0, 107, 0.25);
}
.intent-chip--active:hover,
.intent-chip--active:focus-visible {
  background: #540598;
  border-color: #540598;
}

/* LEND active (red) */
.intent-chip--lend.intent-chip--active {
  background: var(--color-accent-1);
  border-color: var(--color-accent-1);
  color: #fff;
  box-shadow: 0 2px 10px rgba(117, 0, 20, 0.22);
}
.intent-chip--lend.intent-chip--active:hover,
.intent-chip--lend.intent-chip--active:focus-visible {
  background: #9b001f; /* slightly darker red */
  border-color: #9b001f;
}

/* BORROW active (purple) - preserves previous purple look */
.intent-chip--borrow.intent-chip--active {
  background: var(--color-accent-2);
  border-color: var(--color-accent-2);
  color: #fff;
  box-shadow: 0 2px 10px rgba(62, 0, 107, 0.25);
}
.intent-chip--borrow.intent-chip--active:hover,
.intent-chip--borrow.intent-chip--active:focus-visible {
  background: #540598;
  border-color: #540598;
}

/* ALL active (blue) */
.intent-chip--all.intent-chip--active {
  background: #9b959e; /* muted neutral for ALL */
  border-color: #9b959e;
  color: #fff;
  box-shadow: 0 2px 10px rgba(155, 149, 158, 0.18);
}
.intent-chip--all.intent-chip--active:hover,
.intent-chip--all.intent-chip--active:focus-visible {
  background: #868289; /* slightly darker neutral */
  border-color: #868289;
}
.list {
  display: grid;
  gap: 1rem;
}
.profile-loading {
  padding: 0.5rem 0;
  color: var(--color-text-secondary);
}
.profile-card {
  display: grid;
  justify-items: center;
  gap: 0.75rem;
  text-align: center;
}
.profile-avatar {
  width: 84px;
  height: 84px;
  border-radius: 50%;
  background: var(--color-popup);
  background-size: cover;
  background-position: center;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-secondary);
  font-weight: 700;
  font-size: 1.25rem;
  border: 1px solid var(--color-border);
}
.profile-initials {
  text-transform: uppercase;
}
.profile-details {
  display: grid;
  gap: 0.4rem;
  width: 100%;
}
.profile-details h3 {
  margin: 0;
  font-size: 1.2rem;
}
.profile-email a {
  color: var(--color-accent-2);
  font-weight: 600;
  text-decoration: none;
}
.profile-email a:hover {
  text-decoration: underline;
}
.profile-email--muted {
  color: var(--color-text-secondary);
}
.profile-bio {
  margin: 0;
  line-height: 1.4;
  color: #8b959e;
}
.profile-bio--muted {
  color: rgba(139, 149, 158, 0.7);
  font-style: italic;
}
.details-panel {
  display: grid;
  gap: 0.85rem;
}
.details-header {
  display: grid;
  gap: 0.25rem;
}
.details-title {
  margin: 0;
  font-size: 1.35rem;
  font-weight: 700;
  color: #11161f;
}
.details-badge {
  margin-bottom: 0.35rem;
}
.details-badge .badge {
  font-size: 0.6rem;
  padding: 0.08rem 0.35rem;
}
.details-owner {
  margin: 0;
  padding: 0;
  border: none;
  background: none;
  color: var(--color-text-secondary);
  font-size: 0.95rem;
  font-weight: 600;
  text-align: left;
  cursor: pointer;
}
.details-owner:hover,
.details-owner:focus-visible {
  color: var(--color-accent-2);
  text-decoration: underline;
}
.details-description {
  margin: 0;
  color: #242b35;
  line-height: 1.55;
}
.details-window {
  margin: 0;
  font-size: 0.9rem;
  color: var(--color-text-secondary);
}
.details-action {
  justify-self: start;
  padding: 0.55rem 1.15rem;
  border-radius: var(--radius-2);
  border: 1px solid var(--color-border);
  background: var(--color-surface, #fff);
  font-weight: 600;
  transition:
    background 0.2s ease,
    box-shadow 0.2s ease;
}
.details-action:hover:not(:disabled) {
  background: #f5f7fa;
  box-shadow: 0 3px 10px rgba(13, 22, 35, 0.12);
}

/* Intent-specific hover styles for contact button */
.details-action.intent-borrow:hover:not(:disabled) {
  background: var(--color-accent-2);
  color: #fff;
  box-shadow: 0 3px 10px rgba(62, 0, 107, 0.18);
  border-color: rgba(62, 0, 107, 0.2);
}
.details-action.intent-lend:hover:not(:disabled) {
  background: var(--color-accent-1);
  color: #fff;
  box-shadow: 0 3px 10px rgba(117, 0, 20, 0.18);
  border-color: rgba(117, 0, 20, 0.2);
}
.details-action:disabled {
  opacity: 0.6;
  cursor: progress;
}

/* Intent badge styles (match PostCard.vue) */
.badge {
  background: #eee;
  color: #222;
  font-size: 0.7rem;
  padding: 0.2rem 0.6rem;
  border-radius: 999px;
  font-weight: 700;
  letter-spacing: 0.4px;
  text-transform: uppercase;
}
.badge.urgent {
  background: linear-gradient(135deg, #ff4d4f 0%, #ff1744 100%);
  color: #fff;
  box-shadow: 0 2px 6px rgba(255, 77, 79, 0.3);
}
.badge.BORROW {
  background: var(--color-accent-2);
  color: #fff;
  box-shadow: 0 2px 6px rgba(62, 0, 107, 0.2);
}
.badge.LEND {
  background: var(--color-accent-1);
  color: #fff;
  box-shadow: 0 2px 6px rgba(117, 0, 20, 0.2);
}
.badge.DEFAULT {
  background: var(--color-accent-2);
  color: #fff;
  box-shadow: 0 2px 6px rgba(62, 0, 107, 0.2);
}

.details-intent-tag {
  display: inline-block;
  margin-left: 0.6em;
  padding: 0.18em 0.7em;
  font-size: 0.95em;
  font-weight: 600;
  color: #fff;
  background: #e94e77;
  border-radius: 1em;
  vertical-align: middle;
  letter-spacing: 0.03em;
  box-shadow: 0 1px 4px rgba(233, 78, 119, 0.1);
}
</style>
