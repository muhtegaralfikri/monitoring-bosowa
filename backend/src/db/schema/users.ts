import { mysqlTable, varchar, timestamp, boolean, tinyint, bigint } from 'drizzle-orm/mysql-core'

export const users = mysqlTable('users', {
  id: bigint('id', { mode: 'number' }).primaryKey().autoincrement(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  password: varchar('password', { length: 255 }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  role: tinyint('role').notNull().default(2), // 1 = admin, 2 = operasional
  location: tinyint('location'), // 1 = GENSET, 2 = TUG_ASSIST, null = both
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow().onUpdateNow(),
})

export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
