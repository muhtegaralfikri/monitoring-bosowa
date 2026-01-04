import { FastifyInstance } from 'fastify'
import {
  getUsersHandler,
  getUserHandler,
  createUserHandler,
  updateUserHandler,
  deleteUserHandler,
  toggleUserStatusHandler,
} from '../controllers/user.controller'
import { authMiddleware, requireAdmin } from '../middleware/auth.middleware'

export async function userRoutes(fastify: FastifyInstance) {
  // All routes require authentication + admin role
  fastify.register(async function (fastify) {
    fastify.addHook('preHandler', authMiddleware)

    // Get all users
    fastify.get('/', getUsersHandler)

    // Create user (admin only)
    fastify.register(async function (fastify) {
      fastify.addHook('preHandler', requireAdmin)
      fastify.post('/', createUserHandler)
    })

    // Get user by ID
    fastify.get('/:id', getUserHandler)

    // Update user (admin only)
    fastify.register(async function (fastify) {
      fastify.addHook('preHandler', requireAdmin)
      fastify.put('/:id', updateUserHandler)
    })

    // Delete user (admin only)
    fastify.register(async function (fastify) {
      fastify.addHook('preHandler', requireAdmin)
      fastify.delete('/:id', deleteUserHandler)
    })

    // Toggle user status (admin only)
    fastify.register(async function (fastify) {
      fastify.addHook('preHandler', requireAdmin)
      fastify.patch('/:id/toggle-status', toggleUserStatusHandler)
    })
  })
}
