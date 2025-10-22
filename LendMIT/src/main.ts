import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import { router } from './router'
import { useAuthStore } from './stores/auth'

const app = createApp(App)

app.use(createPinia())

router.beforeEach((to) => {
  const auth = useAuthStore()
  if (to.meta?.requiresAuth && !auth.user) {
    return { path: '/login' }
  }
  if ((to.path === '/' || to.path === '/login' || to.path === '/signup') && auth.user) {
    return { path: '/match' }
  }
})

app.use(router)

app.mount('#app')
