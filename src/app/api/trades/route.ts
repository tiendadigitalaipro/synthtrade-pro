import { NextRequest, NextResponse } from 'next/server';
import { turso } from '@/lib/turso-db';
import { db } from '@/lib/db';

const VALID_CONTRACT_TYPES = ['CALL', 'PUT', 'RISE', 'FALL'];
const VALID_STATUSES = ['OPEN', 'WON', 'LOST', 'SOLD'];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get('symbol') ?? undefined;
    const status = searchParams.get('status') ?? undefined;
    const limit = parseInt(searchParams.get('limit') || '50');

    if (turso.isAvailable()) {
      const trades = await turso.getTrades({ symbol, status, limit });
      return NextResponse.json(trades);
    }
    const where: Record<string, unknown> = {};
    if (symbol) where.symbol = symbol;
    if (status) where.status = status;
    const trades = await db.tradeRecord.findMany({ where, orderBy: { createdAt: 'desc' }, take: limit });
    return NextResponse.json(trades);
  } catch (error) {
    console.error('Error fetching trades:', error);
    return NextResponse.json({ error: 'Failed to fetch trades' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (!body.symbol || typeof body.symbol !== 'string' || body.symbol.length > 20)
      return NextResponse.json({ error: 'Invalid symbol' }, { status: 400 });
    if (!VALID_CONTRACT_TYPES.includes(body.contractType))
      return NextResponse.json({ error: 'Invalid contractType' }, { status: 400 });
    if (typeof body.entryPrice !== 'number' || body.entryPrice <= 0)
      return NextResponse.json({ error: 'Invalid entryPrice' }, { status: 400 });
    if (typeof body.amount !== 'number' || body.amount <= 0 || body.amount > 100000)
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
    const status = body.status || 'OPEN';
    if (!VALID_STATUSES.includes(status))
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });

    const tradeData = {
      symbol: body.symbol.trim().toUpperCase(),
      contractType: body.contractType as string,
      entryPrice: body.entryPrice as number,
      strategy: typeof body.strategy === 'string' ? body.strategy.slice(0, 100) : 'Manual',
      amount: body.amount as number,
      payout: typeof body.payout === 'number' && body.payout >= 0 ? body.payout : 0,
      contractId: body.contractId != null ? Number(body.contractId) : null,
      status,
    };

    if (turso.isAvailable()) {
      const trade = await turso.createTrade(tradeData);
      return NextResponse.json(trade);
    }
    const trade = await db.tradeRecord.create({ data: tradeData });
    return NextResponse.json(trade);
  } catch (error) {
    console.error('Error creating trade:', error);
    return NextResponse.json({ error: 'Failed to create trade' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, exitPrice, exitTime, profit, payout, status } = body;
    if (!id || typeof id !== 'string')
      return NextResponse.json({ error: 'Trade ID is required' }, { status: 400 });

    const updateData: Record<string, unknown> = {};
    if (status !== undefined) {
      if (!VALID_STATUSES.includes(status)) return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
      updateData.status = status;
    }
    if (exitPrice !== undefined) {
      if (typeof exitPrice !== 'number') return NextResponse.json({ error: 'Invalid exitPrice' }, { status: 400 });
      updateData.exitPrice = exitPrice;
    }
    if (exitTime !== undefined) updateData.exitTime = new Date(exitTime).toISOString();
    if (profit !== undefined && typeof profit === 'number') updateData.profit = profit;
    if (payout !== undefined && typeof payout === 'number' && payout >= 0) updateData.payout = payout;
    if (Object.keys(updateData).length === 0)
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });

    if (turso.isAvailable()) {
      const trade = await turso.updateTrade(id, updateData as Parameters<typeof turso.updateTrade>[1]);
      return trade ? NextResponse.json(trade) : NextResponse.json({ error: 'Trade not found' }, { status: 404 });
    }
    const trade = await db.tradeRecord.update({ where: { id }, data: { exitPrice, exitTime: exitTime ? new Date(exitTime) : undefined, profit, payout, status } });
    return NextResponse.json(trade);
  } catch (error) {
    console.error('Error updating trade:', error);
    return NextResponse.json({ error: 'Failed to update trade' }, { status: 500 });
  }
}
