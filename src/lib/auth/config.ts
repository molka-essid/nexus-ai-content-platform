import type { NextAuthConfig } from "next-auth";

// Edge-safe base config, shared by the full auth instance (src/lib/auth/auth.ts,
// which adds the Credentials provider backed by Prisma/bcrypt) and the
// middleware instance (middleware.ts). This file must never import Node-only
// code (Prisma, bcrypt) — Next.js Middleware runs on the Edge runtime, which
// can't bundle them.
export const authConfig = {
  pages: { signIn: "/login" },
  session: { strategy: "jwt" },
  providers: [],
  callbacks: {
    // Login is temporarily disabled (2026-07-30, user request) — every
    // route is open, and API routes fall back to a shared workspace user
    // (see src/lib/auth/authorize.ts). To bring real login back: restore
    // the isLoggedIn/isOnLogin checks that used to live here.
    authorized() {
      return true;
    },
    jwt({ token, user }) {
      if (user) {
        token.id = user.id as string;
        token.role = user.role;
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.id;
      session.user.role = token.role;
      return session;
    },
  },
} satisfies NextAuthConfig;
