'use client';

import { useTradingStore } from '@/lib/store';
import { SYNTHETIC_MARKETS, getRecommendedStrategies } from '@/lib/strategies';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, Zap, BarChart3, Activity, Cpu, Gem } from 'lucide-react';

const categoryIcons: Record<string, React.ReactNode> = {
  'Boom/Crash': <Zap className="h-3.5 w-3.5" />,
  'Volatility': <Activity className="h-3.5 w-3.5" />,
  'Volatility 1s': <Cpu className="h-3.5 w-3.5" />,
  'Jump': <BarChart3 className="h-3.5 w-3.5" />,
  'Metals': <Gem className="h-3.5 w-3.5" />,
};

const categoryColors: Record<string, string> = {
  'Boom/Crash': 'text-amber-400',
  'Volatility': 'text-sky-400',
  'Volatility 1s': 'text-cyan-400',
  'Jump': 'text-purple-400',
  'Metals': 'text-yellow-400',
};

const categoryBgColors: Record<string, string> = {
  'Boom/Crash': 'bg-amber-500/10 border-amber-500/20 hover:bg-amber-500/20',
  'Volatility': 'bg-sky-500/10 border-sky-500/20 hover:bg-sky-500/20',
  'Volatility 1s': 'bg-cyan-500/10 border-cyan-500/20 hover:bg-cyan-500/20',
  'Jump': 'bg-purple-500/10 border-purple-500/20 hover:bg-purple-500/20',
  'Metals': 'bg-yellow-500/10 border-yellow-500/20 hover:bg-yellow-500/20',
};

export function MarketSelector() {
  const { currentSymbol, isConnected, subscribeToMarket, supportedMarkets, availableSymbols } = useTradingStore();

  const handleSelect = (symbol: string) => {
    if (isConnected) {
      subscribeToMarket(symbol);
    }
  };

  const markets = supportedMarkets.length > 0 ? supportedMarkets : SYNTHETIC_MARKETS;
  const availableSymbolSet = new Set(availableSymbols.map((s) => s.symbol));

  const categories = Array.from(new Set(markets.map((m) => m.category)));

  return (
    <Card className="border-border/50 bg-card/80 backdrop-blur">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <TrendingUp className="h-4 w-4 text-amber-400" />
          Synthetic Markets
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {categories.map((category) => (
          <div key={category}>
            <div className="flex items-center gap-1.5 mb-1.5">
              <span className={categoryColors[category] || ''}>{categoryIcons[category]}</span>
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">{category}</span>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {markets.filter((m) => m.category === category).map((market) => {
                const isAvailable = availableSymbolSet.size === 0 || availableSymbolSet.has(market.symbol);
                return (
                  <button
                    key={market.symbol}
                    onClick={() => handleSelect(market.symbol)}
                    disabled={!isConnected || !isAvailable}
                    className={`
                      relative rounded-lg border px-2.5 py-2 text-left transition-all duration-200
                      ${categoryBgColors[category]}
                      ${currentSymbol === market.symbol
                        ? 'ring-1 ring-white/30 shadow-lg scale-[1.02]'
                        : ''
                      }
                      ${!isConnected || !isAvailable ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}
                    `}
                    title={!isAvailable ? 'This market is not available on your account' : market.description}
                  >
                    <div className="text-[11px] font-semibold text-foreground">{market.name}</div>
                    <div className="text-[9px] text-muted-foreground mt-0.5">{market.symbol}</div>
                    {currentSymbol === market.symbol && (
                      <Badge className="absolute -top-1 -right-1 text-[8px] px-1 py-0 bg-emerald-500">
                        LIVE
                      </Badge>
                    )}
                    {!isAvailable && isConnected && (
                      <div className="absolute inset-0 rounded-lg bg-black/50 flex items-center justify-center">
                        <span className="text-[8px] text-red-400 font-bold">N/A</span>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
