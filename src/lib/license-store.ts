// Almacenamiento en memoria para serverless (Vercel)
// En desarrollo local, Prisma + SQLite es usado en su lugar.
// Este store persiste datos mientras el serverless function esté caliente.

type InMemoryLicense = {
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

let licenses: InMemoryLicense[] = [];
let useMemoryStore = false;

export function enableMemoryStore() { useMemoryStore = true; }
export function isUsingMemoryStore() { return useMemoryStore; }

export function getLicenses(): InMemoryLicense[] {
  return [...licenses];
}

export function createLicense(data: {
  key: string;
  clientName: string;
  type?: string;
  notes?: string | null;
}): InMemoryLicense {
  const lic: InMemoryLicense = {
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
  licenses.push(lic);
  return lic;
}

export function updateLicense(id: string, data: Partial<InMemoryLicense>): InMemoryLicense | null {
  const idx = licenses.findIndex(l => l.id === id);
  if (idx === -1) return null;
  licenses[idx] = { ...licenses[idx], ...data };
  return licenses[idx];
}

export function deleteLicense(id: string): boolean {
  const len = licenses.length;
  licenses = licenses.filter(l => l.id !== id);
  return licenses.length < len;
}

export function findLicenseByKey(key: string): InMemoryLicense | undefined {
  return licenses.find(l => l.key === key);
}

export function findLicenseByDevice(deviceId: string): InMemoryLicense | undefined {
  return licenses.find(l => l.deviceId === deviceId);
}
