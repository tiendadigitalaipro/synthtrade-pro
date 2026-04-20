// ══════════════════════════════════════════════════════════════════════════
// SynthTrade Pro — Trading Strategies Engine
// A2K Digital Studio © 2026
// Supports: Boom/Crash (300/500/1000), Volatility (10-100 + 1s),
//           Jump, Gold, Silver, Oil, EUR/USD
// ══════════════════════════════════════════════════════════════════════════

import type { Tick } from './deriv-api';

// ─── Technical Indicators ────────────────────────────────────────────────

export function calculateSMA(prices: number[], period: number): number {
  if (prices.length < period) return prices[prices.length - 1] || 0;
  const slice = prices.slice(-period);
  return slice.reduce((sum, p) => sum + p, 0) / period;
}

export function calculateEMA(prices: number[], period: number): number {
  if (prices.length < period) return prices[prices.length - 1] || 0;
  const multiplier = 2 / (period + 1);
  let ema = prices.slice(0, period).reduce((s, p) => s + p, 0) / period;
  for (let i = period; i < prices.length; i++) {
    ema = (prices[i] - ema) * multiplier + ema;
  }
  return ema;
}

export function calculateRSI(prices: number[], period: number = 14): number {
  if (prices.length < period + 1) return 50;
  let gains = 0;
  let losses = 0;
  for (let i = prices.length - period; i < prices.length; i++) {
    const change = prices[i] - prices[i - 1];
    if (change > 0) gains += change;
    else losses += Math.abs(change);
  }
  const avgGain = gains / period;
  const avgLoss = losses / period;
  if (avgLoss === 0) return 100;
  return 100 - 100 / (1 + avgGain / avgLoss);
}

export function calculateStochastic(
  prices: number[],
  period: number = 14
): { k: number; d: number } {
  if (prices.length < period) return { k: 50, d: 50 };
  const slice = prices.slice(-period);
  const high = Math.max(...slice);
  const low = Math.min(...slice);
  const current = prices[prices.length - 1];
  const k = high !== low ? ((current - low) / (high - low)) * 100 : 50;

  // %D = 3-period SMA of %K
  const kValues: number[] = [];
  for (let i = Math.max(0, prices.length - period - 2); i < prices.length; i++) {
    const sl = prices.slice(Math.max(0, i - period + 1), i + 1);
    const h = Math.max(...sl);
    const l = Math.min(...sl);
    const c = prices[i];
    kValues.push(h !== l ? ((c - l) / (h - l)) * 100 : 50);
  }
  const d = kValues.slice(-3).reduce((s, v) => s + v, 0) / Math.min(3, kValues.length);
  return { k, d };
}

export function calculateATR(ticks: Tick[], period: number = 14): number {
  if (ticks.length < 2) return 0;
  const trueRanges: number[] = [];
  for (let i = 1; i < ticks.length; i++) {
    trueRanges.push(Math.abs(ticks[i].quote - ticks[i - 1].quote));
  }
  const recent = trueRanges.slice(-period);
  return recent.reduce((s, r) => s + r, 0) / recent.length;
}

export function calculateBollingerBands(
  prices: number[],
  period: number = 20,
  stdDevMultiplier: number = 2
): { upper: number; middle: number; lower: number; currentPrice: number; bandwidth: number } {
  if (prices.length < period) {
    const current = prices[prices.length - 1] || 0;
    return { upper: current, middle: current, lower: current, currentPrice: current, bandwidth: 0 };
  }
  const slice = prices.slice(-period);
  const middle = slice.reduce((s, p) => s + p, 0) / period;
  const variance = slice.reduce((s, p) => s + Math.pow(p - middle, 2), 0) / period;
  const stdDev = Math.sqrt(variance);
  const upper = middle + stdDevMultiplier * stdDev;
  const lower = middle - stdDevMultiplier * stdDev;
  const bandwidth = middle > 0 ? ((upper - lower) / middle) * 100 : 0;
  return { upper, middle, lower, currentPrice: prices[prices.length - 1], bandwidth };
}

export function calculateMACD(
  prices: number[],
  fastPeriod = 12,
  slowPeriod = 26,
  signalPeriod = 9
): { macd: number; signal: number; histogram: number } {
  if (prices.length < slowPeriod + signalPeriod) return { macd: 0, signal: 0, histogram: 0 };
  const fastEMA = calculateEMA(prices, fastPeriod);
  const slowEMA = calculateEMA(prices, slowPeriod);
  const macdLine = fastEMA - slowEMA;
  const macdValues: number[] = [];
  for (let i = slowPeriod; i <= prices.length; i++) {
    const fEma = calculateEMA(prices.slice(0, i), fastPeriod);
    const sEma = calculateEMA(prices.slice(0, i), slowPeriod);
    macdValues.push(fEma - sEma);
  }
  const signalLine = macdValues.length >= signalPeriod
    ? calculateEMA(macdValues, signalPeriod)
    : macdValues[macdValues.length - 1] || 0;
  return { macd: macdLine, signal: signalLine, histogram: macdLine - signalLine };
}

