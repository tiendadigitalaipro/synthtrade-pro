'use client';

import { useTradingStore } from '@/lib/store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Shield,
  ShieldAlert,
  RotateCcw,
  Volume2,
  VolumeX,
  Bell,
  BellOff,
  TrendingUp,
  DollarSign,
  AlertTriangle,
  Target,
  Layers,
  Activity,
} from 'lucide-react';

export function RiskManagementPanel() {
  const {
    riskSettings,
    sessionProfit,
    sessionTrades,
    consecutiveLosses,
    martingaleStep,
    isSessionPaused,
    pauseReason,
    isAutoTrading,
    soundEnabled,
    notificationEnabled,
    tradeAmount,
    baseTradeAmount,
    updateRiskSettings,
    resetSession,
    toggleSound,
    toggleNotifications,
  } = useTradingStore();

  const isLossHigh = sessionProfit < -(riskSettings.maxDailyLoss * 0.8);
  const isProfitNear = sessionProfit >= riskSettings.dailyProfitTarget * 0.8;

  return (
    <Card className="border-border/50 bg-card/80 backdrop-blur">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <Shield className="h-4 w-4 text-amber-400" />
            Risk Management
          </CardTitle>
          <div className="flex items-center gap-1.5">
            {isSessionPaused && (
              <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-[9px] animate-pulse">
                <ShieldAlert className="h-2.5 w-2.5 mr-0.5" />
                PAUSED
              </Badge>
            )}
            {isAutoTrading && (
              <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[9px]">
                <Activity className="h-2.5 w-2.5 mr-0.5" />
                LIVE
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Session Status */}
        <div className={`rounded-lg border p-3 space-y-2 ${
          isSessionPaused
            ? 'bg-red-500/10 border-red-500/20'
            : sessionProfit > 0
              ? 'bg-emerald-500/5 border-emerald-500/10'
              : 'bg-background/50 border-border/30'
        }`}>
          {isSessionPaused && (
            <div className="text-[11px] font-semibold text-red-400 flex items-center gap-1.5">
              <ShieldAlert className="h-3.5 w-3.5" />
              {pauseReason}
            </div>
          )}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <div className="text-[9px] text-muted-foreground uppercase tracking-wider">Session P/L</div>
              <div className={`text-sm font-bold font-mono ${
                sessionProfit > 0 ? 'text-emerald-400' : sessionProfit < 0 ? 'text-red-400' : 'text-foreground'
              }`}>
                {sessionProfit >= 0 ? '+' : ''}{sessionProfit.toFixed(2)}
              </div>
            </div>
            <div>
              <div className="text-[9px] text-muted-foreground uppercase tracking-wider">Trades</div>
              <div className="text-sm font-bold font-mono text-foreground">{sessionTrades}</div>
            </div>
            <div>
              <div className="text-[9px] text-muted-foreground uppercase tracking-wider">Consec. Losses</div>
              <div className={`text-sm font-bold font-mono ${
                consecutiveLosses >= riskSettings.stopAfterConsecutiveLosses - 1 ? 'text-red-400' : 'text-foreground'
              }`}>
                {consecutiveLosses} / {riskSettings.stopAfterConsecutiveLosses}
              </div>
            </div>
            <div>
              <div className="text-[9px] text-muted-foreground uppercase tracking-wider">Current Stake</div>
              <div className={`text-sm font-bold font-mono ${
                martingaleStep > 0 ? 'text-amber-400' : 'text-foreground'
              }`}>
                ${tradeAmount.toFixed(2)}
                {martingaleStep > 0 && (
                  <span className="text-[9px] text-amber-400 ml-1">×{martingaleStep}</span>
                )}
              </div>
            </div>
          </div>

          {/* Progress bars */}
          <div className="space-y-1.5">
            {/* Daily Loss Limit */}
            <div>
              <div className="flex justify-between text-[9px] text-muted-foreground mb-0.5">
                <span className="flex items-center gap-1">
                  <AlertTriangle className="h-2.5 w-2.5" />
                  Daily Loss Limit
                </span>
                <span className={isLossHigh ? 'text-red-400' : ''}>
                  ${Math.abs(sessionProfit).toFixed(0)} / ${riskSettings.maxDailyLoss}
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-background/50 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    isLossHigh ? 'bg-red-500' : 'bg-amber-500'
                  }`}
                  style={{
                    width: `${Math.min(100, (Math.abs(Math.min(sessionProfit, 0)) / riskSettings.maxDailyLoss) * 100)}%`
                  }}
                />
              </div>
            </div>

            {/* Profit Target */}
            <div>
              <div className="flex justify-between text-[9px] text-muted-foreground mb-0.5">
                <span className="flex items-center gap-1">
                  <Target className="h-2.5 w-2.5" />
                  Profit Target
                </span>
                <span className={isProfitNear ? 'text-emerald-400' : ''}>
                  ${Math.max(0, sessionProfit).toFixed(0)} / ${riskSettings.dailyProfitTarget}
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-background/50 overflow-hidden">
                <div
                  className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min(100, (Math.max(0, sessionProfit) / riskSettings.dailyProfitTarget) * 100)}%`
                  }}
                />
              </div>
            </div>
          </div>

          {isAutoTrading && (
            <Button
              onClick={resetSession}
              variant="outline"
              size="sm"
              className="w-full h-7 text-[10px] border-border/50"
            >
              <RotateCcw className="h-3 w-3 mr-1" />
              Reset Session
            </Button>
          )}
        </div>

        {/* Risk Settings */}
        <div className="space-y-3">
          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Protection Limits</span>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-[11px] flex items-center gap-1.5">
                <DollarSign className="h-3 w-3 text-red-400" />
                Max Daily Loss ($)
              </Label>
              <Input
                type="number"
                value={riskSettings.maxDailyLoss}
                onChange={(e) => updateRiskSettings({ maxDailyLoss: parseFloat(e.target.value) || 0 })}
                className="w-20 h-7 text-xs text-right font-mono bg-background/50"
                min={0}
                step={5}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label className="text-[11px] flex items-center gap-1.5">
                <Target className="h-3 w-3 text-emerald-400" />
                Profit Target ($)
              </Label>
              <Input
                type="number"
                value={riskSettings.dailyProfitTarget}
                onChange={(e) => updateRiskSettings({ dailyProfitTarget: parseFloat(e.target.value) || 0 })}
                className="w-20 h-7 text-xs text-right font-mono bg-background/50"
                min={0}
                step={10}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label className="text-[11px] flex items-center gap-1.5">
                <Layers className="h-3 w-3 text-sky-400" />
                Max Trades/Session
              </Label>
              <Input
                type="number"
                value={riskSettings.maxTradesPerSession}
                onChange={(e) => updateRiskSettings({ maxTradesPerSession: Math.max(1, parseInt(e.target.value) || 100) })}
                className="w-20 h-7 text-xs text-right font-mono bg-background/50"
                min={1}
                max={500}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label className="text-[11px] flex items-center gap-1.5">
                <AlertTriangle className="h-3 w-3 text-amber-400" />
                Stop After Consec. Losses
              </Label>
              <Input
                type="number"
                value={riskSettings.stopAfterConsecutiveLosses}
                onChange={(e) => updateRiskSettings({ stopAfterConsecutiveLosses: Math.max(1, parseInt(e.target.value) || 5) })}
                className="w-20 h-7 text-xs text-right font-mono bg-background/50"
                min={1}
                max={20}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label className="text-[11px] flex items-center gap-1.5">
                <Activity className="h-3 w-3 text-purple-400" />
                Min Signal Confidence (%)
              </Label>
              <Input
                type="number"
                value={riskSettings.minSignalConfidence}
                onChange={(e) => updateRiskSettings({ minSignalConfidence: parseInt(e.target.value) || 1 })}
                className="w-20 h-7 text-xs text-right font-mono bg-background/50"
                min={1}
                max={100}
              />
            </div>
          </div>
        </div>

        {/* Martingale Settings */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <TrendingUp className="h-3 w-3 text-amber-400" />
              Martingale System
            </span>
            <Switch
              checked={riskSettings.useMartingale}
              onCheckedChange={(v) => updateRiskSettings({ useMartingale: v })}
            />
          </div>

          {riskSettings.useMartingale && (
            <div className="rounded-lg bg-amber-500/5 border border-amber-500/20 p-3 space-y-2">
              <p className="text-[10px] text-amber-400">
                ⚠️ Martingale doubles the stake after each loss. High risk!
              </p>
              <div className="flex items-center justify-between">
                <Label className="text-[11px]">Multiplier</Label>
                <Input
                  type="number"
                  value={riskSettings.martingaleMultiplier}
                  onChange={(e) => updateRiskSettings({ martingaleMultiplier: parseFloat(e.target.value) || 1.5 })}
                  className="w-20 h-7 text-xs text-right font-mono bg-background/50"
                  min={1.1}
                  max={5}
                  step={0.5}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-[11px]">Max Steps</Label>
                <Input
                  type="number"
                  value={riskSettings.martingaleMaxSteps}
                  onChange={(e) => updateRiskSettings({ martingaleMaxSteps: parseInt(e.target.value) || 1 })}
                  className="w-20 h-7 text-xs text-right font-mono bg-background/50"
                  min={1}
                  max={10}
                />
              </div>
              {/* Show progression preview */}
              <div className="text-[9px] text-muted-foreground space-y-0.5">
                <div className="font-semibold text-[10px] text-amber-400 mb-1">Stake Progression:</div>
                {Array.from({ length: Math.min(riskSettings.martingaleMaxSteps, 5) }, (_, i) => (
                  <div key={i} className="flex justify-between">
                    <span>Step {i + 1} ({i === 0 ? 'loss' : `${i} losses`}):</span>
                    <span className="font-mono">
                      ${(baseTradeAmount * Math.pow(riskSettings.martingaleMultiplier, i)).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sound & Notifications */}
        <div className="space-y-2">
          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Alerts</span>
          <div className="flex items-center justify-between rounded-lg bg-background/50 border border-border/30 px-3 py-2">
            <Label className="text-[11px] flex items-center gap-1.5">
              {soundEnabled ? <Volume2 className="h-3.5 w-3.5 text-emerald-400" /> : <VolumeX className="h-3.5 w-3.5 text-muted-foreground" />}
              Sound Effects
            </Label>
            <Switch checked={soundEnabled} onCheckedChange={toggleSound} />
          </div>
          <div className="flex items-center justify-between rounded-lg bg-background/50 border border-border/30 px-3 py-2">
            <Label className="text-[11px] flex items-center gap-1.5">
              {notificationEnabled ? <Bell className="h-3.5 w-3.5 text-emerald-400" /> : <BellOff className="h-3.5 w-3.5 text-muted-foreground" />}
              Browser Notifications
            </Label>
            <Switch checked={notificationEnabled} onCheckedChange={toggleNotifications} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
