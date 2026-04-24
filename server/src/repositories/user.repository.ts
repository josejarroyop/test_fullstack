import { pool } from '../config/db';

export const UserRepository = {
  create: async (username: string, passwordHash: string) => {
    const result = await pool.query(
      'INSERT INTO users (username, password_hash) VALUES ($1, $2) RETURNING id, username, created_at',
      [username, passwordHash]
    );
    return result.rows[0];
  },

  findByUsername: async (username: string) => {
    const result = await pool.query(
      'SELECT id, username, password_hash, created_at FROM users WHERE username = $1',
      [username]
    );
    return result.rows[0] || null;
  },

  findById: async (id: string) => {
    const result = await pool.query(
      'SELECT id, username, created_at FROM users WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  },

  findAll: async () => {
    const result = await pool.query(
      'SELECT id, username, created_at FROM users ORDER BY created_at DESC LIMIT 50'
    );
    return result.rows;
  }
};
