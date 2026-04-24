<script setup lang="ts">
import { computed, ref } from 'vue';
import { useFeedStore } from '../stores/feed';

const feed = useFeedStore();
const content = ref('');

const MAX = 2000;
const remaining = computed(() => MAX - content.value.length);
const disabled = computed(() => content.value.trim().length === 0 || content.value.length > MAX);

const onSubmit = async () => {
  if (disabled.value) return;
  const ok = await feed.publish(content.value.trim());
  if (ok) content.value = '';
};
</script>

<template>
  <form
    @submit.prevent="onSubmit"
    class="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 mb-6"
  >
    <textarea
      v-model="content"
      rows="3"
      :maxlength="MAX"
      placeholder="Que quieres compartir?"
      class="w-full resize-none px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
    />
    <div class="flex items-center justify-between mt-2">
      <span
        :class="['text-xs', remaining < 50 ? 'text-amber-600' : 'text-slate-400']"
      >
        {{ remaining }} caracteres
      </span>
      <button
        type="submit"
        :disabled="disabled"
        class="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed transition"
      >
        Publicar
      </button>
    </div>
  </form>
</template>
