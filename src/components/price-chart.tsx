'use client';

import { useMemo } from 'react';
import { useTradingStore } from '@/lib/store';
import { calculateBollingerBands, calculateSMA } from '@/lib/strategies';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Activity, ArrowUp, ArrowDown, Minus } from 'lucide-react';
import { Area, AreaChart, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, Line } from 'recharts';

export function PriceChart() {
  const { currentSymbol, currentPrice, ticks, priceDirection } = useTradingStore();

  const chartData = useMemo(() => {
    const displayTicks = ticks.slice(-150);
    const prices = displayTicks.map((t) => t.quote);

    return displayTicks.map((tick, i) => {
      const bb = i >= 19 ? calculateBollingerBands(prices.slice(0, i + 1), 20, 2) : null;
      const fastMA = i >= 4 ? calculateSMA(prices.slice(0, i + 1), 5) : null;
      const slowMA = i >= 19 ? calculateSMA(prices.slice(0, i + 1), 20) : null;

      return {
        time: new Date(tick.epoch * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        price: tick.quote,
        index: i,
        bbUpper: bb?.upper,
        bbMiddle: bb?.middle,
        bbLower: bb?.lower,
        fastMA,
        slowMA,
      };
    });
  }, [ticks]);

  const priceStats = useMemo(() => {
    if (ticks.length < 2) return { high: 0, low: 0, change: 0, changePercent: 0 };
    const prices = ticks.slice(-100).map((t) => t.quote);
    const high = Math.max(...prices);
    const low = Math.min(...prices);
    const first = prices[0];
    const last = prices[prices.length - 1];
    const change = last - first;
    const changePercent = (change / first) * 100;
    return { high, low, change, changePercent };
  }, [ticks]);

  // Current Bollinger Band values
  const currentBB = useMemo(() => {
    const prices = ticks.map((t) => t.quote);
    if (prices.length < 20) return null;
    return calculateBollingerBands(prices, 20, 2);
  }, [ticks]);

  // Current MA values
  const currentFastMA = useMemo(() => {
    const prices = ticks.map((t) => t.quote);
    if (prices.length < 5) return null;
    return calculateSMA(prices, 5);
  }, [ticks]);

  const currentSlowMA = useMemo(() => {
    const prices = ticks.map((t) => t.quote);
    if (prices.length < 20) return null;
    return calculateSMA(prices, 20);
  }, [ticks]);

  const isPositive = priceStats.change >= 0;
  const marketName = currentSymbol.replace('R_', 'Vol ').replace('JD', 'Jump ');

  return (
    <Card className="border-border/50 bg-card/80 backdrop-blur">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <Activity className="h-4 w-4 text-sky-400" />
              {marketName}
            </CardTitle>
            <Badge variant="secondary" className="text-[10px] font-mono">
              {ticks.length > 0 ? `${ticks.length} ticks` : 'No data'}
            </Badge>
          </div>

          <div className="flex items-center gap-4">
            {/* Current Price */}
            <div className="text-right">
              <div className={`flex items-center gap-1 text-lg font-bold font-mono ${
                priceDirection === 'up' ? 'text-emerald-400' :
                priceDirection === 'down' ? 'text-red-400' : 'text-foreground'
              }`}>
                {priceDirection === 'up' && <ArrowUp className="h-3.5 w-3.5" />}
                {priceDirection === 'down' && <ArrowDown className="h-3.5 w-3.5" />}
                {priceDirection === 'neutral' && <Minus className="h-3.5 w-3.5" />}
                {currentPrice > 0 ? currentPrice.toFixed(4) : '---.----'}
              </div>
              <div className={`text-[11px] font-mono ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
                {isPositive ? '+' : ''}{priceStats.change.toFixed(4)} ({isPositive ? '+' : ''}{priceStats.changePercent.toFixed(3)}%)
              </div>
            </div>
          </div>
        </div>

        {/* Price Stats + Indicators Bar */}
        <div className="flex items-center gap-4 text-[10px] text-muted-foreground mt-1 flex-wrap">
          <span>H: <span className="text-emerald-400 font-mono">{priceStats.high.toFixed(4)}</span></span>
          <span>L: <span className="text-red-400 font-mono">{priceStats.low.toFixed(4)}</span></span>
          <span>O: <span className="font-mono">{ticks.length > 0 ? ticks[ticks.length - 100]?.quote.toFixed(4) || '---' : '---'}</span></span>
          {currentFastMA && <span>MA5: <span className="text-sky-400 font-mono">{currentFastMA.toFixed(4)}</span></span>}
          {currentSlowMA && <span>MA20: <span className="text-purple-400 font-mono">{currentSlowMA.toFixed(4)}</span></span>}
          {currentBB && (
            <>
              <span>BB-U: <span className="text-amber-400/60 font-mono">{currentBB.upper.toFixed(4)}</span></span>
              <span>BB-L: <span className="text-amber-400/60 font-mono">{currentBB.lower.toFixed(4)}</span></span>
            </>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="h-[280px] sm:h-[320px] lg:h-[380px]">
          {chartData.length > 1 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                <defs>
                  <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={isPositive ? '#10b981' : '#ef4444'} stopOpacity={0.25} />
                    <stop offset="95%" stopColor={isPositive ? '#10b981' : '#ef4444'} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="bbFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.06} />
                    <stop offset="50%" stopColor="#f59e0b" stopOpacity={0.03} />
                    <stop offset="100%" stopColor="#f59e0b" stopOpacity={0.06} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="time"
                  tick={{ fontSize: 9, fill: '#6b7280' }}
                  interval="preserveStartEnd"
                  tickLine={false}
                  axisLine={{ stroke: '#374151' }}
                />
                <YAxis
                  domain={['auto', 'auto']}
                  tick={{ fontSize: 9, fill: '#6b7280' }}
                  tickLine={false}
                  axisLine={{ stroke: '#374151' }}
                  tickFormatter={(v: number) => v.toFixed(2)}
                  width={60}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e2432',
                    border: '1px solid #374151',
                    borderRadius: '8px',
                    fontSize: '11px',
                    color: '#f3f4f6',
                  }}
                  formatter={(value: number, name: string) => {
                    const labels: Record<string, string> = {
                      price: 'Price',
                      bbUpper: 'BB Upper',
                      bbMiddle: 'BB Mid',
                      bbLower: 'BB Lower',
                      fastMA: 'MA(5)',
                      slowMA: 'MA(20)',
                    };
                    return [value !== undefined && value !== null ? value.toFixed(4) : '—', labels[name] || name];
                  }}
                  labelFormatter={(label: string) => `Time: ${label}`}
                />
                <ReferenceLine y={currentPrice} stroke="#f59e0b" strokeDasharray="3 3" strokeWidth={1} />

                {/* Bollinger Bands fill area */}
                {chartData[0]?.bbUpper && (
                  <Area
                    type="monotone"
                    dataKey="bbUpper"
                    stroke="none"
                    fill="url(#bbFill)"
                    fillOpacity={1}
                    connectNulls
                  />
                )}

                {/* Bollinger Bands lines */}
                {chartData[0]?.bbUpper && (
                  <Line
                    type="monotone"
                    dataKey="bbUpper"
                    stroke="#f59e0b"
                    strokeWidth={0.8}
                    strokeDasharray="4 2"
                    strokeOpacity={0.4}
                    dot={false}
                    connectNulls
                  />
                )}
                {chartData[0]?.bbLower && (
                  <Line
                    type="monotone"
                    dataKey="bbLower"
                    stroke="#f59e0b"
                    strokeWidth={0.8}
                    strokeDasharray="4 2"
                    strokeOpacity={0.4}
                    dot={false}
                    connectNulls
                  />
                )}
                {chartData[0]?.bbMiddle && (
                  <Line
                    type="monotone"
                    dataKey="bbMiddle"
                    stroke="#f59e0b"
                    strokeWidth={0.5}
                    strokeOpacity={0.2}
                    dot={false}
                    connectNulls
                  />
                )}

                {/* Moving Averages */}
                {chartData[0]?.fastMA && (
                  <Line
                    type="monotone"
                    dataKey="fastMA"
                    stroke="#38bdf8"
                    strokeWidth={1}
                    strokeOpacity={0.6}
                    dot={false}
                    connectNulls
                  />
                )}
                {chartData[0]?.slowMA && (
                  <Line
                    type="monotone"
                    dataKey="slowMA"
                    stroke="#a78bfa"
                    strokeWidth={1}
                    strokeOpacity={0.6}
                    dot={false}
                    connectNulls
                  />
                )}

                {/* Main price line */}
                <Area
                  type="monotone"
                  dataKey="price"
                  stroke={isPositive ? '#10b981' : '#ef4444'}
                  strokeWidth={1.5}
                  fill="url(#priceGradient)"
                  animationDuration={300}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
              {currentPrice > 0 ? 'Loading chart data...' : 'Connect to see live prices'}
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-4 mt-2 text-[9px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="w-3 h-0.5 bg-emerald-500 rounded" /> Price
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-0.5 bg-sky-400 rounded" /> MA(5)
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-0.5 bg-purple-400 rounded" /> MA(20)
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-0.5 bg-amber-400/40 rounded border-t border-dashed border-amber-400/40" /> BB(20,2)
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
