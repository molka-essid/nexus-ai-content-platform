import type { DefaultSession } from "next-auth";
import type { Role } from "@prisma/client";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: Role;
    } & DefaultSession["user"];
  }

  interface User {
    role: Role;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: Role;
  }
}

// next-auth/jwt re-exports from @auth/core/jwt via `export *`, which does not
// participate in declaration merging — the callback signatures inside
// next-auth actually reference @auth/core/jwt's JWT directly, so it must be
// augmented here too for `token.id`/`token.role` to type-check.
declare module "@auth/core/jwt" {
  interface JWT {
    id: string;
    role: Role;
  }
}
