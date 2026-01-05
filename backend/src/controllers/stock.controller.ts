import type { FastifyRequest, FastifyReply } from 'fastify'
import { eq, desc, and, gte, lte, sql } from 'drizzle-orm'
import { stocks } from '../db/schema'
import { db } from '../config/database'
import type { StockInput, StockHistoryQuery } from '../types'
import ExcelJS from 'exceljs'

// Get stock summary
export async function getStockSummaryHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const jwtUser = (request as any).jwtUser

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

    return latestStocks
  } catch (err: any) {
    return reply.status(500).send({ error: 'Failed to get stock summary' })
  }
}

// Stock IN
export async function stockInHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const jwtUser = (request as any).jwtUser
    const input = request.body as StockInput

    // Get current balance for location
    const [lastStock] = await db
      .select()
      .from(stocks)
      .where(eq(stocks.location, input.location))
      .orderBy(desc(stocks.id))
      .limit(1)

    const currentBalance = lastStock ? Number(lastStock.balance) : 0
    const newBalance = currentBalance + Number(input.amount)

    // Insert stock IN record
    await db.insert(stocks).values({
      type: 'IN',
      amount: input.amount.toString(),
      location: input.location,
      balance: newBalance.toString(),
      notes: input.notes ?? null,
      userId: jwtUser.userId,
    })

    // Get the inserted record
    const [newStock] = await db
      .select()
      .from(stocks)
      .where(eq(stocks.location, input.location))
      .orderBy(desc(stocks.id))
      .limit(1)

    return reply.status(201).send(newStock)
  } catch (err: any) {
    return reply.status(500).send({ error: 'Stock IN failed' })
  }
}

// Stock OUT
export async function stockOutHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const jwtUser = (request as any).jwtUser
    const input = request.body as Omit<StockInput, 'location'>

    // Get current balance for both locations
    const [lastGenset] = await db
      .select()
      .from(stocks)
      .where(eq(stocks.location, 'GENSET'))
      .orderBy(desc(stocks.id))
      .limit(1)

    const [lastTug] = await db
      .select()
      .from(stocks)
      .where(eq(stocks.location, 'TUG_ASSIST'))
      .orderBy(desc(stocks.id))
      .limit(1)

    const gensetBalance = lastGenset ? Number(lastGenset.balance) : 0
    const tugBalance = lastTug ? Number(lastTug.balance) : 0
    const totalBalance = gensetBalance + tugBalance

    // Check if enough stock
    if (totalBalance < Number(input.amount)) {
      return reply.status(400).send({ error: 'Insufficient stock' })
    }

    // Distribute deduction from both locations proportionally
    // First deduct from TUG_ASSIST, then from GENSET
    let remainingAmount = Number(input.amount)
    let gensetDeduction = 0
    let tugDeduction = 0

    if (remainingAmount <= tugBalance) {
      tugDeduction = remainingAmount
    } else {
      tugDeduction = tugBalance
      gensetDeduction = remainingAmount - tugBalance
    }

    const newStocks = []

    // Deduct from TUG_ASSIST
    if (tugDeduction > 0) {
      const newTugBalance = tugBalance - tugDeduction
      await db.insert(stocks).values({
        type: 'OUT',
        amount: tugDeduction.toString(),
        location: 'TUG_ASSIST',
        balance: newTugBalance.toString(),
        notes: input.notes ?? null,
        userId: jwtUser.userId,
      })

      const [tugResult] = await db
        .select()
        .from(stocks)
        .where(eq(stocks.location, 'TUG_ASSIST'))
        .orderBy(desc(stocks.id))
        .limit(1)

      newStocks.push(tugResult)
    }

    // Deduct from GENSET
    if (gensetDeduction > 0) {
      const newGensetBalance = gensetBalance - gensetDeduction
      await db.insert(stocks).values({
        type: 'OUT',
        amount: gensetDeduction.toString(),
        location: 'GENSET',
        balance: newGensetBalance.toString(),
        notes: input.notes ?? null,
        userId: jwtUser.userId,
      })

      const [gensetResult] = await db
        .select()
        .from(stocks)
        .where(eq(stocks.location, 'GENSET'))
        .orderBy(desc(stocks.id))
        .limit(1)

      newStocks.push(gensetResult)
    }

    return reply.status(201).send(newStocks)
  } catch (err: any) {
    return reply.status(500).send({ error: 'Stock OUT failed' })
  }
}

