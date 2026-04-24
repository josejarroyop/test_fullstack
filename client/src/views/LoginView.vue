<script setup lang="ts">
import { ref } from 'vue';
import { useRouter, RouterLink } from 'vue-router';
import { useAuthStore } from '../stores/auth';

const auth = useAuthStore();
const router = useRouter();

const username = ref('');
const password = ref('');

const onSubmit = async () => {
  console.log("Intentando loguear...");
  const ok = await auth.login(username.value.trim(), password.value);
  console.log("¿Login exitoso?:", ok); // <--- MIRA ESTO
  
  if (ok) {
    console.log("Redirigiendo a feed...");
    router.push({ name: 'feed' });
  } else {
    console.log("El login falló, quédate aquí.");
  }
};
</script>

<template>
  <div class="min-h-screen flex items-center justify-center px-4">
    <form
      @submit.prevent="onSubmit"
      class="w-full max-w-sm bg-white rounded-2xl shadow-sm border border-slate-200 p-8"
    >
      <h1 class="text-2xl font-semibold text-slate-900 mb-1">Feedback Hub</h1>
      <p class="text-sm text-slate-500 mb-6">Inicia sesion para continuar</p>

      <label class="block text-sm font-medium text-slate-700 mb-1" for="username">Usuario</label>
      <input
        id="username"
        v-model="username"
        type="text"
        autocomplete="username"
        required
        class="w-full mb-4 px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
      />

      <label class="block text-sm font-medium text-slate-700 mb-1" for="password">Contrasena</label>
      <input
        id="password"
        v-model="password"
        type="password"
        autocomplete="current-password"
        required
        class="w-full mb-4 px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
      />

      <p v-if="auth.error" class="text-sm text-red-600 mb-3">{{ auth.error }}</p>

      <button
        type="submit"
        :disabled="auth.loading"
        class="w-full py-2 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed transition"
      >
        {{ auth.loading ? 'Entrando...' : 'Entrar' }}
      </button>

      <p class="text-sm text-slate-500 text-center mt-4">
        No tienes cuenta?
        <RouterLink to="/register" class="text-indigo-600 hover:underline">Registrate</RouterLink>
      </p>
    </form>
  </div>
</template>
