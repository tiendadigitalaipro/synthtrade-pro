// Cliente directo Turso para licencias, trades y settings en produccion
import type { Client, InValue } from '@libsql/client';

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
  id: string; key: string; clientName: string; type: string; status: string;
  deviceId: string | null; activatedAt: string | null; expiresAt: string | null; notes: string | null;
};

export type TradeRow = {
  id: string; symbol: string; contractType: string; entryTime: string; exitTime: string | null;
  entryPrice: number; exitPrice: number | null; profit: number; strategy: string;
  status: string; amount: number; payout: number; contractId: number | null;
  createdAt: string; updatedAt: string;
};

export type SettingRow = { id: string; key: string; value: string; updatedAt: string; };

export const turso = {
  isAvailable(): boolean { return !!getClient(); },

  // ── LICENCIAS ──────────────────────────────────────────────
  async findLicenseByKey(key: string): Promise<LicenseRow | null> {
    const db = getClient(); if (!db) return null;
    const res = await db.execute({ sql: 'SELECT * FROM License WHERE key = ? LIMIT 1', args: [key] });
    return (res.rows[0] as unknown as LicenseRow) ?? null;
  },
  async findLicenseByDevice(deviceId: string): Promise<LicenseRow | null> {
    const db = getClient(); if (!db) return null;
    const res = await db.execute({ sql: 'SELECT * FROM License WHERE deviceId = ? LIMIT 1', args: [deviceId] });
    return (res.rows[0] as unknown as LicenseRow) ?? null;
  },
  async updateLicense(id: string, data: Partial<LicenseRow>): Promise<LicenseRow | null> {
    const db = getClient(); if (!db) return null;
    const fields = Object.keys(data).filter(k => k !== 'id');
    if (!fields.length) return null;
    const setClause = fields.map(f => `${f} = ?`).join(', ');
    const values = fields.map(f => (data as Record<string, InValue>)[f]);
    await db.execute({ sql: `UPDATE License SET ${setClause}, updatedAt = CURRENT_TIMESTAMP WHERE id = ?`, args: [...values, id] });
    return this.findLicenseByKey((data as Record<string, InValue>).key as string || id);
  },
  async getAllLicenses(): Promise<LicenseRow[]> {
    const db = getClient(); if (!db) return [];
    const res = await db.execute('SELECT * FROM License ORDER BY createdAt DESC');
    return res.rows as unknown as LicenseRow[];
  },
  async createLicense(data: Omit<LicenseRow,'id'|'activatedAt'|'expiresAt'|'deviceId'|'notes'> & { notes?: string | null }): Promise<LicenseRow> {
    const db = getClient(); if (!db) throw new Error('Turso not available');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const id = require('crypto').randomUUID();
    await db.execute({ sql: 'INSERT INTO License (id, key, clientName, type, status, notes) VALUES (?, ?, ?, ?, ?, ?)', args: [id, data.key, data.clientName, data.type, data.status, data.notes ?? null] });
    const created = await this.findLicenseByKey(data.key);
    if (!created) throw new Error('Failed to create license');
    return created;
  },
  async deleteLicense(id: string): Promise<boolean> {
    const db = getClient(); if (!db) return false;
    await db.execute({ sql: 'DELETE FROM License WHERE id = ?', args: [id] });
    return true;
  },

  // ── TRADES ─────────────────────────────────────────────────
  async getTrades(filters?: { symbol?: string; status?: string; limit?: number }): Promise<TradeRow[]> {
    const db = getClient(); if (!db) return [];
    let sql = 'SELECT * FROM TradeRecord';
    const args: InValue[] = [];
    const where: string[] = [];
    if (filters?.symbol) { where.push('symbol = ?'); args.push(filters.symbol); }
    if (filters?.status) { where.push('status = ?'); args.push(filters.status); }
    if (where.length) sql += ' WHERE ' + where.join(' AND ');
    sql += ' ORDER BY createdAt DESC LIMIT ?';
    args.push(filters?.limit ?? 50);
    const res = await db.execute({ sql, args });
    return res.rows as unknown as TradeRow[];
  },
  async createTrade(data: Omit<TradeRow,'id'|'entryTime'|'exitTime'|'exitPrice'|'profit'|'contractId'|'createdAt'|'updatedAt'> & { contractId?: number | null }): Promise<TradeRow> {
    const db = getClient(); if (!db) throw new Error('Turso not available');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const id = require('crypto').randomUUID();
    await db.execute({
      sql: 'INSERT INTO TradeRecord (id, symbol, contractType, entryPrice, strategy, status, amount, payout, contractId) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      args: [id, data.symbol, data.contractType, data.entryPrice, data.strategy ?? 'Manual', data.status ?? 'OPEN', data.amount, data.payout ?? 0, data.contractId ?? null],
    });
    const res = await db.execute({ sql: 'SELECT * FROM TradeRecord WHERE id = ? LIMIT 1', args: [id] });
    return res.rows[0] as unknown as TradeRow;
  },
  async updateTrade(id: string, data: Partial<Pick<TradeRow,'exitPrice'|'exitTime'|'profit'|'payout'|'status'>>): Promise<TradeRow | null> {
    const db = getClient(); if (!db) return null;
    const fields = Object.keys(data).filter(k => (data as Record<string, InValue>)[k] !== undefined);
    if (!fields.length) return null;
    const setClause = fields.map(f => `${f} = ?`).join(', ');
    const values = fields.map(f => (data as Record<string, InValue>)[f]);
    await db.execute({ sql: `UPDATE TradeRecord SET ${setClause}, updatedAt = CURRENT_TIMESTAMP WHERE id = ?`, args: [...values, id] });
    const res = await db.execute({ sql: 'SELECT * FROM TradeRecord WHERE id = ? LIMIT 1', args: [id] });
    return (res.rows[0] as unknown as TradeRow) ?? null;
  },

  // ── SETTINGS ───────────────────────────────────────────────
  async getAllSettings(): Promise<Record<string, string>> {
    const db = getClient(); if (!db) return {};
    const res = await db.execute('SELECT key, value FROM BotSetting');
    const map: Record<string, string> = {};
    (res.rows as unknown as SettingRow[]).forEach(r => { map[r.key] = r.value; });
    return map;
  },
  async upsertSettings(settings: Record<string, string>): Promise<void> {
    const db = getClient(); if (!db) return;
    const entries = Object.entries(settings);
    if (!entries.length) return;
    for (const [key, value] of entries) {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const id = require('crypto').randomUUID();
      await db.execute({
        sql: 'INSERT INTO BotSetting (id, key, value) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updatedAt = CURRENT_TIMESTAMP',
        args: [id, key, value],
      });
    }
  },
};
