import { defineStore } from 'pinia'
import { api } from '../api/axiosInstance'

export const useSubscriptionsStore = defineStore('subscriptions', {
  state: () => ({
    followees: [] as string[],
    loading: false as boolean,
    error: null as string | null,
    info: null as string | null,
  }),
  actions: {
    resetMessages() {
      this.error = null
      this.info = null
    },
    async refresh(follower: string) {
      this.loading = true
      this.resetMessages()
      try {
        const res = await api.post('/Following/getFollowees', { follower })
        let out: string[] = []
        const d = res.data
        if (Array.isArray(d) && d[0] && Array.isArray(d[0].followeeIDs)) {
          out = d[0].followeeIDs as string[]
        } else if (d && Array.isArray((d as any).followeeIDs)) {
          out = (d as any).followeeIDs as string[]
        } else if (Array.isArray(d) && d.every((x) => typeof x === 'string')) {
          out = d as string[]
        } else if (Array.isArray(d) && d.every((x: any) => typeof x?.followee === 'string')) {
          out = (d as any[]).map((x: any) => x.followee as string)
        } else if (
          Array.isArray(d) &&
          d.every((x: any) => x && typeof x?.follower?.followee === 'string')
        ) {
          out = (d as any[]).map((x: any) => x.follower.followee as string)
        }
        this.followees = out
      } catch (e: any) {
        const status = e?.response?.status
        const url = (e?.config?.baseURL || '') + (e?.config?.url || '/Following/getFollowees')
        const msg = e?.response?.data?.error || e?.message || 'Failed to load followees'
        this.error = status ? `${msg} (HTTP ${status}) at ${url}` : `${msg} at ${url}`
      } finally {
        this.loading = false
      }
    },
    async follow(follower: string, followee: string) {
      this.loading = true
      this.resetMessages()
      try {
        const f = (follower || '').toString().trim()
        const fe = (followee || '').toString().trim()
        if (!f || !fe) {
          this.error = 'Follower and followee are required.'
          return
        }
        if (import.meta.env.DEV) {
          // eslint-disable-next-line no-console
          console.debug('POST /Following/follow payload', { follower: f, followee: fe })
        }
        await api.post('/Following/follow', { follower: f, followee: fe })
        // Optimistic UI: reflect immediately
        if (!this.followees.includes(fe)) this.followees = [...this.followees, fe]
        // Optionally verify
        try {
          const chk = await api.post('/Following/isFollowing', { follower: f, followee: fe })
          const is = !!chk.data?.[0]?.isFollowing || !!chk.data?.isFollowing
          if (!is) this.info = `Subscribe requested for ${fe}. Awaiting confirmation.`
          else this.info = `Subscribed to ${fe}.`
        } catch {
          this.info = `Subscribed to ${fe}.`
        }
        await this.refresh(f)
      } catch (e: any) {
        const status = e?.response?.status
        const url = (e?.config?.baseURL || '') + (e?.config?.url || '/Following/follow')
        const msg = e?.response?.data?.error || e?.message || 'Failed to subscribe'
        this.error = status ? `${msg} (HTTP ${status}) at ${url}` : `${msg} at ${url}`
      } finally {
        this.loading = false
      }
    },
    async unfollow(follower: string, followee: string) {
      this.loading = true
      this.resetMessages()
      try {
        const f = (follower || '').toString().trim()
        const fe = (followee || '').toString().trim()
        if (!f || !fe) {
          this.error = 'Follower and followee are required.'
          return
        }
        await api.post('/Following/unfollow', { follower: f, followee: fe })
        this.info = 'Unsubscribed.'
        // Optimistic UI
        this.followees = this.followees.filter((x) => x !== fe)
        await this.refresh(f)
      } catch (e: any) {
        const status = e?.response?.status
        const url = (e?.config?.baseURL || '') + (e?.config?.url || '/Following/unfollow')
        const msg = e?.response?.data?.error || e?.message || 'Failed to unsubscribe'
        this.error = status ? `${msg} (HTTP ${status}) at ${url}` : `${msg} at ${url}`
      } finally {
        this.loading = false
      }
    },
  },
})
