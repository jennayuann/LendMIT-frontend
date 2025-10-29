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
  close: []
  saved: [
    resource: {
      id: string
      owner: string
      name: string
      category: string | null
      description: string | null
      intent?: string | null
    },
  ]
  reconciled: [
    payload: {
      oldId: string
      resource: {
        id: string
        owner: string
        name: string
        category: string | null
        description: string | null
        intent?: string | null
      }
    },
  ]
}>()

const auth = useAuthStore()
const name = ref('')
const category = ref<Category | null>(null)
const description = ref<string | null>(null)
const intent = ref<string>('')
const availableIntents = ref<string[]>(['LEND', 'BORROW'])
// Time window state (12-hour with 15-min increments)
const setStart = ref<boolean>(false)
const setEnd = ref<boolean>(false)
const startDate = ref<string>('') // YYYY-MM-DD
const startHour = ref<number>(12) // 1-12
const startMinute = ref<number>(0) // 0,15,30,45
const startAmPm = ref<'AM' | 'PM'>('AM')
const endDate = ref<string>('')
const endHour = ref<number>(12)
const endMinute = ref<number>(0)
const endAmPm = ref<'AM' | 'PM'>('AM')
const formError = ref<string | null>(null)
const timeError = ref<string | null>(null)

async function loadIntents() {
  try {
    let data: any
    try {
      const res = await api.post('/ResourceIntent/listIntents', {})
      data = res.data
    } catch (_) {
      const res2 = await api.post('/ResourceIntentConcept/listIntents', {})
      data = res2.data
    }
    if (Array.isArray(data) && data.length > 0) availableIntents.value = data
    else if (Array.isArray(data?.intentNames) && data.intentNames.length > 0)
      availableIntents.value = data.intentNames
  } catch {}
  if (!availableIntents.value || availableIntents.value.length === 0)
    availableIntents.value = ['LEND', 'BORROW']
  // Do not auto-select an intent for new posts; if current intent becomes invalid, clear it
  if (intent.value && !availableIntents.value.includes(intent.value)) intent.value = ''
}

function resetForCreate() {
  // Clear all form fields when opening the modal for a new post
  name.value = ''
  category.value = null
  description.value = null
  intent.value = ''
  startDate.value = ''
  endDate.value = ''
  startHour.value = 12
  startMinute.value = 0
  startAmPm.value = 'AM'
  endHour.value = 12
  endMinute.value = 0
  endAmPm.value = 'AM'
  setStart.value = false
  setEnd.value = false
  formError.value = null
  timeError.value = null
}
// Helpers to convert between ISO and local 12-hour parts
function clamp15(min: number): 0 | 15 | 30 | 45 {
  const m = Math.max(0, Math.min(59, Math.floor(min)))
  const steps = [0, 15, 30, 45] as const
  const idx = Math.max(0, Math.min(3, Math.floor(m / 15))) as 0 | 1 | 2 | 3
  return steps[idx]
}

function isoToLocalParts(
  iso: string | null | undefined,
): { date: string; hour12: number; minute: 0 | 15 | 30 | 45; ampm: 'AM' | 'PM' } | null {
  if (!iso) return null
  const d = new Date(iso)
  if (isNaN(d.getTime())) return null
  // Build local parts
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  const hours24 = d.getHours()
  const mins = d.getMinutes()
  const ampm: 'AM' | 'PM' = hours24 >= 12 ? 'PM' : 'AM'
  const hour12Raw = hours24 % 12
  const hour12 = hour12Raw === 0 ? 12 : hour12Raw
  const minute = clamp15(mins)
  return { date: `${yyyy}-${mm}-${dd}`, hour12, minute, ampm }
}

function localPartsToISO(
  dateStr: string,
  hour12: number,
  minute: 0 | 15 | 30 | 45,
  ampm: 'AM' | 'PM',
): string | null {
  if (!dateStr) return null
  const [y, m, d] = dateStr.split('-').map((n) => parseInt(n, 10))
  if (!y || !m || !d) return null
  const h12 = Math.max(1, Math.min(12, Math.floor(hour12)))
  const h24 = (h12 % 12) + (ampm === 'PM' ? 12 : 0)
  const dt = new Date(y, m - 1, d, h24, minute, 0)
  if (isNaN(dt.getTime())) return null
  return dt.toISOString()
}

