import { ZodError } from "zod";
import { UnauthorizedError } from "@/lib/auth/session";

export type ActionResult<T = undefined> =
  | ({ ok: true } & (T extends undefined ? { data?: undefined } : { data: T }))
  | { ok: false; error: string };

/** Never leak a stack trace or driver message to the client. */
export function actionError(error: unknown): { ok: false; error: string } {
  if (error instanceof UnauthorizedError) {
    return { ok: false, error: error.message };
  }
  if (error instanceof ZodError) {
    return { ok: false, error: error.issues[0]?.message ?? "Check the form and try again." };
  }
  if (error instanceof Error) {
    return { ok: false, error: error.message };
  }
  return { ok: false, error: "Something went wrong. Try again." };
}
