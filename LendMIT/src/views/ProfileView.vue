<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue'
import NavBar from '../components/NavBar.vue'
import NotificationsDrawer from '../components/NotificationsDrawer.vue'
import { useAuthStore } from '../stores/auth'
import { api } from '../api/axiosInstance'

interface Profile {
  _id?: string
  user?: string
  firstName?: string | null
  lastName?: string | null
  bio?: string | null
  thumbnail?: string | null
}

const auth = useAuthStore()
const loading = ref(false)
const error = ref<string | null>(null)
const info = ref<string | null>(null)
const showDrawer = ref(false)

const profile = ref<Profile | null>(null)
const bio = ref<string | null>(null)
const thumbnail = ref<string | null>(null)
const saving = ref(false)
const pickingFile = ref<HTMLInputElement | null>(null)
const isEditingBio = ref(false)
const bioEdit = ref('')

const displayName = computed(() => {
  const p = profile.value
  const fromProfile = `${p?.firstName ?? ''} ${p?.lastName ?? ''}`.trim()
  const fromAuth = `${auth.user?.firstName ?? ''} ${auth.user?.lastName ?? ''}`.trim()
  // Fallback order: profile -> auth store -> email
  // @ts-ignore allow unknown shape gracefully (e.g., name field)
  return fromProfile || fromAuth || (p as any)?.name || auth.user?.email || ''
})

async function loadProfile(userId: string) {
  loading.value = true
  error.value = null
  info.value = null
  try {
    const res = await api.post('/UserProfile/getProfile', { user: userId })
    const data = res.data
    let p: Profile | null = null
    if (data?.profile) p = data.profile
    else if (Array.isArray(data) && data[0]?.profile) p = data[0].profile
    else if (Array.isArray(data) && data[0]) p = data[0]
    else if (data && typeof data === 'object') p = data as Profile

    if (
      p &&
      (p.firstName !== undefined ||
        p.lastName !== undefined ||
        p.bio !== undefined ||
        p.thumbnail !== undefined)
    ) {
      profile.value = p
      bio.value = p.bio ?? null
      thumbnail.value = p.thumbnail ?? null
    }
    // reset bio edit draft to loaded bio
    bioEdit.value = bio.value ?? ''
  } catch (e: any) {
    error.value = e?.response?.data?.error || e?.message || 'Failed to load profile'
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  if (auth.user?.id) await loadProfile(auth.user.id)
})

watch(
  () => auth.user?.id,
  async (id) => {
    if (id) await loadProfile(id)
  },
)

async function saveThumbnail() {
  if (!auth.user) return
  saving.value = true
  error.value = null
  info.value = null
  try {
    await api.post('/UserProfile/updateProfile', {
      user: auth.user.id,
      thumbnail: thumbnail.value ?? null,
    })
    // Optimistically reflect in local profile state
    profile.value = {
      ...(profile.value || {
        firstName: null,
        lastName: null,
        bio: bio.value ?? null,
        thumbnail: null,
      }),
      thumbnail: thumbnail.value ?? null,
    }
    info.value = 'Profile updated.'
  } catch (e: any) {
    error.value = e?.response?.data?.error || e?.message || 'Failed to update profile'
  } finally {
    saving.value = false
  }
}

function requestFilePick() {
  pickingFile.value?.click()
}

function onFileInputChange(ev: Event) {
  const input = ev.target as HTMLInputElement
  if (!input.files || !input.files.length) return
  handleFiles(input.files)
  // reset so picking the same file again re-fires change
  input.value = ''
}

function onDragOver(ev: DragEvent) {
  ev.preventDefault()
}

function onDrop(ev: DragEvent) {
  ev.preventDefault()
  const files = ev.dataTransfer?.files
  if (files && files.length) handleFiles(files)
}

function handleFiles(fileList: FileList | File[]) {
  const file = (fileList as FileList)[0] ?? (fileList as File[])[0]
  if (!file) return
  if (!file.type.startsWith('image/')) {
    error.value = 'Please choose an image file.'
    return
  }
  const maxBytes = 5 * 1024 * 1024 // 5MB
  if (file.size > maxBytes) {
    error.value = 'Image is too large (max 5MB).'
    return
  }
  const reader = new FileReader()
  reader.onload = () => {
    thumbnail.value = String(reader.result || '')
    // Auto-save thumbnail change immediately (only thumbnail field)
    saveThumbnail()
  }
  reader.onerror = () => {
    error.value = 'Failed to read image file.'
  }
  reader.readAsDataURL(file)
}

function startEditingBio() {
  bioEdit.value = bio.value ?? ''
  isEditingBio.value = true
}

function cancelEditingBio() {
  bioEdit.value = bio.value ?? ''
  isEditingBio.value = false
}

