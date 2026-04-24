<script setup lang="ts">
import { onBeforeUnmount, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import MessageCard from '../components/MessageCard.vue';
import MessageComposer from '../components/MessageComposer.vue';
import { useAuthStore } from '../stores/auth';
import { useFeedStore } from '../stores/feed';

const auth = useAuthStore();
const feed = useFeedStore();
const router = useRouter();

onMounted(async () => {
  // Al entrar al feed: primero cargamos lo que hay, despues enganchamos socket.
  await feed.fetchAll();
  feed.bindSocket();
});

onBeforeUnmount(() => {
  feed.unbindSocket();
});

const onLogout = () => {
  feed.reset();
  auth.logout();
  router.push({ name: 'login' });
};
</script>

<template>
  <div class="min-h-screen">
    <header class="sticky top-0 z-10 bg-white/80 backdrop-blur border-b border-slate-200">
      <div class="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
        <h1 class="text-lg font-semibold text-slate-900">Feedback Hub</h1>
        <div class="flex items-center gap-3">
          <span class="text-sm text-slate-600 hidden sm:inline">
            @{{ auth.user?.username }}
          </span>
          <button
            @click="onLogout"
            class="px-3 py-1.5 rounded-lg text-sm text-slate-600 hover:bg-slate-100 transition"
          >
            Cerrar sesion
          </button>
        </div>
      </div>
    </header>

    <main class="max-w-2xl mx-auto px-4 py-6">
      <MessageComposer />

      <div v-if="feed.error" class="mb-4 p-3 rounded-lg bg-red-50 text-red-700 text-sm">
        {{ feed.error }}
      </div>

      <div v-if="feed.loading" class="text-center text-slate-400 text-sm py-8">
        Cargando feed...
      </div>

      <div v-else-if="feed.sortedMessages.length === 0" class="text-center text-slate-400 text-sm py-12">
        Aun no hay mensajes. Se el primero en publicar.
      </div>

      <MessageCard
        v-for="message in feed.sortedMessages"
        :key="message.id"
        :message="message"
      />
    </main>
  </div>
</template>
