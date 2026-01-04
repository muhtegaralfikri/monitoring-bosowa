import { FastifyInstance } from 'fastify'
import {
  getLogsHandler,
  getLogsStatsHandler,
  cleanOldLogsHandler,
} from '../controllers/logs.controller'
import { authMiddleware, requireAdmin } from '../middleware/auth.middleware'

export async function logsRoutes(fastify: FastifyInstance) {
  // All routes require authentication and admin role
  fastify.register(async function (fastify) {
    fastify.addHook('preHandler', authMiddleware)
    fastify.addHook('preHandler', requireAdmin)

    // Get system logs with filters and pagination
    fastify.get('/', getLogsHandler)

    // Get system statistics
    fastify.get('/stats', getLogsStatsHandler)

    // Clean old logs (delete logs older than 90 days)
    fastify.delete('/clean', cleanOldLogsHandler)
  })
}
