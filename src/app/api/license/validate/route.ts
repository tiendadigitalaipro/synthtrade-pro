import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { deviceId } = body;

    if (!deviceId || typeof deviceId !== 'string' || deviceId.length < 10) {
      return NextResponse.json({ valid: false, type: 'NONE', status: 'NOT_FOUND', message: 'Invalid device ID.' }, { status: 400 });
    }

    // Find license registered to this device
    const license = await db.license.findFirst({
      where: { deviceId },
    });

    if (!license) {
      return NextResponse.json({
        valid: false,
        type: 'NONE',
        status: 'NOT_FOUND',
        message: 'No license found for this device. Please enter your license key.',
        deviceId,
      });
    }

    // Check status
    if (license.status === 'BLOCKED') {
      return NextResponse.json({
        valid: false,
        type: license.type as any,
        status: 'BLOCKED',
        clientName: license.clientName,
        message: 'Your license has been blocked. Contact A2K Digital Studio support.',
        deviceId,
      });
    }

    if (license.status === 'PAUSED') {
      return NextResponse.json({
        valid: false,
        type: license.type as any,
        status: 'PAUSED',
        clientName: license.clientName,
        message: 'Your license is temporarily paused. Contact A2K Digital Studio support.',
        deviceId,
      });
    }

    // Check expiry (DEMO licenses expire)
    if (license.expiresAt) {
      const now = new Date();
      const expiresAt = new Date(license.expiresAt);

      if (now >= expiresAt) {
        // Mark as expired if not already
        if (license.status !== 'EXPIRED') {
          await db.license.update({
            where: { id: license.id },
            data: { status: 'EXPIRED' },
          });
        }
        return NextResponse.json({
          valid: false,
          type: license.type as any,
          status: 'EXPIRED',
          clientName: license.clientName,
          expiresAt: license.expiresAt.toISOString(),
          message: 'Your demo license has expired. Purchase a PRO license to continue.',
          deviceId,
        });
      }

      // Calculate time left
      const msLeft = expiresAt.getTime() - now.getTime();
      const daysLeft = Math.floor(msLeft / (1000 * 60 * 60 * 24));
      const hoursLeft = Math.floor((msLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

      return NextResponse.json({
        valid: true,
        type: license.type as any,
        status: 'ACTIVE',
        clientName: license.clientName,
        expiresAt: license.expiresAt.toISOString(),
        daysLeft,
        hoursLeft,
        message: `Demo license active. ${daysLeft}d ${hoursLeft}h remaining.`,
        deviceId,
      });
    }

    // PRO license — no expiry
    return NextResponse.json({
      valid: true,
      type: license.type as any,
      status: 'ACTIVE',
      clientName: license.clientName,
      expiresAt: null,
      message: 'PRO license active.',
      deviceId,
    });

  } catch (err: any) {
    console.error('[License Validate Error]', err);
    return NextResponse.json({ valid: false, type: 'NONE', status: 'NOT_FOUND', message: 'Server error.' }, { status: 500 });
  }
}
