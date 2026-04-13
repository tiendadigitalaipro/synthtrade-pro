//+------------------------------------------------------------------+
//|  SynthTrade Pro EA v1.0                                          |
//|  A2K Digital Studio — Deriv Synthetic Indices                    |
//|  Strategies: RSI, MA Cross, Bollinger, Tick Counter, Anti-Spike  |
//+------------------------------------------------------------------+
#property copyright "A2K Digital Studio 2024"
#property link      "https://wa.me/584164117331"
#property version   "1.00"
#property description "SynthTrade Pro EA — Automated trading for Deriv Synthetic Indices"
#property description "Strategies: RSI+Stoch, MA Cross+MACD, Bollinger+RSI, Tick Counter, Anti-Spike"
#property description "Contact: wa.me/584164117331 | a2kdigitalstudio2025@gmail.com"
#property strict

#include <Trade\Trade.mqh>
#include <Trade\PositionInfo.mqh>
#include <Trade\AccountInfo.mqh>

//+------------------------------------------------------------------+
//|  ENUMERATIONS                                                     |
//+------------------------------------------------------------------+
enum ENUM_STRATEGY
  {
   STRATEGY_RSI        = 0,   // RSI + Stochastic
   STRATEGY_MA_CROSS   = 1,   // MA Cross + MACD
   STRATEGY_BOLLINGER  = 2,   // Bollinger Bands + RSI
   STRATEGY_TICK_COUNT = 3,   // Tick Counter (Boom/Crash)
   STRATEGY_ANTI_SPIKE = 4    // Anti-Spike (Boom/Crash)
  };

enum ENUM_MARKET_TYPE
  {
   MARKET_VOLATILITY  = 0,
   MARKET_BOOM        = 1,
   MARKET_CRASH       = 2,
   MARKET_STEP        = 3,
   MARKET_METALS      = 4,
   MARKET_UNKNOWN     = 5
  };

//+------------------------------------------------------------------+
//|  INPUT PARAMETERS                                                 |
//+------------------------------------------------------------------+
input string     EA_Name             = "SynthTrade Pro EA";          // EA Name
input string     EA_Version          = "1.0 | A2K Digital Studio";   // EA Version
input ENUM_STRATEGY Strategy         = STRATEGY_RSI;                 // Trading Strategy
input double     LotSize             = 0.01;                         // Lot Size
input double     StakeAmount         = 1.0;                          // Stake Amount (USD)
input int        MagicNumber         = 20240101;                     // Magic Number
input int        ContractDuration    = 5;                            // Contract Duration (ticks)
input bool       UseAutoLot          = false;                        // Use Auto Lot Sizing
input double     RiskPercent         = 1.0;                          // Risk % of Balance (AutoLot)
input bool       UseMartingale       = false;                        // Use Martingale on Loss
input double     MartingaleMultiply  = 2.0;                          // Martingale Multiplier
input int        MaxMartingaleSteps  = 4;                            // Max Martingale Steps
input double     MaxDailyLoss        = 20.0;                         // Max Daily Loss (USD)
input double     DailyProfitTarget   = 50.0;                         // Daily Profit Target (USD)
input int        MaxTradesPerDay     = 30;                           // Max Trades Per Day
input int        StopAfterLosses     = 5;                            // Stop After N Consecutive Losses
input int        RSI_Period          = 14;                           // RSI Period
input int        RSI_BuyLevel        = 30;                           // RSI Buy Level
input int        RSI_SellLevel       = 70;                           // RSI Sell Level
input int        EMA_Fast            = 9;                            // EMA Fast Period
input int        EMA_Slow            = 21;                           // EMA Slow Period
input int        SMA_Signal          = 50;                           // SMA Signal Period
input int        BB_Period           = 20;                           // Bollinger Period
input double     BB_Deviation        = 2.0;                          // Bollinger Deviation
input int        MinSignalScore      = 60;                           // Min Signal Confidence %
input bool       EnableAlerts        = true;                         // Enable Sound Alerts
input bool       EnablePushNotif     = false;                        // Enable Push Notifications
input color      ColorBuy            = clrDodgerBlue;                // Buy Arrow Color
input color      ColorSell           = clrOrangeRed;                 // Sell Arrow Color

//+------------------------------------------------------------------+
//|  SIGNAL STRUCTURE                                                 |
//+------------------------------------------------------------------+
struct TradeSignal
  {
   int    signal;      // 1=BUY, -1=SELL, 0=NONE
   int    confidence;  // 0-100 percent
  };

//+------------------------------------------------------------------+
//|  GLOBAL VARIABLES                                                 |
//+------------------------------------------------------------------+

// Indicator handles
int    h_RSI      = INVALID_HANDLE;
int    h_StochK   = INVALID_HANDLE;
int    h_EMAFast  = INVALID_HANDLE;
int    h_EMASlow  = INVALID_HANDLE;
int    h_SMASignal= INVALID_HANDLE;
int    h_BB       = INVALID_HANDLE;
int    h_MACD     = INVALID_HANDLE;
int    h_RSI_BB   = INVALID_HANDLE;  // RSI reused for Bollinger confirmation

// Trade objects
CTrade         Trade;
CPositionInfo  PosInfo;
CAccountInfo   AccInfo;

// Risk tracking
double   g_DailyStartBalance   = 0.0;
double   g_DailyPnL            = 0.0;
int      g_TradesToday         = 0;
int      g_ConsecLosses        = 0;
datetime g_LastDayReset        = 0;
bool     g_SessionActive       = true;
double   g_CurrentLot          = 0.0;
int      g_MartingaleStep      = 0;
double   g_LastTradeProfit     = 0.0;

