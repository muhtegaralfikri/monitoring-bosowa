# Backend Architecture - Monitoring BBM Bosowa

> Version: 1.0
> Last Updated: 2026-01-04
> Framework: Fastify 5.x + Drizzle ORM
> Port: 4111

---

## 1. Project Structure

```
backend/
├── src/
│   ├── db/
│   │   ├── schema.ts           # Drizzle schema definitions
│   │   ├── connection.ts       # Database connection
│   │   └── migrations/         # SQL migrations
│   ├── routes/
│   │   ├── auth.ts            # Auth routes (login, refresh, logout)
│   │   ├── users.ts           # User CRUD (admin only)
│   │   ├── stock.ts           # Stock in/out, history, trend
│   │   └── index.ts           # Route aggregator
│   ├── middleware/
│   │   ├── auth.ts            # JWT verification
│   │   ├── role.ts            # Role-based access control
│   │   └── validator.ts       # Request validation
│   ├── services/
│   │   ├── auth.service.ts    # Auth logic
│   │   ├── user.service.ts    # User CRUD logic
│   │   └── stock.service.ts   # Stock business logic
│   ├── types/
│   │   └── index.ts           # TypeScript types
│   ├── utils/
│   │   ├── password.ts        # Bcrypt hashing
│   │   ├── jwt.ts             # JWT operations
│   │   └── response.ts        # Standard response format
│   ├── constants/
│   │   └── index.ts           # Constants (roles, locations, etc.)
│   └── index.ts               # App entry point
├── .env.example
├── .env
├── package.json
├── tsconfig.json
└── drizzle.config.ts
```

---

## 2. Core Modules

### 2.1 Database Connection

```typescript
// src/db/connection.ts
import { drizzle } from 'drizzle-orm/mysql2'
import mysql from 'mysql2/promise'
import * as schema from './schema'

const connection = await mysql.createConnection({
  host: process.env.DB_HOST!,
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER!,
  password: process.env.DB_PASSWORD!,
  database: process.env.DB_NAME!,
})

export const db = drizzle(connection, { schema })
```

---

### 2.2 Fastify App Setup

```typescript
// src/index.ts
import Fastify from 'fastify'
import cors from '@fastify/cors'
import jwt from '@fastify/jwt'
import cookie from '@fastify/cookie'
import { routes } from './routes'

const app = Fastify({
  logger: true,
})

// Register plugins
await app.register(cors, {
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
})

await app.register(jwt, {
  secret: process.env.JWT_SECRET!,
})

await app.register(cookie, {
  secret: process.env.COOKIE_SECRET || 'cookie-secret',
})

// Register routes
await app.register(routes)

// Start server
app.listen({ port: Number(process.env.PORT || 4111), host: '0.0.0.0' })
```

---

## 3. API Routes

### 3.1 Route Structure

| Method | Path | Auth | Role | Description |
|--------|------|------|------|-------------|
| POST | `/api/auth/login` | No | - | Login user |
| POST | `/api/auth/refresh` | No | - | Refresh access token |
| POST | `/api/auth/logout` | Yes | All | Logout user |
| GET | `/api/auth/me` | Yes | All | Get current user |
| GET | `/api/users` | Yes | Admin | Get all users |
| POST | `/api/users` | Yes | Admin | Create user |
| PATCH | `/api/users/:id` | Yes | Admin | Update user |
| DELETE | `/api/users/:id` | Yes | Admin | Delete user |
| GET | `/api/stock/summary` | Yes | All | Get stock summary |
| POST | `/api/stock/in` | Yes | Admin | Input stok masuk |
| POST | `/api/stock/out` | Yes | Operasional | Input pemakaian |
| GET | `/api/stock/history` | Yes | All | Get transaction history |
| GET | `/api/stock/trend` | Yes | All | Get stock trend |
| POST | `/api/stock/export` | Yes | All | Export to Excel |

---

### 3.2 Auth Routes

