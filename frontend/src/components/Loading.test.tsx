import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Loading } from "./Loading";

describe("Loading", () => {
  it("shows spinner when loading is true", () => {
    render(<Loading loading={true} />);
    expect(screen.getByRole("status", { name: /loading/i })).toBeInTheDocument();
  });

  it("returns null when loading is false", () => {
    const { container } = render(<Loading loading={false} />);
    expect(container.firstChild).toBeNull();
  });
});
