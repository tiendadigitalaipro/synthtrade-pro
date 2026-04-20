import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// Fix #12: interface declarada antes de su primer uso
interface LicenseStatus {
  valid: boolean;
  type: string;
  status: string;
  clientName: string;
  expiresAt: string | null;
  daysLeft?: number;
  deviceId: string;
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

    // Sanitize key
    const cleanKey = key.trim().toUpperCase();

    // Find license by key
    const license = await db.license.findUnique({
      where: { key: cleanKey },
    });

    if (!license) {
      return NextResponse.json({ success: false, message: 'Invalid license key. Please verify and try again.' });
    }

    // Check if blocked or expired
    if (license.status === 'BLOCKED') {
      return NextResponse.json({ success: false, message: 'This license key has been blocked.' });
    }
    if (license.status === 'EXPIRED') {
      return NextResponse.json({ success: false, message: 'This license key has already expired.' });
    }

    // Check if already activated on a DIFFERENT device
    if (license.deviceId && license.deviceId !== deviceId) {
      return NextResponse.json({
        success: false,
        message: 'This license key is already activated on another device. Each license is tied to one device only.',
      });
    }

    // Already activated on THIS device — just refresh
    if (license.deviceId === deviceId) {
      const now = new Date();
      let status: LicenseStatus = {
        valid: true,
        type: license.type as any,
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

    // First activation on this device
    const now = new Date();
    let expiresAt: Date | null = null;

    if (license.type === 'DEMO') {
      // Demo starts from ACTIVATION DATE — exactly 3 days, server-side
      if (license.activatedAt) {
        // Already had an activation date (admin pre-set)
        expiresAt = license.expiresAt || new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
      } else {
        expiresAt = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
      }
    }

    // Activate: bind to device
    const updated = await db.license.update({
      where: { id: license.id },
      data: {
        deviceId,
        activatedAt: license.activatedAt || now,
        expiresAt: license.type === 'DEMO' ? expiresAt : license.expiresAt,
        status: 'ACTIVE',
      },
    });

    const msLeft = updated.expiresAt ? updated.expiresAt.getTime() - now.getTime() : null;
    const daysLeft = msLeft ? Math.floor(msLeft / (1000 * 60 * 60 * 24)) : undefined;

    return NextResponse.json({
      success: true,
      message: license.type === 'DEMO'
        ? `Demo activated! You have 3 days of access. Expires ${updated.expiresAt?.toLocaleDateString()}.`
        : `PRO license activated! Welcome, ${license.clientName}!`,
      license: {
        valid: true,
        type: updated.type,
        status: 'ACTIVE',
        clientName: updated.clientName,
        expiresAt: updated.expiresAt?.toISOString() ?? null,
        daysLeft,
        deviceId,
      },
    });

  } catch (err: any) {
    console.error('[License Activate Error]', err);
    return NextResponse.json({ success: false, message: 'Server error during activation.' }, { status: 500 });
  }
}
