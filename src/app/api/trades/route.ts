import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get('symbol');
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '50');

    const where: Record<string, unknown> = {};
    if (symbol) where.symbol = symbol;
    if (status) where.status = status;

    const trades = await db.tradeRecord.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return NextResponse.json(trades);
  } catch (error) {
    console.error('Error fetching trades:', error);
    return NextResponse.json({ error: 'Failed to fetch trades' }, { status: 500 });
  }
}

const VALID_CONTRACT_TYPES = ['CALL', 'PUT', 'RISE', 'FALL'];
const VALID_STATUSES = ['OPEN', 'WON', 'LOST', 'SOLD'];

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Fix #5: validate required fields and types
    if (!body.symbol || typeof body.symbol !== 'string' || body.symbol.length > 20) {
      return NextResponse.json({ error: 'Invalid symbol' }, { status: 400 });
    }
    if (!VALID_CONTRACT_TYPES.includes(body.contractType)) {
      return NextResponse.json({ error: 'Invalid contractType' }, { status: 400 });
    }
    if (typeof body.entryPrice !== 'number' || body.entryPrice <= 0) {
      return NextResponse.json({ error: 'Invalid entryPrice' }, { status: 400 });
    }
    if (typeof body.amount !== 'number' || body.amount <= 0 || body.amount > 100000) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
    }
    const status = body.status || 'OPEN';
    if (!VALID_STATUSES.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    const trade = await db.tradeRecord.create({
      data: {
        symbol: body.symbol.trim().toUpperCase(),
        contractType: body.contractType,
        entryPrice: body.entryPrice,
        strategy: typeof body.strategy === 'string' ? body.strategy.slice(0, 100) : 'Manual',
        amount: body.amount,
        payout: typeof body.payout === 'number' && body.payout >= 0 ? body.payout : 0,
        contractId: body.contractId != null ? Number(body.contractId) : null,
        status,
      },
    });

    return NextResponse.json(trade);
  } catch (error) {
    console.error('Error creating trade:', error);
    return NextResponse.json({ error: 'Failed to create trade' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json({ error: 'Trade ID is required' }, { status: 400 });
    }

    const trade = await db.tradeRecord.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(trade);
  } catch (error) {
    console.error('Error updating trade:', error);
    return NextResponse.json({ error: 'Failed to update trade' }, { status: 500 });
  }
}
