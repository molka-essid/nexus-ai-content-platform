import { NextResponse } from "next/server";
import { getWorkspaceUser, type WorkspaceUser } from "@/lib/auth/current-user";

type AuthorizeResult =
  | { ok: true; session: { user: WorkspaceUser } }
  | { ok: false; response: NextResponse };

// Shared guard for API route handlers: resolves the current user (real
// session if logged in, otherwise the shared fallback workspace user — see
// getWorkspaceUser). This is a single-user app, so there's no role-based
// restriction to check — every request that resolves a user is authorized.
// Callers do:
//   const authResult = await authorize();
//   if (!authResult.ok) return authResult.response;
export async function authorize(): Promise<AuthorizeResult> {
  const user = await getWorkspaceUser();
  return { ok: true, session: { user } };
}
