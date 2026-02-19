/**
 * Policy inference: epsilon-greedy exploration/exploitation.
 * Maps Observation → ActionProposal with decaying randomness.
 */
import { plan, type ActionProposal, type Observation } from "../strategic_planner";
import type { Money } from "../ts-client";

/** Mutable policy state carrying epsilon and episode metadata. */
export interface PolicyState {
  /** Current exploration rate in [0.05, 1.0]. Starts at 1.0 (full exploration). */
  epsilon: number;
  /** Number of completed episodes (used for decay). */
  episodeCount: number;
  /** Multiplicative decay applied to epsilon per episode (e.g. 0.995). */
  decayRate: number;
}

const ACTION_TYPES = ["PlaceBet", "Spin", "CashOut"] as const;
type ActionType = (typeof ACTION_TYPES)[number];

/** Creates the default initial policy state (ε=1.0, full exploration). */
export function initialPolicyState(decayRate = 0.995): PolicyState {
  return { epsilon: 1.0, episodeCount: 0, decayRate };
}

/**
 * Returns a new PolicyState with epsilon decayed by decayRate, floored at 0.05.
 * Call once per completed episode, not per step.
 */
export function decayEpsilon(p: PolicyState): PolicyState {
  return {
    ...p,
    epsilon: Math.max(0.05, p.epsilon * p.decayRate),
    episodeCount: p.episodeCount + 1,
  };
}

/**
 * Epsilon-greedy action selection.
 * - With probability ε: explore (random action from action space).
 * - With probability 1-ε: exploit (deterministic planner).
 */
export function infer(observation: Observation, policy: PolicyState = initialPolicyState()): ActionProposal {
  if (Math.random() < policy.epsilon) {
    return randomAction();
  }
  return plan(observation);
}

/** Sample a uniformly random action from the discrete action space. */
function randomAction(): ActionProposal {
  const idx = Math.floor(Math.random() * ACTION_TYPES.length);
  const t: ActionType = ACTION_TYPES[idx]!;
  if (t === "PlaceBet") {
    const amount: Money = {
      amount: +(Math.random() * 9.5 + 0.5).toFixed(2),
      currency: "AUD",
    };
    return { type: "PlaceBet", amount };
  }
  return { type: t };
}
