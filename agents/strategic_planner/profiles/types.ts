/**
 * Typed profile config for human-like behaviour: stake range and delay params.
 */
import type { Money } from "../../ts-client";

export type Currency = Money["currency"];

/** Stake and timing params for one profile. */
export interface ProfileConfig {
  /** Minimum bet amount (per spin). */
  minBet: number;
  /** Maximum bet amount (per spin). */
  maxBet: number;
  /** Currency for stake. */
  currency: Currency;
  /** Min delay between actions (ms). */
  delayMsMin: number;
  /** Max delay between actions (ms). */
  delayMsMax: number;
  /** Optional weight for adaptive logic (0–1). */
  rewardWeight?: number;
}
