import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/db/prisma";
import { Role } from "@prisma/client";

const FALLBACK_USER_EMAIL = "team@altaservice.fr";

export type WorkspaceUser = {
  id: string;
  name: string | null;
  email: string;
  role: Role;
};

// Login is disabled (2026-07-30, user request: too much friction for a
// non-technical single-user tool). This gets-or-creates one shared workspace
// account so every request/page still has a real user to record as
// createdById/uploadedById, without anyone having to sign in.
// To bring real login back: make this require a real `auth()` session
// again (throw/redirect when absent) instead of falling back.
export async function getWorkspaceUser(): Promise<WorkspaceUser> {
  const session = await auth();
  if (session?.user) {
    return {
      id: session.user.id,
      name: session.user.name ?? null,
      email: session.user.email ?? "",
      role: session.user.role,
    };
  }

  const user =
    (await prisma.user.findUnique({ where: { email: FALLBACK_USER_EMAIL } })) ??
    (await prisma.user.create({
      data: {
        name: "Team",
        email: FALLBACK_USER_EMAIL,
        passwordHash: "disabled",
        role: Role.ADMIN,
      },
    }));

  return { id: user.id, name: user.name, email: user.email, role: user.role };
}
