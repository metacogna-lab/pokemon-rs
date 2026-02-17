import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { Nav } from "./Nav";

describe("Nav", () => {
  it("renders all navigation links", () => {
    render(
      <MemoryRouter>
        <Nav />
      </MemoryRouter>
    );
    expect(screen.getByRole("link", { name: "Dashboard" })).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: "Sessions" })).toHaveAttribute("href", "/sessions");
    expect(screen.getByRole("link", { name: "Wallets" })).toHaveAttribute("href", "/wallets");
    expect(screen.getByRole("link", { name: "Fingerprints" })).toHaveAttribute("href", "/fingerprints");
  });
});
