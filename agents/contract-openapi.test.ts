/**
 * Contract tests for openapi.yaml: required paths and schemas exist (task 0006).
 */
import { test, expect } from "bun:test";
import { parse } from "yaml";
import { readFileSync } from "fs";
import { join } from "path";

const repoRoot = join(import.meta.dir, "..");
const specPath = join(repoRoot, "openapi.yaml");

test("openapi.yaml loads as valid YAML", () => {
  const raw = readFileSync(specPath, "utf-8");
  const spec = parse(raw);
  expect(spec).toBeDefined();
  expect(spec.openapi).toMatch(/^3\./);
  expect(spec.paths).toBeDefined();
  expect(spec.components?.schemas).toBeDefined();
});

test("critical paths exist in spec", () => {
  const raw = readFileSync(specPath, "utf-8");
  const spec = parse(raw);
  const paths = Object.keys(spec.paths || {});
  expect(paths).toContain("/health");
  expect(paths).toContain("/sessions");
  expect(paths).toContain("/sessions/{sessionId}");
  expect(paths).toContain("/sessions/{sessionId}/action");
  expect(paths).toContain("/sessions/{sessionId}/events");
  expect(paths).toContain("/games/{gameId}/fingerprint");
  expect(paths).toContain("/wallets/{walletId}/operations");
});

test("critical schemas exist", () => {
  const raw = readFileSync(specPath, "utf-8");
  const spec = parse(raw);
  const schemas = spec.components?.schemas || {};
  expect(schemas).toHaveProperty("ErrorResponse");
  expect(schemas).toHaveProperty("Session");
  expect(schemas).toHaveProperty("GameplayAction");
  expect(schemas).toHaveProperty("GameplayResult");
  expect(schemas).toHaveProperty("Wallet");
  expect(schemas).toHaveProperty("SessionEventsResponse");
  expect(schemas).toHaveProperty("GameFingerprintResponse");
});

test("ErrorResponse schema has code and message", () => {
  const raw = readFileSync(specPath, "utf-8");
  const spec = parse(raw);
  const err = spec.components?.schemas?.ErrorResponse;
  expect(err?.required).toContain("error");
  const errorObj = err?.properties?.error;
  expect(errorObj?.required).toContain("code");
  expect(errorObj?.required).toContain("message");
});
