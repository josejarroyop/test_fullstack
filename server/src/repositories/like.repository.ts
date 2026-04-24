import { pool } from '../config/db';

export const LikeRepository = {
  /**
   * Crea un like. Si ya existe (PK compuesta), Postgres lanza error 23505
   * (unique_violation). Se maneja en la capa superior como 409 Conflict.
   */
  create: async (userId: string, messageId: string) => {
    const result = await pool.query(
      'INSERT INTO likes (user_id, message_id) VALUES ($1, $2) RETURNING user_id, message_id, created_at',
      [userId, messageId]
    );
    return result.rows[0];
  },

  /**
   * Elimina un like. Retorna la fila eliminada o null si no existía.
   */
  delete: async (userId: string, messageId: string) => {
    const result = await pool.query(
      'DELETE FROM likes WHERE user_id = $1 AND message_id = $2 RETURNING user_id, message_id',
      [userId, messageId]
    );
    return result.rows[0] || null;
  },

  existsFor: async (userId: string, messageId: string): Promise<boolean> => {
    const result = await pool.query(
      'SELECT 1 FROM likes WHERE user_id = $1 AND message_id = $2',
      [userId, messageId]
    );
    return (result.rowCount ?? 0) > 0;
  },

  countByMessage: async (messageId: string): Promise<number> => {
    const result = await pool.query(
      'SELECT COUNT(*)::INT AS count FROM likes WHERE message_id = $1',
      [messageId]
    );
    return result.rows[0]?.count ?? 0;
  },
};
