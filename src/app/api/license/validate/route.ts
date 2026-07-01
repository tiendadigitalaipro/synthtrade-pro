import { NextRequest, NextResponse } from 'next/server';
import { turso } from '@/lib/turso-db';
import L from '@/lib/license-store';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { deviceId } = body;
    if (!deviceId || typeof deviceId !== 'string' || deviceId.length < 10) {
      return NextResponse.json({ valid: false, type: 'NONE', status: 'NOT_FOUND', message: 'Invalid device ID.' }, { status: 400 });
    }

    let license: any = null;

    // 1. Turso (produccion)
    if (turso.isAvailable()) {
      license = await turso.findLicenseByDevice(deviceId);
    } else {
      // 2. Prisma SQLite (desarrollo local)
      try {
        const { db } = await import('@/lib/db');
        license = await db.license.findFirst({ where: { deviceId } });
      } catch {
        license = L.getByDevice(deviceId);
      }
    }

    if (!license) {
      return NextResponse.json({ valid: false, type: 'NONE', status: 'NOT_FOUND', message: 'No license found for this device.', deviceId });
    }

    if (license.status === 'BLOCKED') {
      return NextResponse.json({ valid: false, type: license.type, status: 'BLOCKED', clientName: license.clientName, message: 'License blocked. Contact support.', deviceId });
    }
    if (license.status === 'PAUSED') {
      return NextResponse.json({ valid: false, type: license.type, status: 'PAUSED', clientName: license.clientName, message: 'License paused. Contact support.', deviceId });
    }

    if (license.expiresAt) {
      const now = new Date();
      const expiresAt = new Date(license.expiresAt);
      if (now >= expiresAt) {
        if (turso.isAvailable()) {
          await turso.updateLicense(license.id, { status: 'EXPIRED' });
        } else {
          try {
            const { db } = await import('@/lib/db');
            await db.license.update({ where: { id: license.id }, data: { status: 'EXPIRED' } });
          } catch {
            L.update(license.id, { status: 'EXPIRED' });
          }
        }
        return NextResponse.json({ valid: false, type: license.type, status: 'EXPIRED', clientName: license.clientName, message: 'Your license has expired.', deviceId });
      }
    }

    const expiresAtVal = license.expiresAt ? new Date(license.expiresAt) : null;
    const msLeft = expiresAtVal ? expiresAtVal.getTime() - Date.now() : null;
    return NextResponse.json({
      valid: true, type: license.type, status: license.status || 'ACTIVE',
      clientName: license.clientName, expiresAt: license.expiresAt ?? null,
      daysLeft: msLeft ? Math.floor(msLeft / 86400000) : undefined,
      hoursLeft: msLeft ? Math.floor(msLeft / 3600000) : undefined,
      message: `Welcome back, ${license.clientName}!`,
      deviceId,
    });

  } catch (err: any) {
    console.error('[Validate Error]', err);
    return NextResponse.json({ valid: false, type: 'NONE', status: 'ERROR', message: 'Server error.' });
  }
}
