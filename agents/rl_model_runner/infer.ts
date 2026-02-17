/**
 * Policy inference: maps Observation to ActionProposal.
 * Stub implementation delegates to strategic_planner until a trained model exists.
 */
import { plan, type ActionProposal, type Observation } from "../strategic_planner";

/**
 * Runs policy inference against the observation space.
 * Returns an ActionProposal for the given observation.
 * Stub: delegates to strategic_planner.plan() until trained RL model is available.
 */
export function infer(observation: Observation): ActionProposal {
  return plan(observation);
}
