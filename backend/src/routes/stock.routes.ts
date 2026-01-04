import { FastifyInstance } from 'fastify'
import {
  getStockSummaryHandler,
  stockInHandler,
  stockOutHandler,
  getStockHistoryHandler,
  getStockTrendHandler,
} from '../controllers/stock.controller'
import { authMiddleware, requireAdmin } from '../middleware/auth.middleware'

export async function stockRoutes(fastify: FastifyInstance) {
  // All routes require authentication
  fastify.register(async function (fastify) {
    fastify.addHook('preHandler', authMiddleware)

    // Get stock summary
    fastify.get('/summary', getStockSummaryHandler)

    // Stock IN (admin only)
    fastify.register(async function (fastify) {
      fastify.addHook('preHandler', requireAdmin)
      fastify.post('/in', stockInHandler)
    })

    // Stock OUT (all authenticated users)
    fastify.post('/out', stockOutHandler)

    // Get stock history
    fastify.get('/history', getStockHistoryHandler)

    // Get stock trend
    fastify.get('/trend', getStockTrendHandler)
  })
}
