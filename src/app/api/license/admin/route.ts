import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

const ADMIN_KEY = process.env.IRON_LOCK_ADMIN_KEY || 'STP-ADMIN-A2K-2024';

function checkAdmin(req: NextRequest): boolean {
  const auth = req.headers.get('x-admin-key');
  return auth === ADMIN_KEY;
}

function generateLicenseKey(type: 'PRO' | 'DEMO'): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const seg = () => Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  const prefix = type === 'PRO' ? 'STPP' : 'STPD';
  return `${prefix}-${seg()}-${seg()}-${seg()}`;
}

// GET — list all licenses
export async function GET(req: NextRequest) {
  if (!checkAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const licenses = await prisma.license.findMany({
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json(licenses);
}

// POST — create new license
export async function POST(req: NextRequest) {
  if (!checkAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { clientName, type = 'PRO', notes, customKey } = body;

  if (!clientName) {
    return NextResponse.json({ error: 'clientName is required' }, { status: 400 });
  }

  const key = customKey ? customKey.trim().toUpperCase() : generateLicenseKey(type);

  // Check duplicate key
  const existing = await prisma.license.findUnique({ where: { key } });
  if (existing) {
    return NextResponse.json({ error: 'Key already exists' }, { status: 409 });
  }

  const license = await prisma.license.create({
    data: {
      key,
      clientName,
      type: type.toUpperCase(),
      status: 'ACTIVE',
      notes: notes || null,
    },
  });

  return NextResponse.json(license, { status: 201 });
}

// PATCH — update license (pause/block/unblock/edit)
export async function PATCH(req: NextRequest) {
  if (!checkAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { id, status, clientName, notes, deviceId, clearDevice } = body;

  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

  const updateData: Record<string, any> = {};
  if (status) updateData.status = status;
  if (clientName) updateData.clientName = clientName;
  if (notes !== undefined) updateData.notes = notes;
  if (deviceId !== undefined) updateData.deviceId = deviceId;
  if (clearDevice) {
    updateData.deviceId = null;
    updateData.activatedAt = null;
    updateData.expiresAt = null;
    updateData.status = 'ACTIVE';
  }

  const updated = await prisma.license.update({
    where: { id },
    data: updateData,
  });

  return NextResponse.json(updated);
}

// DELETE — delete license
export async function DELETE(req: NextRequest) {
  if (!checkAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

  await prisma.license.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
