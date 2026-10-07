import "dotenv/config";
import bcrypt from "bcryptjs";
import { prisma } from "../src/config/prisma.js";

const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
const adminPassword = process.env.ADMIN_PASSWORD;
const adminName = process.env.ADMIN_NAME?.trim() || "Sahayak Admin";

const createAdmin = async () => {
  if (!adminEmail || !adminPassword) {
    throw new Error(
      "ADMIN_EMAIL and ADMIN_PASSWORD must be defined in backend/.env"
    );
  }

  if (adminPassword.length < 8) {
    throw new Error(
      "ADMIN_PASSWORD must contain at least 8 characters"
    );
  }

  const hashedPassword = await bcrypt.hash(adminPassword, 12);

  const existingAdmin = await prisma.user.findUnique({
    where: {
      email: adminEmail
    }
  });

  if (existingAdmin) {
    const admin = await prisma.user.update({
      where: {
        email: adminEmail
      },
      data: {
        name: adminName,
        password: hashedPassword,
        role: "ADMIN"
      }
    });

    console.log(`Admin updated successfully: ${admin.email}`);
    return;
  }

  const admin = await prisma.user.create({
    data: {
      name: adminName,
      email: adminEmail,
      password: hashedPassword,
      role: "ADMIN"
    }
  });

  console.log(`Admin created successfully: ${admin.email}`);
};

createAdmin()
  .catch((error) => {
    console.error("Admin seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });