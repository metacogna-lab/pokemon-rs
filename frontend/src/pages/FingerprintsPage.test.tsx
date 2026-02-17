import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { FingerprintsPage } from "./FingerprintsPage";

describe("FingerprintsPage", () => {
  it("renders mock game list", () => {
    render(
      <MemoryRouter>
        <FingerprintsPage />
      </MemoryRouter>
    );
    expect(screen.getByText("Classic Slots")).toBeInTheDocument();
    expect(screen.getByText("Mega Spin")).toBeInTheDocument();
  });

  it("shows fingerprint detail when game is selected", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <FingerprintsPage />
      </MemoryRouter>
    );
    await user.click(screen.getByText("Classic Slots"));
    expect(screen.getByText(/fingerprint detail/i)).toBeInTheDocument();
    expect(screen.getByText(/game-001/)).toBeInTheDocument();
    expect(screen.getByText(/0.96/)).toBeInTheDocument();
    expect(screen.getByText(/symbol distribution/i)).toBeInTheDocument();
  });

  it("renders symbol chart with distribution", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <FingerprintsPage />
      </MemoryRouter>
    );
    await user.click(screen.getByText("Mega Spin"));
    expect(screen.getByText("Wild")).toBeInTheDocument();
    expect(screen.getByText("Diamond")).toBeInTheDocument();
  });
});