```typescript
// src/routes/auth.ts
import { FastifyInstance } from 'fastify'
import { AuthService } from '../services/auth.service'
import { LoginSchema, RefreshSchema } from '../types/validation'

export async function authRoutes(app: FastifyInstance) {
  const authService = new AuthService(app)

  // Login
  app.post('/login', {
    schema: {
      body: LoginSchema,
    },
  }, async (request, reply) => {
    const { email, password } = request.body as any
    const result = await authService.login(email, password)

    // Set httpOnly cookies
    reply.setCookie('accessToken', result.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60, // 24 hours
      path: '/',
    })

    reply.setCookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60, // 30 days
      path: '/',
    })

    return { user: result.user }
  })

  // Refresh
  app.post('/refresh', async (request, reply) => {
    const refreshToken = request.cookies.refreshToken
    if (!refreshToken) {
      return reply.status(401).send({ error: 'No refresh token' })
    }

    const result = await authService.refreshToken(refreshToken)

    reply.setCookie('accessToken', result.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60,
      path: '/',
    })

    reply.setCookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60,
      path: '/',
    })

    return { success: true }
  })

  // Logout
  app.post('/logout', {
    onRequest: [authenticate],
  }, async (request, reply) => {
    const refreshToken = request.cookies.refreshToken
    if (refreshToken) {
      await authService.logout(refreshToken)
    }

    reply.clearCookie('accessToken', { path: '/' })
    reply.clearCookie('refreshToken', { path: '/' })

    return { message: 'Logged out' }
  })

  // Get me
  app.get('/me', {
    onRequest: [authenticate],
  }, async (request) => {
    return request.user
  })
}
```

---

### 3.3 Stock Routes

```typescript
// src/routes/stock.ts
import { FastifyInstance } from 'fastify'
import { StockService } from '../services/stock.service'
import { authenticate, requireRole } from '../middleware/auth'

export async function stockRoutes(app: FastifyInstance) {
  const stockService = new StockService(app)

  // Summary
  app.get('/summary', {
    onRequest: [authenticate],
  }, async () => {
    return stockService.getSummary()
  })

  // Stock In (Admin only)
  app.post('/in', {
    onRequest: [authenticate, requireRole('admin')],
    schema: {
      body: {
        type: 'object',
        required: ['amount', 'location', 'notes'],
        properties: {
          date: { type: 'string', format: 'date-time' },
          amount: { type: 'number', minimum: 0.01 },
          location: { enum: ['GENSET', 'TUG_ASSIST'] },
          notes: { type: 'string' },
        },
      },
    },
  }, async (request, reply) => {
    const result = await stockService.stockIn(request.body, request.user)
    return reply.status(201).send(result)
  })

  // Stock Out (Operasional only)
  app.post('/out', {
    onRequest: [authenticate, requireRole('operasional')],
    schema: {
      body: {
        type: 'object',
        required: ['amount', 'notes'],
        properties: {
          date: { type: 'string', format: 'date-time' },
          amount: { type: 'number', minimum: 0.01 },
          notes: { type: 'string' },
        },
      },
    },
  }, async (request, reply) => {
    const result = await stockService.stockOut(request.body, request.user)
    return reply.status(201).send(result)
  })

  // History
  app.get('/history', {
    onRequest: [authenticate],
  }, async (request) => {
    const query = request.query as any
    return stockService.getHistory({
      page: Number(query.page || 1),
      limit: Number(query.limit || 20),
      type: query.type,
      location: query.location,
      startDate: query.startDate,
      endDate: query.endDate,
      search: query.search,
    })
  })

  // Trend
  app.get('/trend', {
    onRequest: [authenticate],
  }, async (request) => {
    const query = request.query as any
    return stockService.getTrend({
      days: Number(query.days || 7),
      location: query.location,
    })
  })

  // Export
  app.post('/export', {
    onRequest: [authenticate],
  }, async (request) => {
    const body = request.body as any
    return stockService.exportToExcel(body.filters)
  })
}
```

---

## 4. Middleware

### 4.1 Authentication Middleware

```typescript
// src/middleware/auth.ts
import { FastifyRequest, FastifyReply } from 'fastify'

export async function authenticate(request: FastifyRequest, reply: FastifyReply) {
  try {
    const token = request.cookies.accessToken
    if (!token) {
      return reply.status(401).send({ error: 'No access token' })
    }

    const decoded = await request.jwtVerify(token)
    request.user = decoded
  } catch (err) {
    return reply.status(401).send({ error: 'Invalid token' })
  }
}

export function requireRole(role: string) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    if (request.user.role !== role) {
      return reply.status(403).send({ error: 'Forbidden' })
    }
  }
}

export function requireLocation() {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    if (request.user.role === 'operasional' && !request.user.location) {
      return reply.status(403).send({ error: 'User has no location assigned' })
    }
  }
}
```

