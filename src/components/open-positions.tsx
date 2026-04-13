'use client';

import { useTradingStore } from '@/lib/store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Briefcase, TrendingUp, TrendingDown, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export function OpenPositions() {
  const { openTrades, currentPrice } = useTradingStore();

  return (
    <Card className="border-border/50 bg-card/80 backdrop-blur">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <Briefcase className="h-4 w-4 text-amber-400" />
          Open Positions
          <Badge
            variant="secondary"
            className={`text-[10px] ml-auto font-mono ${openTrades.length > 0 ? 'bg-amber-500/20 text-amber-400' : ''}`}
          >
            {openTrades.length} open
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {openTrades.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground text-xs">
            <Briefcase className="h-6 w-6 mx-auto mb-1.5 opacity-30" />
            No open positions
          </div>
        ) : (
          <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
            {openTrades.map((trade, i) => {
              const priceDiff = currentPrice - trade.entryPrice;
              const priceDiffPercent = trade.entryPrice > 0 ? (priceDiff / trade.entryPrice) * 100 : 0;
              const isCall = trade.contractType === 'CALL';
              const directionProfit = isCall ? priceDiff : -priceDiff;

              return (
                <div
                  key={trade.id || i}
                  className="rounded-lg border border-border/30 bg-background/50 p-2.5"
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1.5">
                      {isCall ? (
                        <TrendingUp className="h-3 w-3 text-emerald-400" />
                      ) : (
                        <TrendingDown className="h-3 w-3 text-red-400" />
                      )}
                      <span className="text-[11px] font-semibold">{trade.contractType}</span>
                      <Badge variant="outline" className="text-[8px] px-1 py-0 font-mono">
                        #{trade.contractId || '?'}
                      </Badge>
                    </div>
                    <span className={`text-[11px] font-bold font-mono ${
                      directionProfit >= 0 ? 'text-emerald-400' : 'text-red-400'
                    }`}>
                      {directionProfit >= 0 ? '+' : ''}{priceDiffPercent.toFixed(3)}%
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-[9px] text-muted-foreground">
                    <span>Entry: {trade.entryPrice.toFixed(4)}</span>
                    <span>Now: {currentPrice.toFixed(4)}</span>
                    <span className="flex items-center gap-0.5 ml-auto">
                      <Clock className="h-2.5 w-2.5" />
                      {trade.entryTime && formatDistanceToNow(new Date(trade.entryTime), { addSuffix: true })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[9px] text-muted-foreground mt-0.5">
                    <span>Stake: ${trade.amount.toFixed(2)}</span>
                    <span>Payout: ${trade.payout.toFixed(2)}</span>
                    <span className="ml-auto">{trade.strategy}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
