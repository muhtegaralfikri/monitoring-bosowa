import type { FastifyRequest, FastifyReply } from 'fastify'
import { systemLogs } from '../db/schema'
import { db } from '../config/database'

export interface LogOptions {
  action: string
  entityType?: string
  entityId?: number
  details?: string
}

// Helper function to create log entry
export async function createLog(
  request: FastifyRequest,
  options: LogOptions
) {
  try {
    const jwtUser = (request as any).jwtUser
    const ip = request.headers['x-forwarded-for'] as string || request.ip
    const userAgent = request.headers['user-agent'] || ''

    await db.insert(systemLogs).values({
      userId: jwtUser?.userId || null,
      action: options.action,
      entityType: options.entityType || null,
      entityId: options.entityId || null,
      ipAddress: ip,
      userAgent: userAgent.substring(0, 500),
      details: options.details?.substring(0, 1000) || null,
    })
  } catch (err) {
    // Log errors but don't block the request
    console.error('Failed to create log entry:', err)
  }
}

// Action types for logging
export const LOG_ACTIONS = {
  // Auth actions
  LOGIN: 'LOGIN',
  LOGOUT: 'LOGOUT',
  LOGIN_FAILED: 'LOGIN_FAILED',
  TOKEN_REFRESH: 'TOKEN_REFRESH',

  // Stock actions
  STOCK_IN: 'STOCK_IN',
  STOCK_OUT: 'STOCK_OUT',

  // User actions
  USER_CREATED: 'USER_CREATED',
  USER_UPDATED: 'USER_UPDATED',
  USER_DELETED: 'USER_DELETED',

  // Settings actions
  SETTINGS_UPDATED: 'SETTINGS_UPDATED',

  // Log actions
  LOGS_VIEWED: 'LOGS_VIEWED',
} as const
