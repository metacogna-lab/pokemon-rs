import { Component, type ReactNode } from "react";
import type { ErrorResponse } from "../../../agents/ts-client";

/** Displays error message from API ErrorResponse shape or string. */
export function ErrorDisplay({
  error,
}: {
  error: string | { error?: { message?: string } } | null;
}) {
  if (!error) return null;
  const msg =
    typeof error === "string"
      ? error
      : (error as ErrorResponse)?.error?.message ?? "An error occurred";
  return (
    <div className="p-4 rounded bg-red-900/50 border border-red-600 text-red-200" role="alert">
      {msg}
    </div>
  );
}

type Props = { children: ReactNode };
type State = { hasError: boolean; error: Error | null };

/** Catches render errors and displays a fallback message. */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render(): ReactNode {
    if (this.state.hasError && this.state.error) {
      return (
        <div className="p-6">
          <ErrorDisplay error={this.state.error.message} />
        </div>
      );
    }
    return this.props.children;
  }
}
