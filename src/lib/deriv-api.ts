// Deriv WebSocket API Client - Client-side library
// Connects directly to Deriv's WebSocket API from the browser

export interface Tick {
  epoch: number;
  quote: number;
  symbol: string;
  id?: string;
}

export interface AuthorizeResponse {
  authorize: {
    loginid: string;
    balance: number;
    currency: string;
    email: string;
    fullname: string;
    is_virtual: number;
    country: string;
    user_id: number;
  };
}

export interface BalanceResponse {
  balance: {
    balance: number;
    currency: string;
    loginid: string;
  };
}

export interface ProposalResponse {
  proposal: {
    id: string;
    ask_price: number;
    display_value: string;
    payout: number;
    spot: number;
    spot_time: number;
  };
}

export interface BuyResponse {
  buy: {
    balance_after: number;
    buy_price: number;
    contract_id: number;
    longcode: string;
    payout: number;
    purchase_time: number;
    shortcode: string;
    start_time: number;
    transaction_id: number;
  };
}

export interface SellResponse {
  sell: {
    balance_after: number;
    buy_price: number;
    contract_id: number;
    payout: number;
    sell_price: number;
    transaction_id: number;
    profit: number;
  };
}

export interface TickHistoryResponse {
  history: {
    prices: number[];
    times: number[];
  };
}

export interface ProposalOpenContractResponse {
  proposal_open_contract: {
    contract_id: number;
    buy_price: number;
    current_spot: number;
    current_spot_time: number;
    profit: number;
    payout: number;
    contract_type: string;
    longcode: string;
    purchase_time: number;
    status: string;
    symbol: string;
  };
}

export interface ProfitTableResponse {
  profit_table: {
    trades: Array<{
      buy_price: number;
      contract_id: number;
      contract_type: string;
      longcode: string;
      payout: number;
      profit: number;
      purchase_time: number;
      sell_price: number;
      sell_time: number;
      shortcode: string;
      symbol: string;
      transaction_id: number;
    }>;
  };
}

export interface ActiveSymbol {
  symbol: string;
  display_name: string;
  subcategory: string;
  exchange_is_open: number;
  is_trading_suspended: number;
  contract_types: string[];
  minimum_stake: string;
  market_display_name: string;
  submarket_display_name: string;
}

type MessageHandler = (data: any) => void;
type PendingRequest = { resolve: (value: any) => void; reject: (reason: any) => void; timer: ReturnType<typeof setTimeout> };

class DerivAPI {
  private ws: WebSocket | null = null;
  private token: string | null = null;
  private reqIdCounter = 1;
  private pendingRequests: Map<number, PendingRequest> = new Map();
  private subscriptionHandlers: Map<string, Set<MessageHandler>> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private isConnecting = false;
  public onReconnectWarning: ((msg: string) => void) | null = null;

