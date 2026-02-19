/**
 * TDD tests for generated TS client (task 0001_ts_clients).
 * Validates client instantiation, model types, and API surface per openapi.yaml.
 */
import { test, expect } from "bun:test";
import {
  Configuration,
  DefaultApi,
  type Wallet,
  type Session,
  type Money,
  type ErrorResponse,
  type SessionEventRecord,
  type SessionEventsResponse,
  type GameFingerprintResponse,
  type RlExperience,
  type RlExportResponse,
  type CreateWalletRequest,
} from "./ts-client";

test("ts-client exports Configuration and DefaultApi", () => {
  expect(Configuration).toBeDefined();
  expect(typeof Configuration).toBe("function");
  expect(DefaultApi).toBeDefined();
  expect(typeof DefaultApi).toBe("function");
});

test("Configuration can be constructed with basePath", () => {
  const config = new Configuration({
    basePath: "http://localhost:8080/v1",
  });
  expect(config.basePath).toBe("http://localhost:8080/v1");
});

test("Wallet type is usable for typed payloads", () => {
  const w: Wallet = {
    walletId: "c9d19e0d-4a61-4f09-87d5-aa2ec5d376b1",
    balance: { amount: 100, currency: "AUD" },
    dailyLimit: { amount: 500, currency: "AUD" },
    dailySpent: { amount: 0, currency: "AUD" },
  };
  expect(w.walletId).toBeDefined();
  expect(w.balance.amount).toBe(100);
  expect(w.balance.currency).toBe("AUD");
  expect(w.dailyLimit.amount).toBe(500);
  expect(w.dailySpent.amount).toBe(0);
});

test("Session and Money types are exported and usable", () => {
  const money: Money = { amount: 10.5, currency: "AUD" };
  const session: Session = {
    sessionId: "c9d19e0d-4a61-4f09-87d5-aa2ec5d376b1",
    gameId: "4f9b8e88-1f2a-4c34-8e2a-a7fe9ef7b654",
    state: "Playing",
    metrics: { totalSpins: 0, totalPayout: 0 },
  };
  expect(session.state).toBe("Playing");
  expect(money.currency).toBe("AUD");
});

test("DefaultApi is instantiable with Configuration", () => {
  const config = new Configuration({ basePath: "http://localhost:8080/v1" });
  const api = new DefaultApi(config);
  expect(api).toBeDefined();
  expect(typeof api.createSession).toBe("function");
  expect(typeof api.getSession).toBe("function");
  expect(typeof api.playAction).toBe("function");
  // New methods
  expect(typeof api.getSessionEvents).toBe("function");
  expect(typeof api.getGameFingerprint).toBe("function");
  expect(typeof api.getRlExport).toBe("function");
  expect(typeof api.createWallet).toBe("function");
});

test("Error contract has code, message, and optional details", () => {
  const err: ErrorResponse = {
    error: {
      code: "WALLET_LIMIT_EXCEEDED",
      message: "Requested spend exceeds daily limit.",
      details: null,
    },
  };
  expect(err.error.code).toBe("WALLET_LIMIT_EXCEEDED");
  expect(err.error.message).toBeDefined();
});

// ── New type shape tests ──────────────────────────────────────────────────────

test("SessionEventRecord type has required fields", () => {
  const rec: SessionEventRecord = {
    eventId: "evt-123",
    sessionId: "sess-456",
    action: { type: "Spin" },
    result: { symbols: ["A", "B", "C"] },
    timestamp: "2026-01-01T00:00:00Z",
    reward: 0.15,
  };
  expect(rec.eventId).toBe("evt-123");
  expect(rec.reward).toBe(0.15);
});

test("SessionEventsResponse wraps events array", () => {
  const resp: SessionEventsResponse = { events: [] };
  expect(Array.isArray(resp.events)).toBe(true);
});

test("GameFingerprintResponse type has required fields", () => {
  const fp: GameFingerprintResponse = {
    gameId: "game-789",
    rngSignature: "sha256:abc",
    symbolMap: { A: 10, B: 5 },
    statisticalProfile: { rtp: 0.96 },
  };
  expect(fp.rngSignature).toBe("sha256:abc");
  expect(fp.symbolMap["A"]).toBe(10);
});

test("RlExperience type has required fields", () => {
  const exp: RlExperience = {
    id: "exp-001",
    sessionId: "sess-001",
    state: { state: "Playing" },
    action: { type: "Spin" },
    reward: 0.23,
    nextState: { state: "Evaluating" },
    done: false,
  };
  expect(exp.reward).toBe(0.23);
  expect(exp.done).toBe(false);
});

