/**
 * TypeScript API client generated from openapi.yaml.
 * Regenerate with: bun run generate:client (from agents/).
 */

export type Currency = "AUD" | "USD" | "EUR";

export interface Money {
  amount: number;
  currency: Currency;
}

export type GameId = string;
export type SessionId = string;

export interface Wallet {
  walletId: SessionId;
  balance: Money;
  dailyLimit: Money;
}

export interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown> | null;
  };
}

/** Thrown when API returns 4xx/5xx; includes code for orchestrator (e.g. WALLET_LIMIT_EXCEEDED). */
export class ApiError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode?: number
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export type GameState =
  | "Idle"
  | "Initialized"
  | "Probing"
  | "Playing"
  | "Evaluating"
  | "Completed";

export interface SessionMetrics {
  totalSpins: number;
  totalPayout: number;
}

export interface Session {
  sessionId: SessionId;
  gameId: GameId;
  state: GameState;
  metrics: SessionMetrics;
}

export interface PlayerProfile {
  behaviorType: string;
  maxBet?: Money;
}

export interface CreateSessionRequest {
  gameId: GameId;
  playerProfile: PlayerProfile;
}

export interface CreateSessionResponse {
  sessionId: SessionId;
  state: GameState;
}

export type GameplayActionType = "PlaceBet" | "Spin" | "CashOut";

export interface GameplayAction {
  type: GameplayActionType;
  amount?: Money;
}

export interface GameplayResult {
  payout?: Money | null;
  symbols?: string[];
}

export interface PlayActionRequest {
  sessionId: SessionId;
  action: GameplayAction;
}

export interface PlayActionResponse {
  session: Session;
  result: GameplayResult;
}

/** Health check response. */
export interface HealthResponse {
  status: string;
}

export type WalletOperationType = "debit" | "credit";

export interface WalletOperationRequest {
  walletId: SessionId;
  operation: WalletOperationType;
  amount: Money;
}

export interface WalletOperationResponse {
  wallet: Wallet;
}

export class Configuration {
  basePath: string;
  constructor(params: { basePath?: string } = {}) {
    this.basePath = params.basePath ?? "http://localhost:8080/v1";
  }
}

function buildUrl(config: Configuration, path: string): string {
  const base = config.basePath.replace(/\/$/, "");
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${base}${p}`;
}

/** API client for session, gameplay, wallet, and health endpoints. */
export class DefaultApi {
  constructor(private config: Configuration) {}

  async getHealth(options?: RequestInit): Promise<HealthResponse> {
    const res = await fetch(buildUrl(this.config, "/health"), options);
    if (!res.ok) {
      const err: ErrorResponse = await res.json().catch(() => ({
        error: { code: "INTERNAL_ERROR", message: res.statusText },
      }));
      throw new ApiError(
        err.error?.message ?? res.statusText,
        err.error?.code ?? "INTERNAL_ERROR",
        res.status
      );
    }
    return res.json();
  }

  async createSession(
    createSessionRequest: CreateSessionRequest,
    options?: RequestInit
  ): Promise<CreateSessionResponse> {
    const res = await fetch(buildUrl(this.config, "/sessions"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(createSessionRequest),
      ...options,
    });
    if (!res.ok) {
      const err: ErrorResponse = await res.json().catch(() => ({
        error: { code: "INTERNAL_ERROR", message: res.statusText },
      }));
      throw new ApiError(
        err.error?.message ?? res.statusText,
        err.error?.code ?? "INTERNAL_ERROR",
        res.status
      );
    }
    return res.json();
  }

  async getSession(sessionId: SessionId, options?: RequestInit): Promise<Session> {
    const res = await fetch(
      buildUrl(this.config, `/sessions/${encodeURIComponent(sessionId)}`),
      options
    );
    if (!res.ok) {
      const err: ErrorResponse = await res.json().catch(() => ({
        error: { code: "INTERNAL_ERROR", message: res.statusText },
      }));
      throw new ApiError(
        err.error?.message ?? res.statusText,
        err.error?.code ?? "INTERNAL_ERROR",
        res.status
      );
    }
    return res.json();
  }

  async playAction(
    sessionId: SessionId,
    playActionRequest: PlayActionRequest,
    options?: RequestInit
  ): Promise<PlayActionResponse> {
    const res = await fetch(
      buildUrl(this.config, `/sessions/${encodeURIComponent(sessionId)}/action`),
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(playActionRequest),
        ...options,
      }
    );
    if (!res.ok) {
      const err: ErrorResponse = await res.json().catch(() => ({
        error: { code: "INTERNAL_ERROR", message: res.statusText },
      }));
      throw new ApiError(
        err.error?.message ?? res.statusText,
        err.error?.code ?? "INTERNAL_ERROR",
        res.status
      );
    }
    return res.json();
  }

  async walletOperation(
    walletId: SessionId,
    request: WalletOperationRequest,
    options?: RequestInit
  ): Promise<WalletOperationResponse> {
    const res = await fetch(
      buildUrl(this.config, `/wallets/${encodeURIComponent(walletId)}/operations`),
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
        ...options,
      }
    );
    if (!res.ok) {
      const err: ErrorResponse = await res.json().catch(() => ({
        error: { code: "INTERNAL_ERROR", message: res.statusText },
      }));
      throw new ApiError(
        err.error?.message ?? res.statusText,
        err.error?.code ?? "INTERNAL_ERROR",
        res.status
      );
    }
    return res.json();
  }
}
