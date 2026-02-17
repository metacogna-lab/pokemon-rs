import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { SessionsPage } from "./SessionsPage";
import { api } from "../api/client";

vi.mock("../api/client", () => ({
  api: {
    createSession: vi.fn(),
    getSession: vi.fn(),
    playAction: vi.fn(),
  },
}));

describe("SessionsPage", () => {
  beforeEach(() => {
    vi.mocked(api.createSession).mockReset();
    vi.mocked(api.getSession).mockReset();
    vi.mocked(api.playAction).mockReset();
  });

  it("renders empty state when no sessions", () => {
    render(
      <MemoryRouter>
        <SessionsPage />
      </MemoryRouter>
    );
    expect(screen.getByText(/no sessions/i)).toBeInTheDocument();
  });

  it("create form submits with gameId and behaviorType", async () => {
    const user = userEvent.setup();
    vi.mocked(api.createSession).mockResolvedValue({
      sessionId: "sess-1",
      state: "Initialized",
    });
    vi.mocked(api.getSession).mockResolvedValue({
      sessionId: "sess-1",
      gameId: "game-123",
      state: "Initialized",
      metrics: { totalSpins: 0, totalPayout: 0 },
    });

    render(
      <MemoryRouter>
        <SessionsPage />
      </MemoryRouter>
    );

    await user.type(screen.getByPlaceholderText("uuid"), "game-123");
    await user.click(screen.getByRole("button", { name: /create/i }));

    await waitFor(() => {
      expect(api.createSession).toHaveBeenCalledWith(
        expect.objectContaining({
          gameId: "game-123",
          playerProfile: { behaviorType: "conservative" },
        })
      );
    });
  });
});