async function saveBio() {
  if (!auth.user) return
  saving.value = true
  error.value = null
  info.value = null
  try {
    await api.post('/UserProfile/updateProfile', {
      user: auth.user.id,
      bio: bioEdit.value || null,
    })
    bio.value = bioEdit.value || null
    info.value = 'Profile updated.'
    isEditingBio.value = false
  } catch (e: any) {
    error.value = e?.response?.data?.error || e?.message || 'Failed to update profile'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div>
    <NavBar @toggle-notifications="showDrawer = !showDrawer" />
    <NotificationsDrawer :open="showDrawer" @close="showDrawer = false" />
    <main class="wrap">
      <h1 class="page-title">Your Profile</h1>

      <p v-if="!auth.user" class="text-error">Please log in to view your profile.</p>
      <p v-if="error" class="text-error">{{ error }}</p>
      <p v-if="info" class="info">{{ info }}</p>
      <p v-if="loading" class="muted">Loading…</p>

      <section v-if="auth.user && !loading && !error" class="card">
        <div class="header">
          <div
            class="avatar"
            :style="thumbnail ? { backgroundImage: `url(${thumbnail})` } : {}"
            @click="requestFilePick"
            @dragover="onDragOver"
            @drop="onDrop"
            title="Drop an image or click to upload"
          >
            <span v-if="!thumbnail" class="avatar__placeholder">Add photo</span>
            <span class="avatar__overlay">Upload</span>
          </div>
          <div class="identity">
            <div class="name">{{ displayName || '(not set)' }}</div>
            <div class="email muted">{{ auth.user.email }}</div>
          </div>
        </div>

        <input
          ref="pickingFile"
          type="file"
          accept="image/*"
          class="hidden-input"
          @change="onFileInputChange"
        />

        <section class="bio">
          <div class="bio-title">
            <h3>Bio</h3>
            <button v-if="!isEditingBio" type="button" @click="startEditingBio">Edit</button>
          </div>
          <div v-if="!isEditingBio" class="bio-display">
            {{ bio || 'No bio yet.' }}
          </div>
          <div v-else class="bio-edit">
            <textarea
              v-model="bioEdit"
              placeholder="Tell others a bit about you"
              rows="4"
            ></textarea>
            <div class="actions">
              <button :disabled="saving" @click="saveBio" class="primary">
                {{ saving ? 'Saving…' : 'Save bio' }}
              </button>
              <button :disabled="saving" @click="cancelEditingBio">Cancel</button>
            </div>
          </div>
        </section>
      </section>
    </main>
  </div>
</template>

<style scoped>
.wrap {
  padding: 1.25rem;
  max-width: 900px;
  margin: 0 auto;
}
.page-title {
  margin: 0 0 1rem;
}
.muted {
  color: var(--color-text-secondary);
}
.info {
  color: var(--color-accent-2);
}
.card {
  background: #fff;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-4);
  box-shadow: var(--shadow-1);
  padding: 1rem;
  display: grid;
  gap: 1rem;
}
.header {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 1rem;
  align-items: center;
}
.avatar {
  width: 96px;
  height: 96px;
  border-radius: 50%;
  border: 1px dashed var(--color-border);
  background-color: var(--color-popup);
  background-size: cover;
  background-position: center;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-secondary);
  cursor: pointer;
  user-select: none;
  transition:
    box-shadow var(--dur-med) var(--ease),
    border-color var(--dur-fast) var(--ease);
  position: relative;
  overflow: hidden;
}
.avatar:hover {
  box-shadow: var(--ring);
  border-color: var(--color-accent-2);
}
.avatar__placeholder {
  font-size: 12px;
}
.avatar__overlay {
  position: absolute;
  inset: 0;
  background: rgba(62, 0, 107, 0.76);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.8rem;
  font-weight: 700;
  letter-spacing: 0.3px;
  opacity: 0;
  transition: opacity var(--dur-fast) var(--ease);
  pointer-events: none; /* allow click-through to avatar */
  text-transform: uppercase;
}
.avatar:hover .avatar__overlay {
  opacity: 1;
}
.identity .name {
  font-weight: 700;
  font-size: 1.25rem;
}
.identity .email {
  font-size: 1.05rem;
}
.hidden-input {
  display: none;
}

.bio {
  display: grid;
  gap: 0.5rem;
}
.bio-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}
.bio-display {
  white-space: pre-wrap;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-2);
  padding: 0.6rem 0.75rem;
  background: #fff;
}
.bio-edit {
  display: grid;
  gap: 0.5rem;
}
.actions {
  display: flex;
  gap: 0.5rem;
}

@media (max-width: 520px) {
  .header {
    grid-template-columns: 1fr;
  }
  .avatar {
    width: 80px;
    height: 80px;
  }
}
</style>
