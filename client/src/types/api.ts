// Tipos compartidos con el backend.
// Lo que viaja por la API y por el socket se declara aqui para que todo
// el cliente coma de la misma fuente.

export interface User {
  id: string;
  username: string;
  created_at: string;
}

export interface Message {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  username: string;
  likes_count: number;
  liked_by_me: boolean;
}

export interface AuthResponse {
  user: User;
  token: string;
}

// Eventos que emite el servidor por Socket.io.
// Los mantenemos tipados para que el store reaccione sin adivinar el payload.
export interface MessageNewEvent {
  message: Message;
}

export interface MessageUpdatedEvent {
  message: Message;
}

export interface MessageDeletedEvent {
  id: string;
}

export interface LikeChangedEvent {
  message_id: string;
  user_id: string;
  likes_count: number;
}

// Entrada del historial que devuelve GET /message/:id/history.
// Cada fila es una version del mensaje (ediciones previas + actual + borrado).
export type HistoryReason = 'EDITED' | 'DELETED' | 'CURRENT';

export interface HistoryEntry {
  entry_id: string;
  message_id: string;
  user_id: string;
  username: string;
  content: string;
  version_at: string;
  reason: HistoryReason;
}
