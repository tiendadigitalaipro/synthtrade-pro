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

  const DERIV_APP_ID = '33I5gRnFDuizEhfuvaiKY';
  const [showManual, setShowManual] = useState(false);
  const [tokenInput, setTokenInput] = useState('');
  const [showToken, setShowToken] = useState(false);

  const handleOAuthLogin = () => {
    localStorage.setItem('synthtrade_app_id', DERIV_APP_ID);
    // prompt=login fuerza nueva autenticacion aunque ya este logueado, garantizando el redirect
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

            {/* OAuth Login button — un solo clic */}
            <Button
              onClick={handleOAuthLogin}
              disabled={isConnecting}
              className="w-full h-10 text-sm bg-[#FF444F] hover:bg-[#e03d47] text-white font-semibold"
            >
              {isConnecting ? (
                <><Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" /> Conectando...</>
              ) : (
                <><ExternalLink className="h-4 w-4 mr-2" /> Conectar con Deriv</>
              )}
            </Button>
            <p className="text-[10px] text-center text-muted-foreground/50">
              Inicia sesión en Deriv → autoriza → listo
            </p>

            {/* Manual token (collapsed) */}
            <button
              onClick={() => setShowManual(!showManual)}
              className="w-full flex items-center justify-center gap-1 text-[10px] text-muted-foreground/50 hover:text-muted-foreground py-0.5"
            >
              <ChevronDown className={`h-3 w-3 transition-transform ${showManual ? 'rotate-180' : ''}`} />
              {showManual ? 'Ocultar token manual' : 'Usar token manual (avanzado)'}
            </button>

            {showManual && (
              <div className="space-y-2 rounded-lg bg-secondary/20 border border-border/20 p-2.5">
                <p className="text-[10px] text-amber-400/80">Solo si el Login OAuth no funciona</p>
                <div className="relative">
                  <Input
                    type={showToken ? 'text' : 'password'}
                    placeholder="Pega el token aqui"
                    value={tokenInput}
                    onChange={(e) => setTokenInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleManualConnect()}
                    className="pr-16 h-8 text-xs bg-background/50 font-mono"
                  />
                  <button
                    onClick={() => setShowToken(!showToken)}
                    className="absolute right-2.5 top-2 text-[10px] text-muted-foreground hover:text-foreground"
                  >
                    {showToken ? 'Ocultar' : 'Ver'}
                  </button>
                </div>
                <Button
                  onClick={handleManualConnect}
                  disabled={isConnecting || !tokenInput.trim()}
                  size="sm"
                  className="w-full h-7 text-[10px] bg-emerald-700 hover:bg-emerald-600"
                >
                  <Wifi className="h-3 w-3 mr-1.5" /> Conectar con token
                </Button>
              </div>
            )}
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
                <p className="font-bold text-blue-200">PASO 1 — Registra tu App en Deriv (gratis)</p>
                <ol className="list-decimal pl-4 space-y-1 mt-1">
                  <li>Ve a <a href="https://app.deriv.com/apps/" target="_blank" rel="noreferrer" className="text-emerald-400 underline">app.deriv.com/apps</a></li>
                  <li>Clic en <strong>Register app</strong></li>
                  <li>Name: <strong>SynthTrade</strong></li>
                  <li>Redirect URL: <span className="font-mono text-[10px] text-amber-300">https://synthtrade-pro.vercel.app</span></li>
                  <li>Marca: Read, Trade, Payments, Admin</li>
                  <li>Clic Register → copia el <strong>App ID</strong> (numero)</li>
                </ol>
              </div>
              <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-3 text-emerald-300 text-xs space-y-1">
                <p className="font-bold text-emerald-200">PASO 2 — Conecta</p>
                <ol className="list-decimal pl-4 space-y-1 mt-1">
                  <li>Pega el App ID en el campo de arriba</li>
                  <li>Clic en <strong>Login con Deriv</strong></li>
                  <li>Inicia sesion en Deriv y autoriza</li>
                  <li>Te redirige de vuelta — ya estas conectado</li>
                </ol>
              </div>
              <p className="text-[10px] text-muted-foreground">
                El login OAuth no requiere copiar tokens. Es el mismo metodo que usa Deriv Bot.
              </p>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
