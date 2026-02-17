/**
 * Orchestrator: session lifecycle, retries with backoff, circuit breaker.
 * Uses generated client only; does not retry on WALLET_LIMIT_EXCEEDED.
 */
import type { DefaultApi } from "../ts-client";
import type { CreateSessionRequest, PlayActionRequest, SessionId } from "../ts-client";
import { ApiError } from "../ts-client";
import { plan, toGameplayAction } from "../strategic_planner";
import { fromSession, fromPlayActionResponse, type Observation } from "../strategic_planner";
import type { ProfileConfig } from "../strategic_planner/profiles";

const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_CIRCUIT_BREAKER_THRESHOLD = 5;
const NO_RETRY_CODES = new Set([
  "WALLET_LIMIT_EXCEEDED",
  "INVALID_INPUT",
  "STATE_ERROR",
  "NOT_FOUND",
  "UNAUTHORIZED",
]);

/** Options for a single orchestration run. */
export interface OrchestratorOptions {
  maxRetries?: number;
  circuitBreakerThreshold?: number;
  delayMs?: (config: ProfileConfig) => number;
}

/** Result of one play step (get session + plan + playAction). */
export interface StepResult {
  observation: Observation;
  done: boolean;
}

/**
 * Sleep for ms (for inter-action delay from profile). Overridable for tests.
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Runs an API call with retries. Does not retry on NO_RETRY_CODES (e.g. WALLET_LIMIT_EXCEEDED).
 */
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number,
  isRetryable: (e: unknown) => boolean
): Promise<T> {
  let last: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (e) {
      last = e;
      if (attempt === maxRetries || !isRetryable(e)) throw e;
      const backoff = Math.min(1000 * 2 ** attempt, 10000);
      await delay(backoff);
    }
  }
  throw last;
}

function isRetryable(e: unknown): boolean {
  if (e instanceof ApiError && NO_RETRY_CODES.has(e.code)) return false;
  return true;
}

/**
 * Runs one orchestration loop: get session -> plan -> playAction -> delay.
 * Returns observation and whether session is Completed.
 */
export async function runStep(
  api: DefaultApi,
  sessionId: SessionId,
  profile: ProfileConfig,
  options: OrchestratorOptions = {}
): Promise<StepResult> {
  const maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES;
  const getSession = () => api.getSession(sessionId);
  const session = await withRetry(getSession, maxRetries, isRetryable);
  const observation = fromSession(session);
  const proposal = plan(observation);
  const action = toGameplayAction(proposal);
  const amount =
    action.type === "PlaceBet"
      ? action.amount ?? { amount: profile.minBet, currency: profile.currency }
      : undefined;
  const playRequest: PlayActionRequest = {
    sessionId,
    action: amount ? { type: "PlaceBet", amount } : { type: action.type },
  };
  const response = await withRetry(
    () => api.playAction(sessionId, playRequest),
    maxRetries,
    isRetryable
  );
  const nextObservation = fromPlayActionResponse(response);
  const delayMs =
    options.delayMs?.(profile) ??
    profile.delayMsMin + Math.random() * (profile.delayMsMax - profile.delayMsMin);
  await delay(Math.max(0, delayMs));
  return {
    observation: nextObservation,
    done: nextObservation.session.state === "Completed",
  };
}

/**
 * Circuit breaker: stops after N consecutive failures.
 */
export class CircuitBreaker {
  private failures = 0;
  constructor(private readonly threshold: number = DEFAULT_CIRCUIT_BREAKER_THRESHOLD) {}

  recordSuccess(): void {
    this.failures = 0;
  }

  recordFailure(): void {
    this.failures += 1;
  }

  isOpen(): boolean {
    return this.failures >= this.threshold;
  }
}

/**
 * Orchestrates a full session: createSession then loop runStep until Completed or circuit open.
 */
export async function orchestrate(
  api: DefaultApi,
  createRequest: CreateSessionRequest,
  profile: ProfileConfig,
  options: OrchestratorOptions = {}
): Promise<Observation> {
  const circuit = new CircuitBreaker(
    options.circuitBreakerThreshold ?? DEFAULT_CIRCUIT_BREAKER_THRESHOLD
  );
  const createRes = await withRetry(
    () => api.createSession(createRequest),
    options.maxRetries ?? DEFAULT_MAX_RETRIES,
    isRetryable
  );
  const sessionId: SessionId = createRes.sessionId;
  let result: StepResult = await runStep(api, sessionId, profile, options);
  circuit.recordSuccess();
  while (!result.done && !circuit.isOpen()) {
    try {
      result = await runStep(api, sessionId, profile, options);
      circuit.recordSuccess();
    } catch (e) {
      circuit.recordFailure();
      throw e;
    }
  }
  return result.observation;
}
