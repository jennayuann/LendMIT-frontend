<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { api } from '../api/axiosInstance'
import { CATEGORIES, type Category } from '../constants/categories'
import { useAuthStore } from '../stores/auth'

const props = defineProps<{
  open: boolean
  post?: {
    id?: string
    name?: string
    category?: string | null
    description?: string | null
  } | null
}>()
const emit = defineEmits<{
  (e: 'close'): void
  (
    e: 'saved',
    resource: {
      id: string
      owner: string
      name: string
      category: string | null
      description: string | null
    },
  ): void
  (
    e: 'reconciled',
    payload: {
      oldId: string
      resource: {
        id: string
        owner: string
        name: string
        category: string | null
        description: string | null
      }
    },
  ): void
}>()

const auth = useAuthStore()
const name = ref('')
const category = ref<Category | null>(null)
const description = ref<string | null>(null)
const intent = ref<string>('LEND')
const availableIntents = ref<string[]>(['LEND', 'BORROW'])

async function loadIntents() {
  try {
    const res = await api.post('/ResourceIntent/listIntents', {})
    if (Array.isArray(res.data) && res.data.length > 0) availableIntents.value = res.data
    else if (Array.isArray(res.data?.intentNames) && res.data.intentNames.length > 0)
      availableIntents.value = res.data.intentNames
  } catch {}
  if (!availableIntents.value || availableIntents.value.length === 0)
    availableIntents.value = ['LEND', 'BORROW']
  if (!availableIntents.value.includes(intent.value))
    intent.value = availableIntents.value[0] || 'LEND'
}

async function ensureIntentDefined(name: string) {
  try {
    await api.post('/ResourceIntent/defineIntent', { intentName: name })
  } catch {}
}

watch(
  () => props.post,
  (p) => {
    name.value = p?.name || ''
    if (p?.category && (CATEGORIES as readonly string[]).includes(p.category))
      category.value = p.category as Category
    else category.value = null
    description.value = p?.description ?? null
    intent.value = availableIntents.value[0] || 'LEND'
    if (p?.id) {
      api
        .post('/ResourceIntent/getIntent', { resource: p.id })
        .then((res) => {
          const data = res.data
          const it = (data && (data.intent || data?.[0]?.intent)) as string | undefined
          if (it && typeof it === 'string') intent.value = it
        })
        .catch(() => {})
    }
  },
  { immediate: true },
)

async function save() {
  if (!auth.user) return
  if (props.post?.id) {
    await api.post('/Resource/updateResource', {
      resourceID: props.post.id,
      name: name.value || null,
      category: category.value ?? null,
      description: description.value ?? null,
    })
    const updated = {
      id: props.post.id,
      owner: auth.user.id,
      name: name.value,
      category: category.value ?? null,
      description: description.value ?? null,
    }
    emit('saved', updated)
    // Close immediately for snappier UX; continue intent network calls in background
    emit('close')
    // Set intent after emitting saved to avoid UI delay
    try {
      await ensureIntentDefined(intent.value)
      await api.post('/ResourceIntent/setIntent', { resource: props.post.id, intent: intent.value })
    } catch (e0) {
      try {
        await ensureIntentDefined('LEND')
        await ensureIntentDefined('BORROW')
        await api.post('/ResourceIntent/setIntent', {
          resource: props.post.id,
          intent: intent.value,
        })
      } catch (e1) {
        console.warn('ResourceIntent.setIntent failed on update', e0, e1)
      }
    }
  } else {
    // Optimistic, in-memory: emit a temp item immediately, then reconcile with server ID
    const tempId = `tmp_${Date.now().toString(16)}_${Math.random().toString(36).slice(2, 10)}`
    const optimistic = {
      id: tempId,
      owner: auth.user.id,
      name: name.value,
      category: category.value ?? null,
      description: description.value ?? null,
    }
    emit('saved', optimistic)
    // Close immediately for fast UX
    emit('close')

    let resourceID: string | null = null
    try {
      const createRes = await api.post('/Resource/createResource', {
        owner: auth.user.id,
        name: name.value,
        category: category.value ?? null,
        description: description.value ?? null,
      })
      const d = createRes?.data
      if (d) {
        const pick = (v: any) =>
          typeof v === 'string' ? v : typeof v === 'number' ? String(v) : null
        resourceID =
          pick(d.resourceID) ||
          pick(d.id) ||
          pick(d?.resource?.id) ||
          (Array.isArray(d) && pick(d[0]?.resourceID)) ||
          (Array.isArray(d) && pick(d[0]?.id)) ||
          (Array.isArray(d) && pick(d[0]?.resource?.id)) ||
          (Array.isArray(d?.resourceIDs) && pick(d.resourceIDs[0])) ||
          null
      }
    } catch (e) {
      console.warn('Resource.createResource failed', e)
    }

    if (resourceID) {
      const created = {
        id: resourceID,
        owner: auth.user.id,
        name: name.value,
        category: category.value ?? null,
        description: description.value ?? null,
      }
      emit('reconciled', { oldId: tempId, resource: created })
      try {
        await ensureIntentDefined(intent.value)
        await api.post('/ResourceIntent/setIntent', { resource: resourceID, intent: intent.value })
      } catch (e1) {
        try {
          await ensureIntentDefined('LEND')
          await ensureIntentDefined('BORROW')
          await api.post('/ResourceIntent/setIntent', {
            resource: resourceID,
            intent: intent.value,
          })
        } catch (e2) {
          console.warn('ResourceIntent.setIntent failed on create', e1, e2)
        }
      }
    }
  }
}

