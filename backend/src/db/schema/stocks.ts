import { mysqlTable, varchar, decimal, bigint, timestamp, mysqlEnum } from 'drizzle-orm/mysql-core'
import { users } from './users'

export const stocks = mysqlTable('stocks', {
  id: bigint('id', { mode: 'number' }).primaryKey().autoincrement(),
  type: mysqlEnum('type', ['IN', 'OUT']).notNull(),
  amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
  location: mysqlEnum('location', ['GENSET', 'TUG_ASSIST']).notNull(),
  balance: decimal('balance', { precision: 10, scale: 2 }).notNull(),
  notes: varchar('notes', { length: 500 }),
  userId: bigint('user_id', { mode: 'number' })
    .notNull()
    .references(() => users.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export type Stock = typeof stocks.$inferSelect
export type NewStock = typeof stocks.$inferInsert
