<script setup lang="ts">
import { ref } from 'vue';
import { useRouter, RouterLink } from 'vue-router';
import { useAuthStore } from '../stores/auth';

const auth = useAuthStore();
const router = useRouter();

const username = ref('');
const password = ref('');
const confirm = ref('');
const localError = ref<string | null>(null);

const onSubmit = async () => {
  localError.value = null;
  if (password.value !== confirm.value) {
    localError.value = 'Las contrasenas no coinciden';
    return;
  }
  const ok = await auth.register(username.value.trim(), password.value);
  if (ok) router.push({ name: 'feed' });
};
</script>

<template>
  <div class="min-h-screen flex items-center justify-center px-4">
    <form
      @submit.prevent="onSubmit"
      class="w-full max-w-sm bg-white rounded-2xl shadow-sm border border-slate-200 p-8"
    >
      <h1 class="text-2xl font-semibold text-slate-900 mb-1">Crear cuenta</h1>
      <p class="text-sm text-slate-500 mb-6">Unete al Feedback Hub</p>

      <label class="block text-sm font-medium text-slate-700 mb-1" for="username">Usuario</label>
      <input
        id="username"
        v-model="username"
        type="text"
        autocomplete="username"
        required
        minlength="3"
        maxlength="50"
        class="w-full mb-4 px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
      />

      <label class="block text-sm font-medium text-slate-700 mb-1" for="password">Contrasena</label>
      <input
        id="password"
        v-model="password"
        type="password"
        autocomplete="new-password"
        required
        minlength="6"
        class="w-full mb-4 px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
      />

      <label class="block text-sm font-medium text-slate-700 mb-1" for="confirm">Confirmar contrasena</label>
      <input
        id="confirm"
        v-model="confirm"
        type="password"
        autocomplete="new-password"
        required
        minlength="6"
        class="w-full mb-4 px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
      />

      <p v-if="localError" class="text-sm text-red-600 mb-3">{{ localError }}</p>
      <p v-else-if="auth.error" class="text-sm text-red-600 mb-3">{{ auth.error }}</p>

      <button
        type="submit"
        :disabled="auth.loading"
        class="w-full py-2 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed transition"
      >
        {{ auth.loading ? 'Creando...' : 'Crear cuenta' }}
      </button>

      <p class="text-sm text-slate-500 text-center mt-4">
        Ya tienes cuenta?
        <RouterLink to="/login" class="text-indigo-600 hover:underline">Inicia sesion</RouterLink>
      </p>
    </form>
  </div>
</template>
