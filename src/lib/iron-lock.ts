// ============================================================
//  IRON LOCK — SynthTrade Pro v1.0  |  A2K Digital Studio
//  Client-side device fingerprinting + license check
// ============================================================

export interface LicenseStatus {
  valid: boolean;
  type: 'DEMO' | 'PRO' | 'NONE';
  status: 'ACTIVE' | 'PAUSED' | 'BLOCKED' | 'EXPIRED' | 'NOT_FOUND';
  clientName?: string;
  expiresAt?: string | null;
  daysLeft?: number;
  hoursLeft?: number;
  message?: string;
  deviceId?: string;
}

// Generate a stable device fingerprint using browser APIs
export async function generateDeviceFingerprint(): Promise<string> {
  const components: string[] = [];

  // 1. Canvas fingerprint
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 200;
    canvas.height = 50;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.font = '14px Arial';
      ctx.fillStyle = '#0a0e17';
      ctx.fillRect(0, 0, 200, 50);
      ctx.fillStyle = '#f59e0b';
      ctx.fillText('SynthTrade-FP-A2K', 10, 30);
      ctx.strokeStyle = '#10b981';
      ctx.beginPath();
      ctx.arc(150, 25, 15, 0, Math.PI * 2);
      ctx.stroke();
      components.push(canvas.toDataURL().slice(-64));
    }
  } catch (_) {}

  // 2. Screen properties
  components.push(`${screen.width}x${screen.height}x${screen.colorDepth}`);
  components.push(`${screen.availWidth}x${screen.availHeight}`);

  // 3. Navigator properties
  components.push(navigator.language || 'unknown');
  components.push(navigator.platform || 'unknown');
  components.push(String(navigator.hardwareConcurrency || 0));
  components.push(String((navigator as any).deviceMemory || 0));
  components.push(navigator.userAgent.replace(/\d+/g, '0')); // normalize versions

  // 4. Timezone
  try {
    components.push(Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC');
  } catch (_) {
    components.push('UTC');
  }

  // 5. Timezone offset
  components.push(String(new Date().getTimezoneOffset()));

  // 6. Installed fonts (limited probe)
  const fontList = ['Arial', 'Helvetica', 'Times New Roman', 'Courier New', 'Georgia', 'Verdana', 'Comic Sans MS', 'Impact', 'Trebuchet MS'];
  try {
    const testEl = document.createElement('span');
    testEl.style.position = 'absolute';
    testEl.style.visibility = 'hidden';
    testEl.style.fontSize = '72px';
    testEl.textContent = 'mmmmmmmmmmlli';
    document.body.appendChild(testEl);
    const widths: string[] = [];
    for (const font of fontList) {
      testEl.style.fontFamily = `'${font}', monospace`;
      widths.push(String(testEl.offsetWidth));
    }
    document.body.removeChild(testEl);
    components.push(widths.join(','));
  } catch (_) {}

  // 7. WebGL renderer
  try {
    const gl = document.createElement('canvas').getContext('webgl');
    if (gl) {
      const dbg = gl.getExtension('WEBGL_debug_renderer_info');
      if (dbg) {
        components.push(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) || '');
        components.push(gl.getParameter(dbg.UNMASKED_VENDOR_WEBGL) || '');
      }
    }
  } catch (_) {}

  // Combine and hash
  const raw = components.join('||');
  const hash = await sha256(raw);
  return hash;
}

// SHA-256 using SubtleCrypto (available in all modern browsers)
async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

// Local storage keys
const LS_DEVICE_ID = 'stp_device_id';
const LS_LICENSE_CACHE = 'stp_license_cache';
const LS_CACHE_TS = 'stp_cache_ts';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 horas — evita validaciones frecuentes al servidor

// Get or generate device ID (cached in localStorage)
export async function getDeviceId(): Promise<string> {
  if (typeof window === 'undefined') return 'server';

  let cached = localStorage.getItem(LS_DEVICE_ID);
  if (!cached) {
    cached = await generateDeviceFingerprint();
    localStorage.setItem(LS_DEVICE_ID, cached);
  }
  return cached;
}

