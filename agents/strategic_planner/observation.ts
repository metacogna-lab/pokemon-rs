/**
 * Observation layer: typed abstraction over raw API responses.
 * Uses generated client types only; agents reason over Observation instead of raw responses.
 */
import type {
  Session,
  GameplayResult,
  SessionMetrics,
} from "../ts-client";

/** Typed observation built from getSession or playAction responses. */
export interface Observation {
  session: Session;
  result?: GameplayResult;
  metrics: SessionMetrics;
}

/**
 * Builds an Observation from a session and optional gameplay result.
 * Metrics are taken from session.metrics for consistency.
 */
export function fromSession(
  session: Session,
  result?: GameplayResult | null
): Observation {
  return {
    session,
    result: result ?? undefined,
    metrics: session.metrics,
  };
}

/**
 * Builds an Observation from a PlayActionResponse (session + result).
 */
export function fromPlayActionResponse(response: {
  session: Session;
  result: GameplayResult;
}): Observation {
  return {
    session: response.session,
    result: response.result,
    metrics: response.session.metrics,
  };
}
