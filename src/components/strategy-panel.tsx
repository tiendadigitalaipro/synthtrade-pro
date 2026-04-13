'use client';

import { useTradingStore } from '@/lib/store';
import { AVAILABLE_STRATEGIES, getRecommendedStrategies } from '@/lib/strategies';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Cpu, CheckCircle2, Zap, Star } from 'lucide-react';

export function StrategyPanel() {
  const {
    isAutoTrading,
    selectedStrategies,
    lastSignal,
    signalHistory,
    toggleAutoTrading,
    toggleStrategy,
    selectAllStrategies,
    clearStrategies,
    tickHistory,
    currentSymbol,
  } = useTradingStore();

  const recommendedIds = getRecommendedStrategies(currentSymbol);

  return (
    <Card className="border-border/50 bg-card/80 backdrop-blur">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <Cpu className="h-4 w-4 text-purple-400" />
          Strategy Engine
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Auto Trading Toggle */}
        <div className="flex items-center justify-between rounded-lg bg-background/50 border border-border/30 p-3">
          <div>
            <Label className="text-xs font-semibold flex items-center gap-1.5">
              <Zap className="h-3.5 w-3.5" />
              Auto Trading
            </Label>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Bot executes trades based on selected strategies
            </p>
          </div>
          <Switch
            checked={isAutoTrading}
            onCheckedChange={toggleAutoTrading}
          />
        </div>

        {/* Strategy Selection */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
              Active Strategies
            </span>
            <div className="flex gap-1">
              <button
                onClick={selectAllStrategies}
                className="text-[9px] px-1.5 py-0.5 rounded bg-background/50 text-muted-foreground hover:text-foreground border border-border/30"
              >
                All
              </button>
              <button
                onClick={clearStrategies}
                className="text-[9px] px-1.5 py-0.5 rounded bg-background/50 text-muted-foreground hover:text-foreground border border-border/30"
              >
                None
              </button>
            </div>
          </div>

          {/* Recommended for market hint */}
          {recommendedIds.length > 0 && (
            <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-md bg-amber-500/8 border border-amber-500/20">
              <Star className="h-3 w-3 text-amber-400 shrink-0" />
              <span className="text-[9px] text-amber-400/80">
                Recommended for {currentSymbol}: {recommendedIds.join(', ')}
              </span>
            </div>
          )}

          {AVAILABLE_STRATEGIES.map((strategy) => {
            const isActive = selectedStrategies.includes(strategy.id);
            const isRecommended = recommendedIds.includes(strategy.id);
            return (
              <button
                key={strategy.id}
                onClick={() => toggleStrategy(strategy.id)}
                className={`w-full text-left rounded-lg border p-2.5 transition-all duration-200 ${
                  isActive
                    ? 'bg-purple-500/10 border-purple-500/30 ring-1 ring-purple-500/20'
                    : isRecommended
                    ? 'bg-amber-500/5 border-amber-500/20 hover:bg-amber-500/10'
                    : 'bg-background/50 border-border/30 hover:border-border/50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                    isActive ? 'bg-purple-500 border-purple-500' : 'border-border'
                  }`}>
                    {isActive && <CheckCircle2 className="h-3 w-3 text-white" />}
                  </div>
                  <span className="text-[11px] font-semibold">{strategy.name}</span>
                  <div className="ml-auto flex gap-1">
                    {isRecommended && (
                      <Badge className="text-[8px] px-1 py-0 bg-amber-500/20 text-amber-400 border-amber-500/30">
                        ★ Best
                      </Badge>
                    )}
                    {isActive && (
                      <Badge className="text-[8px] px-1 py-0 bg-purple-500/20 text-purple-400 border-purple-500/30">
                        ON
                      </Badge>
                    )}
                  </div>
                </div>
                <p className="text-[9px] text-muted-foreground mt-1 ml-6 leading-relaxed">
                  {strategy.description}
                </p>
              </button>
            );
          })}
        </div>

        {/* Recent Signals */}
        {signalHistory.length > 0 && (
          <div className="space-y-1.5">
            <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
              Recent Signals
            </span>
            <div className="max-h-40 overflow-y-auto space-y-1 custom-scrollbar">
              {signalHistory.slice(-8).reverse().map((signal, i) => (
                <div
                  key={i}
                  className={`flex items-center gap-2 rounded px-2 py-1.5 text-[10px] ${
                    signal.type === 'CALL'
                      ? 'bg-emerald-500/5 text-emerald-400'
                      : signal.type === 'PUT'
                        ? 'bg-red-500/5 text-red-400'
                        : 'bg-background/30 text-muted-foreground'
                  }`}
                >
                  <Badge
                    variant={signal.type === 'CALL' ? 'default' : signal.type === 'PUT' ? 'destructive' : 'secondary'}
                    className="text-[8px] px-1 py-0 min-w-[32px] justify-center"
                  >
                    {signal.type || '—'}
                  </Badge>
                  <span className="truncate">{signal.strategy}</span>
                  <span className="ml-auto font-mono">{signal.confidence}%</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {tickHistory.length < 50 && (
          <p className="text-[10px] text-muted-foreground text-center">
            Need at least 50 ticks for strategy analysis ({tickHistory.length}/50)
          </p>
        )}
      </CardContent>
    </Card>
  );
}