// Get stock history
export async function getStockHistoryHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const jwtUser = (request as any).jwtUser
    const query = request.query as StockHistoryQuery

    const pageRaw = Number(query.page)
    const limitRaw = Number(query.limit)
    const page = Number.isFinite(pageRaw) && pageRaw > 0 ? Math.floor(pageRaw) : 1
    const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.floor(limitRaw) : 20
    const offset = (page - 1) * limit

    // Build conditions
    const conditions: any[] = []

    if (query.type) {
      conditions.push(eq(stocks.type, query.type))
    }

    if (query.location) {
      conditions.push(eq(stocks.location, query.location))
    } else if (jwtUser?.role === 2) {
      // Operasional user can only see their location
      conditions.push(eq(stocks.location, jwtUser.location === 1 ? 'GENSET' : 'TUG_ASSIST'))
    }

    if (query.startDate) {
      conditions.push(gte(stocks.createdAt, new Date(query.startDate)))
    }

    if (query.endDate) {
      const endDate = new Date(query.endDate)
      endDate.setHours(23, 59, 59, 999)
      conditions.push(lte(stocks.createdAt, endDate))
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined

    // Get total count
    const [countResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(stocks)
      .where(whereClause)

    const total = Number(countResult?.count || 0)

    // Get stocks with pagination
    const stockList = await db
      .select({
        id: stocks.id,
        type: stocks.type,
        amount: stocks.amount,
        location: stocks.location,
        balance: stocks.balance,
        notes: stocks.notes,
        createdAt: stocks.createdAt,
        userName: sql<string>`(SELECT name FROM users WHERE id = stocks.user_id)`,
      })
      .from(stocks)
      .where(whereClause)
      .orderBy(desc(stocks.id))
      .limit(limit)
      .offset(offset)

    return {
      data: stockList,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    }
  } catch (err: any) {
    console.error('Stock history error:', err)
    return reply.status(500).send({ error: 'Failed to get stock history', message: err?.message || 'Unknown error' })
  }
}

// Get today's statistics
export async function getTodayStatsHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const jwtUser = (request as any).jwtUser
    const query = request.query as { location?: string }

    // Get today's date range (start and end of today)
    const today = new Date()
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0)
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999)

    // Build location filter
    // If query.location is provided, use it
    // Otherwise, if user is operasional (role 2), filter by their location
    // For public access (no user) or admin, show all locations
    const locationFilter = query.location || (jwtUser?.role === 2 ? (jwtUser.location === 1 ? 'GENSET' : 'TUG_ASSIST') : undefined)

    // Get initial stock (last balance before today)
    const initialStocks = await db
      .select({
        location: stocks.location,
        balance: stocks.balance,
      })
      .from(stocks)
      .where(
        and(
          sql`DATE(created_at) < DATE(${startOfDay})`,
          locationFilter ? eq(stocks.location, locationFilter as any) : undefined
        )
      )
      .orderBy(desc(stocks.id))
      .limit(100)

    // Get today's transactions
    const todayTransactions = await db
      .select({
        location: stocks.location,
        type: stocks.type,
        amount: stocks.amount,
      })
      .from(stocks)
      .where(
        and(
          gte(stocks.createdAt, startOfDay),
          lte(stocks.createdAt, endOfDay),
          locationFilter ? eq(stocks.location, locationFilter as any) : undefined
        )
      )

    // Get current/final stock
    const finalStocks = await db
      .select({
        location: stocks.location,
        balance: stocks.balance,
      })
      .from(stocks)
      .where(
        sql`(stocks.id IN (SELECT MAX(id) FROM stocks GROUP BY location)) ${
          locationFilter ? sql`AND location = ${locationFilter}` : sql``
        }`
      )

    // Group by location
    const locations = locationFilter ? [locationFilter] : ['GENSET', 'TUG_ASSIST']

    const result = locations.map((loc) => {
      // Get initial stock for this location
      const initialEntry = initialStocks.filter((s) => s.location === loc)[0]
      const initialStock = initialEntry ? Number(initialEntry.balance) : 0

      // Get today's IN total
      const todayIn = todayTransactions
        .filter((t) => t.location === loc && t.type === 'IN')
        .reduce((sum, t) => sum + Number(t.amount), 0)

      // Get today's OUT total
      const todayOut = todayTransactions
        .filter((t) => t.location === loc && t.type === 'OUT')
        .reduce((sum, t) => sum + Number(t.amount), 0)

      // Get final stock
      const finalEntry = finalStocks.filter((s) => s.location === loc)[0]
      const finalStock = finalEntry ? Number(finalEntry.balance) : 0

      return {
        location: loc,
        initialStock,
        todayIn,
        todayOut,
        finalStock,
      }
    })

    return result
  } catch (err: any) {
    console.error('Today stats error:', err)
    return reply.status(500).send({ error: 'Failed to get today statistics' })
  }
}

