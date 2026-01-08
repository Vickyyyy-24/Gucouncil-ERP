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
})


const db = {
  async initializeSchema() {
    try {
      const client = await pool.connect();
      try {
        // Check if users table exists
        const tableExists = await client.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_name = 'users'
          );
        `);
        
        if (!tableExists.rows[0].exists) {
          // Only initialize schema if tables don't exist
          const schemaPath = path.join(__dirname, '..', 'database', 'schema.sql');
          const schema = fs.readFileSync(schemaPath, 'utf8');
          await client.query(schema);
          console.log('Database schema initialized successfully');
        } else {
          console.log('Database schema already exists');
        }
      } catch (err) {
        console.error('Error initializing schema:', err.message);
        throw err;
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
      const result = await client.query('SELECT NOW()');
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
