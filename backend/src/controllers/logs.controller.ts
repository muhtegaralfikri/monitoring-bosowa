import type { FastifyRequest, FastifyReply } from 'fastify'
import { eq, desc, and, gte, lte, sql, like } from 'drizzle-orm'
import { systemLogs, users } from '../db/schema'
import { db } from '../config/database'
import type { LogsQuery } from '../types'
import { createLog, LOG_ACTIONS } from '../middleware/logger.middleware'

// Get system logs (admin only)
export async function getLogsHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const jwtUser = (request as any).jwtUser
    const query = request.query as LogsQuery

    const pageRaw = Number(query.page)
    const limitRaw = Number(query.limit)
    const page = Number.isFinite(pageRaw) && pageRaw > 0 ? Math.floor(pageRaw) : 1
    const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.floor(limitRaw) : 50
    const offset = (page - 1) * limit

    // Build conditions
    const conditions: any[] = []

    if (query.action) {
      conditions.push(eq(systemLogs.action, query.action))
    }

    if (query.entityType) {
      conditions.push(eq(systemLogs.entityType, query.entityType))
    }

    if (query.userId) {
      conditions.push(eq(systemLogs.userId, Number(query.userId)))
    }

    if (query.startDate) {
      conditions.push(gte(systemLogs.createdAt, new Date(query.startDate)))
    }

    if (query.endDate) {
      conditions.push(lte(systemLogs.createdAt, new Date(query.endDate)))
    }

    if (query.search) {
      conditions.push(
        sql`(${systemLogs.details} LIKE ${`%${query.search}%`} OR ${systemLogs.action} LIKE ${`%${query.search}%`})`
      )
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined

    // Get total count
    const [countResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(systemLogs)
      .where(whereClause)

    const total = Number(countResult?.count || 0)

    // Get logs with pagination
    const logList = await db
      .select({
        id: systemLogs.id,
        userId: systemLogs.userId,
        action: systemLogs.action,
        entityType: systemLogs.entityType,
        entityId: systemLogs.entityId,
        ipAddress: systemLogs.ipAddress,
        details: systemLogs.details,
        createdAt: systemLogs.createdAt,
        userName: sql<string>`(SELECT name FROM users WHERE id = system_logs.user_id)`,
        userEmail: sql<string>`(SELECT email FROM users WHERE id = system_logs.user_id)`,
      })
      .from(systemLogs)
      .where(whereClause)
      .orderBy(desc(systemLogs.id))
      .limit(limit)
      .offset(offset)

    // Log this action
    await createLog(request as any, {
      action: LOG_ACTIONS.LOGS_VIEWED,
      entityType: 'system_logs',
      details: `Viewed logs page ${page}`,
    })

    return {
      data: logList,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    }
  } catch (err: any) {
    console.error('Get logs error:', err)
    return reply.status(500).send({ error: 'Failed to get logs' })
  }
}

// Get system statistics (admin only)
export async function getLogsStatsHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    // Get logs from last 30 days
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    // Total logs in 30 days
    const [totalLogs] = await db
      .select({ count: sql<number>`count(*)` })
      .from(systemLogs)
      .where(gte(systemLogs.createdAt, thirtyDaysAgo))

    // Logs by action
    const actionCounts = await db
      .select({
        action: systemLogs.action,
        count: sql<number>`count(*)`,
      })
      .from(systemLogs)
      .where(gte(systemLogs.createdAt, thirtyDaysAgo))
      .groupBy(systemLogs.action)

    // Most active users
    const userActivity = await db
      .select({
        userId: systemLogs.userId,
        userName: sql<string>`(SELECT name FROM users WHERE id = system_logs.user_id)`,
        count: sql<number>`count(*)`,
      })
      .from(systemLogs)
      .where(gte(systemLogs.createdAt, thirtyDaysAgo))
      .groupBy(systemLogs.userId)
      .orderBy(sql`count(*) DESC`)
      .limit(5)

    return {
      totalLogs: Number(totalLogs?.count || 0),
      actionCounts: actionCounts.map((item) => ({
        action: item.action,
        count: Number(item.count),
      })),
      userActivity: userActivity.map((item) => ({
        userId: item.userId,
        userName: item.userName || 'Unknown',
        count: Number(item.count),
      })),
    }
  } catch (err: any) {
    console.error('Get logs stats error:', err)
    return reply.status(500).send({ error: 'Failed to get logs statistics' })
  }
}

// Clean old logs (admin only) - delete logs older than 90 days
export async function cleanOldLogsHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const ninetyDaysAgo = new Date()
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)

    const [result] = await db
      .delete(systemLogs)
      .where(sql`${systemLogs.createdAt} < ${ninetyDaysAgo}`)

    return { message: 'Old logs cleaned successfully' }
  } catch (err: any) {
    console.error('Clean old logs error:', err)
    return reply.status(500).send({ error: 'Failed to clean old logs' })
  }
}
