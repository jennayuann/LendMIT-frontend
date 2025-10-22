// Centralized API endpoint configuration with Vite env overrides.

function normalizePath(p: string | undefined): string | undefined {
  if (!p) return undefined
  let out = p.trim()
  // Allow users to paste full /api/* paths; our axios baseURL already includes /api
  if (out.startsWith('/api/')) out = out.slice(4)
  if (!out.startsWith('/')) out = '/' + out
  return out
}

export function getFollowingEndpoints() {
  const prefix = normalizePath(import.meta.env.VITE_FOLLOWING_PREFIX) || '/Following'
  const getFollowees =
    normalizePath(import.meta.env.VITE_FOLLOWING_GET_FOLLOWEES) || `${prefix}/getFollowees`
  const follow = normalizePath(import.meta.env.VITE_FOLLOWING_FOLLOW) || `${prefix}/follow`
  const unfollow = normalizePath(import.meta.env.VITE_FOLLOWING_UNFOLLOW) || `${prefix}/unfollow`
  return { prefix, getFollowees, follow, unfollow }
}
