/**
 * Multi-episode RL training loop.
 * Each episode: orchestrate a session, adapt the profile based on reward signal,
 * decay epsilon, and export experience records to JSONL for offline Gymnasium training.
 */
import type { DefaultApi } from "../ts-client";
import type { ProfileConfig } from "../strategic_planner/profiles/types";
import { adaptProfile } from "./adapt";
import { decayEpsilon, initialPolicyState, type PolicyState } from "./infer";
import { exportToJsonl } from "./export";
import { orchestrate } from "../game_interaction_orchestrator";
import { mkdir } from "node:fs/promises";

export interface TrainingConfig {
  /** Total number of episodes to run. */
  numEpisodes: number;
  /** Directory where per-episode JSONL files are written. Default: "./rl_data". */
  outputDir?: string;
  /** Game ID passed to createSession on each episode. */
  gameId: string;
  /** Behavior type string forwarded to the player profile. Default: "conservative". */
  behaviorType?: string;
  /**
   * Override inter-action delay (ms). Useful in tests to pass `() => 0`.
   * If omitted, the orchestrator uses the profile's delayMsMin/delayMsMax range.
   */
  delayMs?: (profile: import("../strategic_planner/profiles/types").ProfileConfig) => number;
}

/**
 * Runs a multi-episode training loop against the given API.
 * - Each episode creates a new session via `orchestrate()`.
 * - After each episode, adapts the betting profile and decays epsilon.
 * - Writes per-episode JSONL to `outputDir/episode_N.jsonl`.
 * - Logs episode metrics (total reward, ε, step count) to stdout.
 */
export async function runTrainingLoop(
  api: DefaultApi,
  baseProfile: ProfileConfig,
  config: TrainingConfig,
): Promise<void> {
  const outDir = config.outputDir ?? "./rl_data";
  await mkdir(outDir, { recursive: true });

  let profile = baseProfile;
  let policy: PolicyState = initialPolicyState();

  for (let ep = 0; ep < config.numEpisodes; ep++) {
    const { finalObservation, experiences } = await orchestrate(
      api,
      {
        gameId: config.gameId,
        playerProfile: { behaviorType: config.behaviorType ?? "conservative" },
      },
      profile,
      { policy, ...(config.delayMs ? { delayMs: config.delayMs } : {}) },
    );

    // Adapt profile for next episode based on reward signal.
    profile = adaptProfile(
      profile,
      experiences.map((e) => ({ reward: e.reward, done: e.done })),
    );

    // Decay epsilon: each completed episode moves policy toward exploitation.
    policy = decayEpsilon(policy);

    // Export episode experiences to JSONL (skip if nothing was collected).
    if (experiences.length > 0) {
      const path = `${outDir}/episode_${ep + 1}.jsonl`;
      await exportToJsonl(experiences, path);
    }

    const totalReward = experiences.reduce((s, e) => s + e.reward, 0);
    console.log(
      `Episode ${ep + 1}/${config.numEpisodes}: ` +
      `reward=${totalReward.toFixed(3)} | ` +
      `ε=${policy.epsilon.toFixed(3)} | ` +
      `steps=${experiences.length} | ` +
      `finalState=${finalObservation.session.state}`,
    );
  }
}
