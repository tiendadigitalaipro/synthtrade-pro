import { NextRequest, NextResponse } from 'next/server';
import { turso } from '@/lib/turso-db';
import { db } from '@/lib/db';

const ADMIN_KEY = process.env.IRON_LOCK_ADMIN_KEY || '';
function checkAdmin(req: NextRequest): boolean {
  if (!ADMIN_KEY) return false;
  return req.headers.get('x-admin-key') === ADMIN_KEY;
}

export async function GET(req: NextRequest) {
  if (!checkAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    if (turso.isAvailable()) {
      const settings = await turso.getAllSettings();
      return NextResponse.json(settings);
    }
    const settings = await db.botSetting.findMany();
    const map: Record<string, string> = {};
    settings.forEach((s: { key: string; value: string }) => { map[s.key] = s.value; });
    return NextResponse.json(map);
  } catch (error) {
    console.error('Error fetching settings:', error);
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  if (!checkAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const body: Record<string, string> = await req.json();
    if (turso.isAvailable()) {
      await turso.upsertSettings(body);
      return NextResponse.json({ success: true });
    }
    await Promise.all(
      Object.entries(body).map(([key, value]) =>
        db.botSetting.upsert({ where: { key }, update: { value }, create: { key, value } })
      )
    );
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating settings:', error);
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
  }
}
