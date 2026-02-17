/**
 * Planner: maps Observation to ActionProposal. Exhaustive over session state and action types.
 */
import type { Money } from "../ts-client";
import type { Observation } from "./observation";

/** Discriminated union aligned with openapi.yaml GameplayAction. */
export type ActionProposal =
  | { type: "PlaceBet"; amount?: Money }
  | { type: "Spin" }
  | { type: "CashOut" };

/**
 * Returns the next action for the given observation. State-based: Initialized -> PlaceBet;
 * Playing/Probing/Evaluating -> Spin; Completed -> CashOut; Idle -> PlaceBet (session start flow).
 */
export function plan(observation: Observation): ActionProposal {
  const { state } = observation.session;
  switch (state) {
    case "Idle":
      return { type: "PlaceBet" };
    case "Initialized":
      return { type: "PlaceBet" };
    case "Probing":
    case "Playing":
    case "Evaluating":
      return { type: "Spin" };
    case "Completed":
      return { type: "CashOut" };
    default: {
      const _: never = state;
      return _;
    }
  }
}

/** Converts ActionProposal to API GameplayAction shape (for playAction request). */
export function toGameplayAction(proposal: ActionProposal): {
  type: "PlaceBet" | "Spin" | "CashOut";
  amount?: Money;
} {
  switch (proposal.type) {
    case "PlaceBet":
      return { type: "PlaceBet", amount: proposal.amount };
    case "Spin":
      return { type: "Spin" };
    case "CashOut":
      return { type: "CashOut" };
    default: {
      const _: never = proposal;
      return _;
    }
  }
}
