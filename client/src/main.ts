import './assets/main.css';

import { createApp } from 'vue';
import { createPinia } from 'pinia';

import App from './App.vue';
import router from './router';
import { useAuthStore } from './stores/auth';

const app = createApp(App);

app.use(createPinia());
app.use(router);

// Reconectamos socket si ya habia sesion persistida en localStorage.
const auth = useAuthStore();
auth.bootstrap();

app.mount('#app');
