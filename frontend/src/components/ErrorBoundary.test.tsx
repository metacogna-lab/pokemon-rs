import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ErrorDisplay, ErrorBoundary } from "./ErrorBoundary";

describe("ErrorDisplay", () => {
  it("renders error message from string", () => {
    render(<ErrorDisplay error="Something went wrong" />);
    expect(screen.getByRole("alert")).toHaveTextContent("Something went wrong");
  });

  it("renders error message from ErrorResponse shape", () => {
    render(
      <ErrorDisplay error={{ error: { message: "Session not found" } }} />
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Session not found");
  });

  it("returns null when error is null", () => {
    const { container } = render(<ErrorDisplay error={null} />);
    expect(container.firstChild).toBeNull();
  });
});

function Thrower({ message }: { message: string }): never {
  throw new Error(message);
}

describe("ErrorBoundary", () => {
  it("catches child render error and displays message", () => {
    render(
      <ErrorBoundary>
        <Thrower message="Child crashed" />
      </ErrorBoundary>
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Child crashed");
  });

  it("renders children when no error", () => {
    render(
      <ErrorBoundary>
        <span>Content</span>
      </ErrorBoundary>
    );
    expect(screen.getByText("Content")).toBeInTheDocument();
  });
});
