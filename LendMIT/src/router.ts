import { createRouter, createWebHistory } from 'vue-router'

const LandingView = () => import('./views/LandingView.vue')
const LoginView = () => import('./views/LoginView.vue')
const SignupView = () => import('./views/SignupView.vue')
const VerifyView = () => import('./views/VerifyView.vue')
const HomeView = () => import('./views/HomeView.vue')
const MatchBoardView = () => import('./views/MatchBoardView.vue')
const MyPostingsView = () => import('./views/MyPostingsView.vue')
const ProfileView = () => import('./views/ProfileView.vue')
const SubscriptionsView = () => import('./views/SubscriptionsView.vue')

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: LandingView },
    { path: '/login', component: LoginView },
    { path: '/signup', component: SignupView },
    { path: '/verify', component: VerifyView },
    { path: '/home', component: HomeView, meta: { requiresAuth: true } },
    { path: '/match', component: MatchBoardView, meta: { requiresAuth: true } },
    { path: '/myposts', component: MyPostingsView, meta: { requiresAuth: true } },
    { path: '/profile', component: ProfileView, meta: { requiresAuth: true } },
    { path: '/subscriptions', component: SubscriptionsView, meta: { requiresAuth: true } },
  ],
})
