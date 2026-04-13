import { create } from 'zustand';
import { getDerivAPI, type Tick, type ActiveSymbol } from './deriv-api';
import { generateCompositeSignal, calculateATR, type StrategySignal, SYNTHETIC_MARKETS } from './strategies';

export interface TradeRecord {
  id?: string;
  symbol: string;
  contractType: 'CALL' | 'PUT';
  entryTime: string;
  exitTime?: string;
  entryPrice: number;
  exitPrice?: number;
  profit: number;
  strategy: string;
  status: 'OPEN' | 'WON' | 'LOST' | 'SOLD';
  amount: number;
  payout: number;
  contractId?: number;
}

export interface LogEntry {
  id: string;
  timestamp: Date;
  type: 'info' | 'success' | 'warning' | 'error' | 'trade';
  message: string;
}

interface RiskSettings {
  maxDailyLoss: number;
  dailyProfitTarget: number;
  maxTradesPerSession: number;
  stopAfterConsecutiveLosses: number;
  useMartingale: boolean;
  martingaleMultiplier: number;
  martingaleMaxSteps: number;
  minSignalConfidence: number;
  riskPerTradePercent: number;   // Max % of balance per trade (1-2%)
  useAtrSizing: boolean;         // Enable ATR-based position sizing
}

const defaultRiskSettings: RiskSettings = {
  maxDailyLoss: 20,
  dailyProfitTarget: 50,
  maxTradesPerSession: 30,
  stopAfterConsecutiveLosses: 5,
  useMartingale: false,
  martingaleMultiplier: 2.0,
  martingaleMaxSteps: 4,
  minSignalConfidence: 60,
  riskPerTradePercent: 1.5,
  useAtrSizing: true,
};

interface TradingState {
  // Connection
  isConnected: boolean;
  isAuthorized: boolean;
  isConnecting: boolean;
  apiToken: string;
  appId: string;
  connectionError: string | null;

  // Account
  balance: number;
  currency: string;
  loginId: string;
  isVirtual: boolean;
  accountList: any;

  // Market
  currentSymbol: string;
  currentPrice: number;
  ticks: Tick[];
  tickHistory: Tick[];
  previousPrice: number;
  priceDirection: 'up' | 'down' | 'neutral';

  // Trading
  isAutoTrading: boolean;
  selectedStrategies: string[];
  baseTradeAmount: number;
  tradeAmount: number;
  contractDuration: number;
  contractDurationUnit: string;
  currentProposal: { id: string; askPrice: number; payout: number } | null;

  // Risk Management
  riskSettings: RiskSettings;
  sessionProfit: number;
  sessionTrades: number;
  consecutiveLosses: number;
  martingaleStep: number;
  sessionStartTime: Date | null;
  isSessionPaused: boolean;
  pauseReason: string;

  // Records
  openTrades: TradeRecord[];
  tradeHistory: TradeRecord[];
  totalProfit: number;
  totalTrades: number;
  winCount: number;
  lossCount: number;
  currentStreak: number;
  streakType: 'win' | 'loss' | 'none';

  // Strategy signals
  lastSignal: StrategySignal | null;
  signalHistory: StrategySignal[];

  // Activity log
  logs: LogEntry[];
  maxLogs: number;

  // Auto-trade config
  autoTradeCooldown: boolean;
  minTicksBetweenTrades: number;
  maxConcurrentTrades: number;
  signalCooldown: boolean;

  // Notifications
  soundEnabled: boolean;
  notificationEnabled: boolean;

  // Available markets from API
  availableSymbols: ActiveSymbol[];
  supportedMarkets: typeof SYNTHETIC_MARKETS;

  // Actions
  connect: (token?: string, appId?: string) => Promise<void>;
  disconnect: () => void;
  subscribeToMarket: (symbol: string) => Promise<void>;
  setTradeAmount: (amount: number) => void;
  setContractDuration: (duration: number, unit: string) => void;
  toggleAutoTrading: () => void;
  toggleStrategy: (strategyId: string) => void;
  selectAllStrategies: () => void;
  clearStrategies: () => void;
  placeTrade: (type: 'CALL' | 'PUT') => Promise<void>;
  addLog: (type: LogEntry['type'], message: string) => void;
  clearLogs: () => void;
  updateTradeRecord: (contractId: number, updates: Partial<TradeRecord>) => void;
  loadTradeHistory: () => Promise<void>;
  processAutoTrade: () => void;
  updateRiskSettings: (settings: Partial<RiskSettings>) => void;
  resetSession: () => void;
  toggleSound: () => void;
  toggleNotifications: () => void;
  playSound: (type: 'trade' | 'win' | 'loss' | 'alert') => void;
  sendNotification: (title: string, body: string) => void;
}

