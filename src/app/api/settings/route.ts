import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

// ⚠️ SEGURIDAD: Verificar admin key (misma que license/admin)
const ADMIN_KEY = process.env.IRON_LOCK_ADMIN_KEY || '';
function checkAdmin(req: NextRequest): boolean {
  const auth = req.headers.get('x-admin-key');
  return auth === ADMIN_KEY;
}

export async function GET(req: NextRequest) {
  // Proteger endpoint con autenticación
  if (!checkAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const settings = await db.botSetting.findMany();
    const settingsMap: Record<string, string> = {};
    settings.forEach((s) => {
      settingsMap[s.key] = s.value;
    });
    return NextResponse.json(settingsMap);
  } catch (error) {
    console.error('Error fetching settings:', error);
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  // Proteger endpoint con autenticación
  if (!checkAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body: Record<string, string> = await req.json();

    const operations = Object.entries(body).map(([key, value]) =>
      db.botSetting.upsert({
        where: { key },
        update: { value },
        create: { key, value },
      })
    );

    await Promise.all(operations);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating settings:', error);
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
  }
}