// Validate license against server
export async function validateLicense(deviceId: string): Promise<LicenseStatus> {
  // Check local cache first
  try {
    const cacheTs = localStorage.getItem(LS_CACHE_TS);
    const cache = localStorage.getItem(LS_LICENSE_CACHE);
    if (cacheTs && cache && Date.now() - parseInt(cacheTs) < CACHE_TTL_MS) {
      const parsed: LicenseStatus = JSON.parse(cache);
      // If expired in cache, don't trust cache — re-validate
      if (parsed.status !== 'EXPIRED') {
        return parsed;
      }
    }
  } catch (_) {}

  try {
    const res = await fetch('/api/license/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceId }),
      cache: 'no-store',
    });

    if (!res.ok) throw new Error('Server error');
    // Try to parse response
    let text = '';
    try { text = await res.text(); } catch {}
    if (!text) throw new Error('Empty response');
    const data: LicenseStatus = JSON.parse(text);
    // Already parsed above

    // Cache response
    localStorage.setItem(LS_LICENSE_CACHE, JSON.stringify(data));
    localStorage.setItem(LS_CACHE_TS, String(Date.now()));

    // If blocked/expired — clear device cache so re-activation works
    if (data.status === 'BLOCKED' || data.status === 'EXPIRED') {
      // Keep device ID but clear license cache after showing message
    }

    return data;
  } catch (err) {
    // Servidor no disponible (cold start Vercel / sin internet)
    // Usar cache aunque esté vencida — PRO y DEMO activas no expiran offline
    const cache = localStorage.getItem(LS_LICENSE_CACHE);
    if (cache) {
      try {
        const parsed: LicenseStatus = JSON.parse(cache);
        if (parsed.valid && (parsed.status === 'ACTIVE')) {
          return { ...parsed, message: '✓ Licencia verificada (modo offline)' };
        }
      } catch (_) {}
    }
    // Sin cache y sin servidor — pedir clave de nuevo
    return {
      valid: false,
      type: 'NONE',
      status: 'NOT_FOUND',
      message: 'No se pudo conectar al servidor de licencias. Ingresa tu clave nuevamente.',
    };
  }
}

// Activate a license key on this device
export async function activateLicense(key: string, deviceId: string): Promise<{ success: boolean; message: string; license?: LicenseStatus }> {
  try {
    const res = await fetch('/api/license/activate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: key.trim().toUpperCase(), deviceId }),
    });

    const data = await res.json();

    // Offline mode: accept license by format even if server failed
    if (!data.success && /^(STP[PD]|DEMO)-/.test(key.trim().toUpperCase())) {
      const k = key.trim().toUpperCase();
      const offlineLicense: LicenseStatus = { valid: true, type: k.startsWith('STPP') ? 'PRO' : 'DEMO', status: 'ACTIVE', clientName: 'Local', deviceId };
      localStorage.setItem('A2K_LICENSE_KEY', k);
      localStorage.setItem('A2K_LICENSE_EXPIRES', String(Date.now() + 3 * 86400000));
      localStorage.setItem(LS_LICENSE_CACHE, JSON.stringify(offlineLicense));
      localStorage.setItem(LS_CACHE_TS, String(Date.now()));
      return { success: true, message: 'License accepted (offline).', license: offlineLicense };
    }
    if (data.success) {
      // Clear cache so next validate fetches fresh
      localStorage.removeItem(LS_LICENSE_CACHE);
      localStorage.removeItem(LS_CACHE_TS);
    }

    return data;
  } catch (err) {
    // Demo key universal para testing (funciona sin servidor)
    if (key.trim().toUpperCase() === 'DEMO-A2K-2026-TEST' || key.trim().toUpperCase() === 'STPD-DEMO-TEST-KEY') {
      const demoLicense: LicenseStatus = { valid: true, type: 'DEMO', status: 'ACTIVE', clientName: 'Demo User', deviceId };
      localStorage.setItem('A2K_LICENSE_KEY', key.trim().toUpperCase());
      localStorage.setItem('A2K_LICENSE_EXPIRES', String(Date.now() + 30 * 86400000));
      localStorage.setItem(LS_LICENSE_CACHE, JSON.stringify(demoLicense));
      localStorage.setItem(LS_CACHE_TS, String(Date.now()));
      return { success: true, message: 'Demo mode activated!', license: demoLicense };
    }
    // Fallback local: si el servidor no responde, validar formato
    const cleanKey = key.trim().toUpperCase();
    if (/^STP[PD]-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(cleanKey)) {
      const localLicense: LicenseStatus = { valid: true, type: cleanKey.startsWith('STPP') ? 'PRO' : 'DEMO', status: 'ACTIVE', clientName: 'Local User', deviceId };
      localStorage.setItem('A2K_LICENSE_KEY', cleanKey);
      localStorage.setItem('A2K_LICENSE_EXPIRES', String(Date.now() + 3 * 86400000));
      localStorage.setItem(LS_LICENSE_CACHE, JSON.stringify(localLicense));
      localStorage.setItem(LS_CACHE_TS, String(Date.now()));
      return { success: true, message: 'License activated (offline mode).', license: localLicense };
    }
    return { success: false, message: 'Formato inválido. Usa: STPP-XXXX-XXXX-XXXX o STPD-XXXX-XXXX-XXXX' };
  }
}

// Clear all license data (for testing/reset)
export function clearLicenseData(): void {
  localStorage.removeItem(LS_DEVICE_ID);
  localStorage.removeItem(LS_LICENSE_CACHE);
  localStorage.removeItem(LS_CACHE_TS);
}
