import type { FastifyRequest, FastifyReply } from 'fastify'
import { eq, desc, sql } from 'drizzle-orm'
import { stocks, settings } from '../db/schema'
import { db } from '../config/database'
import { SETTINGS_KEYS } from '../db/schema/settings'

// Check for low stock alerts
export async function checkLowStockHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const jwtUser = (request as any).jwtUser

    // Get low stock threshold from settings (default: 100 liters)
    const [setting] = await db
      .select()
      .from(settings)
      .where(eq(settings.key, SETTINGS_KEYS.LOW_STOCK_THRESHOLD))
      .limit(1)

    const threshold = setting ? Number(setting.value) : 100

    // Get latest balance for each location
    const latestStocks = await db
      .select({
        location: stocks.location,
        balance: stocks.balance,
      })
      .from(stocks)
      .where(
        sql`(stocks.id IN (SELECT MAX(id) FROM stocks GROUP BY location)) ${
          jwtUser.role === 2 ? sql`AND location = ${jwtUser.location === 1 ? 'GENSET' : 'TUG_ASSIST'}` : sql``
        }`
      )

    // Check for low stock
    const alerts = latestStocks
      .filter((stock) => Number(stock.balance) < threshold)
      .map((stock) => ({
        location: stock.location,
        balance: Number(stock.balance),
        threshold,
        message: `Stok ${stock.location} rendah: ${Number(stock.balance)} Liter (threshold: ${threshold} Liter)`,
      }))

    return {
      hasAlerts: alerts.length > 0,
      alerts,
      threshold,
    }
  } catch (err: any) {
    console.error('Check low stock error:', err)
    return reply.status(500).send({ error: 'Failed to check stock status' })
  }
}

// Get settings (admin only)
export async function getSettingsHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const allSettings = await db.select().from(settings)

    // Convert to key-value object
    const settingsObj: Record<string, string> = {}
    allSettings.forEach((setting) => {
      settingsObj[setting.key] = setting.value
    })

    // Set default threshold if not exists
    if (!settingsObj[SETTINGS_KEYS.LOW_STOCK_THRESHOLD]) {
      settingsObj[SETTINGS_KEYS.LOW_STOCK_THRESHOLD] = '100'
    }

    return settingsObj
  } catch (err: any) {
    return reply.status(500).send({ error: 'Failed to get settings' })
  }
}

// Update settings (admin only)
export async function updateSettingsHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const body = request.body as { key: string; value: string }

    // Validate key
    if (!Object.values(SETTINGS_KEYS).includes(body.key as any)) {
      return reply.status(400).send({ error: 'Invalid setting key' })
    }

    // Validate value for threshold
    if (body.key === SETTINGS_KEYS.LOW_STOCK_THRESHOLD) {
      const threshold = Number(body.value)
      if (isNaN(threshold) || threshold < 0) {
        return reply.status(400).send({ error: 'Invalid threshold value' })
      }
    }

    // Check if setting exists
    const [existing] = await db
      .select()
      .from(settings)
      .where(eq(settings.key, body.key))
      .limit(1)

    if (existing) {
      // Update existing
      await db.update(settings).set({ value: body.value }).where(eq(settings.key, body.key))
    } else {
      // Create new
      await db.insert(settings).values({ key: body.key, value: body.value })
    }

    return { message: 'Setting updated successfully', key: body.key, value: body.value }
  } catch (err: any) {
    console.error('Update settings error:', err)
    return reply.status(500).send({ error: 'Failed to update settings' })
  }
}
