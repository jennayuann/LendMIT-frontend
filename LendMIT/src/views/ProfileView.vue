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
    <main style="padding: 1rem 1.25rem">
      <h1 style="margin: 0 0 1rem">Your Profile</h1>

      <p v-if="!auth.user" style="color: #b00020">Please log in to view your profile.</p>
      <p v-if="error" style="color: #b00020">{{ error }}</p>
      <p v-if="info" style="color: #385898">{{ info }}</p>
      <p v-if="loading">Loading…</p>

      <section v-if="auth.user && !loading && !error">
        <div style="display: grid; gap: 0.75rem; max-width: 620px">
          <div style="display: flex; gap: 1rem; align-items: center">
            <div
              class="avatar"
              :style="thumbnail ? { backgroundImage: `url(${thumbnail})` } : {}"
              @click="requestFilePick"
              @dragover="onDragOver"
              @drop="onDrop"
              title="Drop an image or click to upload"
            >
              <span v-if="!thumbnail" class="avatar__placeholder">Add photo</span>
            </div>
            <div>
              <div><strong>Name:</strong> {{ displayName || '(not set)' }}</div>
              <div><strong>Email:</strong> {{ auth.user.email }}</div>
            </div>
          </div>

          <input
            ref="pickingFile"
            type="file"
            accept="image/*"
            style="display: none"
            @change="onFileInputChange"
          />

          <section style="display: grid; gap: 0.25rem">
            <div
              style="
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 0.5rem;
              "
            >
              <span><strong>Bio</strong></span>
              <button
                v-if="!isEditingBio"
                type="button"
                @click="startEditingBio"
                style="
                  background: white;
                  border: 1px solid #e1e1ea;
                  border-radius: 8px;
                  padding: 0.25rem 0.5rem;
                  cursor: pointer;
                "
              >
                Edit
              </button>
            </div>

            <div
              v-if="!isEditingBio"
              style="
                color: #333;
                white-space: pre-wrap;
                border: 1px solid #f0f0f5;
                border-radius: 8px;
                padding: 0.5rem;
              "
            >
              {{ bio || 'No bio yet.' }}
            </div>

            <div v-else style="display: grid; gap: 0.5rem">
              <textarea
                v-model="bioEdit"
                placeholder="Tell others a bit about you"
                rows="4"
              ></textarea>
              <div style="display: flex; gap: 0.5rem">
                <button
                  :disabled="saving"
                  @click="saveBio"
                  style="
                    background: #2a7dfb;
                    color: #fff;
                    border: none;
                    border-radius: 8px;
                    padding: 0.4rem 0.6rem;
                    cursor: pointer;
                  "
                >
                  {{ saving ? 'Saving…' : 'Save bio' }}
                </button>
                <button
                  :disabled="saving"
                  @click="cancelEditingBio"
                  style="
                    background: white;
                    color: #333;
                    border: 1px solid #e1e1ea;
                    border-radius: 8px;
                    padding: 0.4rem 0.6rem;
                    cursor: pointer;
                  "
                >
                  Cancel
                </button>
              </div>
            </div>
          </section>
        </div>
      </section>
    </main>
  </div>
</template>

<style scoped>
.avatar {
  width: 88px;
  height: 88px;
  border-radius: 50%;
  border: 1px dashed #c9c9d3;
  background-color: #fafafd;
  background-size: cover;
  background-position: center;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #666;
  cursor: pointer;
  user-select: none;
}
.avatar__placeholder {
  font-size: 12px;
}
</style>
