import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { FingerprintsPage } from "./FingerprintsPage";
import { api } from "../api/client";

vi.mock("../api/client", () => ({
  api: {
    getGameFingerprint: vi.fn(),
  },
}));

const fakeFingerprint = {
  gameId: "game-001",
  rngSignature: "sha256:abc123",
  symbolMap: { Cherry: 0.35, Bar: 0.20, Seven: 0.05 },
  statisticalProfile: { rtp: 0.96, volatility: 0.4 },
};

describe("FingerprintsPage", () => {
  beforeEach(() => {
    vi.mocked(api.getGameFingerprint).mockReset();
  });

  it("renders search form initially", () => {
    render(
      <MemoryRouter>
        <FingerprintsPage />
      </MemoryRouter>
    );
    expect(screen.getByText(/search by game id/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/uuid/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /fetch/i })).toBeInTheDocument();
  });

  it("fetches and displays fingerprint detail on submit", async () => {
    const user = userEvent.setup();
    vi.mocked(api.getGameFingerprint).mockResolvedValue(fakeFingerprint);

    render(
      <MemoryRouter>
        <FingerprintsPage />
      </MemoryRouter>
    );

    await user.type(screen.getByPlaceholderText(/uuid/i), "game-001");
    await user.click(screen.getByRole("button", { name: /fetch/i }));

    await waitFor(() => {
      expect(screen.getByText(/fingerprint detail/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/game-001/)).toBeInTheDocument();
    expect(screen.getByText(/sha256:abc123/)).toBeInTheDocument();
    expect(vi.mocked(api.getGameFingerprint)).toHaveBeenCalledWith("game-001");
  });

  it("renders symbol chart entries from live symbolMap", async () => {
    const user = userEvent.setup();
    vi.mocked(api.getGameFingerprint).mockResolvedValue(fakeFingerprint);

    render(
      <MemoryRouter>
        <FingerprintsPage />
      </MemoryRouter>
    );

    await user.type(screen.getByPlaceholderText(/uuid/i), "game-001");
    await user.click(screen.getByRole("button", { name: /fetch/i }));

    await waitFor(() => {
      expect(screen.getByText("Cherry")).toBeInTheDocument();
    });
    expect(screen.getByText("Bar")).toBeInTheDocument();
    expect(screen.getByText("Seven")).toBeInTheDocument();
  });

  it("displays statistical profile key-value pairs", async () => {
    const user = userEvent.setup();
    vi.mocked(api.getGameFingerprint).mockResolvedValue(fakeFingerprint);

    render(
      <MemoryRouter>
        <FingerprintsPage />
      </MemoryRouter>
    );

    await user.type(screen.getByPlaceholderText(/uuid/i), "game-001");
    await user.click(screen.getByRole("button", { name: /fetch/i }));

    await waitFor(() => {
      expect(screen.getByText(/statistical profile/i)).toBeInTheDocument();
    });
    // statisticalProfile keys are displayed as capitalized labels
    expect(screen.getByText(/rtp/i)).toBeInTheDocument();
    expect(screen.getByText(/volatility/i)).toBeInTheDocument();
  });

  it("shows error message when API call fails", async () => {
    const user = userEvent.setup();
    vi.mocked(api.getGameFingerprint).mockRejectedValue(new Error("not found"));

    render(
      <MemoryRouter>
        <FingerprintsPage />
      </MemoryRouter>
    );

    await user.type(screen.getByPlaceholderText(/uuid/i), "bad-id");
    await user.click(screen.getByRole("button", { name: /fetch/i }));

    await waitFor(() => {
      expect(screen.getByText(/not found/i)).toBeInTheDocument();
    });
  });
});
