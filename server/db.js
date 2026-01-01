const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const db = {
  async testConnection() {
    try {
      const client = await pool.connect();
      const result = await client.query('SELECT NOW()');
      client.release();
      console.log('Database connection successful');
      return true;
    } catch (err) {
      console.error('Database connection error:', err.message);
      return false;
    }
  },

  async query(text, params) {
    const client = await pool.connect();
    try {
      const result = await client.query(text, params);
      return result;
    } catch (err) {
      console.error('Query error:', err.message);
      throw err;
    } finally {
      client.release();
    }
  }
};

module.exports = db;
