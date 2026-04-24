<script setup lang="ts">
import { onMounted, ref, computed } from 'vue';
import { MessagesApi, apiErrorMessage } from '../services/api';
import type { HistoryEntry } from '../types/api';

const props = defineProps<{ messageId: string; authorUsername?: string }>();
const emit = defineEmits<{ (e: 'close'): void }>();

const entries = ref<HistoryEntry[]>([]);
const loading = ref(true);
const error = ref<string | null>(null);

const reasonLabel = (r: HistoryEntry['reason']) => {
  if (r === 'CURRENT') return 'Version actual';
  if (r === 'EDITED') return 'Edicion';
  return 'Eliminado';
};

const reasonClass = (r: HistoryEntry['reason']) => {
  if (r === 'CURRENT') return 'bg-emerald-100 text-emerald-700';
  if (r === 'EDITED') return 'bg-amber-100 text-amber-700';
  return 'bg-rose-100 text-rose-700';
};

const formatDate = (s: string) => new Date(s).toLocaleString();

// El archivo ordena cronologico ascendente; para la UI queremos mas reciente primero.
const ordered = computed(() => [...entries.value].reverse());

onMounted(async () => {
  try {
    entries.value = await MessagesApi.history(props.messageId);
  } catch (e) {
    error.value = apiErrorMessage(e, 'No se pudo cargar el historial');
  } finally {
    loading.value = false;
  }
});

const downloadMarkdown = () => {
  const lines: string[] = [];
  const author = props.authorUsername || entries.value[0]?.username || 'desconocido';
  lines.push(`# Historial del mensaje`);
  lines.push('');
  lines.push(`- **ID:** \`${props.messageId}\``);
  lines.push(`- **Autor:** @${author}`);
  lines.push(`- **Versiones registradas:** ${entries.value.length}`);
  lines.push('');
  lines.push('---');
  lines.push('');

  // Escribimos cronologico ascendente (como vino del backend) para leer la evolucion.
  entries.value.forEach((entry, idx) => {
    lines.push(`## ${idx + 1}. ${reasonLabel(entry.reason)}`);
    lines.push('');
    lines.push(`- **Fecha:** ${formatDate(entry.version_at)}`);
    lines.push(`- **Usuario:** @${entry.username}`);
    lines.push('');
    lines.push('```');
    lines.push(entry.content);
    lines.push('```');
    lines.push('');
  });

  const blob = new Blob([lines.join('\n')], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `historial-${props.messageId.slice(0, 8)}.md`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

const onBackdropClick = (e: MouseEvent) => {
  if (e.target === e.currentTarget) emit('close');
};
</script>

<template>
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm px-4"
    @click="onBackdropClick"
  >
    <div
      class="bg-white rounded-2xl shadow-lg border border-slate-200 w-full max-w-2xl max-h-[80vh] flex flex-col"
      role="dialog"
      aria-modal="true"
    >
      <header class="flex items-center justify-between px-5 py-4 border-b border-slate-200">
        <h2 class="text-lg font-semibold text-slate-900">Historial del mensaje</h2>
        <div class="flex items-center gap-2">
          <button
            @click="downloadMarkdown"
            :disabled="loading || !!error || entries.length === 0"
            class="px-3 py-1.5 rounded-lg text-sm bg-indigo-600 text-white font-medium hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed transition"
          >
            Descargar .md
          </button>
          <button
            @click="emit('close')"
            class="px-3 py-1.5 rounded-lg text-sm text-slate-600 hover:bg-slate-100 transition"
          >
            Cerrar
          </button>
        </div>
      </header>

      <div class="px-5 py-4 overflow-y-auto">
        <div v-if="loading" class="text-center text-slate-400 text-sm py-8">
          Cargando historial...
        </div>

        <div v-else-if="error" class="p-3 rounded-lg bg-red-50 text-red-700 text-sm">
          {{ error }}
        </div>

        <div v-else-if="entries.length === 0" class="text-center text-slate-400 text-sm py-8">
          No hay historial disponible.
        </div>

        <ol v-else class="space-y-3">
          <li
            v-for="entry in ordered"
            :key="entry.entry_id"
            class="border border-slate-200 rounded-xl p-3"
          >
            <div class="flex items-center justify-between mb-2">
              <span
                :class="['px-2 py-0.5 rounded-full text-xs font-medium', reasonClass(entry.reason)]"
              >
                {{ reasonLabel(entry.reason) }}
              </span>
              <span class="text-xs text-slate-500">
                {{ formatDate(entry.version_at) }} · @{{ entry.username }}
              </span>
            </div>
            <p class="text-sm text-slate-800 whitespace-pre-wrap">{{ entry.content }}</p>
          </li>
        </ol>
      </div>
    </div>
  </div>
</template>
