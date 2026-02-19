/**
 * TypeScript API client aligned with openapi.yaml.
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
  dailySpent: Money;
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
  action: GameplayAction;
  /** Measured human-likeness score (0.0–1.0). Optional; defaults to 0.5 on the server. */
  humanLikeness?: number;
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

/** Wallet operation — walletId is in the URL path, not the request body. */
export interface WalletOperationRequest {
  operation: WalletOperationType;
  amount: Money;
}

export interface WalletOperationResponse {
  wallet: Wallet;
}

/** Request body for POST /wallets — create a new wallet. */
export interface CreateWalletRequest {
  /** Client-supplied wallet ID; server generates one if absent. */
  walletId?: SessionId;
  balance: Money;
  dailyLimit: Money;
}

/** Single event record from GET /sessions/{id}/events. */
export interface SessionEventRecord {
  eventId: string;
  sessionId: string;
  action: unknown;
  result: unknown;
  timestamp?: string;
  reward?: number;
}

/** Response for GET /sessions/{id}/events. */
export interface SessionEventsResponse {
  events: SessionEventRecord[];
}

/** Game fingerprint from GET /games/{gameId}/fingerprint. */
export interface GameFingerprintResponse {
  gameId: string;
  rngSignature: string;
  symbolMap: Record<string, number>;
  statisticalProfile: Record<string, number>;
}

/** Single RL experience record from GET /rl/export. */
export interface RlExperience {
  id: string;
  sessionId: string;
  state: unknown;
  action: unknown;
  reward: number;
  nextState: unknown;
  done: boolean;
  createdAt?: string;
}

/** Response for GET /rl/export. */
export interface RlExportResponse {
  experiences: RlExperience[];
}

export class Configuration {
  readonly basePath: string;
  readonly apiKey?: string;
  readonly timeoutMs: number;

  constructor(
    params: { basePath?: string; apiKey?: string; timeoutMs?: number } = {}
  ) {
    this.basePath = params.basePath ?? "http://localhost:8080/v1";
    this.apiKey = params.apiKey;
    this.timeoutMs = params.timeoutMs ?? 10_000;
  }
}

function buildUrl(config: Configuration, path: string): string {
  const base = config.basePath.replace(/\/$/, "");
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${base}${p}`;
}

/** Merges Authorization header and AbortController timeout into fetch options. */
function withAuth(
  config: Configuration,
  options?: RequestInit
): RequestInit & { signal: AbortSignal } {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.timeoutMs);
  // Prevent timer from keeping process alive in Bun/Node.
  if (typeof timer === "object" && "unref" in timer) {
    (timer as ReturnType<typeof setTimeout> & { unref(): void }).unref();
  }
  const headers: Record<string, string> = {
    ...(options?.headers as Record<string, string>),
  };
  if (config.apiKey) {
    headers["Authorization"] = `Bearer ${config.apiKey}`;
  }
  return { ...options, headers, signal: controller.signal };
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let code = "INTERNAL_ERROR";
    let message = res.statusText;
    try {
      const err = (await res.json()) as ErrorResponse;
      code = err.error?.code ?? code;
      message = err.error?.message ?? message;
    } catch {
      // ignore parse error
    }
    throw new ApiError(message, code, res.status);
  }
  return res.json() as Promise<T>;
}

/** API client for session, gameplay, wallet, and health endpoints. */
export class DefaultApi {
  constructor(private readonly config: Configuration) {}

  async getHealth(): Promise<HealthResponse> {
    // Health is a public endpoint — no auth header needed.
    const controller = new AbortController();
    setTimeout(() => controller.abort(), this.config.timeoutMs);
    const res = await fetch(buildUrl(this.config, "/health"), {
      signal: controller.signal,
    });
    return handleResponse<HealthResponse>(res);
  }

  async createSession(req: CreateSessionRequest): Promise<CreateSessionResponse> {
    const res = await fetch(buildUrl(this.config, "/sessions"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req),
      ...withAuth(this.config),
    });
    return handleResponse<CreateSessionResponse>(res);
  }

  async getSession(sessionId: SessionId): Promise<Session> {
    const res = await fetch(
      buildUrl(this.config, `/sessions/${encodeURIComponent(sessionId)}`),
      withAuth(this.config)
    );
    return handleResponse<Session>(res);
  }

  async playAction(
    sessionId: SessionId,
    req: PlayActionRequest
  ): Promise<PlayActionResponse> {
    const res = await fetch(
      buildUrl(this.config, `/sessions/${encodeURIComponent(sessionId)}/action`),
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(req),
        ...withAuth(this.config),
      }
    );
    return handleResponse<PlayActionResponse>(res);
  }

  async walletOperation(
    walletId: SessionId,
    req: WalletOperationRequest
  ): Promise<WalletOperationResponse> {
    const res = await fetch(
      buildUrl(this.config, `/wallets/${encodeURIComponent(walletId)}/operations`),
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(req),
        ...withAuth(this.config),
      }
    );
    return handleResponse<WalletOperationResponse>(res);
  }

  async createWallet(req: CreateWalletRequest): Promise<Wallet> {
    const res = await fetch(buildUrl(this.config, "/wallets"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req),
      ...withAuth(this.config),
    });
    return handleResponse<Wallet>(res);
  }

  async getSessionEvents(sessionId: SessionId): Promise<SessionEventsResponse> {
    const res = await fetch(
      buildUrl(this.config, `/sessions/${encodeURIComponent(sessionId)}/events`),
      withAuth(this.config)
    );
    return handleResponse<SessionEventsResponse>(res);
  }

  async getGameFingerprint(gameId: string): Promise<GameFingerprintResponse> {
    const res = await fetch(
      buildUrl(this.config, `/games/${encodeURIComponent(gameId)}/fingerprint`),
      withAuth(this.config)
    );
    return handleResponse<GameFingerprintResponse>(res);
  }

  async getRlExport(
    sessionId: SessionId,
    limit?: number,
    offset?: number
  ): Promise<RlExportResponse> {
    const params = new URLSearchParams({
      sessionId,
      limit: String(limit ?? 100),
      offset: String(offset ?? 0),
    });
    const res = await fetch(
      buildUrl(this.config, `/rl/export?${params.toString()}`),
      withAuth(this.config)
    );
    return handleResponse<RlExportResponse>(res);
  }
}
