// Cliente HTTP centralizado.
// Todas las llamadas al backend pasan por aqui para que el Bearer y el
// manejo de 401 vivan en un solo lugar.

import axios, { AxiosError } from 'axios';
import type { AuthResponse, HistoryEntry, Message, User } from '../types/api';

const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export const http = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' },
});

http.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  
  if (token && token !== 'undefined' && token !== 'null') {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
    console.log("✅ Token enviado:", config.headers.Authorization);
  } else {
    console.warn("❌ No se está enviando token. Revisa si se guardó en localStorage.");
  }
  return config;
});

// Interceptor de response: si el token caduca o es invalido, limpia sesion.
http.interceptors.response.use(
  (r) => r,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      // Dejamos que el router o el store reaccionen al cambio de estado.
      window.dispatchEvent(new CustomEvent('auth:unauthorized'));
    }
    return Promise.reject(error);
  },
);

// Helpers tipados: no exponemos axios crudo a los stores.
export const AuthApi = {
  register: (username: string, password: string) =>
    http.post<AuthResponse>('/auth/register', { username, password }).then((r) => r.data),

  login: (username: string, password: string) =>
    http.post<AuthResponse>('/auth/login', { username, password }).then((r) => r.data),
};

export const UsersApi = {
  list: () => http.get<User[]>('/users').then((r) => r.data),
};

export const MessagesApi = {
  list: () => http.get<Message[]>('/message').then((r) => r.data),
  create: (content: string) =>
    http.post<Message>('/message', { content }).then((r) => r.data),
  update: (id: string, content: string) =>
    http.put<Message>(`/message/${id}`, { content }).then((r) => r.data),
  remove: (id: string) => http.delete<void>(`/message/${id}`).then((r) => r.data),
  like: (id: string) =>
    http.post<{ message_id: string; likes_count: number }>(`/message/${id}/like`).then((r) => r.data),
  unlike: (id: string) =>
    http.delete<{ message_id: string; likes_count: number }>(`/message/${id}/like`).then((r) => r.data),
  history: (id: string) =>
    http.get<HistoryEntry[]>(`/message/${id}/history`).then((r) => r.data),
};

// Desempaqueta el mensaje de error del backend.
export const apiErrorMessage = (err: unknown, fallback = 'Error inesperado'): string => {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as { message?: string } | undefined;
    return data?.message || err.message || fallback;
  }
  if (err instanceof Error) return err.message;
  return fallback;
};
