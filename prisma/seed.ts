// prisma/seed.ts
import "dotenv/config";
import prisma from "../src/config/prisma";
import { UserRole } from "@prisma/client";
import { hashPassword, validatePasswordStrength } from "../src/utils/password";
import {isValidEmail } from "../src/utils/validation"

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;
  const adminFullName = process.env.ADMIN_FULL_NAME || "System Administrator";

  if (!adminEmail || !adminPassword) {
    throw new Error("ADMIN_EMAIL and ADMIN_PASSWORD must be set in .env");
  }

  if (!isValidEmail(adminEmail)) {
    throw new Error("ADMIN_EMAIL is not a valid email address.");
  }

  const pwError = validatePasswordStrength(adminPassword);
  if (pwError) {
    throw new Error(
      `ADMIN_PASSWORD does not meet strength requirements: ${pwError}`
    );
  }

  const existing = await prisma.user.findUnique({
    where: { email: adminEmail }
  });

  if (existing) {
    console.log(
      `[seed] Admin user already exists with email ${adminEmail}. No changes made.`
    );
    return;
  }

  const hashed = await hashPassword(adminPassword);

  const admin = await prisma.user.create({
    data: {
      email: adminEmail,
      fullName: adminFullName,
      password: hashed,
      role: UserRole.ADMIN,
      department: "Management",
      isActive: true,
      mustChangePassword: false,
      canChangePassword: false
    }
  });

  console.log("[seed] Admin user created:", {
    id: admin.id,
    email: admin.email,
    role: admin.role
  });
}

main()
  .catch((e) => {
    console.error("[seed] Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
