/**
 * RL evaluation metrics: mean reward, episode length, reward variance.
 */

/** Experience-like record for metrics computation. */
export interface ExperienceRecord {
  reward: number;
  done: boolean;
}

/**
 * Computes mean reward over a list of experiences.
 */
export function meanReward(experiences: ExperienceRecord[]): number {
  if (experiences.length === 0) return 0;
  const sum = experiences.reduce((s, e) => s + e.reward, 0);
  return sum / experiences.length;
}

/**
 * Counts experiences until first done=true (episode length).
 */
export function episodeLength(experiences: ExperienceRecord[]): number {
  const idx = experiences.findIndex((e) => e.done);
  return idx < 0 ? experiences.length : idx + 1;
}

/**
 * Computes sample variance of rewards over a window.
 */
export function rewardVariance(experiences: ExperienceRecord[], window?: number): number {
  const slice = window ? experiences.slice(-window) : experiences;
  if (slice.length < 2) return 0;
  const mean = meanReward(slice);
  const sqDiffs = slice.map((e) => Math.pow(e.reward - mean, 2));
  const sumSq = sqDiffs.reduce((a, b) => a + b, 0);
  return sumSq / (slice.length - 1);
}