async function loadTimeWindow(resourceId: string) {
  try {
    let data: any
    try {
      data = (await api.post('/TimeBoundedResource/getTimeWindow', { resource: resourceId })).data
    } catch (_) {
      data = (await api.post('/TimeBoundedResourceConcept/getTimeWindow', { resource: resourceId }))
        .data
    }
    let entry: any = null
    if (Array.isArray(data) && data.length) entry = data[0]
    else if (data && typeof data === 'object') entry = data
    const af = entry?.availableFrom ?? entry?.from ?? null
    const au = entry?.availableUntil ?? entry?.until ?? null

    // Treat past/equal start as unset ("From now"), only prefill if it's in the future
    const now = Date.now()
    const afStr = typeof af === 'string' ? af : null
    const auStr = typeof au === 'string' ? au : null
    const afMs = afStr ? new Date(afStr).getTime() : NaN
    if (afStr && !Number.isNaN(afMs) && afMs > now) {
      const p = isoToLocalParts(afStr)
      if (p) {
        startDate.value = p.date
        startHour.value = p.hour12
        startMinute.value = p.minute
        startAmPm.value = p.ampm
        setStart.value = true
      }
    } else {
      startDate.value = ''
      startHour.value = 12
      startMinute.value = 0
      startAmPm.value = 'AM'
      setStart.value = false
    }
    const pend = isoToLocalParts(auStr)
    if (pend) {
      endDate.value = pend.date
      endHour.value = pend.hour12
      endMinute.value = pend.minute
      endAmPm.value = pend.ampm
      setEnd.value = true
    } else {
      endDate.value = ''
      endHour.value = 12
      endMinute.value = 0
      endAmPm.value = 'AM'
      setEnd.value = false
    }
  } catch (_) {
    startDate.value = ''
    endDate.value = ''
    startHour.value = 12
    startMinute.value = 0
    startAmPm.value = 'AM'
    endHour.value = 12
    endMinute.value = 0
    endAmPm.value = 'AM'
    setStart.value = false
    setEnd.value = false
  }
}

async function ensureIntentDefined(name: string) {
  const variants = [{ intentName: name }, { name }]
  // Try both route families with both body shapes
  for (const body of variants) {
    try {
      await api.post('/ResourceIntent/defineIntent', body)
      return
    } catch (e: any) {
      const status = e?.response?.status
      // If defined already, we're fine
      if (status === 409 || status === 400) {
        // Continue to concept route just in case, but treat as ok if one succeeds
      }
      try {
        await api.post('/ResourceIntentConcept/defineIntent', body)
        return
      } catch (_) {
        // continue loop to next variant
      }
    }
  }
}

async function setIntentForResource(resourceId: string, intentName: string) {
  const bodies = [
    { resource: resourceId, intent: intentName },
    { resourceID: resourceId, intent: intentName },
    { resource: resourceId, intentName: intentName },
    { resourceID: resourceId, intentName: intentName },
  ]
  // Try both route families with body variants; log first meaningful error
  let lastErr: any = null
  for (const body of bodies) {
    try {
      await api.post('/ResourceIntent/setIntent', body)
      return
    } catch (e1: any) {
      lastErr = e1
      try {
        await api.post('/ResourceIntentConcept/setIntent', body)
        return
      } catch (e2: any) {
        lastErr = e2
      }
    }
  }
  if (lastErr) {
    const resp = lastErr?.response
    console.error('setIntent failed', {
      resourceId,
      intentName,
      status: resp?.status,
      data: resp?.data,
      message: lastErr?.message,
    })
  }
}

