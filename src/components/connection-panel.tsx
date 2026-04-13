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
import { Wifi, WifiOff, Loader2, Key, User, DollarSign, LogOut, Settings } from 'lucide-react';

export function ConnectionPanel() {
  const {
    isConnected,
    isAuthorized,
    isConnecting,
    apiToken,
    balance,
    currency,
    loginId,
    connectionError,
    connect,
    disconnect,
  } = useTradingStore();

  const [tokenInput, setTokenInput] = useState('');
  const [showToken, setShowToken] = useState(false);

  const handleConnect = () => {
    if (tokenInput.trim()) {
      connect(tokenInput.trim());
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
              <Badge variant="secondary" className="text-[9px] px-1.5 py-0 ml-auto">DEMO</Badge>
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
                placeholder="Enter Deriv API Token"
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleConnect()}
                className="pl-9 pr-20 h-9 text-xs bg-background/50"
              />
              <button
                onClick={() => setShowToken(!showToken)}
                className="absolute right-2.5 top-2.5 text-[10px] text-muted-foreground hover:text-foreground"
              >
                {showToken ? 'Hide' : 'Show'}
              </button>
            </div>
            <Button
              onClick={handleConnect}
              disabled={isConnecting || !tokenInput.trim()}
              className="w-full h-9 text-xs bg-emerald-600 hover:bg-emerald-700"
            >
              {isConnecting ? (
                <><Loader2 className="h-3 w-3 mr-2 animate-spin" /> Connecting...</>
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
          <p className="text-[11px] text-red-400">{connectionError}</p>
        )}

        {/* Help */}
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="ghost" size="sm" className="w-full h-7 text-[10px] text-muted-foreground">
              <Settings className="h-3 w-3 mr-1" />
              How to get API token
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Getting Your Deriv API Token</DialogTitle>
              <DialogDescription>
                Follow these steps to obtain your API token for the trading bot:
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 text-sm text-muted-foreground">
              <ol className="list-decimal pl-4 space-y-2">
                <li>
                  <strong className="text-foreground">Create a Deriv account</strong> at{' '}
                  <a href="https://app.deriv.com" target="_blank" rel="noreferrer" className="text-emerald-400 underline">
                    deriv.com
                  </a>
                </li>
                <li>
                  <strong className="text-foreground">Use a DEMO account</strong> for testing. The bot works best with virtual funds.
                </li>
                <li>
                  <strong className="text-foreground">Go to Settings &gt; API Token</strong> in your Deriv account dashboard.
                </li>
                <li>
                  <strong className="text-foreground">Create a new token</strong> with the following scopes enabled:
                  <ul className="list-disc pl-4 mt-1 space-y-1">
                    <li>Trade</li>
                    <li>Payments</li>
                    <li>Admin</li>
                  </ul>
                </li>
                <li>
                  <strong className="text-foreground">Copy the token</strong> and paste it into the connection panel above.
                </li>
              </ol>
              <div className="rounded-lg bg-yellow-500/10 border border-yellow-500/20 p-3 text-yellow-400 text-xs">
                ⚠️ Never share your API token. This bot connects directly to Deriv's servers via encrypted WebSocket.
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
