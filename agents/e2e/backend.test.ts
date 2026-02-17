/**
 * E2E tests: run against real backend when RUN_E2E=1.
 * Start backend first: e.g. cargo run -p cli -- serve (port 8080).
 * Skip when backend unavailable: do not set RUN_E2E.
 */
import { test, expect } from "bun:test";
import { Configuration, DefaultApi } from "../ts-client";
import { getConservativeProfile } from "../strategic_planner/profiles";
import { orchestrate } from "../game_interaction_orchestrator";

const runE2E = process.env.RUN_E2E === "1";
const basePath = process.env.API_BASE_URL ?? "http://localhost:8080/v1";

test.if(runE2E)("e2e: health returns 200 when backend is up", async () => {
  const config = new Configuration({ basePath });
  const api = new DefaultApi(config);
  const health = await api.getHealth();
  expect(health.status).toBeDefined();
});

test.if(runE2E)("e2e: create session and play one step", async () => {
  const config = new Configuration({ basePath });
  const api = new DefaultApi(config);
  const gameId = "4f9b8e88-1f2a-4c34-8e2a-a7fe9ef7b654";
  const createRes = await api.createSession({
    gameId,
    playerProfile: { behaviorType: "conservative" },
  });
  expect(createRes.sessionId).toBeDefined();
  expect(createRes.state).toBeDefined();
  const session = await api.getSession(createRes.sessionId);
  expect(session.sessionId).toBe(createRes.sessionId);
  expect(session.state).toBeDefined();
  expect(session.metrics).toBeDefined();
  expect(session.metrics.totalSpins).toBeGreaterThanOrEqual(0);
});

test.if(runE2E)("e2e: full orchestration run until Completed or timeout", async () => {
  const config = new Configuration({ basePath });
  const api = new DefaultApi(config);
  const profile = getConservativeProfile();
  const observation = await orchestrate(
    api,
    {
      gameId: "4f9b8e88-1f2a-4c34-8e2a-a7fe9ef7b654",
      playerProfile: { behaviorType: "conservative" },
    },
    profile,
    { delayMs: () => 10 }
  );
  expect(observation.session).toBeDefined();
  expect(observation.session.state).toBeDefined();
  expect(observation.metrics).toBeDefined();
}, 60000);