async function getIntentForResource(resourceId: string): Promise<string | null> {
  try {
    let data: any
    try {
      data = (await api.post('/ResourceIntent/getIntent', { resource: resourceId })).data
    } catch (_) {
      data = (await api.post('/ResourceIntentConcept/getIntent', { resource: resourceId })).data
    }
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
  return null
}

async function verifyIntentAssociation(resourceId: string, intentName: string, attempts = 3) {
  for (let i = 0; i < attempts; i++) {
    const current = await getIntentForResource(resourceId)
    if (current && current.toUpperCase() === intentName.toUpperCase()) return true
    // Try to self-heal by re-setting the intent (no intent definition creation here)
    await setIntentForResource(resourceId, intentName)
    // small backoff
    await new Promise((r) => setTimeout(r, 150 * (i + 1)))
  }
  console.warn('Intent association verification failed', { resourceId, intentName })
  return false
}

watch(
  () => props.post,
  (p) => {
    name.value = p?.name || ''
    if (p?.category && (CATEGORIES as readonly string[]).includes(p.category))
      category.value = p.category as Category
    else category.value = null
    description.value = p?.description ?? null
    // Do not default intent; for edits we'll fetch it, for creates keep empty
    if (!p?.id) intent.value = ''
    if (p?.id) {
      const id = p.id
      ;(async () => {
        try {
          let data: any
          try {
            const r1 = await api.post('/ResourceIntent/getIntent', { resource: id })
            data = r1.data
          } catch (_) {
            const r2 = await api.post('/ResourceIntentConcept/getIntent', { resource: id })
            data = r2.data
          }
          const it = (data && (data.intent || data?.[0]?.intent)) as string | undefined
          if (it && typeof it === 'string') intent.value = it
        } catch (_) {}
        await loadTimeWindow(id)
      })()
    }
    if (!p?.id) {
      // Reset time state for create
      startDate.value = ''
      endDate.value = ''
      startHour.value = 12
      startMinute.value = 0
      startAmPm.value = 'AM'
      endHour.value = 12
      endMinute.value = 0
      endAmPm.value = 'AM'
      setStart.value = false
      setEnd.value = false
      formError.value = null
      timeError.value = null
    }
  },
  { immediate: true },
)

// Ensure that when the modal is opened for a fresh create (open=true && no post)
// we always clear stale form fields even if `props.post` did not change.
watch(
  () => props.open,
  (isOpen) => {
    if (isOpen && !props.post?.id) {
      resetForCreate()
      // Also ensure intents are loaded for the create form
      loadIntents()
    }
  },
)

async function save() {
  if (!auth.user) return
  formError.value = null
  timeError.value = null
  const creating = !props.post?.id
  if (creating) {
    if (!name.value || name.value.trim().length === 0) {
      formError.value = 'Title is required.'
      return
    }
    if (!intent.value || String(intent.value).trim().length === 0) {
      formError.value = 'Intent is required.'
      return
    }
  }
  // Time validations using local parts
  const now = Date.now()
  const startISO = setStart.value
    ? localPartsToISO(
        startDate.value,
        startHour.value,
        startMinute.value as 0 | 15 | 30 | 45,
        startAmPm.value,
      )
    : null
  const endISO = setEnd.value
    ? localPartsToISO(
        endDate.value,
        endHour.value,
        endMinute.value as 0 | 15 | 30 | 45,
        endAmPm.value,
      )
    : null
  if (setStart.value && startISO) {
    const s = new Date(startISO).getTime()
    if (!Number.isNaN(s) && s < now) {
      timeError.value = 'Start time cannot be before now.'
      return
    }
  }
  if (setEnd.value && endISO && setStart.value && startISO) {
    const s = new Date(startISO).getTime()
    const e = new Date(endISO).getTime()
    if (!Number.isNaN(s) && !Number.isNaN(e) && e < s) {
      timeError.value = 'End time cannot be before start time.'
      return
    }
  }
  if (setEnd.value && endISO && (!setStart.value || !startISO)) {
    const e = new Date(endISO).getTime()
    if (!Number.isNaN(e) && e < now) {
      timeError.value = 'End time cannot be before start time.'
      return
    }
  }
  if (props.post?.id) {
    await api.post('/Resource/updateResource', {
      resourceID: props.post.id,
      name: name.value || null,
      category: category.value ?? null,
      description: description.value ?? null,
    })
    // Upsert time window always per spec; when unset, send nulls
    try {
      const body: any = { resource: props.post.id }
      body.availableFrom = startISO
      body.availableUntil = endISO
      await api.post('/TimeBoundedResource/defineTimeWindow', body)
    } catch (_) {
      try {
        const body: any = { resource: props.post.id }
        body.availableFrom = startISO
        body.availableUntil = endISO
        await api.post('/TimeBoundedResourceConcept/defineTimeWindow', body)
      } catch (e2) {
        console.warn('defineTimeWindow failed', e2)
      }
    }
    const updated = {
      id: props.post.id,
      owner: auth.user.id,
      name: name.value,
      category: category.value ?? null,
      description: description.value ?? null,
      intent: intent.value,
    }
    emit('saved', updated)
    // Close immediately for snappier UX; continue intent network calls in background
    emit('close')
    // Set intent after emitting saved to avoid UI delay (no defineIntent calls here)
    if (intent.value) {
      await setIntentForResource(props.post.id, intent.value)
      // Verify persistence and self-heal if needed
      verifyIntentAssociation(props.post.id, intent.value)
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
      intent: intent.value,
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
      if (typeof d === 'string') {
        resourceID = d
      } else if (d) {
        const pick = (v: any) =>
          typeof v === 'string' ? v : typeof v === 'number' ? String(v) : null
        resourceID =
          pick(d.resourceID) ||
          pick(d.resourceId) ||
          pick(d.id) ||
          pick(d?.resource?.id) ||
          pick(d?.resource?.resourceID) ||
          pick(d?.resource?.resourceId) ||
          (Array.isArray(d) && pick(d[0]?.resourceID)) ||
          (Array.isArray(d) && pick(d[0]?.resourceId)) ||
          (Array.isArray(d) && pick(d[0]?.id)) ||
          (Array.isArray(d) && pick(d[0]?.resource?.id)) ||
          (Array.isArray(d) && pick(d[0]?.resource?.resourceID)) ||
          (Array.isArray(d) && pick(d[0]?.resource?.resourceId)) ||
          (Array.isArray(d?.resourceIDs) && pick(d.resourceIDs[0])) ||
          null
      }
    } catch (e) {
      console.warn('Resource.createResource failed', e)
    }

    if (resourceID) {
      try {
        const body: any = { resource: resourceID }
        body.availableFrom = startISO
        body.availableUntil = endISO
        await api.post('/TimeBoundedResource/defineTimeWindow', body)
      } catch (_) {
        try {
          const body: any = { resource: resourceID }
          body.availableFrom = startISO
          body.availableUntil = endISO
          await api.post('/TimeBoundedResourceConcept/defineTimeWindow', body)
        } catch (e2) {
          console.warn('defineTimeWindow (create) failed', e2)
        }
      }
      const created = {
        id: resourceID,
        owner: auth.user.id,
        name: name.value,
        category: category.value ?? null,
        description: description.value ?? null,
        intent: intent.value,
      }
      emit('reconciled', { oldId: tempId, resource: created })
      // Associate intent without creating new definitions
      await setIntentForResource(resourceID, intent.value)
      // Verify persistence and self-heal if needed
      verifyIntentAssociation(resourceID, intent.value)
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
        <!-- Top-level errors -->
        <p v-if="formError" class="error">{{ formError }}</p>
        <p v-if="timeError" class="error">{{ timeError }}</p>

        <label class="title-field">
          <span class="field-label">Title <span class="req">*</span></span>
          <input v-model="name" placeholder="Title" required />
        </label>
        <div class="field">
          <span class="field-label">Intent <span class="req">*</span></span>
          <div class="segmented" role="radiogroup" aria-label="Intent">
            <label v-for="i in availableIntents" :key="i" class="seg">
              <input type="radio" name="intent" :value="i" v-model="intent" />
              <span>{{ i }}</span>
            </label>
          </div>
        </div>
        <div class="toggle-row">
          <label class="inline"
            ><input type="checkbox" v-model="setStart" /><span>Set start time</span></label
          >
          <label class="inline"
            ><input type="checkbox" v-model="setEnd" /><span>Set end time</span></label
          >
        </div>
        <div class="time-fields" v-if="setStart || setEnd">
          <label v-if="setStart">
            <span class="field-label">Start time <span class="req">*</span></span>
            <div class="time-row">
              <input type="date" v-model="startDate" />
              <select v-model.number="startHour">
                <option v-for="h in 12" :key="`sh-${h}`" :value="h">{{ h }}</option>
              </select>
              <span>:</span>
              <select v-model.number="startMinute">
                <option :value="0">00</option>
                <option :value="15">15</option>
                <option :value="30">30</option>
                <option :value="45">45</option>
              </select>
              <select v-model="startAmPm">
                <option value="AM">AM</option>
                <option value="PM">PM</option>
              </select>
            </div>
          </label>
          <label v-if="setEnd">
            <span class="field-label">End time <span class="req">*</span></span>
            <div class="time-row">
              <input type="date" v-model="endDate" />
              <select v-model.number="endHour">
                <option v-for="h in 12" :key="`eh-${h}`" :value="h">{{ h }}</option>
              </select>
              <span>:</span>
              <select v-model.number="endMinute">
                <option :value="0">00</option>
                <option :value="15">15</option>
                <option :value="30">30</option>
                <option :value="45">45</option>
              </select>
              <select v-model="endAmPm">
                <option value="AM">AM</option>
                <option value="PM">PM</option>
              </select>
            </div>
          </label>
        </div>
        <label class="category-field">
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
        <button class="primary" @click="save">{{ props.post?.id ? 'Save' : 'Create' }}</button>
      </footer>
    </div>
  </div>
</template>

<style scoped>
.modal {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.44);
  display: grid;
  place-items: center;
  z-index: 55;
}
.sheet {
  width: min(720px, 94vw);
  background: var(--color-popup);
  color: var(--color-text-primary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-4);
  /* Allow native dropdowns to render beyond the sheet bounds */
  overflow: visible;
  max-width: 94vw;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  box-shadow: var(--shadow-2);
}
.head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem 0.75rem;
  border-bottom: 1px solid var(--color-border);
}
.head h3 {
  margin: 0;
  font-weight: 800; /* stronger emphasis for modal title */
  letter-spacing: 0.2px;
  font-size: 1.35rem; /* slightly larger than global h3 */
}
.body {
  display: grid;
  gap: 1rem; /* more breathing room between fields */
  padding: 1rem; /* extra space under the header */
  /* Let content determine height to avoid large blank space,
     but cap for long forms so it scrolls. */
  flex: 0 1 auto;
  /* Remove hard cap to avoid reserved empty space on short forms */
  max-height: none;
  overflow: visible;
}
.toggle-row {
  display: flex;
  gap: 1rem;
  align-items: center;
  flex-wrap: wrap;
  /* Extra vertical breathing room specifically for the time checkbox row */
  margin: 0.6rem 0; /* space before and after the checkboxes */
}
textarea {
  width: 100%;
  padding: 0.6rem 0.75rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-2);
  resize: none;
  box-sizing: border-box;
  background: #fff;
  min-height: 5rem;
}
/* Softer placeholder for readability on gray surface */
input::placeholder,
textarea::placeholder {
  color: var(--color-text-secondary);
}
select {
  width: 100%;
  padding: 0.6rem 0.75rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-2);
  background: #fff;
  box-sizing: border-box;
}
/* Make text inputs visually consistent with selects/textareas */
input:not([type]),
input[type='text'],
input[type='email'],
input[type='search'],
input[type='number'],
input[type='tel'],
input[type='date'] {
  width: 100%;
  padding: 0.6rem 0.75rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-2);
  background: #fff;
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
  color: var(--color-text-primary);
  font-weight: 600;
  letter-spacing: 0.2px;
}
.req {
  color: var(--color-error);
  font-weight: 700;
}
/* Section-specific spacing for clarity */
/* Ensure uniform spacing by relying on the grid gap only */
.body input,
.body select,
.body textarea {
  margin-bottom: 0; /* override global rhythm for uniform grid spacing */
}
.body .error {
  margin: 0;
  color: var(--color-error);
  font-weight: 600;
}
.foot {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  border-top: 1px solid var(--color-border);
  white-space: nowrap;
}
.inline input:checked + span {
  color: var(--color-accent-2);
  font-weight: 700;
}
.grid2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
}
.time-fields {
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.75rem;
}
.time-row {
  display: grid;
  /* Date grows, time selects have comfortable widths */
  grid-template-columns: 1fr 4.5rem auto 5rem 5rem;
  align-items: center;
  gap: 0.4rem;
}
.time-row select {
  width: 100%;
  min-width: 0; /* allow grid to control width */
  text-align: center;
  margin-bottom: 0; /* avoid extra vertical space from global rhythm */
}
.time-row input[type='date'] {
  min-width: 11rem; /* comfortable date width */
  margin-bottom: 0; /* avoid extra vertical space from global rhythm */
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
  border: 1px solid var(--color-border);
  border-radius: 999px;
  cursor: pointer;
  user-select: none;
}
.seg input[type='radio'] {
  accent-color: var(--color-accent-1);
}
/* Emphasize selected intent label */
.seg span {
  font-weight: 600;
}
.seg input[type='radio']:checked + span {
  color: var(--color-accent-1);
  font-weight: 700;
}
.icon {
  background: transparent;
  border: none;
  font-size: 1rem;
  cursor: pointer;
}
.primary {
  background: var(--color-accent-1);
  color: #fff;
  border: none;
  border-radius: var(--radius-3);
  padding: 0.5rem 0.75rem;
  cursor: pointer;
  font-weight: 700;
}
</style>
