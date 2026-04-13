'use client';

import { useTradingStore } from '@/lib/store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Trophy,
  Target,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Flame,
  DollarSign,
  Percent,
} from 'lucide-react';

export function PerformanceStats() {
  const {
    totalProfit,
    totalTrades,
    winCount,
    lossCount,
    currentStreak,
    streakType,
    openTrades,
    balance,
  } = useTradingStore();

  const winRate = totalTrades > 0 ? (winCount / totalTrades) * 100 : 0;
  const avgWin = winCount > 0 ? (totalProfit / winCount) : 0;
  const profitFactor = lossCount > 0 ? 'N/A' : totalProfit > 0 ? '∞' : '0';

  const isProfitPositive = totalProfit >= 0;

  const stats = [
    {
      label: 'Total Profit',
      value: `${isProfitPositive ? '+' : ''}$${totalProfit.toFixed(2)}`,
      icon: <DollarSign className="h-4 w-4" />,
      color: isProfitPositive ? 'text-emerald-400' : 'text-red-400',
      bgColor: isProfitPositive ? 'bg-emerald-500/10' : 'bg-red-500/10',
    },
    {
      label: 'Win Rate',
      value: `${winRate.toFixed(1)}%`,
      icon: <Percent className="h-4 w-4" />,
      color: winRate >= 60 ? 'text-emerald-400' : winRate >= 40 ? 'text-amber-400' : 'text-red-400',
      bgColor: winRate >= 60 ? 'bg-emerald-500/10' : winRate >= 40 ? 'bg-amber-500/10' : 'bg-red-500/10',
    },
    {
      label: 'Total Trades',
      value: totalTrades.toString(),
      icon: <BarChart3 className="h-4 w-4" />,
      color: 'text-sky-400',
      bgColor: 'bg-sky-500/10',
    },
    {
      label: 'Win / Loss',
      value: `${winCount} / ${lossCount}`,
      icon: <Target className="h-4 w-4" />,
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/10',
    },
    {
      label: 'Current Streak',
      value: `${currentStreak} ${streakType === 'win' ? 'W' : streakType === 'loss' ? 'L' : ''}`,
      icon: <Flame className="h-4 w-4" />,
      color: streakType === 'win' ? 'text-emerald-400' : streakType === 'loss' ? 'text-red-400' : 'text-muted-foreground',
      bgColor: streakType === 'win' ? 'bg-emerald-500/10' : streakType === 'loss' ? 'bg-red-500/10' : 'bg-background/50',
    },
    {
      label: 'Open Positions',
      value: openTrades.length.toString(),
      icon: <TrendingUp className="h-4 w-4" />,
      color: openTrades.length > 0 ? 'text-amber-400' : 'text-muted-foreground',
      bgColor: openTrades.length > 0 ? 'bg-amber-500/10' : 'bg-background/50',
    },
  ];

  return (
    <Card className="border-border/50 bg-card/80 backdrop-blur">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <Trophy className="h-4 w-4 text-amber-400" />
          Performance
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className={`rounded-lg border border-border/30 ${stat.bgColor} p-2.5 transition-colors`}
            >
              <div className="flex items-center gap-1.5 mb-1">
                <span className={stat.color}>{stat.icon}</span>
                <span className="text-[9px] text-muted-foreground uppercase tracking-wider font-medium">
                  {stat.label}
                </span>
              </div>
              <div className={`text-base font-bold font-mono ${stat.color}`}>
                {stat.value}
              </div>
            </div>
          ))}
        </div>

        {/* Win/Loss Bar */}
        {totalTrades > 0 && (
          <div className="mt-3 space-y-1.5">
            <div className="h-2.5 rounded-full bg-red-500/20 overflow-hidden flex">
              <div
                className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${winRate}%` }}
              />
            </div>
            <div className="flex justify-between text-[9px] text-muted-foreground">
              <span className="text-emerald-400">{winRate.toFixed(1)}% wins</span>
              <span className="text-red-400">{(100 - winRate).toFixed(1)}% losses</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