// Tick counter (Boom/Crash)
int    g_TicksSinceSpike       = 0;
int    g_ExpectedInterval      = 1000;
double g_PrevClose             = 0.0;
bool   g_SpikeDetected         = false;
datetime g_LastSpikeTime       = 0;
int    g_AntiSpikeWait         = 0;
int    g_LastSignal            = 0;

// Market type
ENUM_MARKET_TYPE g_MarketType  = MARKET_UNKNOWN;
string           g_MarketName  = "";

// Dashboard label prefix
string g_ObjPrefix = "STPEA_";

// Last bar time (to avoid duplicate signals on same bar)
datetime g_LastBarTime = 0;

// Last position ticket for P&L tracking
ulong  g_LastTicket = 0;

//+------------------------------------------------------------------+
//|  EXPERT INITIALIZATION                                            |
//+------------------------------------------------------------------+
int OnInit()
  {
   Print("=== SynthTrade Pro EA v1.0 | A2K Digital Studio ===");
   Print("Symbol: ", Symbol(), " | Strategy: ", EnumToString(Strategy));

   // Detect market type
   g_MarketName = Symbol();
   g_MarketType = GetMarketType();
   Print("Market Type: ", MarketTypeToString(g_MarketType));

   // Set tick interval for Boom/Crash
   SetExpectedInterval();

   // Initialize lot size
   g_CurrentLot = UseAutoLot ? CalculateAutoLot() : LotSize;

   // Initialize daily balance
   g_DailyStartBalance = AccountInfoDouble(ACCOUNT_BALANCE);
   g_LastDayReset      = TimeCurrent();
   g_SessionActive     = true;

   // Initialize indicators
   if(!InitIndicators())
     {
      Print("ERROR: Failed to initialize indicators. EA will not trade.");
      return(INIT_FAILED);
     }

   // Set magic number
   Trade.SetExpertMagicNumber(MagicNumber);
   Trade.SetDeviationInPoints(50);
   Trade.SetTypeFilling(ORDER_FILLING_IOC);

   // Draw dashboard
   DrawDashboard();

   Print("SynthTrade Pro EA initialized successfully.");
   return(INIT_SUCCEEDED);
  }

//+------------------------------------------------------------------+
//|  EXPERT DEINITIALIZATION                                          |
//+------------------------------------------------------------------+
void OnDeinit(const int reason)
  {
   // Release indicator handles
   ReleaseIndicators();

   // Remove dashboard objects
   RemoveDashboard();

   Print("SynthTrade Pro EA stopped. Reason: ", reason);
  }

//+------------------------------------------------------------------+
//|  EXPERT TICK FUNCTION                                             |
//+------------------------------------------------------------------+
void OnTick()
  {
   // Daily reset check
   CheckDailyReset();

   // Update tick counter for Boom/Crash
   UpdateTickCounter();

   // Track last closed position P&L
   TrackClosedTrades();

   // Check if trading is allowed
   if(!g_SessionActive)
     {
      UpdateDashboard(0, 0);
      return;
     }

   // Risk limit checks
   if(!CheckRiskLimits())
     {
      g_SessionActive = false;
      UpdateDashboard(0, 0);
      return;
     }

   // Only process signals on new bar (for non-tick strategies)
   // Tick Counter and Anti-Spike can fire on every tick
   bool isNewBar = IsNewBar();

   TradeSignal sig;
   sig.signal     = 0;
   sig.confidence = 0;

   switch(Strategy)
     {
      case STRATEGY_RSI:
         if(isNewBar) sig = GetRSISignal();
         break;
      case STRATEGY_MA_CROSS:
         if(isNewBar) sig = GetMACrossSignal();
         break;
      case STRATEGY_BOLLINGER:
         if(isNewBar) sig = GetBollingerSignal();
         break;
      case STRATEGY_TICK_COUNT:
         sig = GetTickCounterSignal();
         break;
      case STRATEGY_ANTI_SPIKE:
         sig = GetAntiSpikeSignal();
         break;
      default:
         if(isNewBar) sig = GetRSISignal();
         break;
     }

   // Update dashboard
   UpdateDashboard(sig.signal, sig.confidence);

   // Place trade if signal is strong enough
   if(sig.signal != 0 && sig.confidence >= MinSignalScore)
     {
      // Avoid re-entry on same signal direction if position open
      if(!HasOpenPosition())
        {
         PlaceTrade(sig.signal);
        }
     }
  }

//+------------------------------------------------------------------+
//|  INITIALIZE INDICATORS                                            |
//+------------------------------------------------------------------+
bool InitIndicators()
  {
   string sym = Symbol();
   ENUM_TIMEFRAMES tf = Period();

   // RSI (used in RSI strategy and Bollinger confirmation)
   h_RSI = iRSI(sym, tf, RSI_Period, PRICE_CLOSE);
   if(h_RSI == INVALID_HANDLE)
     {
      Print("ERROR: Cannot create RSI handle");
      return(false);
     }

   // Stochastic (RSI strategy confirmation)
   h_StochK = iStochastic(sym, tf, 5, 3, 3, MODE_SMA, STO_LOWHIGH);
   if(h_StochK == INVALID_HANDLE)
     {
      Print("ERROR: Cannot create Stochastic handle");
      return(false);
     }

   // EMA Fast (MA Cross strategy)
   h_EMAFast = iMA(sym, tf, EMA_Fast, 0, MODE_EMA, PRICE_CLOSE);
   if(h_EMAFast == INVALID_HANDLE)
     {
      Print("ERROR: Cannot create EMA Fast handle");
      return(false);
     }

   // EMA Slow (MA Cross strategy)
   h_EMASlow = iMA(sym, tf, EMA_Slow, 0, MODE_EMA, PRICE_CLOSE);
   if(h_EMASlow == INVALID_HANDLE)
     {
      Print("ERROR: Cannot create EMA Slow handle");
      return(false);
     }

   // SMA Signal (MA Cross strategy)
   h_SMASignal = iMA(sym, tf, SMA_Signal, 0, MODE_SMA, PRICE_CLOSE);
   if(h_SMASignal == INVALID_HANDLE)
     {
      Print("ERROR: Cannot create SMA Signal handle");
      return(false);
     }

   // Bollinger Bands
   h_BB = iBands(sym, tf, BB_Period, 0, BB_Deviation, PRICE_CLOSE);
   if(h_BB == INVALID_HANDLE)
     {
      Print("ERROR: Cannot create Bollinger Bands handle");
      return(false);
     }

   // MACD (MA Cross confirmation)
   h_MACD = iMACD(sym, tf, EMA_Fast, EMA_Slow, 9, PRICE_CLOSE);
   if(h_MACD == INVALID_HANDLE)
     {
      Print("ERROR: Cannot create MACD handle");
      return(false);
     }

   // Reuse RSI handle for Bollinger strategy (same parameters)
   h_RSI_BB = h_RSI;

   Print("All indicators initialized successfully.");
   return(true);
  }

