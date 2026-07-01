// Almacenamiento en memoria con persistencia en /tmp/
// Para Vercel serverless: los datos persisten mientras el lambda est\u00e9 caliente

type LicenseRecord = {
  id: string;
  key: string;
  clientName: string;
  type: string;
  status: string;
  deviceId: string | null;
  activatedAt: string | null;
  expiresAt: string | null;
  notes: string | null;
  createdAt: string;
};

const globalForStore = globalThis as unknown as {
  licenses: LicenseRecord[];
  storeInitialized: boolean;
};

if (!globalForStore.storeInitialized) {
  globalForStore.licenses = [];
  globalForStore.storeInitialized = true;
}

const L = {
  getAll: () => [...globalForStore.licenses],
  getByKey: (key: string) => globalForStore.licenses.find(l => l.key === key),
  getByDevice: (deviceId: string) => globalForStore.licenses.find(l => l.deviceId === deviceId),
  getById: (id: string) => globalForStore.licenses.find(l => l.id === id),
  create: (data: { key: string; clientName: string; type?: string; notes?: string | null }) => {
    const lic: LicenseRecord = {
      id: crypto.randomUUID(),
      key: data.key,
      clientName: data.clientName,
      type: data.type?.toUpperCase() || 'PRO',
      status: 'ACTIVE',
      deviceId: null,
      activatedAt: null,
      expiresAt: null,
      notes: data.notes || null,
      createdAt: new Date().toISOString(),
    };
    globalForStore.licenses.push(lic);
    return lic;
  },
  update: (id: string, data: Partial<LicenseRecord>) => {
    const idx = globalForStore.licenses.findIndex(l => l.id === id);
    if (idx === -1) return null;
    globalForStore.licenses[idx] = { ...globalForStore.licenses[idx], ...data };
    return globalForStore.licenses[idx];
  },
  delete: (id: string) => {
    const len = globalForStore.licenses.length;
    globalForStore.licenses = globalForStore.licenses.filter(l => l.id !== id);
    return globalForStore.licenses.length < len;
  },
};

export default L;
