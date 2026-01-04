import { FastifyInstance } from 'fastify'
import {
  loginHandler,
  registerHandler,
  meHandler,
  refreshHandler,
  logoutHandler,
} from '../controllers/auth.controller'
import { authMiddleware } from '../middleware/auth.middleware'

export async function authRoutes(fastify: FastifyInstance) {
  // Public routes
  fastify.post('/login', loginHandler)
  fastify.post('/register', registerHandler)
  fastify.post('/refresh', refreshHandler) // Public - uses httpOnly cookie, not JWT

  // Protected routes
  fastify.register(async function (fastify) {
    fastify.addHook('preHandler', authMiddleware)

    fastify.get('/me', meHandler)
    fastify.post('/logout', logoutHandler)
  })
}
