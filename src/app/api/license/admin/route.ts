import { NextRequest, NextResponse } from 'next/server';
import L from '@/lib/license-store';

const ADMIN_KEY = process.env.IRON_LOCK_ADMIN_KEY || '';

function checkAdmin(req: NextRequest): boolean {
  if (!ADMIN_KEY) return false;
  return req.headers.get('x-admin-key') === ADMIN_KEY;
}

function generateLicenseKey(type: 'PRO' | 'DEMO'): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const seg = () => Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `${type === 'PRO' ? 'STPP' : 'STPD'}-${seg()}-${seg()}-${seg()}`;
}

export async function GET(req: NextRequest) {
  if (!checkAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const { db } = await import('@/lib/db');
    const licenses = await db.license.findMany({ orderBy: { createdAt: 'desc' } });
    return NextResponse.json(licenses);
  } catch {
    return NextResponse.json(L.getAll());
  }
}

export async function POST(req: NextRequest) {
  if (!checkAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await req.json();
  const { clientName, type = 'PRO', notes, customKey } = body;
  if (!clientName) return NextResponse.json({ error: 'clientName is required' }, { status: 400 });
  const key = customKey?.trim()?.toUpperCase() || generateLicenseKey(type);
  try {
    const { db } = await import('@/lib/db');
    const existing = await db.license.findUnique({ where: { key } });
    if (existing) return NextResponse.json({ error: 'Key already exists' }, { status: 409 });
    const license = await db.license.create({
      data: { key, clientName, type: type.toUpperCase(), status: 'ACTIVE', notes: notes || null },
    });
    return NextResponse.json(license, { status: 201 });
  } catch {
    const existing = L.getByKey(key);
    if (existing) return NextResponse.json({ error: 'Key already exists' }, { status: 409 });
    return NextResponse.json(L.create({ key, clientName, type, notes }), { status: 201 });
  }
}

export async function PATCH(req: NextRequest) {
  if (!checkAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await req.json();
  const { id, status, clientName, notes, deviceId, clearDevice } = body;
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });
  const data: Record<string, any> = {};
  if (status) data.status = status;
  if (clientName) data.clientName = clientName;
  if (notes !== undefined) data.notes = notes;
  if (deviceId !== undefined) data.deviceId = deviceId;
  if (clearDevice) Object.assign(data, { deviceId: null, activatedAt: null, expiresAt: null, status: 'ACTIVE' });
  try {
    const { db } = await import('@/lib/db');
    return NextResponse.json(await db.license.update({ where: { id }, data }));
  } catch {
    const r = L.update(id, data);
    return r ? NextResponse.json(r) : NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
}

export async function DELETE(req: NextRequest) {
  if (!checkAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const id = new URL(req.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });
  try {
    const { db } = await import('@/lib/db');
    await db.license.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: L.delete(id) });
  }
}
