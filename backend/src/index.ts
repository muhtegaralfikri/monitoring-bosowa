import 'dotenv/config'
import Fastify from 'fastify'
import cors from '@fastify/cors'
import jwt from '@fastify/jwt'
import cookie from '@fastify/cookie'
import rateLimit from '@fastify/rate-limit'
import { authRoutes } from './routes/auth.routes'
import { stockRoutes } from './routes/stock.routes'
import { userRoutes } from './routes/user.routes'
import { notificationRoutes } from './routes/notification.routes'

const fastify = Fastify({
  logger: true,
})

// Register plugins
await fastify.register(cors, {
  origin: true,
  credentials: true,
})

await fastify.register(jwt, {
  secret: process.env.JWT_SECRET || 'your-secret-key-change-this',
})

await fastify.register(cookie, {
  secret: process.env.COOKIE_SECRET || 'your-cookie-secret-change-this',
})

// Rate limiting
await fastify.register(rateLimit, {
  max: 100, // 100 requests per minute
  timeWindow: '1 minute',
  skipOnError: true,
})

// Health check
fastify.get('/', async (request, reply) => {
  return {
    status: 'ok',
    message: 'Monitoring BBM Bosowa API',
    version: '1.0.0',
  }
})

// Register routes
await fastify.register(authRoutes, { prefix: '/auth' })
await fastify.register(stockRoutes, { prefix: '/stock' })
await fastify.register(userRoutes, { prefix: '/users' })
await fastify.register(notificationRoutes, { prefix: '/notifications' })

// Start server
const start = async () => {
  try {
    const port = Number(process.env.PORT) || 4111
    const host = process.env.HOST || '0.0.0.0'

    await fastify.listen({ port, host })

    console.log(`
      🚀 Server ready!
      📡 Port: ${port}
      🌐 URL: http://${host}:${port}
    `)
  } catch (err) {
    fastify.log.error(err)
    process.exit(1)
  }
}

start()