// ─── Spike Detection (Enhanced) ─────────────────────────────────────────

export function detectSpike(
  ticks: Tick[],
  lookback: number = 20,
  threshold: number = 2.5
): 'UP' | 'DOWN' | null {
  if (ticks.length < lookback + 1) return null;
  const recentPrices = ticks.slice(-(lookback + 1)).map((t) => t.quote);
  const avgPrice = recentPrices.slice(0, -1).reduce((s, p) => s + p, 0) / lookback;
  const currentPrice = recentPrices[recentPrices.length - 1];
  const change = Math.abs(currentPrice - avgPrice) / avgPrice * 100;

  const changes: number[] = [];
  for (let i = 1; i < recentPrices.length - 1; i++) {
    changes.push(Math.abs(recentPrices[i] - recentPrices[i - 1]) / recentPrices[i - 1] * 100);
  }
  const avgChange = changes.length > 0 ? changes.reduce((s, c) => s + c, 0) / changes.length : 0;
  const stdChange = changes.length > 1
    ? Math.sqrt(changes.reduce((s, c) => s + Math.pow(c - avgChange, 2), 0) / (changes.length - 1))
    : avgChange;

  if (avgChange > 0 && change > threshold * stdChange && change > 0.01) {
    return currentPrice > avgPrice ? 'UP' : 'DOWN';
  }
  return null;
}

// Cuenta ticks desde el último spike (para Boom/Crash)
export function ticksSinceLastSpike(ticks: Tick[], spikeThreshold: number = 2.5): number {
  let count = 0;
  for (let i = ticks.length - 1; i >= 1; i--) {
    const change = Math.abs(ticks[i].quote - ticks[i - 1].quote) / ticks[i - 1].quote * 100;
    if (change >= spikeThreshold) return count;
    count++;
  }
  return count;
}

// ─── Strategy Signal Types ───────────────────────────────────────────────

export interface StrategySignal {
  type: 'CALL' | 'PUT' | null;
  strategy: string;
  confidence: number;
  reason: string;
  indicators: Record<string, number>;
}

// ─── BOOM/CRASH SPECIFIC: Tick Counter Strategy ───────────────────────────
// Boom 300: spike ~cada 300 ticks | Crash 300: spike ~cada 300 ticks
// Boom 500: spike ~cada 500 ticks | Crash 500: spike ~cada 500 ticks
// Boom 1000: spike ~cada 1000 ticks | Crash 1000: spike ~cada 1000 ticks

export function generateTickCounterSignal(
  ticks: Tick[],
  symbol: string
): StrategySignal {
  // Determinar intervalo esperado del símbolo
  let expectedInterval = 1000;
  let isBoom = false;
  const sym = symbol.toUpperCase();

  if (sym.includes('BOOM300') || sym === 'BOOM_300') { expectedInterval = 300; isBoom = true; }
  else if (sym.includes('BOOM500') || sym === 'BOOM_500') { expectedInterval = 500; isBoom = true; }
  else if (sym.includes('BOOM1000') || sym === 'BOOM_1000') { expectedInterval = 1000; isBoom = true; }
  else if (sym.includes('CRASH300') || sym === 'CRASH_300') { expectedInterval = 300; isBoom = false; }
  else if (sym.includes('CRASH500') || sym === 'CRASH_500') { expectedInterval = 500; isBoom = false; }
  else if (sym.includes('CRASH1000') || sym === 'CRASH_1000') { expectedInterval = 1000; isBoom = false; }
  else {
    return {
      type: null, strategy: 'Tick Counter',
      confidence: 0, reason: 'No es símbolo Boom/Crash.',
      indicators: {},
    };
  }

  const sinceSpike = ticksSinceLastSpike(ticks, 1.5);
  // Zona de alta probabilidad: >70% del intervalo esperado
  const triggerZone = expectedInterval * 0.70;
  const highProbZone = expectedInterval * 0.85;

  const indicators = { sinceSpike, expectedInterval, triggerZone };

  if (sinceSpike >= highProbZone) {
    const confidence = Math.min(95, 60 + Math.round((sinceSpike - triggerZone) / (expectedInterval - triggerZone) * 35));
    return {
      type: isBoom ? 'CALL' : 'PUT',
      strategy: 'Tick Counter',
      confidence,
      reason: `${sinceSpike} ticks desde último spike (intervalo esperado: ${expectedInterval}). ZONA DE ALTO RIESGO. ${isBoom ? 'CALL en BOOM' : 'PUT en CRASH'}.`,
      indicators,
    };
  }

  if (sinceSpike >= triggerZone) {
    const confidence = Math.min(75, 40 + Math.round((sinceSpike - triggerZone) / (highProbZone - triggerZone) * 35));
    return {
      type: isBoom ? 'CALL' : 'PUT',
      strategy: 'Tick Counter',
      confidence,
      reason: `${sinceSpike} ticks desde último spike. Entrando en zona de probabilidad (>${Math.round(triggerZone)}).`,
      indicators,
    };
  }

  return {
    type: null, strategy: 'Tick Counter',
    confidence: 0,
    reason: `Solo ${sinceSpike} ticks desde último spike. Esperando zona de activación (>${Math.round(triggerZone)}).`,
    indicators,
  };
}

// ─── BOOM/CRASH: Anti-Spike Reversal ─────────────────────────────────────
// Después de un spike, el precio típicamente revierte → trade en dirección opuesta

export function generateAntiSpikeSignal(ticks: Tick[]): StrategySignal {
  if (ticks.length < 5) return { type: null, strategy: 'Anti-Spike', confidence: 0, reason: 'Insuficientes ticks.', indicators: {} };

  const sinceSpike = ticksSinceLastSpike(ticks, 1.5);
  const currentPrice = ticks[ticks.length - 1].quote;

  // Si el spike fue hace 1-5 ticks, entrar en reversa
  if (sinceSpike >= 1 && sinceSpike <= 5) {
    // Determinar dirección del spike
    let spikeIdx = ticks.length - 1 - sinceSpike;
    if (spikeIdx < 1) spikeIdx = 1;
    const spikeUp = ticks[spikeIdx].quote > ticks[spikeIdx - 1].quote;

    const confidence = Math.max(55, 85 - sinceSpike * 8);
    return {
      type: spikeUp ? 'PUT' : 'CALL',
      strategy: 'Anti-Spike',
      confidence,
      reason: `Spike ${spikeUp ? 'alcista' : 'bajista'} hace ${sinceSpike} tick(s). Reversa esperada. ${spikeUp ? 'PUT' : 'CALL'}.`,
      indicators: { sinceSpike, currentPrice },
    };
  }

  return {
    type: null, strategy: 'Anti-Spike',
    confidence: 0,
    reason: sinceSpike === 0 ? 'Spike en este tick — esperando confirmación.' : `Spike hace ${sinceSpike} ticks — ventana de reversa expirada.`,
    indicators: { sinceSpike },
  };
}

// ─── RSI Mejorado con niveles adaptativos ─────────────────────────────────

export function generateRSISignal(
  ticks: Tick[],
  oversoldThreshold: number = 30,
  overboughtThreshold: number = 70
): StrategySignal {
  const prices = ticks.map((t) => t.quote);
  const rsi = calculateRSI(prices, 14);
  const rsi7 = calculateRSI(prices, 7); // RSI rápido para confirmación
  const stoch = calculateStochastic(prices, 14);

  const indicators: Record<string, number> = { rsi, rsi7, stochK: stoch.k, stochD: stoch.d };

  // Señal fuerte: RSI + Stochastic confirman
  if (rsi < oversoldThreshold && stoch.k < 20) {
    return {
      type: 'CALL',
      strategy: 'RSI',
      confidence: Math.min(100, Math.round(((oversoldThreshold - rsi) / oversoldThreshold) * 80 + 20)),
      reason: `RSI ${rsi.toFixed(1)} oversold + Stoch K ${stoch.k.toFixed(1)} < 20. Doble confirmación CALL.`,
      indicators,
    };
  }
  if (rsi > overboughtThreshold && stoch.k > 80) {
    return {
      type: 'PUT',
      strategy: 'RSI',
      confidence: Math.min(100, Math.round(((rsi - overboughtThreshold) / (100 - overboughtThreshold)) * 80 + 20)),
      reason: `RSI ${rsi.toFixed(1)} overbought + Stoch K ${stoch.k.toFixed(1)} > 80. Doble confirmación PUT.`,
      indicators,
    };
  }

  if (rsi < oversoldThreshold) {
    return {
      type: 'CALL',
      strategy: 'RSI',
      confidence: Math.min(100, Math.round(((oversoldThreshold - rsi) / oversoldThreshold) * 70)),
      reason: `RSI ${rsi.toFixed(1)} oversold (< ${oversoldThreshold}). Esperando rebote alcista.`,
      indicators,
    };
  }
  if (rsi > overboughtThreshold) {
    return {
      type: 'PUT',
      strategy: 'RSI',
      confidence: Math.min(100, Math.round(((rsi - overboughtThreshold) / (100 - overboughtThreshold)) * 70)),
      reason: `RSI ${rsi.toFixed(1)} overbought (> ${overboughtThreshold}). Esperando corrección bajista.`,
      indicators,
    };
  }

  return { type: null, strategy: 'RSI', confidence: 0, reason: `RSI ${rsi.toFixed(1)} zona neutral.`, indicators };
}

// ─── MA Crossover Mejorado con EMA + MACD ────────────────────────────────

