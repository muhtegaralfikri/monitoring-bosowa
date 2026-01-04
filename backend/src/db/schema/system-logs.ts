import { mysqlTable, varchar, bigint, timestamp } from 'drizzle-orm/mysql-core'
import { users } from './users'

export const systemLogs = mysqlTable('system_logs', {
  id: bigint('id', { mode: 'number' }).primaryKey().autoincrement(),
  userId: bigint('user_id', { mode: 'number' }).references(() => users.id),
  action: varchar('action', { length: 100 }).notNull(),
  entityType: varchar('entity_type', { length: 50 }),
  entityId: bigint('entity_id', { mode: 'number' }),
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: varchar('user_agent', { length: 500 }),
  details: varchar('details', { length: 1000 }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export type SystemLog = typeof systemLogs.$inferSelect
export type NewSystemLog = typeof systemLogs.$inferInsert