// Get stock trend
export async function getStockTrendHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const query = request.query as { days?: number; location?: string }
    const days = query.days || 7
    const locationFilter = query.location

    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)
    startDate.setHours(0, 0, 0, 0)

    const whereClause = and(
      gte(stocks.createdAt, startDate),
      locationFilter ? eq(stocks.location, locationFilter as any) : undefined
    )

    const trendData = await db
      .select({
        date: sql<string>`DATE(created_at)`,
        location: stocks.location,
        balance: stocks.balance,
      })
      .from(stocks)
      .where(whereClause)
      .orderBy(stocks.createdAt)

    return trendData
  } catch (err: any) {
    return reply.status(500).send({ error: 'Failed to get stock trend' })
  }
}

// Export stock history to Excel
export async function exportStockHistoryHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const jwtUser = (request as any).jwtUser
    const query = request.query as StockHistoryQuery

    // Build conditions
    const conditions: any[] = []

    if (query.type) {
      conditions.push(eq(stocks.type, query.type))
    }

    if (query.location) {
      conditions.push(eq(stocks.location, query.location))
    } else if (jwtUser.role === 2) {
      // Operasional user can only see their location
      conditions.push(eq(stocks.location, jwtUser.location === 1 ? 'GENSET' : 'TUG_ASSIST'))
    }

    if (query.startDate) {
      conditions.push(gte(stocks.createdAt, new Date(query.startDate)))
    }

    if (query.endDate) {
      // Include the entire end date
      const endDate = new Date(query.endDate)
      endDate.setHours(23, 59, 59, 999)
      conditions.push(lte(stocks.createdAt, endDate))
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined

    // Get all stocks (no pagination for export)
    const stockList = await db
      .select({
        id: stocks.id,
        type: stocks.type,
        amount: stocks.amount,
        location: stocks.location,
        balance: stocks.balance,
        notes: stocks.notes,
        createdAt: stocks.createdAt,
        userName: sql<string>`(SELECT name FROM users WHERE id = stocks.user_id)`,
      })
      .from(stocks)
      .where(whereClause)
      .orderBy(desc(stocks.id))

    // Create Excel workbook
    const workbook = new ExcelJS.Workbook()
    const worksheet = workbook.addWorksheet('Riwayat Stok BBM')

    // Define columns
    worksheet.columns = [
      { header: 'ID', key: 'id', width: 10 },
      { header: 'Tanggal', key: 'createdAt', width: 20 },
      { header: 'Tipe', key: 'type', width: 10 },
      { header: 'Lokasi', key: 'location', width: 15 },
      { header: 'Jumlah (Liter)', key: 'amount', width: 15 },
      { header: 'Saldo (Liter)', key: 'balance', width: 15 },
      { header: 'Keterangan', key: 'notes', width: 30 },
      { header: 'User', key: 'userName', width: 20 },
    ]

    // Style header row
    const headerRow = worksheet.getRow(1)
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } }
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF2563EB' },
    }
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' }
    headerRow.height = 25

    // Add data rows
    stockList.forEach((stock) => {
      const row = worksheet.addRow({
        id: stock.id,
        createdAt: new Date(stock.createdAt).toLocaleString('id-ID'),
        type: stock.type,
        location: stock.location,
        amount: Number(stock.amount).toLocaleString('id-ID'),
        balance: Number(stock.balance).toLocaleString('id-ID'),
        notes: stock.notes || '-',
        userName: stock.userName || '-',
      })

      // Style type cell
      const typeCell = row.getCell('type')
      if (stock.type === 'IN') {
        typeCell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFDCfce7' },
        }
        typeCell.font = { color: { argb: 'FF166534' } }
      } else {
        typeCell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFfee2e2' },
        }
        typeCell.font = { color: { argb: 'FF991b1b' } }
      }
    })

    // Add borders to all cells
    worksheet.eachRow((row) => {
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFe2e8f0' } },
          left: { style: 'thin', color: { argb: 'FFe2e8f0' } },
          bottom: { style: 'thin', color: { argb: 'FFe2e8f0' } },
          right: { style: 'thin', color: { argb: 'FFe2e8f0' } },
        }
      })
    })

    // Generate filename with timestamp
    const timestamp = new Date().toISOString().slice(0, 10)
    const filename = `riwayat-stok-bbm-${timestamp}.xlsx`

    // Set response headers
    reply.header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    reply.header('Content-Disposition', `attachment; filename="${filename}"`)

    // Generate buffer
    const buffer = await workbook.xlsx.writeBuffer()

    return reply.send(buffer)
  } catch (err: any) {
    console.error('Export error:', err)
    return reply.status(500).send({ error: 'Failed to export stock history' })
  }
}
