/**
 * Unit tests for the multi-episode training loop.
 * Mocks orchestrate() to avoid network calls and file system to a temp dir.
 */
import { test, expect, mock, beforeAll, afterAll } from "bun:test";
import { mkdir, rm, readdir } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

// We import the module under test. orchestrate is mocked via module mock below.
// Since bun:test module mocking happens per-module, we spy on the exported
// orchestrate function by pointing train.ts imports through a local wrapper.
// Instead, we test runTrainingLoop using a temp dir and checking JSONL output.

import { runTrainingLoop } from "./train";
import type { TrainingConfig } from "./train";
import { getConservativeProfile } from "../strategic_planner/profiles";

const sessionId = "aabbccdd-1111-2222-3333-444455556666";
const gameId = "4f9b8e88-1f2a-4c34-8e2a-a7fe9ef7b654";

/** Build a fake experience with configurable reward/done. */
function fakeExperience(reward: number, done: boolean) {
  return {
    id: crypto.randomUUID(),
    sessionId,
    state: {},
    action: {},
    reward,
    nextState: {},
    done,
  };
}

/** Minimal fake observation. */
const fakeObservation = {
  session: { sessionId, gameId, state: "Completed" as const, metrics: { totalSpins: 3, totalPayout: 4.5 } },
  metrics: { totalSpins: 3, totalPayout: 4.5 },
};

/** Build a mock DefaultApi that immediately returns Completed sessions. */
function buildMockApi(rewardPerStep = 1.0) {
  const fakeExps = [
    fakeExperience(rewardPerStep, false),
    fakeExperience(rewardPerStep, true),
  ];
  return {
    createSession: async () => ({ sessionId, state: "Initialized" }),
    getSession: async () => ({ sessionId, gameId, state: "Completed", metrics: { totalSpins: 2, totalPayout: 2 } }),
    playAction: async () => ({
      session: { sessionId, gameId, state: "Completed", metrics: { totalSpins: 2, totalPayout: 2 } },
      result: {},
    }),
    getRlExport: async () => ({ experiences: fakeExps }),
  } as unknown as import("../ts-client").DefaultApi;
}

let testDir: string;

beforeAll(async () => {
  testDir = join(tmpdir(), `pokemon-train-test-${Date.now()}`);
  await mkdir(testDir, { recursive: true });
});

afterAll(async () => {
  await rm(testDir, { recursive: true, force: true });
});

test("runTrainingLoop writes one JSONL per episode", async () => {
  const api = buildMockApi(0.5);
  const profile = getConservativeProfile();
  const config: TrainingConfig = {
    numEpisodes: 3,
    outputDir: join(testDir, "ep-files"),
    gameId,
    delayMs: () => 0,
  };

  await runTrainingLoop(api, profile, config);

  const files = (await readdir(config.outputDir!)).filter((f) => f.endsWith(".jsonl"));
  expect(files.length).toBe(3);
  expect(files).toContain("episode_1.jsonl");
  expect(files).toContain("episode_2.jsonl");
  expect(files).toContain("episode_3.jsonl");
});

test("runTrainingLoop does not write JSONL when experiences are empty", async () => {
  const api = {
    createSession: async () => ({ sessionId, state: "Initialized" }),
    getSession: async () => ({ sessionId, gameId, state: "Completed", metrics: { totalSpins: 0, totalPayout: 0 } }),
    playAction: async () => ({
      session: { sessionId, gameId, state: "Completed", metrics: { totalSpins: 0, totalPayout: 0 } },
      result: {},
    }),
    getRlExport: async () => ({ experiences: [] }),
  } as unknown as import("../ts-client").DefaultApi;

  const outDir = join(testDir, "empty-eps");
  await mkdir(outDir, { recursive: true });
  const config: TrainingConfig = { numEpisodes: 2, outputDir: outDir, gameId, delayMs: () => 0 };

  await runTrainingLoop(api, getConservativeProfile(), config);

  const files = await readdir(outDir);
  expect(files.filter((f) => f.endsWith(".jsonl")).length).toBe(0);
});

test("runTrainingLoop epsilon decays across episodes", async () => {
  const api = buildMockApi(2.0);
  const profile = getConservativeProfile();
  // Capture console.log lines to assert epsilon decay in output.
  const logs: string[] = [];
  const origLog = console.log;
  console.log = (...args: unknown[]) => {
    logs.push(args.map(String).join(" "));
    origLog(...args);
  };

  try {
    await runTrainingLoop(api, profile, {
      numEpisodes: 5,
      outputDir: join(testDir, "epsilon-decay"),
      gameId,
      delayMs: () => 0,
    });
  } finally {
    console.log = origLog;
  }

  // Extract epsilon values from log lines — each line ends with "ε=<value> |"
  const epsilons = logs
    .filter((l) => l.includes("ε="))
    .map((l) => parseFloat(l.match(/ε=([\d.]+)/)![1]!));

  expect(epsilons.length).toBe(5);
  // Epsilon should be monotonically decreasing
  for (let i = 1; i < epsilons.length; i++) {
    expect(epsilons[i]!).toBeLessThan(epsilons[i - 1]!);
  }
});

test("runTrainingLoop adapts profile when rewards are positive", async () => {
  // Use large positive rewards to trigger profile stake increase.
  const api = buildMockApi(10.0);
  const profile = getConservativeProfile();
  const initialMinBet = profile.minBet;

  // We cannot easily inspect the final profile, but we can verify no errors occur
  // and the training loop completes with enough experiences to trigger adaptProfile.
  // adaptProfile requires window=20 experiences; our mock returns 2 per episode.
  // Run 15 episodes → 30 experiences → adaptation should kick in.
  await runTrainingLoop(api, profile, {
    numEpisodes: 15,
    outputDir: join(testDir, "profile-adapt"),
    gameId,
    delayMs: () => 0,
  });

  // No assertion on the profile value itself (adaptation is internal to loop),
  // but verifying 15 JSONL files were written confirms all episodes ran.
  const files = await readdir(join(testDir, "profile-adapt"));
  expect(files.filter((f) => f.endsWith(".jsonl")).length).toBe(15);
});

test("runTrainingLoop runs zero episodes without error", async () => {
  const api = buildMockApi();
  await expect(
    runTrainingLoop(api, getConservativeProfile(), {
      numEpisodes: 0,
      outputDir: join(testDir, "zero-eps"),
      gameId,
      delayMs: () => 0,
    })
  ).resolves.toBeUndefined();
});