onMounted(loadIntents)
</script>

<template>
  <div v-if="open" class="modal">
    <div class="sheet">
      <header class="head">
        <h3>{{ props.post?.id ? 'Edit posting' : 'Create posting' }}</h3>
        <button class="icon" @click="$emit('close')">✕</button>
      </header>
      <div class="body">
        <label>Title<input v-model="name" placeholder="Title" required /></label>
        <div class="field">
          <span class="field-label">Intent</span>
          <div class="segmented" role="radiogroup" aria-label="Intent">
            <label v-for="i in availableIntents" :key="i" class="seg">
              <input type="radio" name="intent" :value="i" v-model="intent" />
              <span>{{ i }}</span>
            </label>
          </div>
        </div>
        <label>
          Category
          <select v-model="category">
            <option :value="null">Uncategorized</option>
            <option v-for="c in CATEGORIES" :key="c" :value="c">{{ c }}</option>
          </select>
        </label>
        <label
          >Description<textarea v-model="description" placeholder="Description"></textarea>
        </label>
      </div>
      <footer class="foot">
        <button class="primary" @click="save">Save</button>
      </footer>
    </div>
  </div>
</template>

<style scoped>
.modal {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.35);
  display: grid;
  place-items: center;
  z-index: 55;
}
.sheet {
  width: min(720px, 94vw);
  background: #fff;
  border-radius: 12px;
  /* Allow native dropdowns to render beyond the sheet bounds */
  overflow: visible;
  max-width: 94vw;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
}
.head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid #eee;
}
.body {
  display: grid;
  gap: 0.75rem;
  padding: 1rem;
  flex: 1 1 auto;
  overflow: auto;
}
.foot {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  border-top: 1px solid #eee;
}
input,
textarea {
  width: 100%;
  padding: 0.6rem 0.75rem;
  border: 1px solid #e1e1ea;
  border-radius: 8px;
  resize: none;
  box-sizing: border-box;
}
select {
  width: 100%;
  padding: 0.6rem 0.75rem;
  border: 1px solid #e1e1ea;
  border-radius: 8px;
  background: white;
  box-sizing: border-box;
}
.body > label {
  display: grid;
  gap: 0.25rem;
}
.body > .field {
  display: grid;
  gap: 0.25rem;
}
.field-label {
  font-size: 0.9rem;
  color: #333;
}
.segmented {
  display: inline-flex;
  gap: 0.25rem;
}
.seg {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.35rem 0.6rem;
  border: 1px solid #e1e1ea;
  border-radius: 999px;
  cursor: pointer;
  user-select: none;
}
.seg input[type='radio'] {
  accent-color: #2a7dfb;
}
.icon {
  background: transparent;
  border: none;
  font-size: 1rem;
  cursor: pointer;
}
.primary {
  background: #2a7dfb;
  color: #fff;
  border: none;
  border-radius: 8px;
  padding: 0.5rem 0.75rem;
  cursor: pointer;
}
</style>
