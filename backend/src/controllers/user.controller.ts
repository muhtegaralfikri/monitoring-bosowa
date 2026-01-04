import type { FastifyRequest, FastifyReply } from 'fastify'
import { eq, sql } from 'drizzle-orm'
import { users } from '../db/schema'
import { db } from '../config/database'
import { hashPassword } from '../utils/hash'
import type { RegisterInput } from '../types'

// Get all users (admin only)
export async function getUsersHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const query = request.query as { page?: number; limit?: number; search?: string }
    const page = query.page || 1
    const limit = query.limit || 20
    const offset = (page - 1) * limit

    // Get users without password
    const userList = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        role: users.role,
        location: users.location,
        isActive: users.isActive,
        createdAt: users.createdAt,
      })
      .from(users)
      .limit(limit)
      .offset(offset)

    // Get total count
    const [countResult] = await db.select({ count: sql`count(*)` }).from(users)

    return {
      data: userList,
      pagination: {
        page,
        limit,
        total: Number(countResult?.count || 0),
        totalPages: Math.ceil(Number(countResult?.count || 0) / limit),
      },
    }
  } catch (err: any) {
    return reply.status(500).send({ error: 'Failed to get users' })
  }
}

// Get user by ID
export async function getUserHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const { id } = request.params as { id: string }

    const [user] = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        role: users.role,
        location: users.location,
        isActive: users.isActive,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.id, Number(id)))
      .limit(1)

    if (!user) {
      return reply.status(404).send({ error: 'User not found' })
    }

    return user
  } catch (err: any) {
    return reply.status(500).send({ error: 'Failed to get user' })
  }
}

// Create user (admin only)
export async function createUserHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const input = request.body as RegisterInput

    // Check if email exists
    const [existing] = await db.select().from(users).where(eq(users.email, input.email)).limit(1)
    if (existing) {
      return reply.status(400).send({ error: 'Email already exists' })
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
    const [newUser] = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        role: users.role,
        location: users.location,
        isActive: users.isActive,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.email, input.email))
      .limit(1)

    return reply.status(201).send(newUser)
  } catch (err: any) {
    return reply.status(500).send({ error: 'Failed to create user' })
  }
}

// Update user
export async function updateUserHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const { id } = request.params as { id: string }
    const input = request.body as Partial<RegisterInput>

    // Check if user exists
    const [existing] = await db.select().from(users).where(eq(users.id, Number(id))).limit(1)
    if (!existing) {
      return reply.status(404).send({ error: 'User not found' })
    }

    // Prepare update data
    const updateData: any = {
      ...(input.name && { name: input.name }),
      ...(input.role !== undefined && { role: input.role }),
      ...(input.location !== undefined && { location: input.location }),
    }

    // Hash new password if provided
    if (input.password) {
      updateData.password = await hashPassword(input.password)
    }

    // Update user
    await db.update(users).set(updateData).where(eq(users.id, Number(id)))

    const [user] = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        role: users.role,
        location: users.location,
        isActive: users.isActive,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.id, Number(id)))

    return user
  } catch (err: any) {
    return reply.status(500).send({ error: 'Failed to update user' })
  }
}

// Delete user (admin only)
export async function deleteUserHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const { id } = request.params as { id: string }

    // Check if user exists
    const [existing] = await db.select().from(users).where(eq(users.id, Number(id))).limit(1)
    if (!existing) {
      return reply.status(404).send({ error: 'User not found' })
    }

    // Delete user (cascade will delete refresh tokens)
    await db.delete(users).where(eq(users.id, Number(id)))

    return { message: 'User deleted successfully' }
  } catch (err: any) {
    return reply.status(500).send({ error: 'Failed to delete user' })
  }
}

// Toggle user active status
export async function toggleUserStatusHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const { id } = request.params as { id: string }

    // Check if user exists
    const [existing] = await db.select().from(users).where(eq(users.id, Number(id))).limit(1)
    if (!existing) {
      return reply.status(404).send({ error: 'User not found' })
    }

    // Toggle status
    await db
      .update(users)
      .set({ isActive: !existing.isActive })
      .where(eq(users.id, Number(id)))

    return {
      message: `User ${!existing.isActive ? 'activated' : 'deactivated'} successfully`,
    }
  } catch (err: any) {
    return reply.status(500).send({ error: 'Failed to toggle user status' })
  }
}