//+------------------------------------------------------------------+
//|  RELEASE INDICATOR HANDLES                                        |
//+------------------------------------------------------------------+
void ReleaseIndicators()
  {
   if(h_RSI      != INVALID_HANDLE) IndicatorRelease(h_RSI);
   if(h_StochK   != INVALID_HANDLE) IndicatorRelease(h_StochK);
   if(h_EMAFast  != INVALID_HANDLE) IndicatorRelease(h_EMAFast);
   if(h_EMASlow  != INVALID_HANDLE) IndicatorRelease(h_EMASlow);
   if(h_SMASignal!= INVALID_HANDLE) IndicatorRelease(h_SMASignal);
   if(h_BB       != INVALID_HANDLE) IndicatorRelease(h_BB);
   if(h_MACD     != INVALID_HANDLE) IndicatorRelease(h_MACD);
   // h_RSI_BB shares handle with h_RSI, no separate release needed
  }

//+------------------------------------------------------------------+
//|  DETECT MARKET TYPE                                               |
//+------------------------------------------------------------------+
ENUM_MARKET_TYPE GetMarketType()
  {
   string s = g_MarketName;
   StringToUpper(s);

   if(StringFind(s, "BOOM")   >= 0) return(MARKET_BOOM);
   if(StringFind(s, "CRASH")  >= 0) return(MARKET_CRASH);
   if(StringFind(s, "STPRNG") >= 0) return(MARKET_STEP);
   if(StringFind(s, "STPINDX")>= 0) return(MARKET_STEP);
   if(StringFind(s, "R_")     >= 0) return(MARKET_VOLATILITY);
   if(StringFind(s, "1HZ")    >= 0) return(MARKET_VOLATILITY);
   if(StringFind(s, "XAUUSD") >= 0) return(MARKET_METALS);
   if(StringFind(s, "XAGUSD") >= 0) return(MARKET_METALS);

   return(MARKET_UNKNOWN);
  }

//+------------------------------------------------------------------+
//|  MARKET TYPE TO STRING                                            |
//+------------------------------------------------------------------+
string MarketTypeToString(ENUM_MARKET_TYPE mtype)
  {
   switch(mtype)
     {
      case MARKET_VOLATILITY: return("VOLATILITY");
      case MARKET_BOOM:       return("BOOM");
      case MARKET_CRASH:      return("CRASH");
      case MARKET_STEP:       return("STEP INDEX");
      case MARKET_METALS:     return("METALS");
      default:                return("UNKNOWN");
     }
  }

//+------------------------------------------------------------------+
//|  SET EXPECTED TICK INTERVAL (Boom/Crash)                          |
//+------------------------------------------------------------------+
void SetExpectedInterval()
  {
   string s = g_MarketName;
   StringToUpper(s);

   g_ExpectedInterval = 1000; // default

   if(StringFind(s, "300")  >= 0) g_ExpectedInterval = 300;
   else if(StringFind(s, "500")  >= 0) g_ExpectedInterval = 500;
   else if(StringFind(s, "1000") >= 0) g_ExpectedInterval = 1000;

   Print("Expected spike interval: ", g_ExpectedInterval, " ticks");
  }

//+------------------------------------------------------------------+
//|  CALCULATE AUTO LOT SIZE                                          |
//+------------------------------------------------------------------+
double CalculateAutoLot()
  {
   double balance   = AccountInfoDouble(ACCOUNT_BALANCE);
   double riskAmt   = balance * (RiskPercent / 100.0);
   double tickVal   = SymbolInfoDouble(Symbol(), SYMBOL_TRADE_TICK_VALUE);
   double tickSz    = SymbolInfoDouble(Symbol(), SYMBOL_TRADE_TICK_SIZE);
   double minLot    = SymbolInfoDouble(Symbol(), SYMBOL_VOLUME_MIN);
   double maxLot    = SymbolInfoDouble(Symbol(), SYMBOL_VOLUME_MAX);
   double lotStep   = SymbolInfoDouble(Symbol(), SYMBOL_VOLUME_STEP);

   if(tickVal <= 0 || tickSz <= 0) return(LotSize);

   double sl_points = 50.0 * SymbolInfoDouble(Symbol(), SYMBOL_POINT);
   double lot = riskAmt / ((sl_points / tickSz) * tickVal);

   lot = MathFloor(lot / lotStep) * lotStep;
   lot = MathMax(minLot, MathMin(maxLot, lot));

   return(lot);
  }