export function generateMACrossSignal(
  ticks: Tick[],
  fastPeriod: number = 5,
  slowPeriod: number = 20
): StrategySignal {
  const prices = ticks.map((t) => t.quote);
  if (prices.length < slowPeriod + 1) {
    return { type: null, strategy: 'MA Crossover', confidence: 0, reason: `Insuficientes datos (${prices.length}/${slowPeriod + 1}).`, indicators: {} };
  }

  const currentFast = calculateEMA(prices, fastPeriod);
  const currentSlow = calculateEMA(prices, slowPeriod);
  const prevFast = calculateEMA(prices.slice(0, -1), fastPeriod);
  const prevSlow = calculateEMA(prices.slice(0, -1), slowPeriod);
  const macd = calculateMACD(prices);
  const ema50 = calculateEMA(prices, 50);

  const indicators: Record<string, number> = { fastEMA: currentFast, slowEMA: currentSlow, macd: macd.macd, macdSignal: macd.signal, macdHist: macd.histogram };

  if (prevFast <= prevSlow && currentFast > currentSlow) {
    const macdConfirm = macd.histogram > 0;
    const trendConfirm = currentFast > ema50;
    const bonus = (macdConfirm ? 15 : 0) + (trendConfirm ? 10 : 0);
    return {
      type: 'CALL',
      strategy: 'MA Crossover',
      confidence: Math.min(100, 55 + bonus + Math.round(((currentFast - currentSlow) / currentSlow) * 5000)),
      reason: `Golden Cross EMA${fastPeriod}/EMA${slowPeriod}${macdConfirm ? ' + MACD confirma' : ''}${trendConfirm ? ' + tendencia alcista' : ''}. CALL.`,
      indicators,
    };
  }

  if (prevFast >= prevSlow && currentFast < currentSlow) {
    const macdConfirm = macd.histogram < 0;
    const trendConfirm = currentFast < ema50;
    const bonus = (macdConfirm ? 15 : 0) + (trendConfirm ? 10 : 0);
    return {
      type: 'PUT',
      strategy: 'MA Crossover',
      confidence: Math.min(100, 55 + bonus + Math.round(((currentSlow - currentFast) / currentSlow) * 5000)),
      reason: `Death Cross EMA${fastPeriod}/EMA${slowPeriod}${macdConfirm ? ' + MACD confirma' : ''}${trendConfirm ? ' + tendencia bajista' : ''}. PUT.`,
      indicators,
    };
  }

  const trend = currentFast > currentSlow ? 'alcista' : 'bajista';
  return { type: null, strategy: 'MA Crossover', confidence: 0, reason: `Tendencia ${trend}. Sin cruce detectado.`, indicators };
}

// ─── Bollinger Bands Mejorado ─────────────────────────────────────────────

export function generateBBSignal(
  ticks: Tick[],
  period: number = 20,
  stdDevMultiplier: number = 2
): StrategySignal {
  const prices = ticks.map((t) => t.quote);
  const bb = calculateBollingerBands(prices, period, stdDevMultiplier);
  const rsi = calculateRSI(prices, 14);

  const indicators: Record<string, number> = {
    upper: bb.upper, middle: bb.middle, lower: bb.lower, bandwidth: bb.bandwidth, rsi,
  };

  if (prices.length < period) {
    return { type: null, strategy: 'Bollinger Bands', confidence: 0, reason: `Insuficientes datos (${prices.length}/${period}).`, indicators };
  }

  const previousPrice = prices[prices.length - 2];

  // Precio toca o cruza banda inferior + RSI confirma oversold
  if (bb.currentPrice <= bb.lower * 1.001 && previousPrice > bb.lower) {
    const rsiConfirm = rsi < 40;
    return {
      type: 'CALL',
      strategy: 'Bollinger Bands',
      confidence: Math.min(100, Math.round(bb.bandwidth * 5) + (rsiConfirm ? 20 : 0)),
      reason: `Precio toca banda inferior (${bb.lower.toFixed(4)})${rsiConfirm ? ' + RSI confirma oversold' : ''}. CALL reversión.`,
      indicators,
    };
  }

  // Precio toca o cruza banda superior + RSI confirma overbought
  if (bb.currentPrice >= bb.upper * 0.999 && previousPrice < bb.upper) {
    const rsiConfirm = rsi > 60;
    return {
      type: 'PUT',
      strategy: 'Bollinger Bands',
      confidence: Math.min(100, Math.round(bb.bandwidth * 5) + (rsiConfirm ? 20 : 0)),
      reason: `Precio toca banda superior (${bb.upper.toFixed(4)})${rsiConfirm ? ' + RSI confirma overbought' : ''}. PUT reversión.`,
      indicators,
    };
  }

  // Squeeze + breakout detection
  if (bb.bandwidth < 0.5) {
    return {
      type: null, strategy: 'Bollinger Bands',
      confidence: 0, reason: `Bollinger Squeeze detectado (bandwidth ${bb.bandwidth.toFixed(2)}%). Esperando breakout.`,
      indicators,
    };
  }

  return { type: null, strategy: 'Bollinger Bands', confidence: 0, reason: `Precio dentro de bandas. BW: ${bb.bandwidth.toFixed(2)}%.`, indicators };
}

