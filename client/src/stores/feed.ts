// Feed store: lista de mensajes + wiring con Socket.io para tiempo real.
// Todo cambio pasa por aqui: POST/PUT/DELETE via axios, refresco via socket.

import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { MessagesApi, apiErrorMessage } from '../services/api';
import { getSocket } from '../services/socket';
import type {
  LikeChangedEvent,
  Message,
  MessageDeletedEvent,
  MessageNewEvent,
  MessageUpdatedEvent,
} from '../types/api';
import { useAuthStore } from './auth';

export const useFeedStore = defineStore('feed', () => {
  const messages = ref<Message[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const socketBound = ref(false);

  const sortedMessages = computed(() =>
    [...messages.value].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    ),
  );

  const upsert = (msg: Message) => {
    const idx = messages.value.findIndex((m) => m.id === msg.id);
    if (idx >= 0) messages.value[idx] = msg;
    else messages.value.unshift(msg);
  };

  const remove = (id: string) => {
    messages.value = messages.value.filter((m) => m.id !== id);
  };

  const fetchAll = async () => {
    loading.value = true;
    error.value = null;
    try {
      messages.value = await MessagesApi.list();
    } catch (e) {
      error.value = apiErrorMessage(e, 'No se pudo cargar el feed');
    } finally {
      loading.value = false;
    }
  };

  const publish = async (content: string) => {
    error.value = null;
    try {
      const msg = await MessagesApi.create(content);
      // El socket tambien nos lo mandara, pero actualizamos local por si el
      // evento llega tarde o el socket no esta conectado.
      upsert(msg);
      return true;
    } catch (e) {
      error.value = apiErrorMessage(e, 'No se pudo publicar');
      return false;
    }
  };

  const edit = async (id: string, content: string) => {
    error.value = null;
    try {
      const msg = await MessagesApi.update(id, content);
      upsert(msg);
      return true;
    } catch (e) {
      error.value = apiErrorMessage(e, 'No se pudo editar');
      return false;
    }
  };

  const destroy = async (id: string) => {
    error.value = null;
    try {
      await MessagesApi.remove(id);
      remove(id);
      return true;
    } catch (e) {
      error.value = apiErrorMessage(e, 'No se pudo eliminar');
      return false;
    }
  };

  const toggleLike = async (id: string) => {
    const current = messages.value.find((m) => m.id === id);
    if (!current) return;
    error.value = null;
    // Optimistic update: lo dejamos al usuario y ya lo reconciliara el socket.
    const wasLiked = current.liked_by_me;
    current.liked_by_me = !wasLiked;
    current.likes_count += wasLiked ? -1 : 1;
    try {
      const resp = wasLiked ? await MessagesApi.unlike(id) : await MessagesApi.like(id);
      const latest = messages.value.find((m) => m.id === id);
      if (latest) latest.likes_count = resp.likes_count;
    } catch (e) {
      // Revertimos si fallo.
      const latest = messages.value.find((m) => m.id === id);
      if (latest) {
        latest.liked_by_me = wasLiked;
        latest.likes_count += wasLiked ? 1 : -1;
      }
      error.value = apiErrorMessage(e, 'No se pudo actualizar el like');
    }
  };

  // Conecta los listeners del socket a los setters del store.
  // Se llama desde FeedView cuando ya hay socket activo.
  const bindSocket = () => {
    const socket = getSocket();
    if (!socket || socketBound.value) return;

    const auth = useAuthStore();

    socket.on('message:new', (payload: MessageNewEvent) => {
      // Si soy el autor ya lo tengo localmente; si no, lo inserto.
      upsert(payload.message);
    });

    socket.on('message:updated', (payload: MessageUpdatedEvent) => {
      upsert(payload.message);
    });

    socket.on('message:deleted', (payload: MessageDeletedEvent) => {
      remove(payload.id);
    });

    socket.on('like:added', (payload: LikeChangedEvent) => {
      const msg = messages.value.find((m) => m.id === payload.message_id);
      if (!msg) return;
      msg.likes_count = payload.likes_count;
      if (auth.user && payload.user_id === auth.user.id) msg.liked_by_me = true;
    });

    socket.on('like:removed', (payload: LikeChangedEvent) => {
      const msg = messages.value.find((m) => m.id === payload.message_id);
      if (!msg) return;
      msg.likes_count = payload.likes_count;
      if (auth.user && payload.user_id === auth.user.id) msg.liked_by_me = false;
    });

    socketBound.value = true;
  };

  const unbindSocket = () => {
    const socket = getSocket();
    if (!socket) return;
    socket.off('message:new');
    socket.off('message:updated');
    socket.off('message:deleted');
    socket.off('like:added');
    socket.off('like:removed');
    socketBound.value = false;
  };

  const reset = () => {
    unbindSocket();
    messages.value = [];
    error.value = null;
    loading.value = false;
  };

  return {
    messages,
    sortedMessages,
    loading,
    error,
    fetchAll,
    publish,
    edit,
    destroy,
    toggleLike,
    bindSocket,
    unbindSocket,
    reset,
  };
});
