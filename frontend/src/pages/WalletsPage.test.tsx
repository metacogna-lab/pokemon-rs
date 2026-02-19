import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { WalletsPage } from "./WalletsPage";
import { api } from "../api/client";

vi.mock("../api/client", () => ({
  api: {
    walletOperation: vi.fn(),
  },
}));

describe("WalletsPage", () => {
  beforeEach(() => {
    vi.mocked(api.walletOperation).mockReset();
  });

  it("renders balance and daily limit after successful operation", async () => {
    const user = userEvent.setup();
    vi.mocked(api.walletOperation).mockResolvedValue({
      wallet: {
        walletId: "w1",
        balance: { amount: 100, currency: "AUD" },
        dailyLimit: { amount: 500, currency: "AUD" },
        dailySpent: { amount: 0, currency: "AUD" },
      },
    });

    render(
      <MemoryRouter>
        <WalletsPage />
      </MemoryRouter>
    );

    await user.type(screen.getByPlaceholderText(/wallet uuid/i), "w1");
    await user.type(screen.getByDisplayValue(""), "50");
    await user.click(screen.getByRole("button", { name: /submit/i }));

    await waitFor(() => {
      expect(screen.getByText(/100 AUD/)).toBeInTheDocument();
      expect(screen.getByText(/500 AUD/)).toBeInTheDocument();
    });
  });

  it("shows limit alert when balance is low", async () => {
    const user = userEvent.setup();
    vi.mocked(api.walletOperation).mockResolvedValue({
      wallet: {
        walletId: "w1",
        balance: { amount: 5, currency: "AUD" },
        dailyLimit: { amount: 500, currency: "AUD" },
        dailySpent: { amount: 0, currency: "AUD" },
      },
    });

    render(
      <MemoryRouter>
        <WalletsPage />
      </MemoryRouter>
    );

    await user.type(screen.getByPlaceholderText(/wallet uuid/i), "w1");
    const amountInput = screen.getAllByRole("spinbutton")[0];
    await user.clear(amountInput);
    await user.type(amountInput, "10");
    await user.click(screen.getByRole("button", { name: /submit/i }));

    await waitFor(() => {
      expect(screen.getByText(/balance is low/i)).toBeInTheDocument();
    });
  });
});
