import { pool } from '../config/db';

/**
 * El feed devuelve cada mensaje enriquecido con:
 *  - username del autor (JOIN a users)
 *  - likes_count (subquery agregada, casteada a INT para no recibir string)
 *  - liked_by_me (boolean; solo tiene sentido si hay un usuario autenticado)
 *
 * Si no se pasa userId a findAll/findById, liked_by_me siempre es false.
 */
export const MessageRepository = {
  create: async (userId: string, content: string) => {
    const result = await pool.query(
      'INSERT INTO messages (user_id, content) VALUES ($1, $2) RETURNING *',
      [userId, content]
    );
    return result.rows[0];
  },

  findById: async (id: string, currentUserId: string | null = null) => {
    const query = `
      SELECT
        m.id,
        m.user_id,
        m.content,
        m.created_at,
        u.username,
        (SELECT COUNT(*)::INT FROM likes WHERE message_id = m.id) AS likes_count,
        EXISTS(
          SELECT 1 FROM likes
          WHERE message_id = m.id AND user_id = $2::uuid
        ) AS liked_by_me
      FROM messages m
      JOIN users u ON u.id = m.user_id
      WHERE m.id = $1
    `;
    const result = await pool.query(query, [id, currentUserId]);
    return result.rows[0] || null;
  },

  delete: async (messageId: string) => {
    const result = await pool.query(
      'DELETE FROM messages WHERE id = $1 RETURNING *',
      [messageId]
    );
    return result.rows[0];
  },

  findAll: async (currentUserId: string | null = null) => {
    const query = `
      SELECT
        m.id,
        m.user_id,
        m.content,
        m.created_at,
        u.username,
        (SELECT COUNT(*)::INT FROM likes WHERE message_id = m.id) AS likes_count,
        EXISTS(
          SELECT 1 FROM likes
          WHERE message_id = m.id AND user_id = $1::uuid
        ) AS liked_by_me
      FROM messages m
      JOIN users u ON u.id = m.user_id
      ORDER BY m.created_at DESC
      LIMIT 50
    `;
    const result = await pool.query(query, [currentUserId]);
    return result.rows;
  },
};
