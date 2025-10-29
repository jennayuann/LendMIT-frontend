<script setup lang="ts">
defineProps<{
  title: string
  owner: string
  ownerId?: string | null
  description: string
  timeWindow?: string | null
  urgent?: boolean
  intent?: string | null
}>()
const emit = defineEmits<{
  (e: 'open'): void
  (e: 'view-owner', payload: { ownerId: string | null; ownerName: string }): void
}>()
</script>

<template>
  <article class="card" @click="emit('open')">
    <div class="header">
      <span
        class="badge"
        :class="
          !intent || String(intent).toUpperCase() === 'N/A'
            ? 'DEFAULT'
            : String(intent).toUpperCase()
        "
        >{{ (intent || 'N/A')!.toString().toUpperCase() }}</span
      >
      <span v-if="urgent" class="badge urgent">URGENT</span>
      <h3 class="title">{{ title }}</h3>
      <button
        v-if="owner"
        type="button"
        class="owner"
        @click.stop="emit('view-owner', { ownerId: ownerId ?? null, ownerName: owner })"
      >
        {{ owner }}
      </button>
    </div>
    <p class="desc">{{ description }}</p>
    <p v-if="timeWindow" class="time">{{ timeWindow }}</p>
  </article>
</template>

<style scoped>
.card {
  padding: 1.25rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-3);
  background: #fff;
  box-shadow: var(--shadow-0);
  cursor: pointer;
  transition:
    box-shadow var(--dur-med) var(--ease),
    transform var(--dur-med) var(--ease),
    border-color var(--dur-fast) var(--ease);
}
.card:hover {
  box-shadow: var(--shadow-2);
  transform: translateY(-2px);
  border-color: var(--color-accent-2);
}
.header {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  align-items: center;
  margin-bottom: 0.75rem;
}
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
.title {
  margin: 0;
  color: var(--color-text-primary);
  font-size: 1.1rem;
  font-weight: 700;
  flex: 1;
  min-width: 0;
}
.owner {
  color: var(--color-text-secondary);
  font-size: 0.85rem;
  font-weight: 600;
  background: transparent;
  border: none;
  padding: 0;
  cursor: pointer;
  text-decoration: underline;
  text-decoration-thickness: 1px;
  text-underline-offset: 2px;
}
.owner:focus-visible {
  outline: 2px solid var(--color-accent-2);
  outline-offset: 2px;
}
.desc {
  color: var(--color-text-primary);
  margin: 0 0 0.5rem;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.time {
  color: var(--color-text-secondary);
  font-size: 0.85rem;
  margin: 0;
  font-weight: 500;
}
</style>