---

### 4.2 Validation Middleware (Zod)

```typescript
// src/middleware/validator.ts
import { FastifyRequest, FastifyReply } from 'fastify'
import { ZodSchema } from 'zod'

export function validate(schema: ZodSchema) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const result = schema.safeParse(request.body)
    if (!result.success) {
      return reply.status(422).send({
        error: 'Validation error',
        details: result.error.flatten(),
      })
    }
    request.body = result.data
  }
}
```

---

## 5. Services

### 5.1 Auth Service

```typescript
// src/services/auth.service.ts
import bcrypt from 'bcrypt'
import { randomBytes } from 'crypto'
import { db } from '../db/connection'
import { users, refreshTokens } from '../db/schema'
import { eq } from 'drizzle-orm'

export class AuthService {
  constructor(private app: any) {}

  async login(email: string, password: string) {
    // Find user
    const [user] = await db.select().from(users).where(eq(users.email, email))
    if (!user) {
      throw new Error('Invalid credentials')
    }

    // Verify password
    const valid = await bcrypt.compare(password, user.password)
    if (!valid) {
      throw new Error('Invalid credentials')
    }

    // Generate tokens
    const accessToken = this.app.jwt.sign({
      sub: user.id,
      email: user.email,
      role: user.role,
      location: user.location,
    }, { expiresIn: '1d' })

    const refreshToken = randomBytes(32).toString('hex')
    const hashedRefreshToken = await bcrypt.hash(refreshToken, 10)

    // Save refresh token
    await db.insert(refreshTokens).values({
      token: hashedRefreshToken,
      userId: user.id,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    })

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        location: user.location,
      },
    }
  }

  async refreshToken(refreshToken: string) {
    // Find token
    const tokens = await db.select().from(refreshTokens)
      .where(eq(refreshTokens.token, refreshToken))

    if (!tokens.length) {
      throw new Error('Invalid refresh token')
    }

    const [tokenRecord] = tokens
    if (tokenRecord.expiresAt < new Date()) {
      throw new Error('Expired refresh token')
    }

    // Get user
    const [user] = await db.select().from(users).where(eq(users.id, tokenRecord.userId))

    // Generate new tokens (rotation)
    const newAccessToken = this.app.jwt.sign({
      sub: user.id,
      email: user.email,
      role: user.role,
      location: user.location,
    }, { expiresIn: '1d' })

    const newRefreshToken = randomBytes(32).toString('hex')
    const hashedNewRefreshToken = await bcrypt.hash(newRefreshToken, 10)

    // Delete old token, save new
    await db.delete(refreshTokens).where(eq(refreshTokens.token, refreshToken))
    await db.insert(refreshTokens).values({
      token: hashedNewRefreshToken,
      userId: user.id,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    })

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    }
  }

  async logout(refreshToken: string) {
    await db.delete(refreshTokens).where(eq(refreshTokens.token, refreshToken))
  }
}
```

---

### 5.2 Stock Service

