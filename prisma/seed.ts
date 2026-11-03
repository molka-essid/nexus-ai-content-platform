import { hash } from "bcryptjs";
import { prisma } from "../src/lib/db/prisma";
import { Role } from "@prisma/client";

async function main() {
  const existingBrand = await prisma.brandProfile.findFirst();
  if (!existingBrand) {
    await prisma.brandProfile.create({
      data: {
        name: "ALTA Services",
        slogan: "notre expertise la relation client",
        colorPrimary: "#0B2545",
        colorAccent: "#F2A93B",
        colorBackground: "#EAF1FB",
        toneGuidelines:
          "Human, dynamic, engaging, professional, modern. Confident but warm — never corporate-stiff.",
        communicationGuidelines:
          "Focus on Recruitment, Human Resources, and Employee Well-being. Adapt tone per platform: more polished on LinkedIn, more casual/visual on Instagram and Facebook.",
      },
    });
    console.log("Seeded BrandProfile for ALTA Services.");
  }

  const seedUsers = [
    {
      name: "Tatiana",
      email: "tatiana@altaservice.fr",
      role: Role.VALIDATOR,
      password: process.env.SEED_VALIDATOR_PASSWORD ?? "change-me-now",
    },
  ];

  for (const seedUser of seedUsers) {
    const existing = await prisma.user.findUnique({ where: { email: seedUser.email } });
    if (existing) continue;

    const passwordHash = await hash(seedUser.password, 12);
    await prisma.user.create({
      data: {
        name: seedUser.name,
        email: seedUser.email,
        role: seedUser.role,
        passwordHash,
      },
    });
    console.log(`Seeded user ${seedUser.email} (${seedUser.role}).`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