//+------------------------------------------------------------------+
//|  CHECK DAILY RESET                                                |
//+------------------------------------------------------------------+
void CheckDailyReset()
  {
   MqlDateTime dt_now, dt_last;
   TimeToStruct(TimeCurrent(), dt_now);
   TimeToStruct(g_LastDayReset, dt_last);

   if(dt_now.day != dt_last.day || dt_now.mon != dt_last.mon)
     {
      Print("Daily reset triggered. Previous PnL: ", g_DailyPnL);
      g_DailyStartBalance = AccountInfoDouble(ACCOUNT_BALANCE);
      g_DailyPnL          = 0.0;
      g_TradesToday       = 0;
      g_ConsecLosses      = 0;
      g_SessionActive     = true;
      g_MartingaleStep    = 0;
      g_CurrentLot        = UseAutoLot ? CalculateAutoLot() : LotSize;
      g_LastDayReset      = TimeCurrent();
      Print("Daily counters reset. New balance baseline: ", g_DailyStartBalance);
     }
  }

//+------------------------------------------------------------------+
//|  CHECK RISK LIMITS                                                |
//+------------------------------------------------------------------+
bool CheckRiskLimits()
  {
   // Update daily PnL
   double balance = AccountInfoDouble(ACCOUNT_BALANCE);
   g_DailyPnL = balance - g_DailyStartBalance;

   // Max daily loss
   if(g_DailyPnL <= -MathAbs(MaxDailyLoss))
     {
      Print("RISK LIMIT: Max daily loss reached (", g_DailyPnL, " USD). Trading stopped.");
      SendAlert("Max daily loss reached. EA paused.");
      return(false);
     }

   // Daily profit target
   if(DailyProfitTarget > 0 && g_DailyPnL >= DailyProfitTarget)
     {
      Print("PROFIT TARGET: Daily target reached (", g_DailyPnL, " USD). Trading stopped.");
      SendAlert("Daily profit target reached. EA paused.");
      return(false);
     }

   // Max trades per day
   if(g_TradesToday >= MaxTradesPerDay)
     {
      Print("RISK LIMIT: Max trades per day reached (", g_TradesToday, "). Trading stopped.");
      return(false);
     }

   // Consecutive losses
   if(StopAfterLosses > 0 && g_ConsecLosses >= StopAfterLosses)
     {
      Print("RISK LIMIT: ", StopAfterLosses, " consecutive losses. Trading stopped.");
      SendAlert("Consecutive loss limit hit. EA paused.");
      return(false);
     }

   return(true);
  }

//+------------------------------------------------------------------+
//|  TRACK CLOSED TRADES FOR P&L                                      |
//+------------------------------------------------------------------+
void TrackClosedTrades()
  {
   // Scan history for any new closed deal with our magic
   HistorySelect(iTime(Symbol(), PERIOD_D1, 0), TimeCurrent());
   int deals = HistoryDealsTotal();

   for(int i = deals - 1; i >= 0; i--)
     {
      ulong ticket = HistoryDealGetTicket(i);
      if(ticket == 0) continue;
      if(HistoryDealGetInteger(ticket, DEAL_MAGIC) != MagicNumber) continue;
      if(HistoryDealGetInteger(ticket, DEAL_ENTRY) != DEAL_ENTRY_OUT) continue;
      if(ticket == g_LastTicket) break;

      g_LastTicket = ticket;
      double profit = HistoryDealGetDouble(ticket, DEAL_PROFIT)
                    + HistoryDealGetDouble(ticket, DEAL_SWAP)
                    + HistoryDealGetDouble(ticket, DEAL_COMMISSION);

      if(profit < 0)
        {
         g_ConsecLosses++;
         // Martingale logic
         if(UseMartingale && g_MartingaleStep < MaxMartingaleSteps)
           {
            g_MartingaleStep++;
            g_CurrentLot = (UseAutoLot ? CalculateAutoLot() : LotSize)
                           * MathPow(MartingaleMultiply, g_MartingaleStep);
            double maxLot = SymbolInfoDouble(Symbol(), SYMBOL_VOLUME_MAX);
            g_CurrentLot = MathMin(g_CurrentLot, maxLot);
            Print("Martingale step ", g_MartingaleStep, ": new lot = ", g_CurrentLot);
           }
        }
      else
        {
         g_ConsecLosses   = 0;
         g_MartingaleStep = 0;
         g_CurrentLot     = UseAutoLot ? CalculateAutoLot() : LotSize;
        }

      Print("Trade closed. Profit: ", profit, " | Consec losses: ", g_ConsecLosses);
      break;
     }
  }

//+------------------------------------------------------------------+
//|  UPDATE TICK COUNTER (Boom/Crash spike detection)                 |
//+------------------------------------------------------------------+
void UpdateTickCounter()
  {
   if(g_MarketType != MARKET_BOOM && g_MarketType != MARKET_CRASH) return;

   double close0 = iClose(Symbol(), PERIOD_CURRENT, 0);

   if(g_PrevClose <= 0.0)
     {
      g_PrevClose = close0;
      return;
     }

   // Check for spike: price move > 2.5% in one tick
   double changePct = MathAbs(close0 - g_PrevClose) / g_PrevClose;
   if(changePct > 0.025)
     {
      g_SpikeDetected   = true;
      g_TicksSinceSpike = 0;
      g_LastSpikeTime   = TimeCurrent();
      g_AntiSpikeWait   = 0;

      // Determine direction of spike
      if(close0 < g_PrevClose)
        g_LastSignal = (g_MarketType == MARKET_BOOM) ? 1 : 0;  // Boom down spike → BUY
      else
        g_LastSignal = (g_MarketType == MARKET_CRASH) ? -1 : 0; // Crash up spike → SELL

      Print("SPIKE detected! Change: ", DoubleToString(changePct * 100, 2), "% | Direction stored: ", g_LastSignal);
     }
   else
     {
      g_TicksSinceSpike++;
      if(g_SpikeDetected) g_AntiSpikeWait++;
     }

   g_PrevClose = close0;
  }

