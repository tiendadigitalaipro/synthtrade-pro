'use client';

import { useTradingStore } from '@/lib/store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollText, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

const logTypeStyles: Record<string, string> = {
  info: 'text-sky-400',
  success: 'text-emerald-400',
  warning: 'text-amber-400',
  error: 'text-red-400',
  trade: 'text-purple-400',
};

const logTypePrefix: Record<string, string> = {
  info: 'ℹ',
  success: '✓',
  warning: '⚠',
  error: '✗',
  trade: '📊',
};

export function ActivityLog() {
  const { logs, clearLogs } = useTradingStore();

  return (
    <Card className="border-border/50 bg-card/80 backdrop-blur">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <ScrollText className="h-4 w-4 text-sky-400" />
            Activity Log
            <Badge variant="secondary" className="text-[10px] font-mono">
              {logs.length}
            </Badge>
          </CardTitle>
          {logs.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearLogs}
              className="h-6 text-[10px] text-muted-foreground hover:text-foreground"
            >
              <Trash2 className="h-3 w-3 mr-1" />
              Clear
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {logs.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground text-xs">
            <ScrollText className="h-6 w-6 mx-auto mb-1.5 opacity-30" />
            No activity yet
          </div>
        ) : (
          <div className="max-h-48 overflow-y-auto space-y-0.5 custom-scrollbar font-mono">
            {logs.slice().reverse().map((log) => (
              <div
                key={log.id}
                className="flex items-start gap-2 text-[10px] py-1 px-1.5 rounded hover:bg-background/30"
              >
                <span className="text-muted-foreground shrink-0 w-14">
                  {log.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
                <span className={`shrink-0 ${logTypeStyles[log.type]}`}>
                  {logTypePrefix[log.type]}
                </span>
                <span className="text-foreground/80 break-all">{log.message}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
