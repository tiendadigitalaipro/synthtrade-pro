'use client';

import { useTradingStore } from '@/lib/store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { History, TrendingUp, TrendingDown, DollarSign, Target, Flame } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export function TradeHistory() {
  const { tradeHistory } = useTradingStore();

  return (
    <Card className="border-border/50 bg-card/80 backdrop-blur">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <History className="h-4 w-4 text-sky-400" />
          Trade History
          <Badge variant="secondary" className="text-[10px] ml-auto font-mono">
            {tradeHistory.length} trades
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {tradeHistory.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-xs">
            <History className="h-8 w-8 mx-auto mb-2 opacity-30" />
            No completed trades yet
          </div>
        ) : (
          <div className="max-h-72 overflow-y-auto space-y-1.5 custom-scrollbar">
            {tradeHistory.map((trade, i) => (
              <div
                key={trade.id || i}
                className={`rounded-lg border p-2.5 transition-colors ${
                  trade.status === 'WON'
                    ? 'bg-emerald-500/5 border-emerald-500/20'
                    : trade.status === 'LOST'
                      ? 'bg-red-500/5 border-red-500/20'
                      : 'bg-background/30 border-border/30'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5">
                    {trade.contractType === 'CALL' ? (
                      <TrendingUp className="h-3 w-3 text-emerald-400" />
                    ) : (
                      <TrendingDown className="h-3 w-3 text-red-400" />
                    )}
                    <span className="text-[11px] font-semibold">{trade.contractType}</span>
                    <Badge variant="outline" className="text-[8px] px-1 py-0 font-mono">
                      {trade.symbol}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Badge
                      className={`text-[9px] px-1.5 py-0 ${
                        trade.status === 'WON'
                          ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                          : 'bg-red-500/20 text-red-400 border-red-500/30'
                      }`}
                    >
                      {trade.status}
                    </Badge>
                    <span className={`text-[11px] font-bold font-mono ${
                      trade.profit >= 0 ? 'text-emerald-400' : 'text-red-400'
                    }`}>
                      {trade.profit >= 0 ? '+' : ''}{trade.profit.toFixed(2)}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-[9px] text-muted-foreground">
                  <span>Stake: ${trade.amount.toFixed(2)}</span>
                  <span>Payout: ${trade.payout.toFixed(2)}</span>
                  <span>{trade.strategy}</span>
                  {trade.entryTime && (
                    <span className="ml-auto">
                      {formatDistanceToNow(new Date(trade.entryTime), { addSuffix: true })}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