```typescript
// src/services/stock.service.ts
import { db } from '../db/connection'
import { transactions } from '../db/schema'
import { sql, eq, and, gte, lte, like, desc } from 'drizzle-orm'

export class StockService {
  constructor(private app: any) {}

  async getSummary() {
    const result = await db.execute(sql`
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

    return result[0]
  }

  async stockIn(data: any, user: any) {
    const [transaction] = await db.insert(transactions).values({
      type: 'IN',
      amount: data.amount,
      location: data.location,
      userId: user.id,
      notes: data.notes || null,
      createdAt: data.date ? new Date(data.date) : new Date(),
    }).returning()

    return transaction
  }

  async stockOut(data: any, user: any) {
    // Check stock
    const summary = await this.getSummary()
    const currentStock = summary.find((s: any) => s.location === user.location)?.total_balance || 0

    if (currentStock < data.amount) {
      throw new Error('Insufficient stock')
    }

    const [transaction] = await db.insert(transactions).values({
      type: 'OUT',
      amount: data.amount,
      location: user.location,
      userId: user.id,
      notes: data.notes || null,
      createdAt: data.date ? new Date(data.date) : new Date(),
    }).returning()

    return transaction
  }

  async getHistory(filters: any) {
    const { page, limit, type, location, startDate, endDate, search } = filters
    const offset = (page - 1) * limit

    let conditions = []

    if (type) conditions.push(eq(transactions.type, type))
    if (location) conditions.push(eq(transactions.location, location))
    if (startDate) conditions.push(gte(transactions.createdAt, new Date(startDate)))
    if (endDate) conditions.push(lte(transactions.createdAt, new Date(endDate)))
    if (search) conditions.push(like(transactions.notes, `%${search}%`))

    const where = conditions.length ? and(...conditions) : undefined

    const [data, totalResult] = await Promise.all([
      db.select().from(transactions).where(where).orderBy(desc(transactions.createdAt)).limit(limit).offset(offset),
      db.select({ count: sql`COUNT(*) }).from(transactions).where(where),
    ])

    return {
      data,
      pagination: {
        page,
        limit,
        total: Number(totalResult[0]?.count || 0),
        totalPages: Math.ceil(Number(totalResult[0]?.count || 0) / limit),
      },
    }
  }

  async getTrend(params: any) {
    const { days, location } = params
    const result = await db.execute(sql`
      WITH daily_transactions AS (
        SELECT
          DATE(created_at) as transaction_date,
          type,
          location,
          SUM(amount) as amount
        FROM transactions
        WHERE DATE(created_at) >= DATE_SUB(CURDATE(), INTERVAL ${days} DAY)
          ${location ? sql`AND location = ${location}` : sql``}
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
      ORDER BY transaction_date, location
    `)

    return result[0]
  }
}
```

---

## 6. Error Handling

```typescript
// src/utils/error.ts
export class AppError extends Error {
  constructor(public statusCode: number, public message: string) {
    super(message)
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(422, message)
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(404, `${resource} not found`)
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden') {
    super(403, message)
  }
}

// Global error handler
export function errorHandler(error: Error, request: FastifyRequest, reply: FastifyReply) {
  request.log.error(error)

  if (error instanceof AppError) {
    return reply.status(error.statusCode).send({
      error: error.message,
    })
  }

  return reply.status(500).send({
    error: 'Internal server error',
  })
}
```

---

## 7. Environment Variables

```env
# .env
NODE_ENV=development
PORT=4111

# Database
DB_HOST=localhost
DB_PORT=3306
DB_NAME=monitoring_bosowa
DB_USER=monitoring_user
DB_PASSWORD=your_secure_password

# JWT
JWT_SECRET=your_jwt_secret_min_32_chars_change_this

# CORS
FRONTEND_URL=http://localhost:5173

# Cookie
COOKIE_SECRET=your_cookie_secret_min_32_chars
```

---

## 8. Package Scripts

```json
{
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsup",
    "start": "node dist/index.js",
    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit push",
    "db:studio": "drizzle-kit studio"
  }
}
```

---

## 9. Performance Considerations

1. **Connection Pooling**: MySQL2 sudah built-in connection pool
2. **Prepared Statements**: Drizzle pakai prepared statements
3. **Index Optimization**: Lihat database.md
4. **Response Compression**: Pakai `@fastify/compress`
5. **Rate Limiting**: Pakai `@fastify/rate-limit` (optional)

```typescript
await app.register(compress, { encodings: ['gzip', 'deflate'] })
await app.register(rateLimit, { max: 100, timeWindow: '1 minute' })
```

---

## 10. Testing

```typescript
// test/routes/auth.test.ts
import { buildApp } from '../src/app'
import { describe, it, expect, beforeAll, afterAll } from 'vitest'

describe('Auth Routes', () => {
  let app: any

  beforeAll(async () => {
    app = await buildApp()
  })

  afterAll(async () => {
    await app.close()
  })

  it('should login with valid credentials', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      body: { email: 'admin@bosowa.co.id', password: 'admin123' },
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toHaveProperty('user')
  })
})
```
