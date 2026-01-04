import { FastifyInstance } from 'fastify'
import {
  getStockSummaryHandler,
  stockInHandler,
  stockOutHandler,
  getStockHistoryHandler,
  getStockTrendHandler,
  exportStockHistoryHandler,
  getTodayStatsHandler,
} from '../controllers/stock.controller'
import { authMiddleware, requireAdmin } from '../middleware/auth.middleware'

export async function stockRoutes(fastify: FastifyInstance) {
  // Public routes for charts (no authentication required)
  fastify.register(async function (fastify) {
    // Public rate limit (more lenient)
    fastify.addHook('preHandler', async (request, reply) => {
      ;(request as any).rateLimit = {
        max: 100,
        timeWindow: '1 minute',
      }
    })

    // Get stock history (public - for charts)
    fastify.get('/history', getStockHistoryHandler)

    // Get stock trend (public - for charts)
    fastify.get('/trend', getStockTrendHandler)
  })

  // All other routes require authentication
  fastify.register(async function (fastify) {
    // Stricter rate limit for authenticated endpoints
    fastify.addHook('preHandler', authMiddleware)
    fastify.addHook('preHandler', async (request, reply) => {
      // Set rate limit options for this route group
      ;(request as any).rateLimit = {
        max: 50,
        timeWindow: '1 minute',
      }
    })

    // Get stock summary
    fastify.get('/summary', getStockSummaryHandler)

    // Get today's statistics
    fastify.get('/today', getTodayStatsHandler)

    // Stock IN (admin only)
    fastify.register(async function (fastify) {
      fastify.addHook('preHandler', requireAdmin)
      fastify.post('/in', stockInHandler)
    })

    // Stock OUT (all authenticated users)
    fastify.post('/out', stockOutHandler)

    // Export stock history to Excel
    fastify.get('/export', exportStockHistoryHandler)
  })
}
