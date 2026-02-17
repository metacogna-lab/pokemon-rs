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
