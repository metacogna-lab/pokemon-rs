/** Mock fingerprint shape aligned with backend 0005 until API exists. */
export interface GameFingerprint {
  gameId: string;
  name?: string;
  rngSignature: Record<string, unknown>;
  symbolMap: Record<string, { payout: number; frequency?: number }>;
  statisticalProfile: { rtp?: number; volatility?: string };
}
