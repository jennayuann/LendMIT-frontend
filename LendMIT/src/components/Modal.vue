<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'

defineProps<{
  open: boolean
  title?: string
}>()
const emit = defineEmits<{ (e: 'close'): void }>()

function onEsc(e: KeyboardEvent) {
  if (e.key === 'Escape') emit('close')
}
onMounted(() => window.addEventListener('keydown', onEsc))
onUnmounted(() => window.removeEventListener('keydown', onEsc))
</script>

<template>
  <div v-if="open" class="overlay" @click.self="emit('close')">
    <div class="modal">
      <header class="header">
        <h3>{{ title }}</h3>
        <button class="icon" @click="emit('close')">✕</button>
      </header>
      <div class="body">
        <slot />
      </div>
    </div>
  </div>
</template>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.35);
  display: grid;
  place-items: center;
  z-index: 50;
}
.modal {
  width: min(720px, 94vw);
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
  overflow: hidden;
}
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid #eee;
}
.body {
  padding: 1rem;
}
.icon {
  background: transparent;
  border: none;
  font-size: 1rem;
  cursor: pointer;
}
</style>
