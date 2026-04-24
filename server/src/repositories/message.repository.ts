import { pool } from '../config/db';

/**
 * El feed devuelve cada mensaje enriquecido con:
 *  - username del autor (JOIN a users)
 *  - likes_count (subquery agregada, casteada a INT para no recibir string)
 *  - liked_by_me (boolean; solo tiene sentido si hay un usuario autenticado)
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
        m.updated_at,
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

  update: async (messageId: string, content: string) => {
    // El trigger BEFORE UPDATE archiva la version previa en messages_archive
    // y actualiza updated_at automaticamente, asi que aqui solo tocamos content.
    const result = await pool.query(
      'UPDATE messages SET content = $2 WHERE id = $1 RETURNING *',
      [messageId, content]
    );
    return result.rows[0] || null;
  },

  findAll: async (currentUserId: string | null = null) => {
    const query = `
      SELECT
        m.id,
        m.user_id,
        m.content,
        m.created_at,
        m.updated_at,
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

  /**
   * Linea de tiempo de un mensaje:
   *   - cada fila de messages_archive con original_id = messageId
   *   - la fila actual de messages (si todavia existe)
   * Publico para cualquier usuario autenticado.
   */
  getHistory: async (messageId: string) => {
    const query = `
      SELECT
        a.archive_id AS entry_id,
        a.original_id AS message_id,
        a.user_id,
        u.username,
        a.content,
        a.message_created_at AS version_at,
        a.archive_reason AS reason
      FROM messages_archive a
      LEFT JOIN users u ON u.id = a.user_id
      WHERE a.original_id = $1

      UNION ALL

      SELECT
        m.id AS entry_id,
        m.id AS message_id,
        m.user_id,
        u.username,
        m.content,
        m.updated_at AS version_at,
        'CURRENT'::VARCHAR AS reason
      FROM messages m
      JOIN users u ON u.id = m.user_id
      WHERE m.id = $1

      ORDER BY version_at ASC
    `;
    const result = await pool.query(query, [messageId]);
    return result.rows;
  },
};
