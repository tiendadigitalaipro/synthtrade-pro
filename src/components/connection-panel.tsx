'use client';

import { useState, useEffect } from 'react';
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
import { Wifi, Loader2, User, DollarSign, LogOut, Settings, ExternalLink, ChevronDown } from 'lucide-react';

export function ConnectionPanel() {
  const {
    isConnected,
    isAuthorized,
    isConnecting,
    balance,
    currency,
    loginId,
    isVirtual,
    connectionError,
    connect,
    disconnect,
  } = useTradingStore();

  const DERIV_APP_ID = '1089'; // App ID publico oficial de Deriv para desarrollo/pruebas
  const [showManual, setShowManual] = useState(true);
  const [tokenInput, setTokenInput] = useState('');
  const [showToken, setShowToken] = useState(false);

  const handleOAuthLogin = () => {
    localStorage.setItem('synthtrade_app_id', DERIV_APP_ID);
    window.location.href = `https://oauth.deriv.com/oauth2/authorize?app_id=${DERIV_APP_ID}&redirect_uri=https://synthtrade-pro.vercel.app&l=EN&brand=deriv&response_type=token&prompt=login`;
  };

  const handleManualConnect = () => {
    const cleanToken = tokenInput.replace(/[\s​‌‍﻿'"]/g, '');
    if (cleanToken) {
      localStorage.setItem('synthtrade_app_id', DERIV_APP_ID);
      connect(cleanToken, DERIV_APP_ID);
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
            {isConnecting ? 'Conectando...' : isConnected ? 'Live' : 'Offline'}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">

        {/* Account Info when connected */}
        {isAuthorized && (
          <div className="space-y-2 rounded-lg bg-background/50 p-3 border border-border/30">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <User className="h-3 w-3" />
              <span className="font-mono">{loginId}</span>
              <Badge
                variant="secondary"
                className={`text-[9px] px-1.5 py-0 ml-auto ${isVirtual ? 'bg-blue-500/20 text-blue-400' : 'bg-emerald-500/20 text-emerald-400'}`}
              >
                {isVirtual ? 'DEMO' : 'REAL'}
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

        {/* Connection form */}
        {!isConnected && (
          <div className="space-y-2.5">

            {/* Instrucciones rápidas */}
            <div className="rounded-lg bg-blue-500/10 border border-blue-500/20 p-2.5 text-[10px] text-blue-300 space-y-1">
              <p className="font-semibold text-blue-200">Cómo obtener tu token (usa esta URL exacta):</p>
              <ol className="list-decimal pl-3 space-y-0.5">
                <li>Ve a <span className="font-mono text-amber-300">legacy-api.deriv.com/dashboard</span></li>
                <li>Inicia sesión → pestaña <strong>API tokens</strong></li>
                <li>Crea token con permisos <strong>Read + Trade</strong> (mide ~15 caracteres)</li>
                <li>⚠️ NO uses home.deriv.com — sus tokens (~68 caracteres) son del hub nuevo y NO funcionan aquí</li>
              </ol>
            </div>

            {/* Token input — principal */}
            <div className="space-y-1.5">
              <div className="relative">
                <Input
                  type={showToken ? 'text' : 'password'}
                  placeholder="Pega tu token API de Deriv aquí"
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleManualConnect()}
                  className="pr-14 h-9 text-xs bg-background/50 font-mono border-border/50"
                />
                <button
                  onClick={() => setShowToken(!showToken)}
                  className="absolute right-2.5 top-2.5 text-[10px] text-muted-foreground hover:text-foreground"
                >
                  {showToken ? 'Ocultar' : 'Ver'}
                </button>
              </div>
              <Button
                onClick={handleManualConnect}
                disabled={isConnecting || !tokenInput.trim()}
                className="w-full h-9 text-sm bg-[#FF444F] hover:bg-[#e03d47] text-white font-semibold"
              >
                {isConnecting ? (
                  <><Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" /> Conectando...</>
                ) : (
                  <><Wifi className="h-4 w-4 mr-2" /> Conectar con Deriv</>
                )}
              </Button>
            </div>
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
        {connectionError && !isConnected && (
          <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-2">
            <p className="text-[11px] text-red-400 leading-relaxed">{connectionError}</p>
          </div>
        )}

        {/* Help dialog */}
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="ghost" size="sm" className="w-full h-7 text-[10px] text-muted-foreground">
              <Settings className="h-3 w-3 mr-1" />
              Como conectar con Deriv
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Conectar SynthTrade con Deriv</DialogTitle>
              <DialogDescription>Sigue estos pasos — solo la primera vez.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3 text-sm">
              <div className="rounded-lg bg-blue-500/10 border border-blue-500/20 p-3 text-blue-300 text-xs space-y-1">
                <p className="font-bold text-blue-200">PASO 1 — Crea tu token clásico (gratis)</p>
                <ol className="list-decimal pl-4 space-y-1 mt-1">
                  <li>Ve a <a href="https://legacy-api.deriv.com/dashboard/" target="_blank" rel="noreferrer" className="text-emerald-400 underline">legacy-api.deriv.com/dashboard</a></li>
                  <li>Inicia sesión con tu cuenta de Deriv</li>
                  <li>Pestaña <strong>API tokens</strong> → <strong>Create new token</strong></li>
                  <li>Nombre: cualquiera. Permisos: <strong>Read + Trade</strong></li>
                  <li>Clic Create → copia el token (mide ~15 caracteres)</li>
                </ol>
              </div>
              <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-3 text-emerald-300 text-xs space-y-1">
                <p className="font-bold text-emerald-200">PASO 2 — Conecta</p>
                <ol className="list-decimal pl-4 space-y-1 mt-1">
                  <li>Pega el token en el campo de arriba</li>
                  <li>Clic en <strong>Conectar con Deriv</strong></li>
                </ol>
              </div>
              <p className="text-[10px] text-muted-foreground">
                ⚠️ No uses home.deriv.com / hub.deriv.com para el token — esos son del hub nuevo (tokens ~68 caracteres) y no son compatibles con esta app.
              </p>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