let tickCounter = 0;
let signalCooldownTimer: ReturnType<typeof setTimeout> | null = null;

export const useTradingStore = create<TradingState>((set, get) => ({
  // Connection
  isConnected: false,
  isAuthorized: false,
  isConnecting: false,
  apiToken: '',
  appId: '1089',
  connectionError: null,

  // Account
  balance: 0,
  currency: 'USD',
  loginId: '',
  isVirtual: true,
  accountList: null,

  // Market
  currentSymbol: 'R_10',
  currentPrice: 0,
  ticks: [],
  tickHistory: [],
  previousPrice: 0,
  priceDirection: 'neutral',

  // Trading
  isAutoTrading: false,
  selectedStrategies: ['RSI'],
  baseTradeAmount: 1,
  tradeAmount: 1,
  contractDuration: 5,
  contractDurationUnit: 't',
  currentProposal: null,

  // Risk Management
  riskSettings: { ...defaultRiskSettings },
  sessionProfit: 0,
  sessionTrades: 0,
  consecutiveLosses: 0,
  martingaleStep: 0,
  sessionStartTime: null,
  isSessionPaused: false,
  pauseReason: '',

  // Records
  openTrades: [],
  tradeHistory: [],
  totalProfit: 0,
  totalTrades: 0,
  winCount: 0,
  lossCount: 0,
  currentStreak: 0,
  streakType: 'none',

  // Strategy signals
  lastSignal: null,
  signalHistory: [],

  // Activity log
  logs: [],
  maxLogs: 300,

  // Auto-trade config
  autoTradeCooldown: false,
  minTicksBetweenTrades: 10,
  maxConcurrentTrades: 3,
  signalCooldown: false,

  // Notifications
  soundEnabled: true,
  notificationEnabled: false,

  // Available markets from API
  availableSymbols: [],
  supportedMarkets: SYNTHETIC_MARKETS,

  // Actions
  connect: async (token?: string, appId?: string) => {
    const api = getDerivAPI();
    // Clean token: strip all whitespace, invisible chars, and quotes
    const rawToken = get().apiToken || token || '';
    const stateToken = rawToken.replace(/[\s\u200B\u200C\u200D\uFEFF'"]/g, '');

    if (!stateToken) {
      set({ connectionError: 'API token is required' });
      return;
    }

    // Basic format validation — Deriv tokens are 15 alphanumeric chars
    if (stateToken.length < 10 || stateToken.length > 64) {
      set({ connectionError: `Invalid token length (${stateToken.length} chars). Deriv tokens are usually 15 characters. Create a new token at app.deriv.com/account/api-token` });
      return;
    }

    const effectiveAppId = appId || get().appId || '1089';
    set({ isConnecting: true, connectionError: null, apiToken: stateToken, appId: effectiveAppId });
    get().addLog('info', `Connecting to Deriv (app_id: ${effectiveAppId})...`);

    try {
      await api.connect(effectiveAppId);
      set({ isConnected: true, isConnecting: false });
      get().addLog('success', 'Connected to Deriv WebSocket server');
      get().playSound('trade');

      // Authorize
      const auth = await api.authorize(stateToken);
      set({
        isAuthorized: true,
        balance: auth.authorize.balance,
        currency: auth.authorize.currency,
        loginId: auth.authorize.loginid,
        isVirtual: auth.authorize.is_virtual === 1 || auth.authorize.is_virtual === true,
        accountList: auth.authorize.account_list || null,
      });
      get().addLog('success', `Authorized: ${auth.authorize.fullname} (${auth.authorize.loginid})`);
      get().addLog('info', `Account Type: ${auth.authorize.is_virtual ? 'DEMO (Virtual)' : 'REAL'} | Currency: ${auth.authorize.currency}`);

      // Subscribe to balance updates
      try {
        const balResponse = await api.getBalance();
        if (balResponse.balance) {
          set({ balance: balResponse.balance.balance, currency: balResponse.balance.currency });
        }
      } catch (e) {
        // Balance subscription might fail, that's ok
      }

      // Fetch available markets for this account
      try {
        const activeSymbols = await api.getActiveSymbols('basic');
        set({ availableSymbols: activeSymbols });

        // Filter supported markets to only show those available for trading
        const availableSymbolMap = new Map(activeSymbols.map((s: ActiveSymbol) => [s.symbol, s]));
        const filteredMarkets = SYNTHETIC_MARKETS.filter((m) => {
          const active = availableSymbolMap.get(m.symbol);
          if (!active) return false;
          // Check if CALL contract is supported
          const hasCallPut = active.contract_types?.includes('CALL') || active.contract_types?.includes('RISE');
          return hasCallPut && !active.is_trading_suspended;
        });

        set({ supportedMarkets: filteredMarkets.length > 0 ? filteredMarkets : SYNTHETIC_MARKETS });

        if (filteredMarkets.length > 0) {
          get().addLog('success', `Available markets: ${filteredMarkets.map((m) => m.name).join(', ')}`);
        } else {
          get().addLog('warning', 'No synthetic markets with CALL/PUT found. Showing all markets - some may not be tradeable.');
        }
      } catch (e) {
        // If active_symbols fails, keep showing all markets
        get().addLog('warning', 'Could not verify available markets. All markets shown.');
      }

      // Subscribe to open contracts
      api.subscribeToOpenContracts((data: any) => {
        if (data.proposal_open_contract) {
          const poc = data.proposal_open_contract;

          if (poc.is_sold || poc.status === 'sold') {
            const profit = poc.profit;
            const won = profit > 0;

            get().addLog(
              won ? 'success' : 'warning',
              `Contract #${poc.contract_id} closed: ${won ? 'WON' : 'LOST'} ${profit >= 0 ? '+' : ''}$${profit.toFixed(2)}`
            );

            if (won) {
              get().playSound('win');
              get().sendNotification('Trade Won! ✅', `+$${profit.toFixed(2)} on ${poc.symbol}`);
            } else {
              get().playSound('loss');
              get().sendNotification('Trade Lost ❌', `-$${Math.abs(profit).toFixed(2)} on ${poc.symbol}`);
            }

            get().updateTradeRecord(poc.contract_id, {
              exitPrice: poc.current_spot,
              profit: profit,
              status: won ? 'WON' : 'LOST',
              exitTime: new Date().toISOString(),
            });
          }
        }
      });

      // Subscribe to current market
      await get().subscribeToMarket(get().currentSymbol);
    } catch (error: any) {
      // Translate Deriv error codes to friendly messages
      let errMsg = error.message || 'Connection failed';
      if (errMsg.includes('Input validation failed') || errMsg.includes('authorize')) {
        errMsg = '❌ Token inválido. Asegúrate de: 1) Crear el token en app.deriv.com/account/api-token  2) Activar permisos: Read + Trade + Payments + Admin  3) Copiar el token completo sin espacios';
      } else if (errMsg.includes('InvalidToken') || errMsg.includes('invalid token')) {
        errMsg = '❌ Token expirado o inválido. Crea un nuevo token en Deriv.';
      } else if (errMsg.includes('RateLimit')) {
        errMsg = '⏳ Demasiados intentos. Espera 1 minuto e intenta de nuevo.';
      } else if (errMsg.includes('timeout') || errMsg.includes('Timeout')) {
        errMsg = '⏱️ Tiempo agotado. Verifica tu conexión a internet e intenta de nuevo.';
      }
      set({
        isConnecting: false,
        isConnected: false,
        connectionError: errMsg,
      });
      get().addLog('error', `Connection failed: ${error.message}`);
      get().playSound('alert');
    }
  },

  disconnect: () => {
    const api = getDerivAPI();
    api.unsubscribeFromTicks(get().currentSymbol);
    api.unsubscribeFromOpenContracts();
    api.disconnect();
    set({
      isConnected: false,
      isAuthorized: false,
      isAutoTrading: false,
      balance: 0,
      currency: 'USD',
      loginId: '',
      accountList: null,
      currentPrice: 0,
      ticks: [],
      tickHistory: [],
      currentProposal: null,
      connectionError: null,
      isSessionPaused: false,
      pauseReason: '',
    });
    get().addLog('info', 'Disconnected from Deriv');
  },

  subscribeToMarket: async (symbol: string) => {
    const api = getDerivAPI();
    const oldSymbol = get().currentSymbol;

    if (oldSymbol && oldSymbol !== symbol) {
      api.unsubscribeFromTicks(oldSymbol);
    }

    set({ currentSymbol: symbol, ticks: [], tickHistory: [], currentPrice: 0 });
    const market = SYNTHETIC_MARKETS.find((m) => m.symbol === symbol);
    get().addLog('info', `Subscribing to ${market?.name || symbol}...`);

    try {
      const historyTicks = await api.subscribeToTicks(symbol, (data: any) => {
        if (data.tick) {
          const tick: Tick = {
            epoch: data.tick.epoch,
            quote: data.tick.quote,
            symbol: data.tick.symbol,
            id: data.tick.id,
          };

          set((state) => {
            const newTicks = [...state.ticks.slice(-200), tick];
            const newHistory = [...state.tickHistory.slice(-1000), tick];
            const direction = state.currentPrice > 0
              ? tick.quote > state.currentPrice ? 'up' : tick.quote < state.currentPrice ? 'down' : 'neutral'
              : 'neutral';

            tickCounter++;

            return {
              ticks: newTicks,
              tickHistory: newHistory,
              currentPrice: tick.quote,
              previousPrice: state.currentPrice,
              priceDirection: direction,
            };
          });

          // Auto-trading logic - run every 5 ticks for performance
          if (get().isAutoTrading && !get().autoTradeCooldown && tickCounter % 5 === 0) {
            get().processAutoTrade();
          }
        }
      });

      set({ tickHistory: historyTicks });
      if (historyTicks.length > 0) {
        set({
          currentPrice: historyTicks[historyTicks.length - 1].quote,
          previousPrice: historyTicks.length > 1 ? historyTicks[historyTicks.length - 2].quote : historyTicks[historyTicks.length - 1].quote,
        });
      }
      get().addLog('success', `Subscribed to ${market?.name || symbol}. Loaded ${historyTicks.length} historical ticks.`);
    } catch (error: any) {
      get().addLog('error', `Failed to subscribe to ${symbol}: ${error.message}`);
    }
  },

  setTradeAmount: (amount: number) => set({ baseTradeAmount: amount, tradeAmount: amount }),
  setContractDuration: (duration: number, unit: string) => set({ contractDuration: duration, contractDurationUnit: unit }),

  toggleAutoTrading: () => {
    const state = get();
    set((s) => {
      const newState = !s.isAutoTrading;
      if (newState) {
        get().addLog('warning', '🤖 Auto-trading ENABLED. The bot will now execute trades based on selected strategies.');
        get().playSound('trade');
        return {
          isAutoTrading: newState,
          sessionStartTime: s.sessionStartTime || new Date(),
          sessionProfit: 0,
          sessionTrades: 0,
          consecutiveLosses: 0,
          martingaleStep: 0,
          isSessionPaused: false,
          pauseReason: '',
          tradeAmount: s.baseTradeAmount,
        };
      } else {
        get().addLog('info', '🛑 Auto-trading DISABLED.');
        return { isAutoTrading: newState, signalCooldown: false };
      }
    });
  },

  toggleStrategy: (strategyId: string) => {
    set((state) => {
      const selected = state.selectedStrategies.includes(strategyId)
        ? state.selectedStrategies.filter((s) => s !== strategyId)
        : [...state.selectedStrategies, strategyId];
      return { selectedStrategies: selected };
    });
  },

  selectAllStrategies: () => {
    set({ selectedStrategies: ['RSI', 'MA_CROSS', 'BOLLINGER', 'SPIKE', 'TICK_COUNTER', 'ANTI_SPIKE', 'MEAN_REVERSION', 'MACD', 'TREND_FOLLOW'] });
  },

  clearStrategies: () => {
    set({ selectedStrategies: [] });
  },

  placeTrade: async (type: 'CALL' | 'PUT') => {
    const api = getDerivAPI();
    const state = get();

    if (!state.isConnected || !state.isAuthorized) {
      get().addLog('error', 'Not connected. Please connect with your API token first.');
      return;
    }

    if (state.isSessionPaused) {
      get().addLog('warning', `Session paused: ${state.pauseReason}`);
      return;
    }

    if (state.openTrades.length >= state.maxConcurrentTrades) {
      get().addLog('warning', `Max concurrent trades (${state.maxConcurrentTrades}) reached.`);
      return;
    }

    const effectiveAmount = state.tradeAmount;
    if (effectiveAmount <= 0 || effectiveAmount > state.balance) {
      get().addLog('error', `Invalid trade amount ($${effectiveAmount.toFixed(2)}). Balance: $${state.balance.toFixed(2)}`);
      return;
    }

    get().addLog('info', `Requesting ${type} contract for ${state.currentSymbol} @ $${effectiveAmount.toFixed(2)}...`);

    // Check if the current symbol is available for trading
    const activeSymbol = state.availableSymbols.find((s: ActiveSymbol) => s.symbol === state.currentSymbol);
    if (activeSymbol && !activeSymbol.contract_types?.includes(type) && !activeSymbol.contract_types?.includes('RISE') && !activeSymbol.contract_types?.includes('FALL')) {
      get().addLog('error', `${state.currentSymbol} does not support ${type} contracts. Try a different market (e.g., Volatility 10 or Volatility 75).`);
      get().playSound('alert');
      return;
    }

    try {
      const proposal = await api.getProposal({
        contract_type: type,
        symbol: state.currentSymbol,
        amount: effectiveAmount,
        duration: state.contractDuration,
        duration_unit: state.contractDurationUnit,
        basis: 'stake',
        currency: state.currency,
      });

      if (proposal.proposal) {
        set({ currentProposal: { id: proposal.proposal.id, askPrice: proposal.proposal.ask_price, payout: proposal.proposal.payout } });
        get().addLog('info', `Proposal received. Cost: $${proposal.proposal.ask_price.toFixed(2)}, Payout: $${proposal.proposal.payout.toFixed(2)}`);

        const buyResult = await api.buy(proposal.proposal.id, proposal.proposal.ask_price);

        if (buyResult.buy) {
          const newTrade: TradeRecord = {
            symbol: state.currentSymbol,
            contractType: type,
            entryTime: new Date().toISOString(),
            entryPrice: state.currentPrice,
            profit: 0,
            strategy: state.selectedStrategies.join('+') || 'Manual',
            status: 'OPEN',
            amount: buyResult.buy.buy_price,
            payout: buyResult.buy.payout,
            contractId: buyResult.buy.contract_id,
          };

          set((s) => ({
            openTrades: [...s.openTrades, newTrade],
            balance: buyResult.buy.balance_after,
            currentProposal: null,
            sessionTrades: s.sessionTrades + 1,
          }));

          get().addLog('trade', `✅ ${type} BOUGHT | #${buyResult.buy.contract_id} | ${state.currentSymbol} | Stake: $${buyResult.buy.buy_price.toFixed(2)} | Payout: $${buyResult.buy.payout.toFixed(2)}`);
          get().playSound('trade');
          get().sendNotification(`${type} Trade Opened`, `$${buyResult.buy.buy_price.toFixed(2)} on ${state.currentSymbol}`);

          // Save trade to database
          try {
            await fetch('/api/trades', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(newTrade),
            });
          } catch (dbError) {
            console.error('Failed to save trade to database:', dbError);
          }

          // Set cooldown
          set({ autoTradeCooldown: true, signalCooldown: true });
          setTimeout(() => set({ autoTradeCooldown: false }), state.minTicksBetweenTrades * 500);
          if (signalCooldownTimer) clearTimeout(signalCooldownTimer);
          signalCooldownTimer = setTimeout(() => set({ signalCooldown: false }), 15000);
        }
      }
    } catch (error: any) {
      get().addLog('error', `Trade failed: ${error.message}`);
      set({ currentProposal: null });
      get().playSound('alert');
    }
  },

  processAutoTrade: () => {
    const state = get();
    if (!state.isAutoTrading || state.selectedStrategies.length === 0) return;
    if (state.tickHistory.length < 50) return;
    if (state.openTrades.length >= state.maxConcurrentTrades) return;
    if (state.signalCooldown) return;

    // ─── Risk Management Checks ─────────────────────────────────
    const risk = state.riskSettings;

    // Check daily loss limit
    if (state.sessionProfit < -risk.maxDailyLoss) {
      if (!state.isSessionPaused) {
        set({ isSessionPaused: true, pauseReason: `Daily loss limit reached (-$${risk.maxDailyLoss})` });
        get().addLog('error', `🛑 STOP: Daily loss limit reached! Session profit: $${state.sessionProfit.toFixed(2)}`);
        get().playSound('alert');
        get().sendNotification('Trading Paused ⚠️', `Daily loss limit of -$${risk.maxDailyLoss} reached.`);
      }
      return;
    }

    // Check daily profit target
    if (state.sessionProfit >= risk.dailyProfitTarget) {
      if (!state.isSessionPaused) {
        set({ isSessionPaused: true, pauseReason: `Daily profit target reached (+$${risk.dailyProfitTarget})` });
        get().addLog('success', `🎯 TARGET HIT: Daily profit target of +$${risk.dailyProfitTarget} reached! Session stopped.`);
        get().playSound('win');
        get().sendNotification('Target Reached! 🎯', `Session profit target of +$${risk.dailyProfitTarget} hit!`);
      }
      return;
    }

    // Check max trades per session
    if (state.sessionTrades >= risk.maxTradesPerSession) {
      if (!state.isSessionPaused) {
        set({ isSessionPaused: true, pauseReason: `Max trades per session (${risk.maxTradesPerSession}) reached` });
        get().addLog('warning', `🛑 STOP: Max trades per session (${risk.maxTradesPerSession}) reached.`);
        get().playSound('alert');
      }
      return;
    }

    // Check consecutive losses
    if (state.consecutiveLosses >= risk.stopAfterConsecutiveLosses) {
      if (!state.isSessionPaused) {
        set({ isSessionPaused: true, pauseReason: `${risk.stopAfterConsecutiveLosses} consecutive losses` });
        get().addLog('error', `🛑 STOP: ${risk.stopAfterConsecutiveLosses} consecutive losses! Session paused to prevent further damage.`);
        get().playSound('alert');
        get().sendNotification('Trading Paused', `${risk.stopAfterConsecutiveLosses} consecutive losses detected.`);
      }
      return;
    }

    // ─── Max Risk Per Trade (1-2% of balance) ───────────────────
    const maxStakeByRisk = state.balance * (risk.riskPerTradePercent / 100);
    const baseStake = Math.min(state.baseTradeAmount, maxStakeByRisk);
    if (baseStake < state.baseTradeAmount) {
      get().addLog('info', `⚖️ Stake capped at $${baseStake.toFixed(2)} (${risk.riskPerTradePercent}% of $${state.balance.toFixed(2)} balance)`);
    }

    // ─── ATR-Based Dynamic Position Sizing ──────────────────────
    let atrMultiplier = 1.0;
    if (risk.useAtrSizing && state.tickHistory.length >= 20) {
      const atr = calculateATR(state.tickHistory, 14);
      const atrRatio = state.currentPrice > 0 ? atr / state.currentPrice : 0;
      if (atrRatio > 0.02) {
        atrMultiplier = 0.5;
        get().addLog('info', `📉 ATR High (${(atrRatio*100).toFixed(2)}%): Stake reduced 50% for safety`);
      } else if (atrRatio > 0.01) {
        atrMultiplier = 0.75;
        get().addLog('info', `📊 ATR Medium (${(atrRatio*100).toFixed(2)}%): Stake reduced 25%`);
      }
    }
    const adjustedBaseStake = baseStake * atrMultiplier;

    // ─── Signal Analysis ────────────────────────────────────────
    const signal = generateCompositeSignal(state.tickHistory, state.selectedStrategies, state.currentSymbol);
    set({ lastSignal: signal });

    set((s) => ({
      signalHistory: [...s.signalHistory.slice(-30), signal],
    }));

    // ─── Execute Trade if Signal Strong Enough ──────────────────
    if (signal.type && signal.confidence >= risk.minSignalConfidence) {
      get().addLog('trade', `📊 Signal: ${signal.type} (${signal.confidence}% confidence) — ${signal.reason}`);

      // Calculate martingale amount if enabled
      if (risk.useMartingale && state.consecutiveLosses > 0) {
        const step = Math.min(state.consecutiveLosses, risk.martingaleMaxSteps);
        const martingaleAmount = adjustedBaseStake * Math.pow(risk.martingaleMultiplier, step);
        const maxAmount = state.balance * 0.1; // Never risk more than 10% of balance
        const clampedAmount = Math.min(martingaleAmount, maxAmount);

        if (clampedAmount > state.balance) {
          get().addLog('warning', `Martingale amount ($${clampedAmount.toFixed(2)}) exceeds balance. Skipping.`);
          return;
        }

        set({ tradeAmount: clampedAmount, martingaleStep: step });
        get().addLog('info', `📈 Martingale Step ${step}: Amount adjusted to $${clampedAmount.toFixed(2)} (base $${state.baseTradeAmount} × ${risk.martingaleMultiplier}^${step})`);
      }

      // Apply adjusted stake if not using martingale
      if (!risk.useMartingale || state.consecutiveLosses === 0) {
        set({ tradeAmount: adjustedBaseStake });
      }

      get().placeTrade(signal.type);
    }
  },

  updateRiskSettings: (settings: Partial<RiskSettings>) => {
    set((state) => ({
      riskSettings: { ...state.riskSettings, ...settings },
    }));
    get().addLog('info', `Risk settings updated.`);
  },

  resetSession: () => {
    set({
      sessionProfit: 0,
      sessionTrades: 0,
      consecutiveLosses: 0,
      martingaleStep: 0,
      sessionStartTime: new Date(),
      isSessionPaused: false,
      pauseReason: '',
      tradeAmount: get().baseTradeAmount,
    });
    get().addLog('info', '🔄 Session reset. Starting fresh.');
  },

  toggleSound: () => set((s) => ({ soundEnabled: !s.soundEnabled })),
  toggleNotifications: async () => {
    const state = get();
    if (!state.notificationEnabled) {
      if (typeof window !== 'undefined' && 'Notification' in window) {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          set({ notificationEnabled: true });
          get().addLog('success', 'Browser notifications enabled.');
        } else {
          get().addLog('warning', 'Notification permission denied.');
        }
      } else {
        get().addLog('warning', 'Browser notifications not supported.');
      }
    } else {
      set({ notificationEnabled: false });
      get().addLog('info', 'Browser notifications disabled.');
    }
  },

  playSound: (type: 'trade' | 'win' | 'loss' | 'alert') => {
    if (!get().soundEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      gainNode.gain.value = 0.08;

      switch (type) {
        case 'trade':
          oscillator.frequency.value = 800;
          oscillator.type = 'sine';
          gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.15);
          oscillator.start(audioCtx.currentTime);
          oscillator.stop(audioCtx.currentTime + 0.15);
          break;
        case 'win':
          oscillator.frequency.value = 523;
          oscillator.type = 'sine';
          oscillator.frequency.exponentialRampToValueAtTime(784, audioCtx.currentTime + 0.15);
          gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);
          oscillator.start(audioCtx.currentTime);
          oscillator.stop(audioCtx.currentTime + 0.3);
          break;
        case 'loss':
          oscillator.frequency.value = 400;
          oscillator.type = 'sawtooth';
          oscillator.frequency.exponentialRampToValueAtTime(200, audioCtx.currentTime + 0.25);
          gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);
          oscillator.start(audioCtx.currentTime);
          oscillator.stop(audioCtx.currentTime + 0.3);
          break;
        case 'alert':
          oscillator.frequency.value = 300;
          oscillator.type = 'square';
          gainNode.gain.value = 0.05;
          gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.4);
          oscillator.start(audioCtx.currentTime);
          oscillator.stop(audioCtx.currentTime + 0.4);
          break;
      }
    } catch (e) {
      // Audio not supported
    }
  },

  sendNotification: (title: string, body: string) => {
    if (!get().notificationEnabled) return;
    try {
      if (typeof window !== 'undefined' && 'Notification' in window && window.Notification.permission === 'granted') {
        new window.Notification(title, {
          body,
          icon: '/logo.svg',
          badge: '/logo.svg',
          tag: 'synthtrade',
        });
      }
    } catch (e) {
      // Notifications not supported
    }
  },

  addLog: (type, message) => {
    const entry: LogEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      timestamp: new Date(),
      type,
      message,
    };
    set((state) => ({
      logs: [...state.logs.slice(-(state.maxLogs - 1)), entry],
    }));
  },

  clearLogs: () => set({ logs: [] }),

  updateTradeRecord: (contractId: number, updates: Partial<TradeRecord>) => {
    set((state) => {
      const openIdx = state.openTrades.findIndex((t) => t.contractId === contractId);
      if (openIdx !== -1) {
        const updatedOpen = [...state.openTrades];
        updatedOpen[openIdx] = { ...updatedOpen[openIdx], ...updates };

        const remaining = updates.status && updates.status !== 'OPEN'
          ? updatedOpen.filter((t) => t.contractId !== contractId)
          : updatedOpen;

        let newHistory = state.tradeHistory;
        if (updates.status && updates.status !== 'OPEN') {
          newHistory = [{ ...updatedOpen[openIdx], ...updates } as TradeRecord, ...state.tradeHistory];
        }

        const allClosed = newHistory.filter((t) => t.status === 'WON' || t.status === 'LOST');
        const wins = allClosed.filter((t) => t.status === 'WON').length;
        const losses = allClosed.filter((t) => t.status === 'LOST').length;
        const totalProfit = allClosed.reduce((s, t) => s + (t.profit || 0), 0);

        // Calculate streak and consecutive losses
        let streak = 0;
        let streakType: 'win' | 'loss' | 'none' = 'none';
        let consecutiveLossCount = 0;

        for (let i = 0; i < allClosed.length; i++) {
          if (i === 0) {
            streak = 1;
            streakType = allClosed[i].status === 'WON' ? 'win' : 'loss';
            if (allClosed[i].status === 'LOST') consecutiveLossCount = 1;
          } else if (allClosed[i].status === allClosed[i - 1].status) {
            streak++;
          } else {
            break;
          }
        }

        // Recalculate consecutive losses from the end (most recent)
        if (allClosed.length > 0) {
          consecutiveLossCount = 0;
          for (let i = 0; i < allClosed.length; i++) {
            if (allClosed[i].status === 'LOST') {
              consecutiveLossCount++;
            } else {
              break;
            }
          }
        }

        // Track session profit
        const tradeProfit = updates.profit || 0;
        const newSessionProfit = state.sessionProfit + (updates.status === 'WON' || updates.status === 'LOST' ? tradeProfit : 0);

        // Update consecutive losses for martingale
        const newConsecutiveLosses = (updates.status === 'LOST')
          ? state.consecutiveLosses + 1
          : (updates.status === 'WON' ? 0 : state.consecutiveLosses);

        // Reset trade amount on win, keep martingale on loss
        const newTradeAmount = updates.status === 'WON'
          ? state.baseTradeAmount
          : state.tradeAmount;

        const newMartingaleStep = updates.status === 'WON' ? 0 : state.martingaleStep;

        return {
          openTrades: remaining,
          tradeHistory: newHistory.slice(0, 100),
          totalProfit,
          totalTrades: allClosed.length,
          winCount: wins,
          lossCount: losses,
          currentStreak: streak,
          streakType,
          sessionProfit: newSessionProfit,
          consecutiveLosses: newConsecutiveLosses,
          martingaleStep: newMartingaleStep,
          tradeAmount: newTradeAmount,
        };
      }

      return state;
    });
  },

  loadTradeHistory: async () => {
    try {
      const response = await fetch('/api/trades?limit=100');
      const trades = await response.json();

      const closedTrades = trades.filter((t: TradeRecord) => t.status === 'WON' || t.status === 'LOST');
      const wins = closedTrades.filter((t: TradeRecord) => t.status === 'WON').length;
      const losses = closedTrades.filter((t: TradeRecord) => t.status === 'LOST').length;
      const totalProfit = closedTrades.reduce((s: number, t: TradeRecord) => s + (t.profit || 0), 0);

      set({
        tradeHistory: trades,
        openTrades: trades.filter((t: TradeRecord) => t.status === 'OPEN'),
        totalTrades: closedTrades.length,
        winCount: wins,
        lossCount: losses,
        totalProfit,
      });
    } catch (error) {
      console.error('Failed to load trade history:', error);
    }
  },
}));
