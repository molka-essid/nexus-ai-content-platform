import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth/config";

// A separate, edge-safe NextAuth instance built only from the shared config
// (no Credentials provider, no Prisma/bcrypt) — see src/lib/auth/config.ts
// for why this must stay lean.
export const { auth: middleware } = NextAuth(authConfig);

export const config = {
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico).*)"],
};
