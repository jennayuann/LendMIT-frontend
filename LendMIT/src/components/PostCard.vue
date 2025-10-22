<script setup lang="ts">
defineProps<{
  title: string
  owner: string
  description: string
  timeWindow?: string | null
  urgent?: boolean
}>()
const emit = defineEmits<{ (e: 'open'): void }>()
</script>

<template>
  <article class="card" @click="emit('open')">
    <div class="header">
      <span v-if="urgent" class="badge">URGENT</span>
      <h3 class="title">{{ title }}</h3>
      <span class="owner">{{ owner }}</span>
    </div>
    <p class="desc">{{ description }}</p>
    <p v-if="timeWindow" class="time">{{ timeWindow }}</p>
  </article>
</template>

<style scoped>
.card {
  padding: 1rem;
  border: 1px solid #e5e5ef;
  border-radius: 12px;
  background: #fff;
  cursor: pointer;
}
.header {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 0.5rem;
  align-items: center;
}
.badge {
  background: #eee;
  color: #fff;
  font-size: 0.75rem;
  padding: 0.1rem 0.4rem;
  border-radius: 6px;
  font-weight: 700;
}
.badge.urgent {
  background: #ff4d4f;
}
.badge {
  background: #ff4d4f;
}
.badge.BORROW {
  background: #52c41a;
}
.title {
  margin: 0;
  color: #666;
  font-size: 0.85rem;
}
.desc {
  color: #333;
  margin: 0.5rem 0 0;
}
.time {
  color: #666;
  font-size: 0.85rem;
  margin-top: 0.25rem;
}
</style>
