import type { FastifyRequest, FastifyReply } from 'fastify'
import { authService } from '../services/auth.service'
import type { JwtPayload } from '../types'

// Extend Fastify types
declare module 'fastify' {
  interface FastifyRequest {
    jwtUser?: JwtPayload
  }
}

export async function authMiddleware(request: FastifyRequest, reply: FastifyReply) {
  try {
    // Verify JWT token from Authorization header
    await request.jwtVerify()

    // Get user from token payload
    const payload = (request.user as any) as JwtPayload

    // Verify user still exists and is active
    const user = await authService.getUserById(payload.userId)
    if (!user) {
      return reply.status(401).send({ error: 'User not found' })
    }

    request.jwtUser = payload
  } catch (err) {
    return reply.status(401).send({ error: 'Unauthorized' })
  }
}

export function requireRole(...roles: number[]) {
  return async function (request: FastifyRequest, reply: FastifyReply) {
    if (!request.jwtUser) {
      return reply.status(401).send({ error: 'Unauthorized' })
    }

    if (!roles.includes(request.jwtUser.role)) {
      return reply.status(403).send({ error: 'Forbidden' })
    }
  }
}

export const requireAdmin = requireRole(1)
export const requireAdminOrOperasional = requireRole(1, 2)
