// Router con guard simple:
//  - rutas publicas: /login, /register
//  - rutas privadas: /feed (redirige a /login si no hay token)

import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '../stores/auth';

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      redirect: '/feed',
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('../views/LoginView.vue'),
      meta: { guestOnly: true },
    },
    {
      path: '/register',
      name: 'register',
      component: () => import('../views/RegisterView.vue'),
      meta: { guestOnly: true },
    },
    {
      path: '/feed',
      name: 'feed',
      component: () => import('../views/FeedView.vue'),
      meta: { requiresAuth: true },
    },
    {
      // Cualquier otra cosa al feed; el guard se encarga si no hay sesion.
      path: '/:pathMatch(.*)*',
      redirect: '/feed',
    },
  ],
});

router.beforeEach((to) => {
  const auth = useAuthStore();
  
  const token = localStorage.getItem('token');
  const isAuthenticated = !!token;
  if (to.meta.requiresAuth && !isAuthenticated) {
    return { name: 'login' };
  }
  
  if (to.meta.guestOnly && isAuthenticated) {
    return { name: 'feed' };
  }
  if (isAuthenticated && !auth.isAuthenticated) {
  }

  return true;
});

export default router;
