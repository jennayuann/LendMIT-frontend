import { defineStore } from 'pinia'
import { api } from '../api/axiosInstance'
import { useAuthStore } from './auth'

export type Resource = {
  id: string
  owner: string
  name: string
  category: string | null
  description: string | null
}

type IntentCache = Record<string, string | null>

function lsKey(userId: string) {
  return `myResources:${userId}`
}

export const useResourcesStore = defineStore('resources', {
  state: () => ({
    myResources: [] as Resource[],
    feed: [] as Resource[],
    intents: {} as IntentCache,
    loading: false as boolean,
    error: null as string | null,
  }),
  actions: {
    resetMessages() {
      this.error = null
    },
    addLocal(resource: Resource) {
      // Add to in-memory lists
      const existing = this.myResources.find((r) => r.id === resource.id)
      if (!existing) this.myResources.unshift(resource)
      const fexist = this.feed.find((r) => r.id === resource.id)
      if (!fexist) this.feed.unshift(resource)

      // Persist to localStorage per-user
      const auth = useAuthStore()
      const userId = auth.user?.id
      if (userId) {
        try {
          const key = lsKey(userId)
          const current: Resource[] = JSON.parse(localStorage.getItem(key) || '[]')
          const idx = current.findIndex((r) => r.id === resource.id)
          if (idx >= 0) current[idx] = resource
          else current.unshift(resource)
          localStorage.setItem(key, JSON.stringify(current))
        } catch (_) {
          // ignore storage errors
        }
      }
    },
    setIntentLocal(resourceId: string, intent: string | null) {
      this.intents[resourceId] = intent
    },
    async fetchIntent(resourceId: string) {
      try {
        const res = await api.post('/ResourceIntent/getIntent', { resource: resourceId })
        const data = res.data
        const value: string | null = (data && (data.intent || data?.[0]?.intent)) || null
        this.intents[resourceId] = typeof value === 'string' ? value : null
      } catch (_) {
        this.intents[resourceId] = null
      }
      return this.intents[resourceId]
    },
    async refreshMyResources() {
      const auth = useAuthStore()
      const userId = auth.user?.id
      if (!userId) return
      this.loading = true
      this.resetMessages()
      try {
        // Try known patterns for listing by owner
        let list: Resource[] | null = null
        try {
          const r1 = await api.post('/Resource/listResourcesByOwner', { owner: userId })
          if (Array.isArray(r1.data)) list = r1.data
          else if (Array.isArray(r1.data?.resources)) list = r1.data.resources
        } catch (_) {}
        if (!list) {
          try {
            const r2 = await api.post('/Resource/listByOwner', { owner: userId })
            if (Array.isArray(r2.data)) list = r2.data
            else if (Array.isArray(r2.data?.resources)) list = r2.data.resources
          } catch (_) {}
        }
        if (!list) {
          // Fallback to localStorage cache
          try {
            const key = lsKey(userId)
            list = JSON.parse(localStorage.getItem(key) || '[]')
          } catch (_) {
            list = []
          }
        }
        this.myResources = (list || []).map((r: any) => ({
          id: r.id || r._id || r.resourceID || r.resource || '',
          owner: r.owner,
          name: r.name,
          category: r.category ?? null,
          description: r.description ?? null,
        }))
      } catch (err: any) {
        this.error = err?.response?.data?.error || err?.message || 'Failed to load resources'
      } finally {
        this.loading = false
      }
    },
    async refreshFeed() {
      // If a global listing endpoint exists, try it first
      this.loading = true
      this.resetMessages()
      try {
        let list: Resource[] | null = null
        try {
          const r = await api.post('/Resource/listResources', {})
          if (Array.isArray(r.data)) list = r.data
          else if (Array.isArray(r.data?.resources)) list = r.data.resources
        } catch (_) {}
        if (!list) {
          // Fallback: show myResources as the feed for now
          list = this.myResources.slice()
        }
        this.feed = (list || []).map((r: any) => ({
          id: r.id || r._id || r.resourceID || r.resource || '',
          owner: r.owner,
          name: r.name,
          category: r.category ?? null,
          description: r.description ?? null,
        }))
      } catch (err: any) {
        this.error = err?.response?.data?.error || err?.message || 'Failed to load feed'
      } finally {
        this.loading = false
      }
    },
  },
})
