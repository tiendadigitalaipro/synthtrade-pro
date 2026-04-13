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
    apiToken,
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
  const [appIdInput, setAppIdInput] = useState('1089');

  const handleConnect = () => {
    const cleanToken = tokenInput.replace(/[\s\u200B\u200C\u200D\uFEFF'"]/g, '');
    if (cleanToken) {
      connect(cleanToken, appIdInput.trim() || '1089');
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
            <div className="relative">
              <Key className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type={showToken ? 'text' : 'password'}
                placeholder="Pega tu token API de Deriv"
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

            {/* Advanced: App ID */}
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground w-full"
            >
              {showAdvanced ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              App ID avanzado (por defecto: 1089)
            </button>
            {showAdvanced && (
              <div className="space-y-1">
                <Input
                  type="text"
                  placeholder="App ID (ej: 1089)"
                  value={appIdInput}
                  onChange={(e) => setAppIdInput(e.target.value)}
                  className="h-8 text-xs bg-background/50 font-mono"
                />
                <p className="text-[10px] text-muted-foreground">
                  Usa 1089 para cuentas estándar. Si tu token fue creado para otra app, ingresa ese ID aquí.
                </p>
              </div>
            )}

            <Button
              onClick={handleConnect}
              disabled={isConnecting || !tokenInput.trim()}
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
              <ol className="list-decimal pl-4 space-y-3">
                <li>
                  <strong className="text-foreground">Inicia sesión</strong> en{' '}
                  <a href="https://app.deriv.com" target="_blank" rel="noreferrer" className="text-emerald-400 underline">
                    app.deriv.com
                  </a>
                  {' '}con tu cuenta <strong className="text-blue-400">Demo</strong> o <strong className="text-emerald-400">Real</strong>.
                </li>
                <li>
                  Ve a:{' '}
                  <a href="https://app.deriv.com/account/api-token" target="_blank" rel="noreferrer" className="text-emerald-400 underline font-mono text-xs">
                    app.deriv.com/account/api-token
                  </a>
                </li>
                <li>
                  <strong className="text-foreground">Crea un nuevo token</strong> con estos 4 permisos activados:
                  <ul className="list-none pl-2 mt-2 space-y-1">
                    <li className="text-emerald-400">✅ Read</li>
                    <li className="text-emerald-400">✅ Trade</li>
                    <li className="text-emerald-400">✅ Payments</li>
                    <li className="text-emerald-400">✅ Admin</li>
                  </ul>
                </li>
                <li>
                  <strong className="text-foreground">Copia el token</strong> generado (son ~15 caracteres) y pégalo en el campo de arriba.
                </li>
                <li>
                  Presiona <strong className="text-foreground">Connect</strong>.
                </li>
              </ol>
              <div className="rounded-lg bg-blue-500/10 border border-blue-500/20 p-3 text-blue-300 text-xs space-y-1">
                <p>💡 <strong>Demo vs Real:</strong> El mismo proceso aplica para ambas cuentas. El bot detecta automáticamente el tipo.</p>
                <p>💡 <strong>Tip:</strong> Empieza siempre con la cuenta Demo para probar las estrategias sin riesgo.</p>
              </div>
              <div className="rounded-lg bg-yellow-500/10 border border-yellow-500/20 p-3 text-yellow-400 text-xs">
                ⚠️ Nunca compartas tu token API. El bot se conecta directamente a los servidores de Deriv mediante WebSocket encriptado.
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