//+------------------------------------------------------------------+
//|  CHECK IF NEW BAR                                                 |
//+------------------------------------------------------------------+
bool IsNewBar()
  {
   datetime barTime = iTime(Symbol(), Period(), 0);
   if(barTime != g_LastBarTime)
     {
      g_LastBarTime = barTime;
      return(true);
     }
   return(false);
  }

//+------------------------------------------------------------------+
//|  CHECK IF POSITION IS OPEN (this EA's magic)                      |
//+------------------------------------------------------------------+
bool HasOpenPosition()
  {
   for(int i = PositionsTotal() - 1; i >= 0; i--)
     {
      if(PosInfo.SelectByIndex(i))
        {
         if(PosInfo.Symbol() == Symbol() && PosInfo.Magic() == MagicNumber)
            return(true);
        }
     }
   return(false);
  }

//+------------------------------------------------------------------+
//|  STRATEGY 1: RSI + STOCHASTIC                                     |
//+------------------------------------------------------------------+
TradeSignal GetRSISignal()
  {
   TradeSignal result;
   result.signal     = 0;
   result.confidence = 0;

   if(h_RSI == INVALID_HANDLE || h_StochK == INVALID_HANDLE)
      return(result);

   double rsi_buf[3];
   double stoch_k[3];
   double stoch_d[3];

   if(CopyBuffer(h_RSI,    0, 0, 3, rsi_buf)  < 3) return(result);
   if(CopyBuffer(h_StochK, 0, 0, 3, stoch_k)  < 3) return(result);
   if(CopyBuffer(h_StochK, 1, 0, 3, stoch_d)  < 3) return(result);

   double rsi1  = rsi_buf[1];
   double rsi2  = rsi_buf[2];
   double stk1  = stoch_k[1];
   double std1  = stoch_d[1];

   // BUY: RSI crosses below buy level + Stochastic confirms oversold
   if(rsi1 < RSI_BuyLevel && stk1 < 20)
     {
      result.signal = 1;
      int conf = 60;
      if(rsi2 >= RSI_BuyLevel) conf += 15;  // RSI just crossed
      if(stk1 < std1)          conf += 10;  // Stoch K below D (still falling, caution)
      else                     conf += 15;  // K above D (momentum turning)
      if(rsi1 < 25)            conf += 10;  // Deeper oversold
      result.confidence = MathMin(conf, 100);
      return(result);
     }

   // SELL: RSI crosses above sell level + Stochastic confirms overbought
   if(rsi1 > RSI_SellLevel && stk1 > 80)
     {
      result.signal = -1;
      int conf = 60;
      if(rsi2 <= RSI_SellLevel) conf += 15;
      if(stk1 > std1)           conf += 15;
      else                      conf += 10;
      if(rsi1 > 75)             conf += 10;
      result.confidence = MathMin(conf, 100);
      return(result);
     }

   return(result);
  }

//+------------------------------------------------------------------+
//|  STRATEGY 2: MA CROSS + MACD                                      |
//+------------------------------------------------------------------+
TradeSignal GetMACrossSignal()
  {
   TradeSignal result;
   result.signal     = 0;
   result.confidence = 0;

   if(h_EMAFast == INVALID_HANDLE || h_EMASlow == INVALID_HANDLE ||
      h_SMASignal == INVALID_HANDLE || h_MACD == INVALID_HANDLE)
      return(result);

   double ema_fast[3], ema_slow[3], sma_sig[3];
   double macd_main[3], macd_hist[3];

   if(CopyBuffer(h_EMAFast,  0, 0, 3, ema_fast)  < 3) return(result);
   if(CopyBuffer(h_EMASlow,  0, 0, 3, ema_slow)  < 3) return(result);
   if(CopyBuffer(h_SMASignal,0, 0, 3, sma_sig)   < 3) return(result);
   if(CopyBuffer(h_MACD,     0, 0, 3, macd_main) < 3) return(result);
   if(CopyBuffer(h_MACD,     1, 0, 3, macd_hist) < 3) return(result);

   double price = iClose(Symbol(), Period(), 1);

   bool fastAboveSlow_now  = ema_fast[1] > ema_slow[1];
   bool fastAboveSlow_prev = ema_fast[2] > ema_slow[2];
   bool priceAboveSig      = price > sma_sig[1];
   bool macdBull           = macd_hist[1] > 0 || macd_hist[1] > macd_hist[2];

   // BUY: fast crosses above slow AND price above signal AND MACD bullish
   if(fastAboveSlow_now && !fastAboveSlow_prev && priceAboveSig)
     {
      result.signal = 1;
      int conf = 65;
      if(macdBull)                      conf += 20;
      if(macd_hist[1] > macd_hist[2])   conf += 10;
      if(ema_fast[1] - ema_slow[1] > ema_fast[2] - ema_slow[2]) conf += 5;
      result.confidence = MathMin(conf, 100);
      return(result);
     }

   // SELL: fast crosses below slow AND price below signal AND MACD bearish
   bool fastBelowSlow_now  = ema_fast[1] < ema_slow[1];
   bool fastBelowSlow_prev = ema_fast[2] < ema_slow[2];
   bool priceBelowSig      = price < sma_sig[1];
   bool macdBear           = macd_hist[1] < 0 || macd_hist[1] < macd_hist[2];

   if(fastBelowSlow_now && !fastBelowSlow_prev && priceBelowSig)
     {
      result.signal = -1;
      int conf = 65;
      if(macdBear)                      conf += 20;
      if(macd_hist[1] < macd_hist[2])   conf += 10;
      if(ema_slow[1] - ema_fast[1] > ema_slow[2] - ema_fast[2]) conf += 5;
      result.confidence = MathMin(conf, 100);
      return(result);
     }

   return(result);
  }

