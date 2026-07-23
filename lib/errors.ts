// Supabase's Postgrest/Auth/Storage error objects are shaped like errors (they have a `.message`)
// but are NOT real `Error` instances, so `err instanceof Error` is false for them and silently
// falls through to a generic fallback message — this was diagnosed once already on the login page
// (see the project's app-summary doc, "first-signup debugging saga") but the same pattern crept
// back into every form added since. This helper is the one place that decides how to pull a
// message out of *any* thrown value, so every form shows the real database error (RLS denial,
// missing table/column from a migration that hasn't been run yet, a unique-constraint violation,
// etc.) instead of a useless "Could not save X."
export function errorMessage(err: unknown, fallback: string): string {
  if (err instanceof Error) return err.message;
  if (err && typeof err === "object" && "message" in err && typeof (err as any).message === "string") {
    return (err as any).message;
  }
  return fallback;
}
