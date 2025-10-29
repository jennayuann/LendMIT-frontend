<script setup lang="ts"></script>

<template>
  <div class="page">
    <div class="card">
      <div class="brand-header">
        <h1 class="brand">Welcome to LendMIT</h1>
        <p class="subtitle">Share resources with your MIT community</p>
      </div>
      <div class="actions">
        <a href="/match" class="action-card">
          <h3>Match Board</h3>
          <p>Browse available items</p>
        </a>
        <a href="/my-postings" class="action-card">
          <h3>My Postings</h3>
          <p>Manage your items</p>
        </a>
      </div>
    </div>
  </div>
</template>

<style scoped>
.page {
  min-height: 100dvh;
  display: grid;
  place-items: center;
  background: linear-gradient(135deg, var(--color-bg) 0%, #e8ebf0 100%);
  padding: 2rem;
}
.card {
  width: min(640px, 94vw);
  background: #fff;
  padding: 3rem 2rem;
  border-radius: var(--radius-4);
  box-shadow: var(--shadow-2);
  border: 1px solid var(--color-border);
}
.brand-header {
  text-align: center;
  margin-bottom: 2.5rem;
}
.brand {
  font-family: 'Neue Haas Grotesk Display', var(--font-sans);
  margin: 0 0 0.5rem;
  font-size: 2rem;
  font-weight: 800;
  background: linear-gradient(135deg, var(--color-accent-1) 0%, var(--color-accent-2) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
.subtitle {
  margin: 0;
  color: var(--color-text-secondary);
  font-size: 1rem;
}
.actions {
  display: grid;
  gap: 1rem;
}
.action-card {
  padding: 1.5rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-3);
  background: #fff;
  transition:
    box-shadow var(--dur-med) var(--ease),
    transform var(--dur-med) var(--ease),
    border-color var(--dur-fast) var(--ease);
  text-decoration: none;
  color: inherit;
}
.action-card:hover {
  box-shadow: var(--shadow-1);
  transform: translateY(-2px);
  border-color: var(--color-accent-2);
}
.action-card h3 {
  margin: 0 0 0.25rem;
  color: var(--color-accent-2);
  font-size: 1.2rem;
}
.action-card p {
  margin: 0;
  color: var(--color-text-secondary);
  font-size: 0.9rem;
}
</style>