//+------------------------------------------------------------------+
//|  STRATEGY 3: BOLLINGER BANDS + RSI                                |
//+------------------------------------------------------------------+
TradeSignal GetBollingerSignal()
  {
   TradeSignal result;
   result.signal     = 0;
   result.confidence = 0;

   if(h_BB == INVALID_HANDLE || h_RSI_BB == INVALID_HANDLE)
      return(result);

   double bb_upper[3], bb_lower[3], bb_mid[3];
   double rsi_buf[3];

   if(CopyBuffer(h_BB,     1, 0, 3, bb_upper) < 3) return(result);
   if(CopyBuffer(h_BB,     2, 0, 3, bb_lower) < 3) return(result);
   if(CopyBuffer(h_BB,     0, 0, 3, bb_mid)   < 3) return(result);
   if(CopyBuffer(h_RSI_BB, 0, 0, 3, rsi_buf)  < 3) return(result);

   double price_high1 = iHigh (Symbol(), Period(), 1);
   double price_low1  = iLow  (Symbol(), Period(), 1);
   double price_close1= iClose(Symbol(), Period(), 1);
   double price_close2= iClose(Symbol(), Period(), 2);
   double rsi1        = rsi_buf[1];

   // BUY: price touches/pierces lower band AND RSI < 40
   bool touchesLower = price_low1 <= bb_lower[1];
   bool rsiOversold  = rsi1 < 40;

   if(touchesLower && rsiOversold)
     {
      result.signal = 1;
      int conf = 60;
      if(rsi1 < 30)               conf += 15;
      if(price_close1 > bb_lower[1]) conf += 10;  // Candle closed back above lower band
      if(price_close1 > price_close2) conf += 10;
      if(rsi1 < rsi_buf[2])        conf += 5;     // RSI still declining (early entry warning)
      else                         conf += 10;    // RSI turning up
      result.confidence = MathMin(conf, 100);
      return(result);
     }

   // SELL: price touches/pierces upper band AND RSI > 60
   bool touchesUpper = price_high1 >= bb_upper[1];
   bool rsiOverbought= rsi1 > 60;

   if(touchesUpper && rsiOverbought)
     {
      result.signal = -1;
      int conf = 60;
      if(rsi1 > 70)                conf += 15;
      if(price_close1 < bb_upper[1]) conf += 10;
      if(price_close1 < price_close2) conf += 10;
      if(rsi1 > rsi_buf[2])         conf += 5;
      else                          conf += 10;
      result.confidence = MathMin(conf, 100);
      return(result);
     }

   return(result);
  }

//+------------------------------------------------------------------+
//|  STRATEGY 4: TICK COUNTER (Boom/Crash)                            |
//+------------------------------------------------------------------+
TradeSignal GetTickCounterSignal()
  {
   TradeSignal result;
   result.signal     = 0;
   result.confidence = 0;

   if(g_MarketType != MARKET_BOOM && g_MarketType != MARKET_CRASH)
      return(result);

   double threshold70 = g_ExpectedInterval * 0.70;
   double threshold85 = g_ExpectedInterval * 0.85;

   if(g_TicksSinceSpike >= threshold70 && g_TicksSinceSpike <= threshold85)
     {
      if(g_MarketType == MARKET_BOOM)
        {
         result.signal = 1; // BUY — expect upward spike soon
        }
      else // MARKET_CRASH
        {
         result.signal = -1; // SELL — expect downward spike soon
        }

      // Confidence scales with proximity to expected interval
      double pct = (double)g_TicksSinceSpike / (double)g_ExpectedInterval;
      int conf = (int)(50.0 + pct * 40.0); // 50% at 70% ticks, up to 90% at full interval
      result.confidence = MathMin(conf, 90);
     }

   return(result);
  }

//+------------------------------------------------------------------+
//|  STRATEGY 5: ANTI-SPIKE (Boom/Crash)                              |
//+------------------------------------------------------------------+
TradeSignal GetAntiSpikeSignal()
  {
   TradeSignal result;
   result.signal     = 0;
   result.confidence = 0;

   if(g_MarketType != MARKET_BOOM && g_MarketType != MARKET_CRASH)
      return(result);

   // Wait 2-3 ticks after spike before entering
   if(!g_SpikeDetected || g_AntiSpikeWait < 2 || g_AntiSpikeWait > 8)
      return(result);

   if(g_LastSignal == 1) // Boom spike down → enter BUY (mean reversion)
     {
      result.signal     = 1;
      result.confidence = 75 + MathMin(g_AntiSpikeWait * 3, 15);
     }
   else if(g_LastSignal == -1) // Crash spike up → enter SELL
     {
      result.signal     = -1;
      result.confidence = 75 + MathMin(g_AntiSpikeWait * 3, 15);
     }

   return(result);
  }

