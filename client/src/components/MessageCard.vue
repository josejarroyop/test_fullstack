<script setup lang="ts">
import { computed, ref } from 'vue';
import { useAuthStore } from '../stores/auth';
import { useFeedStore } from '../stores/feed';
import type { Message } from '../types/api';
import MessageHistoryModal from './MessageHistoryModal.vue';

const props = defineProps<{ message: Message }>();

const auth = useAuthStore();
const feed = useFeedStore();

const isMine = computed(() => auth.user?.id === props.message.user_id);

const editing = ref(false);
const draft = ref(props.message.content);
const showHistory = ref(false);
const wasEdited = computed(
  () => new Date(props.message.updated_at).getTime() - new Date(props.message.created_at).getTime() > 1000,
);

const startEdit = () => {
  draft.value = props.message.content;
  editing.value = true;
};

const cancelEdit = () => {
  editing.value = false;
};

const saveEdit = async () => {
  const trimmed = draft.value.trim();
  if (!trimmed) return;
  const ok = await feed.edit(props.message.id, trimmed);
  if (ok) editing.value = false;
};

const onDelete = async () => {
  if (!confirm('Eliminar este mensaje?')) return;
  await feed.destroy(props.message.id);
};

const onToggleLike = () => {
  feed.toggleLike(props.message.id);
};

const formatted = computed(() => {
  const d = new Date(props.message.created_at);
  return d.toLocaleString();
});
</script>

<template>
  <article class="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 mb-3">
    <header class="flex items-center justify-between mb-2">
      <div class="flex items-center gap-2">
        <div
          class="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-sm font-semibold"
        >
          {{ message.username.charAt(0).toUpperCase() }}
        </div>
        <div class="leading-tight">
          <p class="text-sm font-medium text-slate-900">{{ message.username }}</p>
          <p class="text-xs text-slate-500">{{ formatted }}</p>
        </div>
      </div>
      <div v-if="isMine" class="flex items-center gap-1 text-xs">
        <button
          v-if="!editing"
          @click="startEdit"
          class="px-2 py-1 rounded-md text-slate-500 hover:bg-slate-100"
        >
          Editar
        </button>
        <button
          @click="onDelete"
          class="px-2 py-1 rounded-md text-red-600 hover:bg-red-50"
        >
          Eliminar
        </button>
      </div>
    </header>

    <div v-if="editing" class="mb-3">
      <textarea
        v-model="draft"
        rows="3"
        maxlength="2000"
        class="w-full resize-none px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
      />
      <div class="flex gap-2 mt-2">
        <button
          @click="saveEdit"
          class="px-3 py-1 rounded-md bg-indigo-600 text-white text-xs font-medium hover:bg-indigo-700"
        >
          Guardar
        </button>
        <button
          @click="cancelEdit"
          class="px-3 py-1 rounded-md bg-slate-100 text-slate-700 text-xs font-medium hover:bg-slate-200"
        >
          Cancelar
        </button>
      </div>
    </div>

    <p v-else class="text-sm text-slate-800 whitespace-pre-wrap mb-3">
      {{ message.content }}
    </p>

    <footer class="flex items-center gap-2 text-sm">
      <button
        @click="onToggleLike"
        :class="[
          'inline-flex items-center gap-1 px-3 py-1 rounded-full border transition',
          message.liked_by_me
            ? 'bg-rose-50 text-rose-600 border-rose-200 hover:bg-rose-100'
            : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100',
        ]"
      >
        <span aria-hidden="true">{{ message.liked_by_me ? '&#9829;' : '&#9825;' }}</span>
        <span class="font-medium">{{ message.likes_count }}</span>
      </button>

      <button
        @click="showHistory = true"
        class="inline-flex items-center gap-1 px-3 py-1 rounded-full border bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 transition"
        :title="wasEdited ? 'Este mensaje fue editado' : 'Ver linea de tiempo'"
      >
        <span class="font-medium">Historial</span>
        <span v-if="wasEdited" class="text-[10px] text-amber-600">(editado)</span>
      </button>
    </footer>

    <MessageHistoryModal
      v-if="showHistory"
      :message-id="message.id"
      :author-username="message.username"
      @close="showHistory = false"
    />
  </article>
</template>
