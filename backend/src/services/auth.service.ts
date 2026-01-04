import { eq, and } from 'drizzle-orm'
import { users, refreshTokens } from '../db/schema'
import { db } from '../config/database'
import { hashPassword, verifyPassword } from '../utils/hash'
import type { LoginInput, RegisterInput, UserData, JwtPayload } from '../types'

export class AuthService {
  // Generate random token for refresh token
  private generateRefreshToken(): string {
    return Buffer.from(`${Date.now()}-${Math.random()}`).toString('base64')
  }

  // Register new user
  async register(input: RegisterInput): Promise<UserData> {
    // Check if email exists
    const existing = await db.select().from(users).where(eq(users.email, input.email)).limit(1)
    if (existing.length > 0) {
      throw new Error('Email already registered')
    }

    // Hash password
    const hashedPassword = await hashPassword(input.password)

    // Insert user
    await db.insert(users).values({
      email: input.email,
      password: hashedPassword,
      name: input.name,
      role: input.role || 2,
      location: input.location ?? null,
    })

    // Get inserted user
    const [user] = await db.select().from(users).where(eq(users.email, input.email)).limit(1)

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      location: user.location,
    }
  }

  // Validate login credentials
  async validateLogin(input: LoginInput): Promise<UserData> {
    const [user] = await db.select().from(users).where(eq(users.email, input.email)).limit(1)

    if (!user) {
      throw new Error('Invalid email or password')
    }

    if (!user.isActive) {
      throw new Error('User account is inactive')
    }

    const isValid = await verifyPassword(input.password, user.password)
    if (!isValid) {
      throw new Error('Invalid email or password')
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      location: user.location,
    }
  }

  // Get user by ID
  async getUserById(userId: number): Promise<UserData | null> {
    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1)

    if (!user) {
      return null
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      location: user.location,
    }
  }

  // Create refresh token
  async createRefreshToken(userId: number, expiresIn: number = 30 * 24 * 60 * 60 * 1000): Promise<string> {
    const token = this.generateRefreshToken()
    const expiresAt = new Date(Date.now() + expiresIn)

    await db.insert(refreshTokens).values({
      userId,
      token,
      expiresAt,
    })

    return token
  }

  // Verify and rotate refresh token
  async rotateRefreshToken(oldToken: string): Promise<{ newToken: string; userId: number } | null> {
    const [existing] = await db
      .select()
      .from(refreshTokens)
      .where(eq(refreshTokens.token, oldToken))
      .limit(1)

    if (!existing) {
      return null
    }

    // Check if expired
    if (existing.expiresAt < new Date()) {
      // Delete expired token
      await db.delete(refreshTokens).where(eq(refreshTokens.token, oldToken))
      return null
    }

    // Delete old token
    await db.delete(refreshTokens).where(eq(refreshTokens.token, oldToken))

    // Create new token
    const newToken = await this.createRefreshToken(existing.userId)

    return {
      newToken,
      userId: existing.userId,
    }
  }

  // Delete refresh token (logout)
  async deleteRefreshToken(token: string): Promise<boolean> {
    await db.delete(refreshTokens).where(eq(refreshTokens.token, token))
    return true
  }

  // Delete all refresh tokens for user (logout all devices)
  async deleteAllRefreshTokens(userId: number): Promise<void> {
    await db.delete(refreshTokens).where(eq(refreshTokens.userId, userId))
  }

  // Clean up expired tokens
  async cleanupExpiredTokens(): Promise<void> {
    // This would be implemented with a cron job
    await db.delete(refreshTokens).where(and(/* expired condition */))
  }
}

export const authService = new AuthService()
