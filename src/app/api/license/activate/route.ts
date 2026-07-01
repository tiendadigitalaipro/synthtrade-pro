import { NextRequest, NextResponse } from 'next/server';

interface LicResponse {
  valid: boolean; type: string; status: string;
  clientName: string; expiresAt: string | null; daysLeft?: number; deviceId: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { key, deviceId } = body;
    if (!key || typeof key !== 'string') return NextResponse.json({ success: false, message: 'License key is required.' }, { status: 400 });
    if (!deviceId || typeof deviceId !== 'string' || deviceId.length < 10) return NextResponse.json({ success: false, message: 'Invalid device ID.' }, { status: 400 });

    const cleanKey = key.trim().toUpperCase();
    let license: any = null;

    // Try Prisma first, fallback to memory store
    try {
      const { db } = await import('@/lib/db');
      license = await db.license.findUnique({ where: { key: cleanKey } });
    } catch {
      const L = (await import('@/lib/license-store')).default;
      license = L.getByKey(cleanKey);
    }

    if (!license) return NextResponse.json({ success: false, message: 'Invalid license key. Please verify and try again.' });
    if (license.status === 'BLOCKED') return NextResponse.json({ success: false, message: 'This license key has been blocked.' });
    if (license.status === 'EXPIRED') return NextResponse.json({ success: false, message: 'This license key has already expired.' });
    if (license.deviceId && license.deviceId !== deviceId) return NextResponse.json({ success: false, message: 'This license is activated on another device.' });

    if (license.deviceId === deviceId) {
      const now = new Date();
      if (license.expiresAt && now >= new Date(license.expiresAt)) return NextResponse.json({ success: false, message: 'Your license has expired.' });
      return NextResponse.json({ success: true, message: 'License already active.', license: { valid: true, type: license.type, status: 'ACTIVE', clientName: license.clientName, expiresAt: license.expiresAt?.toString?.() ?? null, deviceId } });
    }

    const now = new Date();
    const expiresAt = license.type === 'DEMO' ? new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000) : license.expiresAt;
    const updateData = { deviceId, activatedAt: license.activatedAt || now, expiresAt: license.type === 'DEMO' ? expiresAt : license.expiresAt, status: 'ACTIVE' };

    let updated: any = null;
    try {
      const { db } = await import('@/lib/db');
      updated = await db.license.update({ where: { id: license.id }, data: updateData });
    } catch {
      const L = (await import('@/lib/license-store')).default;
      updated = L.update(license.id, {
        deviceId: updateData.deviceId?.toISOString?.() || String(updateData.deviceId),
        activatedAt: updateData.activatedAt?.toISOString?.() || String(updateData.activatedAt),
        expiresAt: updateData.expiresAt?.toISOString?.() || null,
        status: 'ACTIVE',
      });
    }

    const msLeft = updated?.expiresAt ? new Date(updated.expiresAt).getTime() - now.getTime() : null;
    return NextResponse.json({
      success: true,
      message: license.type === 'DEMO' ? 'Demo activated! You have 3 days.' : `PRO license activated! Welcome, ${license.clientName}!`,
      license: { valid: true, type: license.type, status: 'ACTIVE', clientName: license.clientName, expiresAt: updated?.expiresAt?.toString?.() ?? null, daysLeft: msLeft ? Math.floor(msLeft / 86400000) : undefined, deviceId },
    });

  } catch (err: any) {
    console.error('[Activate Error]', err);
    return NextResponse.json({ success: false, message: 'Server error.' }, { status: 500 });
  }
}
