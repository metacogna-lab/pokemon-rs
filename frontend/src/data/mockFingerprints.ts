import type { GameFingerprint } from "../types/fingerprint";

/** Mock fingerprint data until GET /games/{id}/fingerprint exists. */
export const MOCK_FINGERPRINTS: GameFingerprint[] = [
  {
    gameId: "game-001",
    name: "Classic Slots",
    rngSignature: { algorithm: "mersenne", seed: 12345 },
    symbolMap: {
      Cherry: { payout: 2, frequency: 0.35 },
      Bar: { payout: 10, frequency: 0.05 },
      Seven: { payout: 50, frequency: 0.01 },
      Lemon: { payout: 1, frequency: 0.4 },
      Bell: { payout: 5, frequency: 0.19 },
    },
    statisticalProfile: { rtp: 0.96, volatility: "medium" },
  },
  {
    gameId: "game-002",
    name: "Mega Spin",
    rngSignature: { algorithm: "xorshift", variant: "128" },
    symbolMap: {
      Wild: { payout: 100, frequency: 0.02 },
      Diamond: { payout: 25, frequency: 0.08 },
      Star: { payout: 10, frequency: 0.12 },
      Heart: { payout: 5, frequency: 0.2 },
      Club: { payout: 2, frequency: 0.58 },
    },
    statisticalProfile: { rtp: 0.94, volatility: "high" },
  },
];
