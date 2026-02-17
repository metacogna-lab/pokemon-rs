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
  };
  expect(w.walletId).toBeDefined();
  expect(w.balance.amount).toBe(100);
  expect(w.balance.currency).toBe("AUD");
  expect(w.dailyLimit.amount).toBe(500);
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
