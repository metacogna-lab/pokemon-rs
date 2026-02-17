import { describe, it, expect, vi, beforeEach } from "vitest";
import { api } from "./client";

describe("api client", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  it("getHealth calls fetch with /health path", async () => {
    (vi.mocked(fetch) as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ status: "healthy" }),
    } as Response);

    const result = await api.getHealth();
    expect(result).toEqual({ status: "healthy" });
    expect(fetch).toHaveBeenCalledWith(
      "http://localhost:8080/v1/health",
      undefined
    );
  });
});
