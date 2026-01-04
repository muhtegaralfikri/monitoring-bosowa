import type { FastifyRequest, FastifyReply } from 'fastify'
import { authService } from '../services/auth.service'
import type { LoginInput, RegisterInput } from '../types'

// Login
export async function loginHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const input = request.body as LoginInput
    const user = await authService.validateLogin(input)

    // Create JWT token - use server.jwt for signing
    const token = request.server.jwt.sign({
      userId: user.id,
      email: user.email,
      role: user.role,
    })

    // Create refresh token
    const refreshToken = await authService.createRefreshToken(user.id)

    // Set httpOnly cookie
    reply.setCookie('refreshToken', refreshToken, {
      httpOnly: true,
      path: '/',
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 30 * 24 * 60 * 60, // 30 days
    })

    return {
      user,
      token,
    }
  } catch (err: any) {
    return reply.status(400).send({ error: err.message || 'Login failed' })
  }
}

// Register
export async function registerHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const input = request.body as RegisterInput
    console.log('Register input:', input)
    const user = await authService.register(input)

    return reply.status(201).send({
      user,
    })
  } catch (err: any) {
    console.error('Register error:', err)
    return reply.status(400).send({ error: err.message || 'Registration failed' })
  }
}

// Get current user
export async function meHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const jwtUser = (request as any).jwtUser
    const user = await authService.getUserById(jwtUser.userId)

    if (!user) {
      return reply.status(404).send({ error: 'User not found' })
    }

    return { user }
  } catch (err: any) {
    return reply.status(500).send({ error: 'Failed to get user' })
  }
}

// Refresh token
export async function refreshHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const refreshToken = request.cookies.refreshToken

    if (!refreshToken) {
      return reply.status(401).send({ error: 'No refresh token provided' })
    }

    const result = await authService.rotateRefreshToken(refreshToken)

    if (!result) {
      return reply.status(401).send({ error: 'Invalid or expired refresh token' })
    }

    // Get user
    const user = await authService.getUserById(result.userId)
    if (!user) {
      return reply.status(401).send({ error: 'User not found' })
    }

    // Create new JWT token
    const token = request.server.jwt.sign({
      userId: user.id,
      email: user.email,
      role: user.role,
    })

    // Set new refresh token cookie
    reply.setCookie('refreshToken', result.newToken, {
      httpOnly: true,
      path: '/',
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 30 * 24 * 60 * 60, // 30 days
    })

    return {
      user,
      token,
    }
  } catch (err: any) {
    return reply.status(401).send({ error: 'Invalid refresh token' })
  }
}

// Logout
export async function logoutHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const refreshToken = request.cookies.refreshToken

    if (refreshToken) {
      await authService.deleteRefreshToken(refreshToken)
    }

    // Clear cookie
    reply.clearCookie('refreshToken', {
      path: '/',
    })

    return { message: 'Logged out successfully' }
  } catch (err: any) {
    return reply.status(500).send({ error: 'Logout failed' })
  }
}