  connect(appId: string = '1089'): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.isConnecting) {
        reject(new Error('Connection already in progress'));
        return;
      }
      if (this.ws?.readyState === WebSocket.OPEN) {
        resolve();
        return;
      }

      this.isConnecting = true;
      // Endpoint oficial segun developers.deriv.com/docs/options/websocket/
      // (ws.derivws.com, sin subdominios green/blue — eso no existe en la doc actual)
      const wsAppId = /[^0-9]/.test(appId) ? '1089' : appId;
      const url = `wss://ws.derivws.com/websockets/v3?app_id=${wsAppId}&l=EN&brand=deriv`;

      try {
        this.ws = new WebSocket(url);
      } catch (err) {
        reject(new Error('Failed to create WebSocket connection'));
        return;
      }

      const connectionTimer = setTimeout(() => {
        this.isConnecting = false;
        // FIX: cerrar el socket huérfano — antes quedaba abierto y podía
        // disparar onopen DESPUÉS del reject, dejando la UI en estado inconsistente.
        if (this.ws && this.ws.readyState !== WebSocket.OPEN) {
          this.ws.onopen = null;
          this.ws.onclose = null;
          try { this.ws.close(); } catch { /* noop */ }
          this.ws = null;
        }
        reject(new Error('Connection timeout'));
      }, 15000);

      this.ws.onopen = () => {
        clearTimeout(connectionTimer);
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        resolve();
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleMessage(data);
        } catch (e) {
          console.error('Failed to parse WebSocket message:', e);
        }
      };

      this.ws.onerror = (event) => {
        clearTimeout(connectionTimer);
        this.isConnecting = false;
        reject(new Error('WebSocket connection error'));
      };

      this.ws.onclose = () => {
        this.isConnecting = false;
        this.cleanupPendingRequests();
        if (this.token && this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnectAttempts++;
          const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 15000);
          if (this.reconnectAttempts === 3) {
            this.onReconnectWarning?.(`Reconnect attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}. Check your internet connection.`);
          }
          this.reconnectTimer = setTimeout(() => {
            if (this.token) {
              this.connect(appId).then(() => {
                this.authorize(this.token!).catch(console.error);
              }).catch(() => {
                if (this.reconnectAttempts >= this.maxReconnectAttempts) {
                  this.onReconnectWarning?.('Max reconnect attempts reached. Please reconnect manually.');
                  this.token = null;
                }
              });
            }
          }, delay);
        }
      };
    });
  }

  private handleMessage(data: any) {
    // Handle request responses
    if (data.req_id && this.pendingRequests.has(data.req_id)) {
      const pending = this.pendingRequests.get(data.req_id)!;
      clearTimeout(pending.timer);
      this.pendingRequests.delete(data.req_id);

      if (data.error) {
        const err = new Error(data.error.message || 'API Error') as Error & { code?: string };
        err.code = data.error.code;
        pending.reject(err);
      } else {
        pending.resolve(data);
      }
      return;
    }

    // Handle subscription messages (tick, proposal_open_contract, etc.)
    if (data.msg_type === 'tick') {
      this.emitSubscription('tick', data);
    } else if (data.msg_type === 'proposal_open_contract') {
      this.emitSubscription('proposal_open_contract', data);
    } else if (data.msg_type === 'transaction') {
      this.emitSubscription('transaction', data);
    } else if (data.msg_type === 'balance') {
      // FIX: las actualizaciones de balance (subscribe:1) no se emitían —
      // el saldo en pantalla quedaba congelado tras el primer valor.
      this.emitSubscription('balance', data);
    }
  }

  private emitSubscription(type: string, data: any) {
    const handlers = this.subscriptionHandlers.get(type);
    if (handlers) {
      handlers.forEach((handler) => handler(data));
    }
  }

  private sendRequest(data: any, timeout = 30000): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        reject(new Error('WebSocket not connected'));
        return;
      }

      const reqId = this.reqIdCounter++;
      const req = { ...data, req_id: reqId };

      const timer = setTimeout(() => {
        this.pendingRequests.delete(reqId);
        reject(new Error('Request timeout'));
      }, timeout);

      this.pendingRequests.set(reqId, { resolve, reject, timer });
      this.ws.send(JSON.stringify(req));
    });
  }

  private cleanupPendingRequests() {
    this.pendingRequests.forEach((pending) => {
      clearTimeout(pending.timer);
      pending.reject(new Error('Connection closed'));
    });
    this.pendingRequests.clear();
  }

  async authorize(token: string): Promise<AuthorizeResponse> {
    // FIX: guardar el token SOLO si Deriv lo acepta. Antes se guardaba antes
    // de la petición, y si el token era inválido el auto-reconnect entraba en
    // bucle reenviando el token malo (InvalidToken repetido + RateLimit).
    const response = await this.sendRequest({
      authorize: token,
    });
    this.token = token;
    return response as AuthorizeResponse;
  }

  async getBalance(): Promise<BalanceResponse> {
    const response = await this.sendRequest({ balance: 1, subscribe: 1 });
    // The first response is the initial balance, but subscribe gives us ongoing updates
    return response as BalanceResponse;
  }

  // Registra un callback para las actualizaciones de balance en tiempo real
  onBalanceUpdate(callback: MessageHandler) {
    if (!this.subscriptionHandlers.has('balance')) {
      this.subscriptionHandlers.set('balance', new Set());
    }
    this.subscriptionHandlers.get('balance')!.add(callback);
  }

  async subscribeToTicks(symbol: string, callback: MessageHandler): Promise<Tick[]> {
    // First, get tick history
    let historyTicks: Tick[] = [];
    try {
      const historyResponse = await this.getTickHistory(symbol, 500);
      historyTicks = historyResponse;
    } catch (e) {
      console.error('Failed to get tick history:', e);
    }

    // Subscribe to real-time ticks
    if (!this.subscriptionHandlers.has('tick')) {
      this.subscriptionHandlers.set('tick', new Set());
    }
    this.subscriptionHandlers.get('tick')!.add(callback);

    await this.sendRequest({ ticks: symbol, subscribe: 1 });

    return historyTicks;
  }

  unsubscribeFromTicks(symbol: string) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ forget_all: 'ticks' }));
    }
    this.subscriptionHandlers.delete('tick');
  }

  offSubscription(type: string, callback: MessageHandler) {
    const handlers = this.subscriptionHandlers.get(type);
    if (handlers) {
      handlers.delete(callback);
      if (handlers.size === 0) {
        this.subscriptionHandlers.delete(type);
      }
    }
  }

  async getTickHistory(symbol: string, count: number = 500, end?: number, style?: string): Promise<Tick[]> {
    const params: Record<string, unknown> = {
      ticks_history: symbol,
      count: Math.min(count, 5000),
      end: end || 'latest',
      style: style || 'ticks',
    };

    const response = await this.sendRequest(params) as TickHistoryResponse;

    if (!response.history || !response.history.prices) return [];

    return response.history.prices.map((price, i) => ({
      epoch: response.history.times[i],
      quote: price,
      symbol,
    }));
  }

  async getProposal(params: {
    contract_type: string;
    symbol: string;
    amount: number;
    duration: number;
    duration_unit: string;
    basis?: string;
    currency?: string;
  }): Promise<ProposalResponse> {
    // NOTA: NO incluir product_type aquí — Deriv lo rechaza en el proposal
    const response = await this.sendRequest({
      proposal: 1,
      ...params,
    });
    return response as ProposalResponse;
  }

  // Obtiene los contratos válidos para un símbolo específico
  async getContractsFor(symbol: string): Promise<any> {
    const response = await this.sendRequest({
      contracts_for: symbol,
      currency: 'USD',
      landing_company: 'svg',
      product_type: 'basic',
    });
    return response;
  }

  async getActiveSymbols(productType: string = 'basic'): Promise<ActiveSymbol[]> {
    const response = await this.sendRequest({
      active_symbols: 'full',  // 'brief' no devuelve contract_types — necesitamos 'full'
      product_type: productType,
    });
    return (response.active_symbols || []) as ActiveSymbol[];
  }

  async buy(contractId: string, price: number): Promise<BuyResponse> {
    const response = await this.sendRequest({
      buy: contractId,
      price,
    });
    return response as BuyResponse;
  }

  async sell(contractId: number, price?: number): Promise<SellResponse> {
    const params: Record<string, unknown> = { sell: contractId };
    if (price) params.price = price;
    const response = await this.sendRequest(params);
    return response as SellResponse;
  }

  async subscribeToOpenContracts(callback: MessageHandler): Promise<void> {
    if (!this.subscriptionHandlers.has('proposal_open_contract')) {
      this.subscriptionHandlers.set('proposal_open_contract', new Set());
    }
    this.subscriptionHandlers.get('proposal_open_contract')!.add(callback);

    try {
      await this.sendRequest({ proposal_open_contract: 1, subscribe: 1 });
    } catch (e) {
      console.error('Failed to subscribe to open contracts:', e);
    }
  }

  unsubscribeFromBalance() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ forget_all: 'balance' }));
    }
  }

  unsubscribeFromOpenContracts() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ forget_all: 'proposal_open_contract' }));
    }
    this.subscriptionHandlers.delete('proposal_open_contract');
  }

  async getProfitTable(params?: {
    limit?: number;
    offset?: number;
    description?: number;
    sort?: string;
  }): Promise<ProfitTableResponse> {
    const response = await this.sendRequest({
      profit_table: 1,
      description: 1,
      limit: params?.limit || 50,
      sort: 'ASC',
      ...params,
    });
    return response as ProfitTableResponse;
  }

  disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.token = null;
    this.reconnectAttempts = this.maxReconnectAttempts; // Prevent auto-reconnect
    if (this.ws) {
      this.ws.onclose = null;
      this.ws.close();
      this.ws = null;
    }
    this.cleanupPendingRequests();
    this.subscriptionHandlers.clear();
  }

  get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  get isConnectingState(): boolean {
    return this.isConnecting;
  }
}

// Singleton instance
let apiInstance: DerivAPI | null = null;

export function getDerivAPI(): DerivAPI {
  if (!apiInstance) {
    apiInstance = new DerivAPI();
  }
  return apiInstance;
}

export default DerivAPI;
