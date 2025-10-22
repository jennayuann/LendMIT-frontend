<script setup lang="ts"></script>

<template>
  <div class="page">
    <div class="card">
      <h1>Welcome to LendMIT</h1>
      <p>This is your home page after logging in.</p>
    </div>
  </div>
</template>

<style scoped>
.page {
  min-height: 100dvh;
  display: grid;
  place-items: center;
  background: #f7f7fb;
}
.card {
  width: min(960px, 94vw);
  background: #fff;
  padding: 2rem;
  border-radius: 16px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.08);
}
</style>