// ─── Spike Detection Signal ───────────────────────────────────────────────

export function generateSpikeSignal(
  ticks: Tick[],
  lookback: number = 20,
  threshold: number = 2.5
): StrategySignal {
  const spike = detectSpike(ticks, lookback, threshold);
  const currentPrice = ticks.length > 0 ? ticks[ticks.length - 1].quote : 0;
  const indicators: Record<string, number> = { currentPrice, threshold };

  if (spike === 'UP') {
    return { type: 'CALL', strategy: 'Spike Detection', confidence: 85, reason: `Spike alcista detectado en ${currentPrice.toFixed(4)}. CALL momentum.`, indicators };
  }
  if (spike === 'DOWN') {
    return { type: 'PUT', strategy: 'Spike Detection', confidence: 85, reason: `Spike bajista detectado en ${currentPrice.toFixed(4)}. PUT momentum.`, indicators };
  }
  return { type: null, strategy: 'Spike Detection', confidence: 0, reason: 'Sin spike significativo detectado.', indicators };
}

// ─── Mean Reversion (para Volatility indices) ─────────────────────────────

export function generateMeanReversionSignal(ticks: Tick[]): StrategySignal {
  if (ticks.length < 30) return { type: null, strategy: 'Mean Reversion', confidence: 0, reason: 'Insuficientes ticks.', indicators: {} };

  const prices = ticks.map(t => t.quote);
  const mean = calculateSMA(prices, 30);
  const current = prices[prices.length - 1];
  const atr = calculateATR(ticks, 14);
  const deviation = (current - mean) / (atr || 1);

  const indicators = { mean, current, atr, deviation };

  if (deviation < -2.0) {
    return {
      type: 'CALL', strategy: 'Mean Reversion',
      confidence: Math.min(95, 60 + Math.round(Math.abs(deviation) * 10)),
      reason: `Precio ${Math.abs(deviation).toFixed(2)} ATRs por debajo de la media. Reversión alcista esperada.`,
      indicators,
    };
  }
  if (deviation > 2.0) {
    return {
      type: 'PUT', strategy: 'Mean Reversion',
      confidence: Math.min(95, 60 + Math.round(Math.abs(deviation) * 10)),
      reason: `Precio ${deviation.toFixed(2)} ATRs por encima de la media. Reversión bajista esperada.`,
      indicators,
    };
  }
  return { type: null, strategy: 'Mean Reversion', confidence: 0, reason: `Desviación ${deviation.toFixed(2)} ATRs. Dentro de rango normal.`, indicators };
}

// ─── MACD Signal ─────────────────────────────────────────────────────────

export function generateMACDSignal(ticks: Tick[]): StrategySignal {
  const prices = ticks.map(t => t.quote);
  const macd = calculateMACD(prices);
  const prevMacd = calculateMACD(prices.slice(0, -1));

  const indicators = { macd: macd.macd, signal: macd.signal, histogram: macd.histogram };

  if (prices.length < 35) return { type: null, strategy: 'MACD', confidence: 0, reason: 'Insuficientes datos para MACD.', indicators };

  // Cruce alcista: MACD cruza por encima de la línea de señal
  if (prevMacd.histogram <= 0 && macd.histogram > 0) {
    return {
      type: 'CALL', strategy: 'MACD',
      confidence: Math.min(90, 60 + Math.round(Math.abs(macd.histogram) * 1000)),
      reason: `MACD cruce alcista. Histograma positivo: ${macd.histogram.toFixed(6)}. CALL.`,
      indicators,
    };
  }

  // Cruce bajista
  if (prevMacd.histogram >= 0 && macd.histogram < 0) {
    return {
      type: 'PUT', strategy: 'MACD',
      confidence: Math.min(90, 60 + Math.round(Math.abs(macd.histogram) * 1000)),
      reason: `MACD cruce bajista. Histograma negativo: ${macd.histogram.toFixed(6)}. PUT.`,
      indicators,
    };
  }

  const trend = macd.histogram > 0 ? 'alcista' : 'bajista';
  return { type: null, strategy: 'MACD', confidence: 0, reason: `MACD tendencia ${trend}. Sin cruce.`, indicators };
}

// ─── Trend Following (para mercados en tendencia fuerte) ──────────────────

