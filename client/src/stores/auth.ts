// Auth store: fuente de verdad para user + token.
// Persiste en localStorage para que refrescar el navegador no nos tire la sesion.

import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { AuthApi, apiErrorMessage } from '../services/api';
import { connectSocket, disconnectSocket } from '../services/socket';
import type { User } from '../types/api';

const TOKEN_KEY = 'token';
const USER_KEY = 'user';

const readUser = (): User | null => {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
};

export const useAuthStore = defineStore('auth', () => {
  // Estado: hidratado desde localStorage al arrancar.
  const token = ref<string | null>(localStorage.getItem(TOKEN_KEY));
  const user = ref<User | null>(readUser());
  const loading = ref(false);
  const error = ref<string | null>(null);

  const isAuthenticated = computed(() => !!token.value && !!user.value);

  const persist = (t: string, u: User) => {
    token.value = t;
    user.value = u;
    localStorage.setItem(TOKEN_KEY, t);
    localStorage.setItem(USER_KEY, JSON.stringify(u));
  };

  const clear = () => {
    token.value = null;
    user.value = null;
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  };

const login = async (username: string, password: string) => {
  loading.value = true;
  error.value = null;
  try {
    // 1. Aquí ya recibes el objeto AuthResponse directamente
    const response = await AuthApi.login(username, password);
    
    // 2. Accede a las propiedades directamente (sin .data)
    const { token, user } = response; 
    
    // 3. Persiste
    persist(token, user);
    connectSocket(token);
    return true;
  } catch (e) {
    error.value = apiErrorMessage(e, 'No se pudo iniciar sesion');
    return false;
  } finally {
    loading.value = false;
  }
};

  const register = async (username: string, password: string) => {
    loading.value = true;
    error.value = null;
    try {
      const data = await AuthApi.register(username, password);
      persist(data.token, data.user);
      connectSocket(data.token);
      return true;
    } catch (e) {
      error.value = apiErrorMessage(e, 'No se pudo registrar');
      return false;
    } finally {
      loading.value = false;
    }
  };

  const logout = () => {
    disconnectSocket();
    clear();
  };

  // Si ya tenemos token al abrir la app, reconectamos el socket.
  const bootstrap = () => {
    if (token.value) {
      connectSocket(token.value);
    }
  };

  // El interceptor de axios dispara este evento cuando el backend responde 401.
  window.addEventListener('auth:unauthorized', () => {
    logout();
  });

  return {
    token,
    user,
    loading,
    error,
    isAuthenticated,
    login,
    register,
    logout,
    bootstrap,
  };
});