test("RlExportResponse wraps experiences array", () => {
  const resp: RlExportResponse = { experiences: [] };
  expect(Array.isArray(resp.experiences)).toBe(true);
});

test("CreateWalletRequest type is correct", () => {
  const req: CreateWalletRequest = {
    balance: { amount: 500, currency: "AUD" },
    dailyLimit: { amount: 100, currency: "AUD" },
  };
  expect(req.balance.amount).toBe(500);
  expect(req.walletId).toBeUndefined();
});

// ── Mock-fetch tests for new API methods ──────────────────────────────────────

test("getSessionEvents calls correct URL and returns events", async () => {
  const originalFetch = globalThis.fetch;
  let capturedUrl = "";
  globalThis.fetch = async (url: unknown) => {
    capturedUrl = String(url);
    return new Response(JSON.stringify({ events: [] }), { status: 200 });
  };
  const api = new DefaultApi(new Configuration({ basePath: "http://localhost:8080/v1" }));
  const result = await api.getSessionEvents("sess-123");
  expect(capturedUrl).toContain("/sessions/sess-123/events");
  expect(Array.isArray(result.events)).toBe(true);
  globalThis.fetch = originalFetch;
});

test("getGameFingerprint calls correct URL", async () => {
  const originalFetch = globalThis.fetch;
  let capturedUrl = "";
  globalThis.fetch = async (url: unknown) => {
    capturedUrl = String(url);
    return new Response(
      JSON.stringify({
        gameId: "game-1",
        rngSignature: "sig",
        symbolMap: {},
        statisticalProfile: {},
      }),
      { status: 200 }
    );
  };
  const api = new DefaultApi(new Configuration({ basePath: "http://localhost:8080/v1" }));
  const result = await api.getGameFingerprint("game-1");
  expect(capturedUrl).toContain("/games/game-1/fingerprint");
  expect(result.rngSignature).toBe("sig");
  globalThis.fetch = originalFetch;
});

test("getRlExport builds query string with sessionId, limit, offset", async () => {
  const originalFetch = globalThis.fetch;
  let capturedUrl = "";
  globalThis.fetch = async (url: unknown) => {
    capturedUrl = String(url);
    return new Response(JSON.stringify({ experiences: [] }), { status: 200 });
  };
  const api = new DefaultApi(new Configuration({ basePath: "http://localhost:8080/v1" }));
  await api.getRlExport("sess-999", 50, 10);
  expect(capturedUrl).toContain("sessionId=sess-999");
  expect(capturedUrl).toContain("limit=50");
  expect(capturedUrl).toContain("offset=10");
  globalThis.fetch = originalFetch;
});

test("createWallet sends POST to /wallets with body", async () => {
  const originalFetch = globalThis.fetch;
  let capturedUrl = "";
  let capturedMethod = "";
  let capturedBody = "";
  globalThis.fetch = async (url: unknown, init?: RequestInit) => {
    capturedUrl = String(url);
    capturedMethod = init?.method ?? "";
    capturedBody = init?.body as string;
    const wallet: Wallet = {
      walletId: "w-1",
      balance: { amount: 100, currency: "AUD" },
      dailyLimit: { amount: 50, currency: "AUD" },
      dailySpent: { amount: 0, currency: "AUD" },
    };
    return new Response(JSON.stringify(wallet), { status: 200 });
  };
  const api = new DefaultApi(new Configuration({ basePath: "http://localhost:8080/v1" }));
  const result = await api.createWallet({
    balance: { amount: 100, currency: "AUD" },
    dailyLimit: { amount: 50, currency: "AUD" },
  });
  expect(capturedUrl).toContain("/wallets");
  expect(capturedMethod).toBe("POST");
  expect(capturedBody).toContain("balance");
  expect(result.walletId).toBe("w-1");
  globalThis.fetch = originalFetch;
});

test("createSession rejects with error message when response not ok", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({
        error: { code: "INVALID_INPUT", message: "Invalid gameId" },
      }),
      { status: 400 }
    );
  const config = new Configuration({ basePath: "http://localhost:8080/v1" });
  const api = new DefaultApi(config);
  await expect(
    api.createSession({
      gameId: "4f9b8e88-1f2a-4c34-8e2a-a7fe9ef7b654",
      playerProfile: { behaviorType: "conservative" },
    })
  ).rejects.toThrow("Invalid gameId");
  globalThis.fetch = originalFetch;
});
