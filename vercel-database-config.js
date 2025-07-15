// 💾 VERCEL DATABASE CONFIGURATION
// lib/db/client.js

import { Pool } from 'pg';
import { createClient } from '@libsql/client';

// 🚀 Option 1: PostgreSQL (Recommended for production)
const pgPool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// 🚀 Option 2: Turso (SQLite compatible, serverless)
const tursoClient = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

// 🎯 Database abstraction layer
export class Database {
  constructor() {
    this.client = process.env.USE_TURSO ? tursoClient : pgPool;
  }
  
  async query(sql, params = []) {
    try {
      if (process.env.USE_TURSO) {
        const result = await this.client.execute({ sql, args: params });
        return result.rows;
      } else {
        const result = await this.client.query(sql, params);
        return result.rows;
      }
    } catch (error) {
      console.error('Database query error:', error);
      throw error;
    }
  }
  
  async close() {
    if (process.env.USE_TURSO) {
      await this.client.close();
    } else {
      await this.client.end();
    }
  }
}

export const db = new Database();

// 📊 ENVIRONMENT VARIABLES (.env.local)
/*
# Database Configuration
DATABASE_URL=postgresql://user:password@localhost:5432/tradai

# OR use Turso (SQLite compatible)
USE_TURSO=true
TURSO_DATABASE_URL=libsql://your-database.turso.io
TURSO_AUTH_TOKEN=your-auth-token

# API Keys
GROQ_API_KEY=your-groq-key
TOGETHER_API_KEY=your-together-key
TWELVE_DATA_API_KEY=your-twelve-data-key

# NextAuth
NEXTAUTH_URL=https://your-domain.vercel.app
NEXTAUTH_SECRET=your-secret-key
*/