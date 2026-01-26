const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  },
  max: 3,
  connectionTimeoutMillis: 15000,
  idleTimeoutMillis: 30000,
  keepAlive: true
});

// Set timezone on connection
pool.on('connect', (client) => {
  client.query('SET timezone = \'Asia/Kolkata\'');
});

const db = {
  async initializeSchema() {
    try {
      const client = await pool.connect();
      try {
        const tableExists = await client.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_name = 'users'
          );
        `);
        
        if (!tableExists.rows[0].exists) {
          const schemaPath = path.join(__dirname, '..', 'database', 'schema.sql');
          const schema = fs.readFileSync(schemaPath, 'utf8');
          await client.query(schema);
          console.log('Database schema initialized successfully');
        } else {
          console.log('Database schema already exists');
        }
      } finally {
        client.release();
      }
    } catch (err) {
      console.error('Database connection error during schema initialization:', err.message);
      throw err;
    }
  },

  async testConnection() {
    try {
      const client = await pool.connect();
      await client.query('SELECT NOW()');
      client.release();
      await this.initializeSchema();
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
      return await client.query(text, params);
    } catch (err) {
      console.error('Query error:', err.message);
      throw err;
    } finally {
      client.release();
    }
  }
};

module.exports = db;