export function generateTrendFollowingSignal(ticks: Tick[]): StrategySignal {
  if (ticks.length < 50) return { type: null, strategy: 'Trend Following', confidence: 0, reason: 'Insuficientes datos.', indicators: {} };

  const prices = ticks.map(t => t.quote);
  const ema8 = calculateEMA(prices, 8);
  const ema21 = calculateEMA(prices, 21);
  const ema50 = calculateEMA(prices, 50);
  const rsi = calculateRSI(prices, 14);
  const current = prices[prices.length - 1];

  const indicators = { ema8, ema21, ema50, rsi, current };

  // Tendencia alcista fuerte: EMA8 > EMA21 > EMA50 + precio sobre EMA8 + RSI > 50
  if (ema8 > ema21 && ema21 > ema50 && current > ema8 && rsi > 52) {
    const strength = ((ema8 - ema50) / ema50) * 10000;
    return {
      type: 'CALL', strategy: 'Trend Following',
      confidence: Math.min(90, 65 + Math.round(strength)),
      reason: `Tendencia alcista fuerte: EMA8(${ema8.toFixed(4)}) > EMA21 > EMA50. RSI ${rsi.toFixed(1)}.`,
      indicators,
    };
  }

  // Tendencia bajista fuerte
  if (ema8 < ema21 && ema21 < ema50 && current < ema8 && rsi < 48) {
    const strength = ((ema50 - ema8) / ema50) * 10000;
    return {
      type: 'PUT', strategy: 'Trend Following',
      confidence: Math.min(90, 65 + Math.round(strength)),
      reason: `Tendencia bajista fuerte: EMA8(${ema8.toFixed(4)}) < EMA21 < EMA50. RSI ${rsi.toFixed(1)}.`,
      indicators,
    };
  }

  return { type: null, strategy: 'Trend Following', confidence: 0, reason: 'Sin tendencia clara definida.', indicators };
}

// ─── Composite Strategy ─────────────────────────────────────────────────

export function generateCompositeSignal(
  ticks: Tick[],
  strategies: string[],
  symbol?: string
): StrategySignal {
  const signals: StrategySignal[] = [];

  if (strategies.includes('RSI')) signals.push(generateRSISignal(ticks));
  if (strategies.includes('MA_CROSS')) signals.push(generateMACrossSignal(ticks));
  if (strategies.includes('BOLLINGER')) signals.push(generateBBSignal(ticks));
  if (strategies.includes('SPIKE')) signals.push(generateSpikeSignal(ticks));
  if (strategies.includes('TICK_COUNTER') && symbol) signals.push(generateTickCounterSignal(ticks, symbol));
  if (strategies.includes('ANTI_SPIKE')) signals.push(generateAntiSpikeSignal(ticks));
  if (strategies.includes('MEAN_REVERSION')) signals.push(generateMeanReversionSignal(ticks));
  if (strategies.includes('MACD')) signals.push(generateMACDSignal(ticks));
  if (strategies.includes('TREND_FOLLOW')) signals.push(generateTrendFollowingSignal(ticks));

  if (signals.length === 0) return { type: null, strategy: 'Composite', confidence: 0, reason: 'Sin estrategias seleccionadas.', indicators: {} };

  const activeSignals = signals.filter((s) => s.type !== null);
  if (activeSignals.length === 0) {
    return { type: null, strategy: 'Composite', confidence: 0, reason: signals.map((s) => s.reason).join(' | '), indicators: signals.reduce((acc, s) => ({ ...acc, ...s.indicators }), {}) };
  }

  let callCount = 0, putCount = 0, totalConfidence = 0;
  activeSignals.forEach((s) => {
    if (s.type === 'CALL') callCount++;
    if (s.type === 'PUT') putCount++;
    totalConfidence += s.confidence;
  });

  const finalType = callCount >= putCount ? 'CALL' : 'PUT';
  const agreement = Math.max(callCount, putCount);
  const avgConfidence = totalConfidence / activeSignals.length;
  const consensusBonus = (agreement / Math.max(1, activeSignals.length)) * 20;
  const conflictPenalty = Math.min(callCount, putCount) > 0 ? 15 : 0;

  return {
    type: finalType,
    strategy: 'Composite',
    confidence: Math.min(100, Math.max(0, Math.round(avgConfidence + consensusBonus - conflictPenalty))),
    reason: `${agreement}/${activeSignals.length} estrategias de acuerdo → ${finalType}. ${activeSignals.map((s) => `[${s.strategy}:${s.confidence}%]`).join(' ')}`,
    indicators: signals.reduce((acc, s) => ({ ...acc, ...s.indicators }), {}),
  };
}

// ─── Available Strategies ───────────────────────────────────────────────

