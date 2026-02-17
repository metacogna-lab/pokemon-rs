import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { Layout } from "./Layout";

describe("Layout", () => {
  it("renders nav and children", () => {
    render(
      <MemoryRouter>
        <Layout>
          <div>Dashboard content</div>
        </Layout>
      </MemoryRouter>
    );
    expect(screen.getByText("Dashboard content")).toBeInTheDocument();
    expect(screen.getByRole("navigation")).toBeInTheDocument();
  });

  it("nav has links to main routes", () => {
    render(
      <MemoryRouter>
        <Layout>
          <span>Content</span>
        </Layout>
      </MemoryRouter>
    );
    expect(screen.getByRole("link", { name: /dashboard/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /sessions/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /wallets/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /fingerprints/i })).toBeInTheDocument();
  });
});
