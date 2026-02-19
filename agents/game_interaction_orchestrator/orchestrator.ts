/**
 * Orchestrator: session lifecycle, retries with backoff, circuit breaker.
 * Measures inter-action delay to derive humanLikeness; exports RL experiences on completion.
 * Uses generated client only; does not retry on WALLET_LIMIT_EXCEEDED.
 */
import type { DefaultApi, RlExperience } from "../ts-client";
import type { CreateSessionRequest, PlayActionRequest, SessionId } from "../ts-client";
import { ApiError } from "../ts-client";
import { toGameplayAction } from "../strategic_planner";
import { fromSession, fromPlayActionResponse, type Observation } from "../strategic_planner";
import type { ProfileConfig } from "../strategic_planner/profiles";
import { infer, type PolicyState } from "../rl_model_runner/infer";

const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_CIRCUIT_BREAKER_THRESHOLD = 5;
const DEFAULT_MAX_STEPS = 500;
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
  /** Maximum play steps before the session is abandoned (prevents infinite loops). */
  maxSteps?: number;
  delayMs?: (config: ProfileConfig) => number;
  /** Optional RL policy for epsilon-greedy action selection. Defaults to pure exploitation (ε=0). */
  policy?: PolicyState;
}

/** Result of one play step (get session + plan + playAction). */
export interface StepResult {
  observation: Observation;
  done: boolean;
  /** Measured human-likeness score [0, 1] based on actual vs target delay. */
  humanLikeness: number;
}

/** Result of a complete orchestration run. */
export interface OrchestrationResult {
  /** Final observation after session completes. */
  finalObservation: Observation;
  /** RL experiences collected during the session (empty if export fails). */
  experiences: RlExperience[];
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
 * Measures actual delay vs target to derive a human-likeness score.
 * Returns observation, whether session is Completed, and the humanLikeness score.
 */
/** Pure-exploit policy: epsilon=0 means always use the deterministic planner. */
const EXPLOIT_POLICY: PolicyState = { epsilon: 0, episodeCount: 0, decayRate: 0.995 };

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
  const policy = options.policy ?? EXPLOIT_POLICY;
  const proposal = infer(observation, policy);
  const action = toGameplayAction(proposal);
  const amount =
    action.type === "PlaceBet"
      ? action.amount ?? { amount: profile.minBet, currency: profile.currency }
      : undefined;

  // Measure actual delay to compute human-likeness score.
  const targetMs =
    options.delayMs?.(profile) ??
    profile.delayMsMin + Math.random() * (profile.delayMsMax - profile.delayMsMin);
  const t0 = Date.now();
  await delay(Math.max(0, targetMs));
  const actualMs = Date.now() - t0;
  const midpointMs = (profile.delayMsMin + profile.delayMsMax) / 2;
  const humanLikeness =
    midpointMs > 0
      ? Math.max(0, 1 - Math.abs(actualMs - midpointMs) / midpointMs)
      : 0.5;

  // sessionId is in the URL path; body carries action + humanLikeness.
  const playRequest: PlayActionRequest = {
    action: amount ? { type: "PlaceBet", amount } : { type: action.type },
    humanLikeness,
  };
  const response = await withRetry(
    () => api.playAction(sessionId, playRequest),
    maxRetries,
    isRetryable
  );
  const nextObservation = fromPlayActionResponse(response);
  return {
    observation: nextObservation,
    done: nextObservation.session.state === "Completed",
    humanLikeness,
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
 * After the session ends, exports RL experiences from the backend and returns them alongside
 * the final observation. Callers can use experiences to adaptProfile() between episodes.
 */
export async function orchestrate(
  api: DefaultApi,
  createRequest: CreateSessionRequest,
  profile: ProfileConfig,
  options: OrchestratorOptions = {}
): Promise<OrchestrationResult> {
  const circuit = new CircuitBreaker(
    options.circuitBreakerThreshold ?? DEFAULT_CIRCUIT_BREAKER_THRESHOLD
  );
  const createRes = await withRetry(
    () => api.createSession(createRequest),
    options.maxRetries ?? DEFAULT_MAX_RETRIES,
    isRetryable
  );
  const sessionId: SessionId = createRes.sessionId;
  const maxSteps = options.maxSteps ?? DEFAULT_MAX_STEPS;
  let steps = 0;
  let result: StepResult = await runStep(api, sessionId, profile, options);
  circuit.recordSuccess();
  steps++;
  while (!result.done && !circuit.isOpen() && steps < maxSteps) {
    try {
      result = await runStep(api, sessionId, profile, options);
      circuit.recordSuccess();
      steps++;
    } catch (e) {
      circuit.recordFailure();
      throw e;
    }
  }

  // Export RL experiences from the backend after session ends.
  let experiences: import("../ts-client").RlExperience[] = [];
  try {
    const exported = await api.getRlExport(sessionId, 1000, 0);
    experiences = exported.experiences;
  } catch (e) {
    // Non-fatal: export failure does not abort the session result.
    console.warn("[orchestrate] getRlExport failed:", e instanceof Error ? e.message : String(e));
  }

  return { finalObservation: result.observation, experiences };
}