export const AVAILABLE_STRATEGIES = [
  {
    id: 'TICK_COUNTER',
    name: '🎯 Tick Counter (Boom/Crash)',
    description: 'Cuenta ticks desde el último spike. Boom 300/500/1000 y Crash 300/500/1000. Entra en zona de alta probabilidad de spike.',
    defaultParams: { expectedInterval: 300 },
    bestFor: ['BOOM300N', 'BOOM500', 'BOOM1000', 'CRASH300N', 'CRASH500', 'CRASH1000'],
  },
  {
    id: 'ANTI_SPIKE',
    name: '🔄 Anti-Spike Reversal',
    description: 'Después de un spike detectado, entra en dirección contraria esperando reversión. Alta efectividad en Boom/Crash.',
    defaultParams: { windowTicks: 5 },
    bestFor: ['BOOM300N', 'BOOM500', 'BOOM1000', 'CRASH300N', 'CRASH500', 'CRASH1000'],
  },
  {
    id: 'SPIKE',
    name: '⚡ Spike Detection',
    description: 'Detecta spikes de precio para índices Boom/Crash. Opera en dirección del spike por momentum.',
    defaultParams: { lookback: 20, threshold: 2.5 },
    bestFor: ['BOOM300N', 'BOOM500', 'BOOM1000', 'CRASH300N', 'CRASH500', 'CRASH1000'],
  },
  {
    id: 'RSI',
    name: '📊 RSI + Stochastic',
    description: 'RSI con confirmación Stochastic. Oversold < 30 = CALL, Overbought > 70 = PUT. Mejor en mercados laterales.',
    defaultParams: { period: 14, oversold: 30, overbought: 70 },
    bestFor: ['R_10', 'R_25', 'R_50', 'R_75', 'R_100', 'frxXAUUSD'],
  },
  {
    id: 'BOLLINGER',
    name: '📈 Bollinger Bands',
    description: 'Opera en las bandas con confirmación RSI. Efectivo para volatility indices y Gold.',
    defaultParams: { period: 20, stdDev: 2 },
    bestFor: ['R_10', 'R_25', 'R_50', 'R_75', 'R_100', 'frxXAUUSD', 'frxXAGUSD'],
  },
  {
    id: 'MA_CROSS',
    name: '📉 EMA Crossover + MACD',
    description: 'Cruces de EMA rápida/lenta con confirmación MACD. Golden Cross = CALL, Death Cross = PUT.',
    defaultParams: { fastPeriod: 5, slowPeriod: 20 },
    bestFor: ['R_50', 'R_75', 'R_100', 'frxXAUUSD', 'JD10', 'JD25'],
  },
  {
    id: 'MACD',
    name: '🔀 MACD Signal',
    description: 'Cruces del histograma MACD. Señales limpias en mercados con tendencia.',
    defaultParams: { fast: 12, slow: 26, signal: 9 },
    bestFor: ['R_50', 'R_75', 'R_100', 'frxXAUUSD'],
  },
  {
    id: 'MEAN_REVERSION',
    name: '↩️ Mean Reversion',
    description: 'Detecta desviaciones extremas de la media (2+ ATR). Excelente para Volatility 10/25.',
    defaultParams: { period: 30, atrPeriod: 14 },
    bestFor: ['R_10', 'R_25', 'R_50', 'JD10', 'JD25'],
  },
  {
    id: 'TREND_FOLLOW',
    name: '🚀 Trend Following (EMA Triple)',
    description: 'Alineación EMA 8/21/50. Opera en dirección de la tendencia dominante. Mejor para índices de alta volatilidad.',
    defaultParams: { ema1: 8, ema2: 21, ema3: 50 },
    bestFor: ['R_75', 'R_100', 'R_100_1s', 'JD75', 'JD100'],
  },
];

// ─── Available Markets (COMPLETO) ──────────────────────────────────────────