//+------------------------------------------------------------------+
//|  PLACE TRADE                                                      |
//+------------------------------------------------------------------+
void PlaceTrade(int direction)
  {
   string sym     = Symbol();
   double lot     = g_CurrentLot;
   double ask     = SymbolInfoDouble(sym, SYMBOL_ASK);
   double bid     = SymbolInfoDouble(sym, SYMBOL_BID);
   double point   = SymbolInfoDouble(sym, SYMBOL_POINT);
   int    digits  = (int)SymbolInfoInteger(sym, SYMBOL_DIGITS);

   // Validate lot
   double minLot  = SymbolInfoDouble(sym, SYMBOL_VOLUME_MIN);
   double maxLot  = SymbolInfoDouble(sym, SYMBOL_VOLUME_MAX);
   double lotStep = SymbolInfoDouble(sym, SYMBOL_VOLUME_STEP);
   lot = MathMax(minLot, MathMin(maxLot, MathFloor(lot / lotStep) * lotStep));

   ENUM_ORDER_TYPE orderType = (direction == 1) ? ORDER_TYPE_BUY : ORDER_TYPE_SELL;
   double          price     = (direction == 1) ? ask : bid;
   string          comment   = EA_Name + " | " + EnumToString(Strategy) + " | Magic:" + IntegerToString(MagicNumber);

   Print("Placing trade: ", (direction == 1 ? "BUY" : "SELL"),
         " | Lot: ", lot, " | Price: ", DoubleToString(price, digits),
         " | Strategy: ", EnumToString(Strategy));

   bool result = Trade.PositionOpen(sym, orderType, lot, price, 0, 0, comment);

   if(result)
     {
      g_TradesToday++;
      Print("Trade placed successfully. Ticket: ", Trade.ResultOrder(),
            " | Trades today: ", g_TradesToday);

      // Draw arrow on chart
      DrawTradeArrow(direction, price);

      // Alerts
      if(EnableAlerts)
        {
         Alert(EA_Name, ": ", (direction == 1 ? "BUY" : "SELL"), " @ ", DoubleToString(price, digits));
        }
      if(EnablePushNotif)
        {
         SendNotification(EA_Name + ": " + (direction == 1 ? "BUY" : "SELL") + " @ " + DoubleToString(price, digits));
        }

      // Reset anti-spike flag after trading
      if(Strategy == STRATEGY_ANTI_SPIKE)
        {
         g_SpikeDetected = false;
         g_AntiSpikeWait = 0;
         g_LastSignal    = 0;
        }
      // Reset tick counter after trading
      if(Strategy == STRATEGY_TICK_COUNT)
        {
         g_TicksSinceSpike = 0;
        }
     }
   else
     {
      int err = Trade.ResultRetcode();
      Print("ERROR placing trade: ", err, " — ", Trade.ResultRetcodeDescription());
     }
  }

//+------------------------------------------------------------------+
//|  SEND ALERT HELPER                                                |
//+------------------------------------------------------------------+
void SendAlert(string msg)
  {
   if(EnableAlerts)    Alert(EA_Name, ": ", msg);
   if(EnablePushNotif) SendNotification(EA_Name + ": " + msg);
   Print(EA_Name, " ALERT: ", msg);
  }

//+------------------------------------------------------------------+
//|  DRAW TRADE ARROW ON CHART                                        |
//+------------------------------------------------------------------+
void DrawTradeArrow(int direction, double price)
  {
   string name = g_ObjPrefix + "Arrow_" + IntegerToString(TimeCurrent());
   ENUM_OBJECT arrowType = (direction == 1) ? OBJ_ARROW_UP : OBJ_ARROW_DOWN;
   color  arrowColor     = (direction == 1) ? ColorBuy : ColorSell;

   ObjectCreate(0, name, arrowType, 0, TimeCurrent(), price);
   ObjectSetInteger(0, name, OBJPROP_COLOR,     arrowColor);
   ObjectSetInteger(0, name, OBJPROP_WIDTH,     2);
   ObjectSetInteger(0, name, OBJPROP_ARROWCODE, (direction == 1) ? 233 : 234);
   ObjectSetInteger(0, name, OBJPROP_ANCHOR,    (direction == 1) ? ANCHOR_TOP : ANCHOR_BOTTOM);
  }

//+------------------------------------------------------------------+
//|  DASHBOARD — DRAW (initial creation)                              |
//+------------------------------------------------------------------+
void DrawDashboard()
  {
   // Background panel
   string bg = g_ObjPrefix + "BG";
   ObjectCreate(0, bg, OBJ_RECTANGLE_LABEL, 0, 0, 0);
   ObjectSetInteger(0, bg, OBJPROP_XDISTANCE,   10);
   ObjectSetInteger(0, bg, OBJPROP_YDISTANCE,   30);
   ObjectSetInteger(0, bg, OBJPROP_XSIZE,       240);
   ObjectSetInteger(0, bg, OBJPROP_YSIZE,       230);
   ObjectSetInteger(0, bg, OBJPROP_BGCOLOR,     C'20,20,35');
   ObjectSetInteger(0, bg, OBJPROP_BORDER_TYPE, BORDER_FLAT);
   ObjectSetInteger(0, bg, OBJPROP_COLOR,       C'60,120,220');
   ObjectSetInteger(0, bg, OBJPROP_WIDTH,       1);
   ObjectSetInteger(0, bg, OBJPROP_CORNER,      CORNER_LEFT_UPPER);
   ObjectSetInteger(0, bg, OBJPROP_BACK,        false);
   ObjectSetInteger(0, bg, OBJPROP_SELECTABLE,  false);

   // Create all text labels (UpdateDashboard will fill them)
   string labels[] = {"Title","Sub","Strategy","Signal","Confidence","PnL","Trades","ConsecLoss","Status","Market"};
   int    y_pos[]  = {38, 54, 75, 95, 115, 135, 155, 175, 195, 215};

   for(int i = 0; i < ArraySize(labels); i++)
     {
      string lname = g_ObjPrefix + labels[i];
      ObjectCreate(0, lname, OBJ_LABEL, 0, 0, 0);
      ObjectSetInteger(0, lname, OBJPROP_XDISTANCE,  18);
      ObjectSetInteger(0, lname, OBJPROP_YDISTANCE,  y_pos[i]);
      ObjectSetInteger(0, lname, OBJPROP_CORNER,     CORNER_LEFT_UPPER);
      ObjectSetInteger(0, lname, OBJPROP_FONTSIZE,   8);
      ObjectSetString (0, lname, OBJPROP_FONT,       "Consolas");
      ObjectSetInteger(0, lname, OBJPROP_COLOR,      clrWhite);
      ObjectSetInteger(0, lname, OBJPROP_SELECTABLE, false);
      ObjectSetInteger(0, lname, OBJPROP_BACK,       false);
     }

   // Static content
   ObjectSetString(0, g_ObjPrefix + "Title",    OBJPROP_TEXT, "  SynthTrade Pro EA v1.0");
   ObjectSetString(0, g_ObjPrefix + "Sub",      OBJPROP_TEXT, "  A2K Digital Studio");
   ObjectSetInteger(0, g_ObjPrefix + "Title",   OBJPROP_COLOR, C'80,160,255');
   ObjectSetInteger(0, g_ObjPrefix + "Sub",     OBJPROP_COLOR, C'140,140,180');

   UpdateDashboard(0, 0);
   ChartRedraw(0);
  }

