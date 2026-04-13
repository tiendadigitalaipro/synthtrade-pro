'use client';

import { useTradingStore } from '@/lib/store';
import { LicenseGate } from '@/components/license-gate';
import { ConnectionPanel } from '@/components/connection-panel';
import { MarketSelector } from '@/components/market-selector';
import { PriceChart } from '@/components/price-chart';
import { TradingControls } from '@/components/trading-controls';
import { StrategyPanel } from '@/components/strategy-panel';
import { TradeHistory } from '@/components/trade-history';
import { PerformanceStats } from '@/components/performance-stats';
import { ActivityLog } from '@/components/activity-log';
import { OpenPositions } from '@/components/open-positions';
import { RiskManagementPanel } from '@/components/risk-management';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Bot, Wifi, WifiOff, Zap } from 'lucide-react';
import { useEffect, useCallback } from 'react';

export default function Home() {
  const {
    isConnected,
    isAuthorized,
    isAutoTrading,
    isSessionPaused,
    currentSymbol,
    currentPrice,
    sessionProfit,
    loadTradeHistory,
    totalProfit,
    winCount,
    lossCount,
    totalTrades,
    toggleAutoTrading,
    placeTrade,
  } = useTradingStore();

  useEffect(() => {
    loadTradeHistory().catch(console.error);
  }, []);

  // ─── Keyboard Shortcuts ──────────────────────────────────────
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Ignore if user is typing in an input
    const target = e.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') return;

    switch (e.key.toLowerCase()) {
      case 'b':
        // B = Buy CALL
        if (isConnected && isAuthorized) {
          e.preventDefault();
          placeTrade('CALL');
        }
        break;
      case 's':
        // S = Sell PUT
        if (isConnected && isAuthorized) {
          e.preventDefault();
          placeTrade('PUT');
        }
        break;
      case ' ':
        // Space = Toggle Auto Trading
        if (isConnected && isAuthorized) {
          e.preventDefault();
          toggleAutoTrading();
        }
        break;
    }
  }, [isConnected, isAuthorized, placeTrade, toggleAutoTrading]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const marketLabel = currentSymbol
    .replace('BOOM1000', 'Boom 1000')
    .replace('CRASH1000', 'Crash 1000')
    .replace('R_', 'Vol ')
    .replace('JD', 'Jump ');

  const winRate = totalTrades > 0 ? ((winCount / totalTrades) * 100).toFixed(1) : '0.0';

  return (
    <LicenseGate>
    <div className="min-h-screen bg-[#0a0e17]">
      {/* Top Header Bar */}
      <header className="sticky top-0 z-50 border-b border-border/50 bg-[#0a0e17]/95 backdrop-blur-xl">
        <div className="max-w-[1800px] mx-auto px-3 sm:px-4 py-2 flex items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 shrink-0">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-900/30">
                <Bot className="h-4.5 w-4.5 text-white" />
              </div>
              <div className="hidden sm:block">
                <h1 className="text-sm font-bold text-foreground tracking-tight leading-none">
                  SynthTrade<span className="text-amber-400">Pro</span>
                </h1>
                <p className="text-[8px] text-muted-foreground tracking-wider uppercase">Synthetic Indices Bot</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Quick Stats */}
            <div className="hidden md:flex items-center gap-3 mr-2">
              <div className="text-center">
                <div className="text-[8px] text-muted-foreground uppercase">P/L</div>
                <div className={`text-xs font-bold font-mono ${totalProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {totalProfit >= 0 ? '+' : ''}{totalProfit.toFixed(2)}
                </div>
              </div>
              <div className="w-px h-6 bg-border/30" />
              <div className="text-center">
                <div className="text-[8px] text-muted-foreground uppercase">Win %</div>
                <div className="text-xs font-bold font-mono text-foreground">{winRate}%</div>
              </div>
              <div className="w-px h-6 bg-border/30" />
              <div className="text-center">
                <div className="text-[8px] text-muted-foreground uppercase">Trades</div>
                <div className="text-xs font-bold font-mono text-foreground">{totalTrades}</div>
              </div>
            </div>

            {/* Connection Status */}
            <div className="flex items-center gap-1.5">
              <div className={`w-2 h-2 rounded-full ${
                isConnected
                  ? 'bg-emerald-400 shadow-[0_0_6px_rgba(16,185,129,0.6)]'
                  : 'bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.4)]'
              }`} />
              <span className="text-[10px] text-muted-foreground hidden lg:inline">
                {isConnected ? (
                  <span className="flex items-center gap-1">
                    <Wifi className="h-3 w-3 text-emerald-400" /> Live
                  </span>
                ) : (
                  <span className="flex items-center gap-1">
                    <WifiOff className="h-3 w-3 text-red-400" /> Offline
                  </span>
                )}
              </span>
            </div>

            {/* Auto Trading Badge */}
            {isAutoTrading && !isSessionPaused && (
              <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[10px] px-2">
                <Zap className="h-2.5 w-2.5 mr-1" />
                AUTO
              </Badge>
            )}

            {isSessionPaused && (
              <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-[10px] px-2 animate-pulse">
                ⏸ PAUSED
              </Badge>
            )}

            {/* Market + Price */}
            {isConnected && (
              <div className="hidden sm:flex items-center gap-2 bg-secondary/50 rounded-lg px-2.5 py-1 border border-border/30">
                <span className="text-[10px] text-muted-foreground">{marketLabel}</span>
                <span className="text-xs font-bold font-mono text-foreground">
                  {currentPrice > 0 ? currentPrice.toFixed(4) : '---'}
                </span>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Dashboard */}
      <main className="max-w-[1800px] mx-auto px-3 sm:px-4 py-3">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">

          {/* Left Sidebar */}
          <div className="lg:col-span-3 xl:col-span-3 space-y-3">
            <ConnectionPanel />
            <MarketSelector />

            {/* Mobile: Tab-based panels for smaller screens */}
            <div className="lg:hidden">
              <Tabs defaultValue="strategy" className="w-full">
                <TabsList className="w-full bg-background/50 border border-border/30 h-8">
                  <TabsTrigger value="strategy" className="text-[10px] flex-1 h-7">Strategy</TabsTrigger>
                  <TabsTrigger value="risk" className="text-[10px] flex-1 h-7">Risk</TabsTrigger>
                  <TabsTrigger value="stats" className="text-[10px] flex-1 h-7">Stats</TabsTrigger>
                </TabsList>
                <TabsContent value="strategy"><StrategyPanel /></TabsContent>
                <TabsContent value="risk"><RiskManagementPanel /></TabsContent>
                <TabsContent value="stats"><PerformanceStats /></TabsContent>
              </Tabs>
            </div>

            {/* Desktop: Show strategy and risk panels */}
            <div className="hidden lg:block space-y-3">
              <StrategyPanel />
              <RiskManagementPanel />
            </div>
          </div>

          {/* Center Content */}
          <div className="lg:col-span-6 xl:col-span-6 space-y-3">
            <PriceChart />
            <TradingControls />
            <OpenPositions />

            {/* Mobile: History and Log tabs */}
            <div className="lg:hidden">
              <Tabs defaultValue="history" className="w-full">
                <TabsList className="w-full bg-background/50 border border-border/30 h-8">
                  <TabsTrigger value="history" className="text-[10px] flex-1 h-7">History</TabsTrigger>
                  <TabsTrigger value="log" className="text-[10px] flex-1 h-7">Activity Log</TabsTrigger>
                </TabsList>
                <TabsContent value="history"><TradeHistory /></TabsContent>
                <TabsContent value="log"><ActivityLog /></TabsContent>
              </Tabs>
            </div>
          </div>

          {/* Right Sidebar - Desktop only */}
          <div className="hidden lg:block lg:col-span-3 xl:col-span-3 space-y-3">
            <PerformanceStats />
            <TradeHistory />
            <ActivityLog />
          </div>
        </div>
      </main>

      {/* Keyboard Shortcuts Bar */}
      {isConnected && isAuthorized && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-[#0a0e17]/90 backdrop-blur-sm border-t border-border/30 py-1.5 px-3 hidden lg:block">
          <div className="max-w-[1800px] mx-auto flex items-center justify-center gap-6 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-secondary/80 border border-border/40 font-mono text-foreground text-[9px]">B</kbd>
              Buy CALL
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-secondary/80 border border-border/40 font-mono text-foreground text-[9px]">S</kbd>
              Buy PUT
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-secondary/80 border border-border/40 font-mono text-foreground text-[9px]">Space</kbd>
              Toggle Auto
            </span>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-border/30 mt-4 py-3">
        <div className="max-w-[1800px] mx-auto px-3 sm:px-4 flex items-center justify-between text-[10px] text-muted-foreground">
          <span>SynthTrade Pro v1.0 — Automated Trading Bot for Deriv Synthetic Indices</span>
          <span className="hidden sm:inline">
            ⚠️ Trading involves risk. Always test with demo accounts first.
          </span>
        </div>
      </footer>
    </div>
    </LicenseGate>
  );
}
