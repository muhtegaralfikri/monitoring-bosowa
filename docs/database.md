# Database Design - Monitoring BBM Bosowa

> Version: 1.0
> Last Updated: 2026-01-04
> Database: MySQL 8.0+

---

## 1. Entity Relationship Diagram

```
┌───────────────────┐         ┌──────────────────────────┐
│      users        │         │      transactions        │
├───────────────────┤         ├──────────────────────────┤
│ id (PK)          │◄────────│user_id (FK)              │
│ email (UNIQUE)   │         │                          │
│ password         │         │                          │
│ name             │         │                          │
│ role             │         │                          │
│ location         │         │location                  │
│ created_at       │         │type (IN/OUT)             │
│ updated_at       │         │amount                    │
│                  │         │notes                     │
│                  │         │created_at                │
└───────────────────┘         └──────────────────────────┘
                                          │
                                          │
┌─────────────────────────────────────────┘
│
│
┌───────────────────┐         ┌──────────────────────────┐
│  refresh_tokens   │         │   (Computed Views)       │
├───────────────────┤         ├──────────────────────────┤
│ id (PK)          │         │  stock_summary           │
│ token (UNIQUE)   │         │  - date                  │
│ user_id (FK)     │         │  - location              │
│ expires_at       │         │  - total_balance         │
│ created_at       │         │                          │
└───────────────────┘         └──────────────────────────┘
```

---

## 2. Normalisasi

### 2.1 Normal Form Applied

| Normal Form | Status | Notes |
|-------------|--------|-------|
| 1NF | ✅ | Semua kolom atomic, tidak ada repeating groups |
| 2NF | ✅ | Tidak ada partial dependency (PK tunggal di setiap tabel) |
| 3NF | ✅ | Tidak ada transitive dependency |

### 2.2 Denormalization Considerations

Tidak perlu denormalization untuk sistem ini karena:
- Data volume kecil (< 10,000 transaksi/tahun)
- Query sederhana
- Dashboard pakai aggregation query

---

## 3. Table Schema

### 3.1 users

Menyimpan data pengguna sistem.

```sql
CREATE TABLE users (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL COMMENT 'Hashed password (bcrypt)',
    name VARCHAR(100) NOT NULL,
    role ENUM('admin', 'operasional') NOT NULL DEFAULT 'operasional',
    location ENUM('GENSET', 'TUG_ASSIST') NULL COMMENT 'NULL for admin, required for operasional',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_email (email),
    INDEX idx_role (role),
    INDEX idx_location (location)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

**Drizzle Schema:**
```typescript
import { mysqlTable, int, varchar, enum as enumType, boolean, timestamp, index } from 'drizzle-orm/mysql-core'