//+------------------------------------------------------------------+
//|  DASHBOARD — UPDATE                                               |
//+------------------------------------------------------------------+
void UpdateDashboard(int signal, int confidence)
  {
   string stratName  = EnumToString(Strategy);
   string signalStr  = (signal == 1) ? "BUY" : (signal == -1) ? "SELL" : "WAIT";
   color  signalClr  = (signal == 1) ? ColorBuy : (signal == -1) ? ColorSell : clrGray;
   string sessionStr = g_SessionActive ? "ACTIVE" : "PAUSED";
   color  sessionClr = g_SessionActive ? clrLimeGreen : clrOrangeRed;
   double balance    = AccountInfoDouble(ACCOUNT_BALANCE);
   g_DailyPnL        = balance - g_DailyStartBalance;
   color  pnlClr     = (g_DailyPnL >= 0) ? clrLimeGreen : clrOrangeRed;

   ObjectSetString (0, g_ObjPrefix + "Strategy",   OBJPROP_TEXT,  "  Strategy : " + stratName);
   ObjectSetString (0, g_ObjPrefix + "Signal",     OBJPROP_TEXT,  "  Signal   : " + signalStr);
   ObjectSetInteger(0, g_ObjPrefix + "Signal",     OBJPROP_COLOR, signalClr);
   ObjectSetString (0, g_ObjPrefix + "Confidence", OBJPROP_TEXT,  "  Conf     : " + IntegerToString(confidence) + "%");
   ObjectSetString (0, g_ObjPrefix + "PnL",        OBJPROP_TEXT,  "  Daily PnL: " + DoubleToString(g_DailyPnL, 2) + " USD");
   ObjectSetInteger(0, g_ObjPrefix + "PnL",        OBJPROP_COLOR, pnlClr);
   ObjectSetString (0, g_ObjPrefix + "Trades",     OBJPROP_TEXT,  "  Trades   : " + IntegerToString(g_TradesToday) + "/" + IntegerToString(MaxTradesPerDay));
   ObjectSetString (0, g_ObjPrefix + "ConsecLoss", OBJPROP_TEXT,  "  ConsecLoss: " + IntegerToString(g_ConsecLosses) + "/" + IntegerToString(StopAfterLosses));
   ObjectSetString (0, g_ObjPrefix + "Status",     OBJPROP_TEXT,  "  Session  : " + sessionStr);
   ObjectSetInteger(0, g_ObjPrefix + "Status",     OBJPROP_COLOR, sessionClr);
   ObjectSetString (0, g_ObjPrefix + "Market",     OBJPROP_TEXT,  "  Market   : " + MarketTypeToString(g_MarketType));

   ChartRedraw(0);
  }

//+------------------------------------------------------------------+
//|  REMOVE ALL DASHBOARD OBJECTS                                     |
//+------------------------------------------------------------------+
void RemoveDashboard()
  {
   ObjectsDeleteAll(0, g_ObjPrefix);
  }

//+------------------------------------------------------------------+
//|  ON TRADE TRANSACTION (for real-time P&L tracking)               |
//+------------------------------------------------------------------+
void OnTradeTransaction(const MqlTradeTransaction& trans,
                        const MqlTradeRequest&     request,
                        const MqlTradeResult&      result)
  {
   if(trans.type == TRADE_TRANSACTION_DEAL_ADD)
     {
      if(HistoryDealSelect(trans.deal))
        {
         if(HistoryDealGetInteger(trans.deal, DEAL_MAGIC)  == MagicNumber &&
            HistoryDealGetInteger(trans.deal, DEAL_ENTRY)  == DEAL_ENTRY_OUT)
           {
            double profit = HistoryDealGetDouble(trans.deal, DEAL_PROFIT)
                          + HistoryDealGetDouble(trans.deal, DEAL_SWAP)
                          + HistoryDealGetDouble(trans.deal, DEAL_COMMISSION);
            g_LastTradeProfit = profit;
            Print("Deal closed via transaction. Profit: ", profit);
           }
        }
     }
  }

//+------------------------------------------------------------------+
//|  UTILITY: Safe CopyBuffer wrapper                                 |
//+------------------------------------------------------------------+
bool SafeCopyBuffer(int handle, int bufIdx, int start, int count, double &buf[])
  {
   if(handle == INVALID_HANDLE) return(false);
   return(CopyBuffer(handle, bufIdx, start, count, buf) >= count);
  }

//+------------------------------------------------------------------+
//| END OF FILE                                                       |
//+------------------------------------------------------------------+
