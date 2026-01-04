import { mysqlTable, varchar, bigint } from 'drizzle-orm/mysql-core'

export const settings = mysqlTable('settings', {
  id: bigint('id', { mode: 'number' }).primaryKey().autoincrement(),
  key: varchar('key', { length: 50 }).notNull().unique(),
  value: varchar('value', { length: 255 }).notNull(),
})

export type Setting = typeof settings.$inferSelect
export type NewSetting = typeof settings.$inferInsert

// Default settings keys
export const SETTINGS_KEYS = {
  LOW_STOCK_THRESHOLD: 'low_stock_threshold', // in liters
} as const