export const SYNTHETIC_MARKETS = [
  // ── BOOM ──
  { symbol: 'BOOM300N',  name: 'Boom 300',  category: 'Boom/Crash', description: 'Spike alcista ~cada 300 ticks',  color: '#00d97e', recommendedStrategies: ['TICK_COUNTER', 'ANTI_SPIKE', 'SPIKE'] },
  { symbol: 'BOOM500',   name: 'Boom 500',  category: 'Boom/Crash', description: 'Spike alcista ~cada 500 ticks',  color: '#00d97e', recommendedStrategies: ['TICK_COUNTER', 'ANTI_SPIKE', 'SPIKE'] },
  { symbol: 'BOOM1000',  name: 'Boom 1000', category: 'Boom/Crash', description: 'Spike alcista ~cada 1000 ticks', color: '#00d97e', recommendedStrategies: ['TICK_COUNTER', 'ANTI_SPIKE', 'SPIKE'] },

  // ── CRASH ──
  { symbol: 'CRASH300N', name: 'Crash 300',  category: 'Boom/Crash', description: 'Spike bajista ~cada 300 ticks',  color: '#ff4560', recommendedStrategies: ['TICK_COUNTER', 'ANTI_SPIKE', 'SPIKE'] },
  { symbol: 'CRASH500',  name: 'Crash 500',  category: 'Boom/Crash', description: 'Spike bajista ~cada 500 ticks',  color: '#ff4560', recommendedStrategies: ['TICK_COUNTER', 'ANTI_SPIKE', 'SPIKE'] },
  { symbol: 'CRASH1000', name: 'Crash 1000', category: 'Boom/Crash', description: 'Spike bajista ~cada 1000 ticks', color: '#ff4560', recommendedStrategies: ['TICK_COUNTER', 'ANTI_SPIKE', 'SPIKE'] },

  // ── VOLATILITY ──
  { symbol: 'R_10',     name: 'Volatility 10',    category: 'Volatility', description: '10% volatilidad',  color: '#775dd0', recommendedStrategies: ['RSI', 'MEAN_REVERSION', 'BOLLINGER'] },
  { symbol: 'R_10_1s',  name: 'Volatility 10 (1s)', category: 'Volatility', description: 'Vol 10 tick rápido', color: '#775dd0', recommendedStrategies: ['RSI', 'MEAN_REVERSION'] },
  { symbol: 'R_25',     name: 'Volatility 25',    category: 'Volatility', description: '25% volatilidad',  color: '#775dd0', recommendedStrategies: ['RSI', 'MEAN_REVERSION', 'BOLLINGER'] },
  { symbol: 'R_25_1s',  name: 'Volatility 25 (1s)', category: 'Volatility', description: 'Vol 25 tick rápido', color: '#775dd0', recommendedStrategies: ['RSI', 'BOLLINGER'] },
  { symbol: 'R_50',     name: 'Volatility 50',    category: 'Volatility', description: '50% volatilidad',  color: '#775dd0', recommendedStrategies: ['BOLLINGER', 'MA_CROSS', 'RSI'] },
  { symbol: 'R_50_1s',  name: 'Volatility 50 (1s)', category: 'Volatility', description: 'Vol 50 tick rápido', color: '#775dd0', recommendedStrategies: ['BOLLINGER', 'SPIKE'] },
  { symbol: 'R_75',     name: 'Volatility 75',    category: 'Volatility', description: '75% volatilidad',  color: '#feb019', recommendedStrategies: ['TREND_FOLLOW', 'MA_CROSS', 'MACD'] },
  { symbol: 'R_75_1s',  name: 'Volatility 75 (1s)', category: 'Volatility', description: 'Vol 75 tick rápido', color: '#feb019', recommendedStrategies: ['TREND_FOLLOW', 'SPIKE'] },
  { symbol: 'R_100',    name: 'Volatility 100',   category: 'Volatility', description: '100% volatilidad', color: '#ff6b35', recommendedStrategies: ['TREND_FOLLOW', 'MACD', 'SPIKE'] },
  { symbol: 'R_100_1s', name: 'Volatility 100 (1s)', category: 'Volatility', description: 'Vol 100 tick rápido', color: '#ff6b35', recommendedStrategies: ['TREND_FOLLOW', 'SPIKE'] },

  // ── GOLD & METALS ──
  { symbol: 'frxXAUUSD', name: 'Gold (XAU/USD)', category: 'Metals', description: 'Oro vs Dólar',      color: '#ffd700', recommendedStrategies: ['RSI', 'BOLLINGER', 'MACD', 'MA_CROSS'] },
  { symbol: 'frxXAGUSD', name: 'Silver (XAG/USD)', category: 'Metals', description: 'Plata vs Dólar',  color: '#c0c0c0', recommendedStrategies: ['RSI', 'BOLLINGER', 'MEAN_REVERSION'] },

  // ── JUMP ──
  { symbol: 'JD10',  name: 'Jump 10',  category: 'Jump', description: 'Jump 10% volatilidad',  color: '#00b4d8', recommendedStrategies: ['MEAN_REVERSION', 'RSI', 'ANTI_SPIKE'] },
  { symbol: 'JD25',  name: 'Jump 25',  category: 'Jump', description: 'Jump 25% volatilidad',  color: '#00b4d8', recommendedStrategies: ['MEAN_REVERSION', 'BOLLINGER'] },
  { symbol: 'JD50',  name: 'Jump 50',  category: 'Jump', description: 'Jump 50% volatilidad',  color: '#00b4d8', recommendedStrategies: ['BOLLINGER', 'MA_CROSS'] },
  { symbol: 'JD75',  name: 'Jump 75',  category: 'Jump', description: 'Jump 75% volatilidad',  color: '#00b4d8', recommendedStrategies: ['TREND_FOLLOW', 'MACD'] },
  { symbol: 'JD100', name: 'Jump 100', category: 'Jump', description: 'Jump 100% volatilidad', color: '#00b4d8', recommendedStrategies: ['TREND_FOLLOW', 'SPIKE'] },
];

// Helper: obtener estrategias recomendadas para un símbolo
export function getRecommendedStrategies(symbol: string): string[] {
  const market = SYNTHETIC_MARKETS.find(m => m.symbol === symbol);
  return market?.recommendedStrategies || ['RSI', 'BOLLINGER'];
}

// Helper: categoría del símbolo
export function getMarketCategory(symbol: string): string {
  const market = SYNTHETIC_MARKETS.find(m => m.symbol === symbol);
  return market?.category || 'Unknown';
}
