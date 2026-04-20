'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { getDeviceId, validateLicense, activateLicense, type LicenseStatus } from '@/lib/iron-lock';
import { Bot, Lock, Shield, Clock, CheckCircle, XCircle, AlertTriangle, Loader2, Key, Eye, EyeOff } from 'lucide-react';

interface LicenseGateProps {
  children: React.ReactNode;
}

export function LicenseGate({ children }: LicenseGateProps) {
  const [stage, setStage] = useState<'loading' | 'valid' | 'invalid' | 'activate' | 'error'>('loading');
  const [licenseStatus, setLicenseStatus] = useState<LicenseStatus | null>(null);
  const [deviceId, setDeviceId] = useState<string>('');
  const [licenseKey, setLicenseKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [isActivating, setIsActivating] = useState(false);
  const [activationMsg, setActivationMsg] = useState('');
  const [activationError, setActivationError] = useState('');

  // Fix #14: incluir setters en deps (son estables pero satisface exhaustive-deps)
  const checkLicense = useCallback(async () => {
    setStage('loading');
    try {
      const id = await getDeviceId();
      setDeviceId(id);
      const status = await validateLicense(id);
      setLicenseStatus(status);

      if (status.valid && status.status === 'ACTIVE') {
        setStage('valid');
      } else if (status.status === 'NOT_FOUND') {
        setStage('activate');
      } else {
        setStage('invalid');
      }
    } catch (err) {
      setStage('error');
    }
  }, [setStage, setDeviceId, setLicenseStatus]);

  useEffect(() => {
    checkLicense();
  }, [checkLicense]);

  const handleActivate = async () => {
    if (!licenseKey.trim()) {
      setActivationError('Please enter your license key.');
      return;
    }
    setIsActivating(true);
    setActivationError('');
    setActivationMsg('');

    const result = await activateLicense(licenseKey, deviceId);
    setIsActivating(false);

    if (result.success) {
      setActivationMsg(result.message);
      setTimeout(() => checkLicense(), 1500);
    } else {
      setActivationError(result.message);
    }
  };

  // ─── Loading State ───────────────────────────────────────────
  if (stage === 'loading') {
    return (
      <div className="min-h-screen bg-[#0a0e17] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-900/50">
            <Loader2 className="h-8 w-8 text-white animate-spin" />
          </div>
          <p className="text-muted-foreground text-sm animate-pulse">Verifying license...</p>
        </div>
      </div>
    );
  }

  // ─── Valid License ──────────────────────────────────────────
  if (stage === 'valid') {
    return (
      <>
        {/* Demo warning banner */}
        {licenseStatus?.type === 'DEMO' && licenseStatus.daysLeft !== undefined && (
          <div className={`fixed top-0 left-0 right-0 z-[9999] text-center py-1.5 text-xs font-bold ${
            licenseStatus.daysLeft <= 1
              ? 'bg-red-600/90 text-white animate-pulse'
              : licenseStatus.daysLeft <= 2
              ? 'bg-amber-500/90 text-black'
              : 'bg-emerald-600/80 text-white'
          }`}>
            <Clock className="inline h-3.5 w-3.5 mr-1.5 mb-0.5" />
            DEMO LICENSE — {licenseStatus.daysLeft}d {licenseStatus.hoursLeft}h remaining
            {licenseStatus.daysLeft <= 1 && ' — EXPIRES SOON! Get PRO at wa.me/584164117331'}
          </div>
        )}
        <div className={licenseStatus?.type === 'DEMO' ? 'pt-7' : ''}>
          {children}
        </div>
      </>
    );
  }

  // ─── Activate License ────────────────────────────────────────
  if (stage === 'activate') {
    return (
      <div className="min-h-screen bg-[#0a0e17] flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-2xl shadow-amber-900/50 mb-4">
              <Bot className="h-10 w-10 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">SynthTrade<span className="text-amber-400">Pro</span></h1>
            <p className="text-muted-foreground text-sm mt-1">Synthetic Indices Automated Bot</p>
            <p className="text-[10px] text-muted-foreground/60 mt-1">A2K Digital Studio</p>
          </div>

          {/* Activation Card */}
          <div className="bg-secondary/30 border border-border/40 rounded-2xl p-6 backdrop-blur-sm shadow-2xl">
            <div className="flex items-center gap-2 mb-1">
              <Shield className="h-4 w-4 text-amber-400" />
              <h2 className="text-sm font-semibold text-foreground">License Activation</h2>
            </div>
            <p className="text-xs text-muted-foreground mb-5">Enter your license key to unlock full access to SynthTrade Pro.</p>

            {/* Key Input */}
            <div className="relative mb-3">
              <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type={showKey ? 'text' : 'password'}
                value={licenseKey}
                onChange={(e) => setLicenseKey(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === 'Enter' && handleActivate()}
                placeholder="STPP-XXXX-XXXX-XXXX"
                className="w-full bg-background/60 border border-border/50 rounded-lg pl-10 pr-10 py-3 text-sm font-mono text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/30 transition-colors"
                autoFocus
              />
              <button
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                type="button"
              >
                {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            {/* Messages */}
            {activationError && (
              <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2.5 mb-3">
                <XCircle className="h-4 w-4 text-red-400 mt-0.5 shrink-0" />
                <p className="text-xs text-red-300">{activationError}</p>
              </div>
            )}
            {activationMsg && (
              <div className="flex items-start gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2.5 mb-3">
                <CheckCircle className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" />
                <p className="text-xs text-emerald-300">{activationMsg}</p>
              </div>
            )}

            {/* Activate Button */}
            <button
              onClick={handleActivate}
              disabled={isActivating || !licenseKey.trim()}
              className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 rounded-lg text-sm transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-amber-900/30"
            >
              {isActivating ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Activating...</>
              ) : (
                <><Lock className="h-4 w-4" /> Activate License</>
              )}
            </button>

            {/* Device ID */}
            <div className="mt-4 pt-4 border-t border-border/30">
              <p className="text-[9px] text-muted-foreground/50 text-center">
                Device ID: <span className="font-mono">{deviceId.slice(0, 16)}...{deviceId.slice(-8)}</span>
              </p>
            </div>
          </div>

          {/* Contact */}
          <div className="text-center mt-4">
            <p className="text-xs text-muted-foreground">
              Need a license?{' '}
              <a
                href="https://wa.me/584164117331"
                target="_blank"
                rel="noopener noreferrer"
                className="text-amber-400 hover:text-amber-300 font-medium"
              >
                Contact A2K Digital Studio
              </a>
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ─── Invalid / Blocked / Expired ──────────────────────────────
  const isExpired = licenseStatus?.status === 'EXPIRED';
  const isBlocked = licenseStatus?.status === 'BLOCKED';
  const isPaused = licenseStatus?.status === 'PAUSED';

  return (
    <div className="min-h-screen bg-[#0a0e17] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className={`w-20 h-20 rounded-2xl flex items-center justify-center shadow-2xl mb-4 ${
            isExpired ? 'bg-gradient-to-br from-orange-600 to-red-700 shadow-red-900/50' :
            isBlocked ? 'bg-gradient-to-br from-red-700 to-red-900 shadow-red-900/50' :
            'bg-gradient-to-br from-yellow-600 to-amber-700 shadow-amber-900/50'
          }`}>
            {isExpired ? <Clock className="h-10 w-10 text-white" /> :
             isBlocked ? <XCircle className="h-10 w-10 text-white" /> :
             <AlertTriangle className="h-10 w-10 text-white" />}
          </div>
          <h1 className="text-2xl font-bold text-foreground">
            {isExpired ? 'License Expired' : isBlocked ? 'Access Blocked' : isPaused ? 'Access Paused' : 'License Error'}
          </h1>
        </div>

        <div className="bg-secondary/30 border border-border/40 rounded-2xl p-6 text-center">
          <p className="text-sm text-muted-foreground mb-4">{licenseStatus?.message || 'There is an issue with your license.'}</p>

          {isExpired && (
            <p className="text-xs text-amber-400 mb-4">
              Your 3-day demo has ended. Upgrade to SynthTrade Pro for unlimited access.
            </p>
          )}

          <a
            href="https://wa.me/584164117331"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-bold py-3 px-6 rounded-lg text-sm transition-all duration-200 shadow-lg shadow-emerald-900/30"
          >
            Contact A2K Digital Studio on WhatsApp
          </a>

          <div className="mt-4 pt-4 border-t border-border/30">
            <p className="text-[9px] text-muted-foreground/50">
              Device ID: <span className="font-mono">{deviceId.slice(0, 16)}...{deviceId.slice(-8)}</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
