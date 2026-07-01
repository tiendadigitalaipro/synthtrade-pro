// Cliente directo Turso para licencias en produccion
// Evita los problemas de version del adapter de Prisma

import type { Client } from '@libsql/client';

let _client: Client | null = null;

function getClient(): Client | null {
  if (_client) return _client;
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;
  if (!url || !authToken) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { createClient } = require('@libsql/client');
    _client = createClient({ url, authToken });
    return _client;
  } catch {
    return null;
  }
}

export type LicenseRow = {
  id: string;
  key: string;
  clientName: string;
  type: string;
  status: string;
  deviceId: string | null;
  activatedAt: string | null;
  expiresAt: string | null;
  notes: string | null;
};

export const turso = {
  isAvailable(): boolean {
    return !!getClient();
  },

  async findLicenseByKey(key: string): Promise<LicenseRow | null> {
    const db = getClient();
    if (!db) return null;
    const res = await db.execute({ sql: 'SELECT * FROM License WHERE key = ? LIMIT 1', args: [key] });
    return (res.rows[0] as unknown as LicenseRow) ?? null;
  },

  async findLicenseByDevice(deviceId: string): Promise<LicenseRow | null> {
    const db = getClient();
    if (!db) return null;
    const res = await db.execute({ sql: 'SELECT * FROM License WHERE deviceId = ? LIMIT 1', args: [deviceId] });
    return (res.rows[0] as unknown as LicenseRow) ?? null;
  },

  async updateLicense(id: string, data: Partial<LicenseRow>): Promise<LicenseRow | null> {
    const db = getClient();
    if (!db) return null;
    const fields = Object.keys(data).filter(k => k !== 'id');
    if (!fields.length) return null;
    const setClause = fields.map(f => `${f} = ?`).join(', ');
    const values = fields.map(f => (data as any)[f]);
    await db.execute({
      sql: `UPDATE License SET ${setClause}, updatedAt = CURRENT_TIMESTAMP WHERE id = ?`,
      args: [...values, id],
    });
    return this.findLicenseByKey((data as any).key || id);
  },

  async getAllLicenses(): Promise<LicenseRow[]> {
    const db = getClient();
    if (!db) return [];
    const res = await db.execute('SELECT * FROM License ORDER BY createdAt DESC');
    return res.rows as unknown as LicenseRow[];
  },

  async createLicense(data: Omit<LicenseRow, 'id' | 'activatedAt' | 'expiresAt' | 'deviceId' | 'notes'> & { notes?: string | null }): Promise<LicenseRow> {
    const db = getClient();
    if (!db) throw new Error('Turso not available');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const id = require('crypto').randomUUID();
    await db.execute({
      sql: 'INSERT INTO License (id, key, clientName, type, status, notes) VALUES (?, ?, ?, ?, ?, ?)',
      args: [id, data.key, data.clientName, data.type, data.status, data.notes ?? null],
    });
    const created = await this.findLicenseByKey(data.key);
    if (!created) throw new Error('Failed to create license');
    return created;
  },

  async deleteLicense(id: string): Promise<boolean> {
    const db = getClient();
    if (!db) return false;
    await db.execute({ sql: 'DELETE FROM License WHERE id = ?', args: [id] });
    return true;
  },
};
