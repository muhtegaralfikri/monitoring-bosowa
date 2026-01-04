import { drizzle } from 'drizzle-orm/mysql2'
import mysql from 'mysql2/promise'
import * as schema from '../db/schema'

// Create connection pool
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'monitoring_bosowa',
  multipleStatements: true,
}

console.log('Database config:', { ...dbConfig, password: '***' })

const pool = mysql.createPool(dbConfig)

// Create drizzle instance
export const db = drizzle(pool, { schema, mode: 'default' })

// Export for raw queries if needed
export { pool }
