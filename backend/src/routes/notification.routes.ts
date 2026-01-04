import { FastifyInstance } from 'fastify'
import {
  checkLowStockHandler,
  getSettingsHandler,
  updateSettingsHandler,
} from '../controllers/notification.controller'
import { authMiddleware, requireAdmin } from '../middleware/auth.middleware'

export async function notificationRoutes(fastify: FastifyInstance) {
  // All routes require authentication
  fastify.register(async function (fastify) {
    fastify.addHook('preHandler', authMiddleware)

    // Check low stock alerts (all authenticated users)
    fastify.get('/check', checkLowStockHandler)

    // Settings management (admin only)
    fastify.register(async function (fastify) {
      fastify.addHook('preHandler', requireAdmin)

      // Get settings
      fastify.get('/settings', getSettingsHandler)

      // Update settings
      fastify.post('/settings', updateSettingsHandler)
    })
  })
}
