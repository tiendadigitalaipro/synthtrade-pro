import { NextRequest, NextResponse } from 'next/server';

// Interfaz para respuesta de licencia
interface LicenseResponse {
  valid: boolean;
  type: string;
  status: string;
  clientName: string;
  expiresAt: string | null;
  daysLeft?: number;
  deviceId: string;
}

// Adaptador de BD: intenta Prisma, fallback a in-memory store
async function db() {
  try {
    const { db: prismaDb } = await import('@/lib/db');
    // Solo para probar si Prisma funciona
    await prismaDb.license.count();
    return prismaDb;
  } catch {
    return null; // fallback a in-memory
  }
}

async function findLicense(key: string) {
  const client = await db();
  if (client) {
    return await client.license.findUnique({ where: { key } });
  }
  const { findLicenseByKey } = await import('@/lib/license-store');
  const l = findLicenseByKey(key);
  if (!l) return null;
  return {
    id: l.id, key: l.key, clientName: l.clientName,
    type: l.type, status: l.status,
    deviceId: l.deviceId || null,
    activatedAt: l.activatedAt ? new Date(l.activatedAt) : null,
    expiresAt: l.expiresAt ? new Date(l.expiresAt) : null,
    notes: l.notes || null,
    createdAt: new Date(l.createdAt),
    updatedAt: new Date(),
  };
}

async function updateLic(id: string, data: any) {
  const client = await db();
  if (client) {
    return await client.license.update({ where: { id }, data });
  }
  const { updateLicense } = await import('@/lib/license-store');
  const l = updateLicense(id, data);
  return l ? {
    id: l.id, key: l.key, clientName: l.clientName,
    type: l.type, status: l.status,
    deviceId: l.deviceId || null,
    activatedAt: l.activatedAt ? new Date(l.activatedAt) : null,
    expiresAt: l.expiresAt ? new Date(l.expiresAt) : null,
    notes: l.notes || null,
    createdAt: new Date(l.createdAt),
    updatedAt: new Date(),
  } : null;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { key, deviceId } = body;

    if (!key || typeof key !== 'string') {
      return NextResponse.json({ success: false, message: 'License key is required.' }, { status: 400 });
    }
    if (!deviceId || typeof deviceId !== 'string' || deviceId.length < 10) {
      return NextResponse.json({ success: false, message: 'Invalid device ID.' }, { status: 400 });
    }

    const cleanKey = key.trim().toUpperCase();
    const license = await findLicense(cleanKey);

    if (!license) {
      return NextResponse.json({ success: false, message: 'Invalid license key. Please verify and try again.' });
    }

    if (license.status === 'BLOCKED') {
      return NextResponse.json({ success: false, message: 'This license key has been blocked.' });
    }
    if (license.status === 'EXPIRED') {
      return NextResponse.json({ success: false, message: 'This license key has already expired.' });
    }

    if (license.deviceId && license.deviceId !== deviceId) {
      return NextResponse.json({
        success: false,
        message: 'This license key is already activated on another device.',
      });
    }

    if (license.deviceId === deviceId) {
      const now = new Date();
      const status: LicenseResponse = {
        valid: true,
        type: license.type,
        status: 'ACTIVE',
        clientName: license.clientName,
        expiresAt: license.expiresAt?.toISOString() ?? null,
        deviceId,
      };
      if (license.expiresAt && now >= license.expiresAt) {
        return NextResponse.json({ success: false, message: 'Your license has expired. Purchase a new PRO license.' });
      }
      return NextResponse.json({ success: true, message: 'License already active on this device.', license: status });
    }

    const now = new Date();
    let expiresAt: Date | null = null;
    if (license.type === 'DEMO') {
      expiresAt = license.expiresAt || new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    }

    const updated = await updateLic(license.id, {
      deviceId,
      activatedAt: license.activatedAt || now,
      expiresAt: license.type === 'DEMO' ? expiresAt : license.expiresAt,
      status: 'ACTIVE',
    });

    if (!updated) {
      return NextResponse.json({ success: false, message: 'Error activating license.' }, { status: 500 });
    }

    const msLeft = updated.expiresAt ? new Date(updated.expiresAt).getTime() - now.getTime() : null;
    const daysLeft = msLeft ? Math.floor(msLeft / (1000 * 60 * 60 * 24)) : undefined;

    return NextResponse.json({
      success: true,
      message: license.type === 'DEMO'
        ? `Demo activated! You have 3 days of access.`
        : `PRO license activated! Welcome, ${license.clientName}!`,
      license: {
        valid: true,
        type: updated.type,
        status: 'ACTIVE',
        clientName: updated.clientName,
        expiresAt: updated.expiresAt?.toString?.() ?? null,
        daysLeft,
        deviceId,
      },
    });

  } catch (err: any) {
    console.error('[License Activate Error]', err);
    return NextResponse.json({ success: false, message: 'Server error during activation.' }, { status: 500 });
  }
}