export const users = mysqlTable('users', {
  id: int('id').primaryKey().autoincrement(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  password: varchar('password', { length: 255 }).notNull(),
  name: varchar('name', { length: 100 }).notNull(),
  role: enumType('role', ['admin', 'operasional']).notNull().default('operasional'),
  location: enumType('location', ['GENSET', 'TUG_ASSIST']).$type<string | null>(),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
}, (table) => ({
  emailIdx: index('idx_email').on(table.email),
  roleIdx: index('idx_role').on(table.role),
  locationIdx: index('idx_location').on(table.location),
}))
```

---

### 3.2 refresh_tokens

Menyimpan refresh token untuk auto-renewal session.

```sql
CREATE TABLE refresh_tokens (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    token VARCHAR(255) NOT NULL UNIQUE COMMENT 'Hashed refresh token',
    user_id INT UNSIGNED NOT NULL,
    expires_at DATETIME NOT NULL COMMENT 'Token expiration time (30 days)',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    revoked_at TIMESTAMP NULL COMMENT 'Set saat logout atau revoke',
    revoked_by INT UNSIGNED NULL COMMENT 'User ID yang me-revoke (optional)',

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_token (token),
    INDEX idx_user_expires (user_id, expires_at),
    INDEX idx_active (user_id, revoked_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

**Drizzle Schema:**
```typescript
export const refreshTokens = mysqlTable('refresh_tokens', {
  id: int('id').primaryKey().autoincrement(),
  token: varchar('token', { length: 255 }).notNull().unique(),
  userId: int('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  revokedAt: timestamp('revoked_at').$type<Date | null>(),
  revokedBy: int('revoked_by').references(() => users.id).$type<number | null>(),
}, (table) => ({
  tokenIdx: index('idx_token').on(table.token),
  userExpiresIdx: index('idx_user_expires').on(table.userId, table.expiresAt),
  activeIdx: index('idx_active').on(table.userId, table.revokedAt),
}))
```

---

### 3.3 transactions

Menyimpan semua transaksi stok (masuk/keluar).

```sql
CREATE TABLE transactions (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    type ENUM('IN', 'OUT') NOT NULL COMMENT 'IN = stok masuk, OUT = pemakaian',
    amount DECIMAL(10, 2) NOT NULL COMMENT 'Jumlah dalam liter',
    location ENUM('GENSET', 'TUG_ASSIST') NOT NULL,
    user_id INT UNSIGNED NOT NULL COMMENT 'User yang melakukan input',
    notes TEXT NULL COMMENT 'Keterangan tambahan',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT,
    INDEX idx_type (type),
    INDEX idx_location (location),
    INDEX idx_created_at (created_at),
    INDEX idx_user_id (user_id),
    INDEX idx_type_location_date (type, location, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

**Drizzle Schema:**
```typescript
export const transactions = mysqlTable('transactions', {
  id: int('id').primaryKey().autoincrement(),
  type: enumType('type', ['IN', 'OUT']).notNull(),
  amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
  location: enumType('location', ['GENSET', 'TUG_ASSIST']).notNull(),
  userId: int('user_id').notNull().references(() => users.id, { onDelete: 'restrict' }),
  notes: text('notes').$type<string | null>(),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  typeIdx: index('idx_type').on(table.type),
  locationIdx: index('idx_location').on(table.location),
  createdAtIdx: index('idx_created_at').on(table.createdAt),
  userIdIdx: index('idx_user_id').on(table.userId),
  typeLocationDateIdx: index('idx_type_location_date').on(table.type, table.location, table.createdAt),
}))
```

---

### 3.4 system_logs (Optional)

Menyimpan log aktivitas sistem untuk audit.

```sql
CREATE TABLE system_logs (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNSIGNED NULL,
    action VARCHAR(50) NOT NULL COMMENT 'LOGIN, LOGOUT, STOCK_IN, STOCK_OUT, CREATE_USER, etc.',
    entity_type VARCHAR(50) NULL COMMENT 'user, transaction, etc.',
    entity_id INT UNSIGNED NULL,
    ip_address VARCHAR(45) NULL,
    user_agent TEXT NULL,
    details JSON NULL COMMENT 'Additional context',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_user_id (user_id),
    INDEX idx_action (action),
    INDEX idx_entity (entity_type, entity_id),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

## 4. Views / Computed Queries

### 4.1 Stock Summary (Real-time)

Query untuk mendapatkan stok terakhir per lokasi:

```sql
WITH stock_calculation AS (
    SELECT
        location,
        SUM(CASE WHEN type = 'IN' THEN amount ELSE -amount END) as balance
    FROM transactions
    GROUP BY location
)
SELECT
    location,
    COALESCE(balance, 0) as total_balance
FROM (SELECT DISTINCT location FROM transactions) t
LEFT JOIN stock_calculation s ON t.location = s.location;
```

**Drizzle Query:**
```typescript
import { sql } from 'drizzle-orm'

const stockSummary = await db.execute(sql`
  WITH stock_calculation AS (
    SELECT
      location,
      SUM(CASE WHEN type = 'IN' THEN amount ELSE -amount END) as balance
    FROM transactions
    GROUP BY location
  )
  SELECT
    location,
    COALESCE(balance, 0) as total_balance
  FROM (SELECT DISTINCT location FROM transactions) t
  LEFT JOIN stock_calculation s ON t.location = s.location
`)
```

---

### 4.2 Stock Trend (Per Date)

Query untuk grafik tren stok:

```sql
WITH daily_transactions AS (
    SELECT
        DATE(created_at) as transaction_date,
        type,
        location,
        SUM(amount) as amount
    FROM transactions
    WHERE DATE(created_at) >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
    GROUP BY DATE(created_at), type, location
),
running_balance AS (
    SELECT
        transaction_date,
        location,
        SUM(CASE WHEN type = 'IN' THEN amount ELSE -amount END)
            OVER (PARTITION BY location ORDER BY transaction_date) as balance,
        SUM(CASE WHEN type = 'IN' THEN amount ELSE 0 END) as stock_in,
        SUM(CASE WHEN type = 'OUT' THEN amount ELSE 0 END) as stock_out
    FROM daily_transactions
)
SELECT * FROM running_balance
ORDER BY transaction_date, location;
```

---

## 5. Seed Data

### 5.1 Default Admin User

```sql
INSERT INTO users (email, password, name, role, location) VALUES
('admin@bosowa.co.id', '$2b$10$xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx', 'Admin Utama', 'admin', NULL);

-- Password: admin123 (hash dengan bcrypt)
```

**Drizzle Seed:**
```typescript
import bcrypt from 'bcrypt'

const hashedPassword = await bcrypt.hash('admin123', 10)

await db.insert(users).values({
  email: 'admin@bosowa.co.id',
  password: hashedPassword,
  name: 'Admin Utama',
  role: 'admin',
  location: null,
})
```

---

### 5.2 Sample Operasional Users

```sql
INSERT INTO users (email, password, name, role, location) VALUES
('genset@bosowa.co.id', '$2b$10$...', 'Operator GENSET', 'operasional', 'GENSET'),
('tugassist@bosowa.co.id', '$2b$10$...', 'Operator TUG ASSIST', 'operasional', 'TUG_ASSIST');

-- Password: operasional123
```

---

## 6. Index Strategy

### 6.1 Indexes Created

| Table | Index | Columns | Purpose |
|-------|-------|---------|---------|
| users | idx_email | email | Login lookup |
| users | idx_role | role | Filter by role |
| users | idx_location | location | Filter by location |
| refresh_tokens | idx_token | token | Refresh token lookup |
| refresh_tokens | idx_user_expires | user_id, expires_at | Active token query |
| refresh_tokens | idx_active | user_id, revoked_at | Non-revoked token |
| transactions | idx_type | type | Filter by type |
| transactions | idx_location | location | Filter by location |
| transactions | idx_created_at | created_at | Date range query |
| transactions | idx_user_id | user_id | User history |
| transactions | idx_type_location_date | type, location, created_at | Composite filter |

### 6.2 Index Maintenance

```sql
-- Cleanup expired refresh tokens (jalankan via cron)
DELETE FROM refresh_tokens WHERE expires_at < NOW();

-- Atau buat event scheduler MySQL
CREATE EVENT cleanup_expired_tokens
ON SCHEDULE EVERY 1 HOUR
DO DELETE FROM refresh_tokens WHERE expires_at < NOW();
```

---

## 7. Database Size Estimation

| Table | Rows/year | Row size | Total/year |
|-------|-----------|----------|------------|
| users | 10 | ~200 bytes | ~2 KB |
| refresh_tokens | 100 | ~100 bytes | ~10 KB |
| transactions | 1,000 | ~150 bytes | ~150 KB |
| system_logs | 5,000 | ~200 bytes | ~1 MB |

**Total growth:** ~1.2 MB/tahun (sangat kecil, aman untuk VPS 2GB)

---

## 8. Backup Strategy

### 8.1 Backup via aaPanel

1. **Auto Backup:** Set di aaPanel → Database → Backup
   - Daily backup at 3 AM
   - Retain 7 days

2. **Manual Backup:**
```bash
mysqldump -u monitoring_user -p monitoring_bosowa > backup_$(date +%Y%m%d).sql
```

### 8.2 Restore

```bash
mysql -u monitoring_user -p monitoring_bosowa < backup_20260104.sql
```

---

## 9. Migration Strategy

### 9.1 Drizzle Kit Setup

```bash
npm install -D drizzle-kit
```

**drizzle.config.ts:**
```typescript
import type { Config } from 'drizzle-kit'

export default {
  schema: './src/db/schema.ts',
  out: './src/db/migrations',
  driver: 'mysql2',
  dbCredentials: {
    host: process.env.DB_HOST!,
    port: Number(process.env.DB_PORT!),
    user: process.env.DB_USER!,
    password: process.env.DB_PASSWORD!,
    database: process.env.DB_NAME!,
  },
} satisfies Config
```

### 9.2 Migration Commands

```bash
# Generate migration
npm run db:generate

# Apply migration
npm run db:migrate

# Rollback (manual)
npm run db:rollback
```

---

## 10. Query Optimization Tips

1. **Use INDEX** untuk kolom yang sering di-filter (type, location, created_at)
2. **Avoid SELECT *** - select only needed columns
3. **Use LIMIT** untuk pagination
4. **Cache aggregate queries** di aplikasi (dashboard summary)
5. **Use prepared statements** (Drizzle sudah handle ini)
