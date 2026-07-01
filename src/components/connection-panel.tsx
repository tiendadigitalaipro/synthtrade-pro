'use client';

import { useState } from 'react';
import { useTradingStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Wifi, WifiOff, Loader2, Key, User, DollarSign, LogOut, Settings, ChevronDown, ChevronUp } from 'lucide-react';

export function ConnectionPanel() {
  const {
    isConnected,
    isAuthorized,
    isConnecting,
    appId,
    balance,
    currency,
    loginId,
    isVirtual,
    connectionError,
    connect,
    disconnect,
  } = useTradingStore();

  const [tokenInput, setTokenInput] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [appIdInput, setAppIdInput] = useState('');
  const isPatToken = tokenInput.trim().startsWith('pat_');

  const handleConnect = () => {
    const cleanToken = tokenInput.replace(/[\s\u200B\u200C\u200D\uFEFF'"]/g, '');
    const cleanAppId = appIdInput.trim();
    if (cleanToken && cleanAppId) {
      connect(cleanToken, cleanAppId);
    }
  };

  const handleDisconnect = () => {
    disconnect();
    setTokenInput('');
  };

  return (
    <Card className="border-border/50 bg-card/80 backdrop-blur">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <Wifi className="h-4 w-4 text-emerald-400" />
          Connection
          <Badge
            variant={isConnected ? 'default' : 'destructive'}
            className="ml-auto text-[10px] px-2 py-0"
          >
            {isConnecting ? 'Connecting...' : isConnected ? 'Live' : 'Offline'}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Account Info */}
        {isAuthorized && (
          <div className="space-y-2 rounded-lg bg-background/50 p-3 border border-border/30">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <User className="h-3 w-3" />
              <span className="font-mono">{loginId}</span>
              <Badge
                variant="secondary"
                className={`text-[9px] px-1.5 py-0 ml-auto ${isVirtual ? 'bg-blue-500/20 text-blue-400' : 'bg-emerald-500/20 text-emerald-400'}`}
              >
                {isVirtual ? '🎮 DEMO' : '💰 REAL'}
              </Badge>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <DollarSign className="h-3.5 w-3.5 text-emerald-400" />
              <span className="font-bold text-emerald-400 font-mono">
                {currency} {balance.toFixed(2)}
              </span>
            </div>
          </div>
        )}

        {/* Token Input */}
        {!isConnected && (
          <div className="space-y-2">

            {/* App ID — REQUERIDO, siempre visible */}
            <div className="rounded-lg bg-blue-500/10 border border-blue-500/20 p-2 space-y-1.5">
              <p className="text-[10px] text-blue-300 font-semibold">📋 Paso 1 — Tu App ID de Deriv</p>
              <Input
                type="text"
                placeholder="Ej: 12345  (obtenerlo en app.deriv.com/apps)"
                value={appIdInput}
                onChange={(e) => setAppIdInput(e.target.value)}
                className="h-8 text-xs bg-background/50 font-mono"
              />
              <p className="text-[10px] text-blue-400/70">
                Gratis en{' '}
                <a href="https://app.deriv.com/apps/" target="_blank" rel="noreferrer" className="underline text-blue-300">
                  app.deriv.com/apps
                </a>
                {' '}→ &quot;Register app&quot; → copia el número App ID
              </p>
            </div>

            {/* Token */}
            <div className="space-y-1">
              <p className="text-[10px] text-muted-foreground font-semibold">📋 Paso 2 — Token API</p>
              <div className="relative">
                <Key className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type={showToken ? 'text' : 'password'}
                  placeholder="Pega tu token pat_xxx de Deriv"
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleConnect()}
                  className="pl-9 pr-16 h-9 text-xs bg-background/50"
                />
                <button
                  onClick={() => setShowToken(!showToken)}
                  className="absolute right-2.5 top-2 text-[10px] text-muted-foreground hover:text-foreground px-1"
                >
                  {showToken ? 'Ocultar' : 'Ver'}
                </button>
              </div>
            </div>

            <Button
              onClick={handleConnect}
              disabled={isConnecting || !tokenInput.trim() || !appIdInput.trim()}
              className="w-full h-9 text-xs bg-emerald-600 hover:bg-emerald-700"
            >
              {isConnecting ? (
                <><Loader2 className="h-3 w-3 mr-2 animate-spin" /> Conectando...</>
              ) : (
                <><Wifi className="h-3 w-3 mr-2" /> Connect</>
              )}
            </Button>
          </div>
        )}

        {/* Disconnect */}
        {isConnected && (
          <Button
            onClick={handleDisconnect}
            variant="destructive"
            size="sm"
            className="w-full h-8 text-xs"
          >
            <LogOut className="h-3 w-3 mr-2" />
            Disconnect
          </Button>
        )}

        {/* Advertencia token pat_ */}
        {isPatToken && !isConnected && (
          <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-2">
            <p className="text-[11px] text-amber-400 leading-relaxed">
              ⚠️ <strong>Token pat_ detectado.</strong> Este formato puede no conectar con app_id 1089.
              Si falla: ve a <strong>app.deriv.com/account/api-token</strong>, elimina este token y crea uno nuevo sin seleccionar &quot;OAuth&quot;.
            </p>
          </div>
        )}

        {/* Error */}
        {connectionError && (
          <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-2">
            <p className="text-[11px] text-red-400 leading-relaxed">{connectionError}</p>
          </div>
        )}

        {/* Help */}
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="ghost" size="sm" className="w-full h-7 text-[10px] text-muted-foreground">
              <Settings className="h-3 w-3 mr-1" />
              Cómo obtener el token API
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>🔑 Cómo obtener tu token API de Deriv</DialogTitle>
              <DialogDescription>
                Sigue estos pasos exactos para conectar el bot.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 text-sm text-muted-foreground">

              <div className="rounded-lg bg-blue-500/10 border border-blue-500/20 p-3 text-blue-300 text-xs space-y-1">
                <p className="font-bold text-blue-200">🔵 PASO 1 — Registra tu App (gratis, solo una vez)</p>
                <ol className="list-decimal pl-4 space-y-1 mt-1">
                  <li>Ve a <a href="https://app.deriv.com/apps/" target="_blank" rel="noreferrer" className="text-emerald-400 underline">app.deriv.com/apps</a></li>
                  <li>Clic en <strong>&quot;Register app&quot;</strong></li>
                  <li>Nombre: <strong>&quot;SynthTrade&quot;</strong> — marca los 4 scopes (Read, Trade, Payments, Admin)</li>
                  <li>Copia el número <strong>App ID</strong> que aparece (ej: 12345)</li>
                  <li>Pégalo en el campo App ID de la pantalla de conexión</li>
                </ol>
              </div>

              <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-3 text-emerald-300 text-xs space-y-1">
                <p className="font-bold text-emerald-200">🟢 PASO 2 — Crea tu Token API</p>
                <ol className="list-decimal pl-4 space-y-1 mt-1">
                  <li>Ve a <a href="https://app.deriv.com/account/api-token" target="_blank" rel="noreferrer" className="text-emerald-400 underline">app.deriv.com/account/api-token</a></li>
                  <li>Nombre: <strong>&quot;SynthTrade&quot;</strong> — activa los 4 permisos: Read, Trade, Payments, Admin</li>
                  <li>Clic en <strong>&quot;Create&quot;</strong></li>
                  <li>Copia el token completo (empieza con <span className="font-mono text-amber-400">pat_</span>)</li>
                  <li>Pégalo en el campo Token de la pantalla de conexión</li>
                </ol>
              </div>

              <div className="rounded-lg bg-yellow-500/10 border border-yellow-500/20 p-3 text-yellow-400 text-xs">
                ⚠️ Nunca compartas tu token ni tu App ID. La conexión va directamente a Deriv por WebSocket encriptado.
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
