/**
 * Gymnasium-compatible JSONL export for offline RL training.
 * One record per line, matching the Gymnasium step() return format.
 */
import type { RlExperience } from "../ts-client";

/** Record shape matching Gymnasium's step() return convention. */
export interface GymnasiumRecord {
  /** Current observation (state before action). */
  obs: unknown;
  /** Action taken. */
  action: unknown;
  /** Scalar reward received. */
  reward: number;
  /** Observation after action (next state). */
  next_obs: unknown;
  /** True if episode ended (equivalent to Gymnasium's `terminated`). */
  terminated: boolean;
  /** Always false — truncation not used in this environment. */
  truncated: boolean;
  /** Additional metadata (empty by default). */
  info: object;
}

/** Convert one RL experience record to a Gymnasium-compatible record. */
export function toGymnasiumRecord(exp: RlExperience): GymnasiumRecord {
  return {
    obs: exp.state,
    action: exp.action,
    reward: exp.reward,
    next_obs: exp.nextState,
    terminated: exp.done,
    truncated: false,
    info: {},
  };
}

/**
 * Serialize a list of RL experiences to a JSONL file (one JSON object per line).
 * Uses Bun.write for efficient file I/O.
 *
 * @param experiences - RL experience records to export.
 * @param path - Output file path (e.g. "./rl_data/episode_1.jsonl").
 */
export async function exportToJsonl(experiences: RlExperience[], path: string): Promise<void> {
  const lines = experiences.map((e) => JSON.stringify(toGymnasiumRecord(e))).join("\n");
  await Bun.write(path, lines + "\n");
}
